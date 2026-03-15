import os
import re
import io
import json
import base64
import traceback
from urllib.parse import quote_plus
from datetime import timedelta, date
from dotenv import load_dotenv
import logging

from flask import Flask, Blueprint, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)

# ================================================================
# CONFIGURAÇÃO INICIAL
# ================================================================

load_dotenv()

app = Flask(__name__)
CORS(app, origins="*",
     allow_headers=["Content-Type", "Authorization"],
     methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
     supports_credentials=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

# ================================================================
# BANCO DE DADOS
# ================================================================

db_user = os.getenv("DB_USER")
db_pass = os.getenv("DB_PASS")
db_host = os.getenv("DB_HOST", "localhost")
db_port = os.getenv("DB_PORT", "5432")
db_name = os.getenv("DB_NAME", "postgres")

app.config["SQLALCHEMY_DATABASE_URI"] = (
    f"postgresql+psycopg2://{quote_plus(db_user)}:{quote_plus(db_pass)}"
    f"@{db_host}:{db_port}/{db_name}?sslmode=require"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_pre_ping": True,
    "pool_recycle": 300,
    "connect_args": {"sslmode": "require", "connect_timeout": 10},
}

# ================================================================
# JWT
# ================================================================

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "chave_jwt_segura")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

jwt = JWTManager(app)
db  = SQLAlchemy(app)

# ================================================================
# MODELOS
# ================================================================

class Usuario(db.Model):
    __tablename__ = "usuarios"
    id         = db.Column(db.Integer, primary_key=True)
    nome       = db.Column(db.String(120), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)

    def set_password(self, s): self.senha_hash = generate_password_hash(s)
    def check_password(self, s): return check_password_hash(self.senha_hash, s)


class Cliente(db.Model):
    __tablename__ = "clientes"
    id         = db.Column(db.Integer, primary_key=True)
    nome       = db.Column(db.String(150), nullable=False)
    documento  = db.Column(db.String(20),  nullable=True)
    telefone   = db.Column(db.String(20),  nullable=True)
    email      = db.Column(db.String(120), nullable=True)
    endereco   = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {"id": self.id, "nome": self.nome, "documento": self.documento,
                "telefone": self.telefone, "email": self.email, "endereco": self.endereco,
                "created_at": self.created_at.isoformat() if self.created_at else None}


TAXA_JUROS_MENSAL = 0.01  # 1% ao mês

class Lancamento(db.Model):
    __tablename__ = "lancamentos"
    id              = db.Column(db.Integer,        primary_key=True)
    tipo            = db.Column(db.String(10),     nullable=False)
    cliente_id      = db.Column(db.Integer,        db.ForeignKey("clientes.id"), nullable=True)
    descricao       = db.Column(db.String(255),    nullable=False)
    nfe             = db.Column(db.String(50),     nullable=True)
    prazo_dias      = db.Column(db.Integer,        nullable=True)
    vencimento      = db.Column(db.Date,           nullable=False)
    valor           = db.Column(db.Numeric(12, 2), nullable=False)
    data_pagamento  = db.Column(db.Date,           nullable=True)
    forma_pagamento = db.Column(db.String(30),     nullable=True)
    observacao      = db.Column(db.Text,           nullable=True)
    parcelas        = db.Column(db.Integer,        nullable=True, default=1)
    parcela_num     = db.Column(db.Integer,        nullable=True, default=1)
    created_at      = db.Column(db.DateTime,       server_default=db.func.now())

    cliente = db.relationship("Cliente", backref="lancamentos", lazy=True)

    def calcular_status(self):
        if self.data_pagamento: return "pago"
        if self.vencimento < date.today(): return "atrasado"
        return "pendente"

    def calcular_juros(self):
        if self.data_pagamento or self.vencimento >= date.today(): return 0.0
        dias = (date.today() - self.vencimento).days
        return round(float(self.valor) * (TAXA_JUROS_MENSAL / 30) * dias, 2)

    def to_dict(self):
        juros = self.calcular_juros()
        val   = float(self.valor)
        return {
            "id": self.id, "tipo": self.tipo,
            "cliente_id": self.cliente_id,
            "cliente_nome": self.cliente.nome if self.cliente else None,
            "descricao": self.descricao, "nfe": self.nfe,
            "prazo_dias": self.prazo_dias,
            "vencimento": self.vencimento.isoformat(),
            "valor": val, "juros": juros,
            "valor_total": round(val + juros, 2),
            "status": self.calcular_status(),
            "data_pagamento": self.data_pagamento.isoformat() if self.data_pagamento else None,
            "forma_pagamento": self.forma_pagamento,
            "observacao": self.observacao,
            "parcelas": self.parcelas or 1,
            "parcela_num": self.parcela_num or 1,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


# ================================================================
# CRIAR TABELAS
# ================================================================

with app.app_context():
    try:
        db.create_all()
        logging.info("✅ Tabelas verificadas/criadas.")
    except Exception as e:
        logging.error(f"❌ Erro ao criar tabelas: {e}")

# ================================================================
# BLUEPRINT: /auth
# ================================================================

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")

@auth_bp.route("/usuarios", methods=["POST"])
def criar_usuario():
    try:
        data  = request.get_json()
        nome  = data.get("nome",  "").strip()
        email = data.get("email", "").strip().lower()
        senha = data.get("senha", "").strip()
        if not nome or not email or not senha:
            return jsonify({"erro": "Campos obrigatórios ausentes."}), 400
        if Usuario.query.filter_by(email=email).first():
            return jsonify({"erro": "Usuário já existe."}), 400
        novo = Usuario(nome=nome, email=email)
        novo.set_password(senha)
        db.session.add(novo)
        db.session.commit()
        return jsonify({"mensagem": "Usuário criado com sucesso!"}), 201
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data    = request.get_json()
        email   = data.get("email", "").strip().lower()
        senha   = data.get("senha", "").strip()
        usuario = Usuario.query.filter_by(email=email).first()
        if not usuario or not usuario.check_password(senha):
            return jsonify({"erro": "Credenciais inválidas."}), 401
        token = create_access_token(
            identity=str(usuario.id),
            additional_claims={"nome": usuario.nome, "email": usuario.email}
        )
        return jsonify({"mensagem": "Login bem-sucedido!", "token": token,
                        "user": {"id": usuario.id, "nome": usuario.nome, "email": usuario.email}}), 200
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@auth_bp.route("/perfil", methods=["GET"])
@jwt_required()
def perfil():
    return jsonify({"mensagem": "Bem-vindo(a)!", "usuario_id": get_jwt_identity()}), 200

app.register_blueprint(auth_bp)

# ================================================================
# BLUEPRINT: /clientes
# ================================================================

clientes_bp = Blueprint("clientes", __name__, url_prefix="/clientes")

@clientes_bp.route("", methods=["GET"])
@jwt_required()
def listar_clientes():
    try:
        q     = request.args.get("q", "").strip()
        query = Cliente.query
        if q:
            query = query.filter(db.or_(
                Cliente.nome.ilike(f"%{q}%"),
                Cliente.documento.ilike(f"%{q}%"),
                Cliente.email.ilike(f"%{q}%"),
            ))
        return jsonify([c.to_dict() for c in query.order_by(Cliente.nome).all()]), 200
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@clientes_bp.route("", methods=["POST"])
@jwt_required()
def criar_cliente():
    try:
        data = request.get_json()
        nome = data.get("nome", "").strip()
        if not nome:
            return jsonify({"erro": "Nome é obrigatório."}), 400
        c = Cliente(nome=nome,
                    documento=data.get("documento","").strip() or None,
                    telefone =data.get("telefone", "").strip() or None,
                    email    =(data.get("email","").strip().lower()) or None,
                    endereco =data.get("endereco", "").strip() or None)
        db.session.add(c)
        db.session.commit()
        return jsonify(c.to_dict()), 201
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@clientes_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def editar_cliente(id):
    try:
        c    = Cliente.query.get_or_404(id)
        data = request.get_json()
        c.nome      = data.get("nome",      c.nome).strip()
        c.documento = data.get("documento", c.documento)
        c.telefone  = data.get("telefone",  c.telefone)
        c.email     = data.get("email",     c.email)
        c.endereco  = data.get("endereco",  c.endereco)
        db.session.commit()
        return jsonify(c.to_dict()), 200
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@clientes_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def excluir_cliente(id):
    try:
        c = Cliente.query.get_or_404(id)
        db.session.delete(c)
        db.session.commit()
        return jsonify({"mensagem": "Cliente excluído."}), 200
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

app.register_blueprint(clientes_bp)

# ================================================================
# BLUEPRINT: /financeiro
# ================================================================

financeiro_bp = Blueprint("financeiro", __name__, url_prefix="/financeiro")

@financeiro_bp.route("", methods=["GET"])
@jwt_required()
def listar_lancamentos():
    try:
        tipo   = request.args.get("tipo",   "").strip()
        status = request.args.get("status", "").strip()
        q      = request.args.get("q",      "").strip()
        query  = Lancamento.query
        if tipo: query = query.filter(Lancamento.tipo == tipo)
        if q:
            query = query.join(Cliente, isouter=True).filter(db.or_(
                Lancamento.descricao.ilike(f"%{q}%"),
                Lancamento.nfe.ilike(f"%{q}%"),
                Cliente.nome.ilike(f"%{q}%"),
            ))
        resultado = [l.to_dict() for l in query.order_by(Lancamento.vencimento.asc()).all()]
        if status: resultado = [l for l in resultado if l["status"] == status]
        return jsonify(resultado), 200
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@financeiro_bp.route("/resumo", methods=["GET"])
@jwt_required()
def resumo():
    try:
        todos = [l.to_dict() for l in Lancamento.query.all()]
        mes   = date.today().isoformat()[:7]
        return jsonify({
            "a_receber":    round(sum(l["valor_total"] for l in todos if l["tipo"]=="receber" and l["status"]!="pago"), 2),
            "a_pagar":      round(sum(l["valor_total"] for l in todos if l["tipo"]=="pagar"   and l["status"]!="pago"), 2),
            "atrasados":    len([l for l in todos if l["status"]=="atrasado"]),
            "recebido_mes": round(sum(l["valor"] for l in todos if l["tipo"]=="receber" and l["data_pagamento"] and l["data_pagamento"][:7]==mes), 2),
        }), 200
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@financeiro_bp.route("", methods=["POST"])
@jwt_required()
def criar_lancamento():
    try:
        data      = request.get_json()
        tipo      = data.get("tipo", "").strip()
        descricao = data.get("descricao", "").strip()
        venc_str  = data.get("vencimento", "")
        if tipo not in ("receber","pagar"):
            return jsonify({"erro": "Tipo inválido."}), 400
        if not descricao:
            return jsonify({"erro": "Descrição é obrigatória."}), 400
        if not venc_str:
            return jsonify({"erro": "Vencimento é obrigatório."}), 400

        n_parcelas  = int(data.get("parcelas", 1) or 1)
        valor_total = float(data.get("valor", 0))
        valor_parc  = round(valor_total / n_parcelas, 2)
        base_venc   = date.fromisoformat(venc_str)
        criados     = []

        for i in range(n_parcelas):
            if i == 0:
                venc_parc = base_venc
            else:
                try:
                    from dateutil.relativedelta import relativedelta
                    venc_parc = base_venc + relativedelta(months=i)
                except ImportError:
                    from datetime import timedelta as _td
                    venc_parc = base_venc + _td(days=30*i)

            l = Lancamento(
                tipo            = tipo,
                cliente_id      = data.get("cliente_id") or None,
                descricao       = descricao if n_parcelas==1 else f"{descricao} ({i+1}/{n_parcelas})",
                nfe             = data.get("nfe","").strip() or None,
                prazo_dias      = data.get("prazo_dias") or None,
                vencimento      = venc_parc,
                valor           = valor_parc,
                forma_pagamento = data.get("forma_pagamento","").strip() or None,
                observacao      = data.get("observacao","").strip() or None,
                parcelas        = n_parcelas,
                parcela_num     = i+1,
            )
            db.session.add(l)
            criados.append(l)

        db.session.commit()
        return jsonify([c.to_dict() for c in criados] if n_parcelas>1 else criados[0].to_dict()), 201

    except ValueError:
        return jsonify({"erro": "Data inválida. Use YYYY-MM-DD."}), 400
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@financeiro_bp.route("/<int:id>", methods=["PUT"])
@jwt_required()
def editar_lancamento(id):
    try:
        l    = Lancamento.query.get_or_404(id)
        data = request.get_json()
        if "tipo"            in data and data["tipo"] in ("receber","pagar"): l.tipo = data["tipo"]
        if "descricao"       in data: l.descricao       = data["descricao"].strip()
        if "cliente_id"      in data: l.cliente_id      = data["cliente_id"] or None
        if "nfe"             in data: l.nfe             = data["nfe"].strip() or None
        if "prazo_dias"      in data: l.prazo_dias      = data["prazo_dias"] or None
        if "vencimento"      in data: l.vencimento      = date.fromisoformat(data["vencimento"])
        if "valor"           in data: l.valor           = float(data["valor"])
        if "forma_pagamento" in data: l.forma_pagamento = data["forma_pagamento"].strip() or None
        if "observacao"      in data: l.observacao      = data["observacao"].strip() or None
        if "data_pagamento"  in data:
            l.data_pagamento = date.fromisoformat(data["data_pagamento"]) if data["data_pagamento"] else None
        db.session.commit()
        return jsonify(l.to_dict()), 200
    except ValueError:
        return jsonify({"erro": "Data inválida."}), 400
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@financeiro_bp.route("/<int:id>/pagar", methods=["PATCH"])
@jwt_required()
def marcar_pago(id):
    try:
        l    = Lancamento.query.get_or_404(id)
        data = request.get_json() or {}
        l.data_pagamento  = date.fromisoformat(data.get("data_pagamento", date.today().isoformat()))
        l.forma_pagamento = data.get("forma_pagamento", l.forma_pagamento)
        db.session.commit()
        return jsonify(l.to_dict()), 200
    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

@financeiro_bp.route("/<int:id>", methods=["DELETE"])
@jwt_required()
def excluir_lancamento(id):
    """
    Exclui um lançamento.
    ?modo=grupo  → exclui todas as parcelas do mesmo grupo (mesmo descricao base + parcelas)
    ?modo=unico  → exclui só este lançamento (padrão)
    """
    try:
        l    = Lancamento.query.get_or_404(id)
        modo = request.args.get("modo", "unico")

        if modo == "grupo" and l.parcelas and l.parcelas > 1:
            # Identifica o grupo pela descrição base (remove sufixo " (N/Total)")
            import re as _re
            desc_base = _re.sub(r"\s*\(\d+/\d+\)$", "", l.descricao).strip()

            # Busca todas as parcelas com mesma descrição base, tipo e cliente
            irmãs = Lancamento.query.filter(
                Lancamento.tipo       == l.tipo,
                Lancamento.cliente_id == l.cliente_id,
                Lancamento.parcelas   == l.parcelas,
                Lancamento.descricao.like(f"{desc_base}%"),
            ).all()

            count = len(irmãs)
            for irma in irmãs:
                db.session.delete(irma)
            db.session.commit()
            return jsonify({"mensagem": f"{count} parcela(s) excluída(s)."}), 200
        else:
            db.session.delete(l)
            db.session.commit()
            return jsonify({"mensagem": "Lançamento excluído."}), 200

    except Exception as e:
        logging.error(f"❌ {e}")
        return jsonify({"erro": "Erro interno."}), 500

# ── Parse boleto PDF ──────────────────────────────────────────────────────────

def extrair_dados_boleto(texto):
    from datetime import datetime as _dt
    dados = {"beneficiario": None, "pagador": None, "valor": None,
             "vencimento": None, "descricao": None, "nfe": None}

    for pat in [r"Valor\s+Cobrado\s+([\d\.]+,\d{2})",
                r"Valor\s+do\s+Documento\s+([\d\.]+,\d{2})",
                r"R\$\s*([\d\.]+,\d{2})",
                r"([\d]{1,3}(?:\.\d{3})*,\d{2})"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            try:
                v = float(m.group(1).replace(".","").replace(",","."))
                if v > 0: dados["valor"] = v; break
            except: pass

    for pat in [r"Vencimento\s+(\d{2}/\d{2}/\d{4})(?:\s+\d{2}:\d{2}:\d{2})?",
                r"(\d{2}/\d{2}/\d{4})\s+\d{2}:\d{2}:\d{2}"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            try: dados["vencimento"] = _dt.strptime(m.group(1),"%d/%m/%Y").date().isoformat(); break
            except: pass
    if not dados["vencimento"]:
        em = re.search(r"(?:emiss[aã]o|processamento)[^\d]*(\d{2}/\d{2}/\d{4})", texto, re.IGNORECASE)
        emissao = em.group(1) if em else None
        for d in re.findall(r"(\d{2}/\d{2}/\d{4})", texto):
            if d != emissao:
                try: dados["vencimento"] = _dt.strptime(d,"%d/%m/%Y").date().isoformat(); break
                except: pass

    for pat in [r"Benefici[aá]rio[:\s]*\n([A-Za-zÀ-ú][^\n]+)",
                r"Benefici[aá]rio\s+CNPJ[^\n]*\n([A-Za-zÀ-ú][^\n]+)",
                r"Benefici[aá]rio[:\s]+([A-Za-zÀ-ú][^\n]{4,})",
                r"Cedente[:\s]+([A-Za-zÀ-ú][^\n]+)"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            val = m.group(1).strip().split("  ")[0].strip()
            if len(val) > 4 and not re.match(r"^[\d\.\-/\s]+$", val):
                dados["beneficiario"] = val[:100]; break

    for pat in [r"Pagador\s*:\s*\n([A-Za-zÀ-ú][^\n]+)",
                r"Pagador\s+CPF[^\n]*\n([A-Za-zÀ-ú][^\n]+)",
                r"Pagador[:\s]+([A-Za-zÀ-ú][^\n]{4,})",
                r"Sacado[:\s]+([A-Za-zÀ-ú][^\n]+)"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            val = m.group(1).strip().split("  ")[0].strip()
            if len(val) > 4 and not re.match(r"^[\d\.\-/\s]+$", val):
                dados["pagador"] = val[:100]; break

    for pat in [r"Nota\s+Fiscal\s+\(NF-e\)[^\n]*\n([\d]+)",
                r"NF-?e?\s*[nº#:]*\s*([\d\.]+)",
                r"nota\s+fiscal[:\s]*([\d\.]+)"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m: dados["nfe"] = m.group(1).strip(); break

    for pat in [r"Instru[cç][oõ]es[^\n]*\n(PARCELA[^\n]+)",
                r"Descri[cç][aã]o\s*/\s*Hist[oó]rico[^\n]+\n([^\n]+)",
                r"descri[cç][aã]o[:\s]+([^\n]+)",
                r"-\s*Referente:\s*([^\n]+)",
                r"referente[:\s]+([^\n]+)"]:
        m = re.search(pat, texto, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if dados["nfe"]: val = val.replace(dados["nfe"],"").strip()
            if len(val) > 4: dados["descricao"] = val[:200]; break

    if not dados["descricao"] and dados["beneficiario"]:
        dados["descricao"] = f"Boleto - {dados['beneficiario']}"

    return dados


@financeiro_bp.route("/boleto", methods=["POST"])
@jwt_required()
def parsear_boleto():
    try:
        body      = request.get_json()
        pdf_b64   = body.get("pdf_base64", "")
        tipo_hint = body.get("tipo", "pagar")
        if not pdf_b64:
            return jsonify({"erro": "PDF não enviado."}), 400

        pdf_bytes   = base64.b64decode(pdf_b64)
        texto_total = ""

        try:
            import pdfplumber
            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    t = page.extract_text()
                    if t: texto_total += t + "\n"
        except Exception: pass

        if not texto_total.strip():
            try:
                import PyPDF2
                for page in PyPDF2.PdfReader(io.BytesIO(pdf_bytes)).pages:
                    t = page.extract_text()
                    if t: texto_total += t + "\n"
            except Exception: pass

        if not texto_total.strip():
            return jsonify({"erro": "PDF sem texto extraível. Preencha os dados manualmente."}), 422

        dados = extrair_dados_boleto(texto_total)
        return jsonify({
            "tipo": tipo_hint,
            "descricao":    dados["descricao"]    or "Boleto bancário",
            "valor":        dados["valor"],
            "vencimento":   dados["vencimento"],
            "nfe":          dados["nfe"],
            "beneficiario": dados["beneficiario"],
            "pagador":      dados["pagador"],
        }), 200

    except Exception as e:
        logging.error(f"❌ Boleto: {e}")
        return jsonify({"erro": f"Erro ao processar PDF: {str(e)}"}), 500

app.register_blueprint(financeiro_bp)

# ================================================================
# HANDLER DE ERROS GLOBAIS
# ================================================================

@app.errorhandler(Exception)
def handle_exception(e):
    print("\n" + "="*80)
    print("🚨 ERRO DETECTADO - TRACEBACK COMPLETO")
    print("="*80)
    print(traceback.format_exc())
    print("="*80 + "\n")
    return {"error": "Erro interno do servidor"}, 500

# ================================================================
# INÍCIO DO SERVIDOR  ← sempre no final
# ================================================================

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)