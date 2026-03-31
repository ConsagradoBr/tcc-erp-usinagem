import base64
import io
import logging
import re
from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from backend.extensions import db
from backend.financeiro_utils import extrair_dados_boleto
from backend.models import Cliente, Lancamento
from backend.security import require_permissions

financeiro_bp = Blueprint("financeiro", __name__, url_prefix="/financeiro")


def descricao_base(texto):
    return re.sub(r"\s*\(\d+/\d+\)$", "", (texto or "")).strip()


def consultar_grupo(lancamento):
    base = descricao_base(lancamento.descricao)
    query = Lancamento.query.filter(Lancamento.tipo == lancamento.tipo)
    if lancamento.cliente_id is None:
        query = query.filter(Lancamento.cliente_id.is_(None))
    else:
        query = query.filter(Lancamento.cliente_id == lancamento.cliente_id)
    query = query.filter(Lancamento.descricao.like(f"{base}%"))
    if lancamento.parcelas and lancamento.parcelas > 1:
        query = query.filter(Lancamento.parcelas == lancamento.parcelas)
    return query.order_by(Lancamento.parcela_num.asc(), Lancamento.id.asc()).all()


def distribuir_valor_total(valor_total, parcelas):
    parcelas = max(int(parcelas or 1), 1)
    valor_total = round(float(valor_total), 2)
    valor_base = round(valor_total / parcelas, 2)
    valores = [valor_base for _ in range(parcelas)]
    diferenca = round(valor_total - sum(valores), 2)
    valores[-1] = round(valores[-1] + diferenca, 2)
    return valores


@financeiro_bp.route("", methods=["GET"])
@require_permissions("financeiro")
def listar_lancamentos():
    try:
        tipo = request.args.get("tipo", "").strip()
        status = request.args.get("status", "").strip()
        q = request.args.get("q", "").strip()
        query = Lancamento.query
        if tipo:
            query = query.filter(Lancamento.tipo == tipo)
        if q:
            query = query.join(Cliente, isouter=True).filter(
                db.or_(
                    Lancamento.descricao.ilike(f"%{q}%"),
                    Lancamento.nfe.ilike(f"%{q}%"),
                    Cliente.nome.ilike(f"%{q}%"),
                )
            )
        resultado = [
            lancamento.to_dict()
            for lancamento in query.order_by(Lancamento.vencimento.asc()).all()
        ]
        if status:
            resultado = [item for item in resultado if item["status"] == status]
        return jsonify(resultado), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/resumo", methods=["GET"])
@require_permissions("financeiro")
def resumo():
    try:
        todos = [lancamento.to_dict() for lancamento in Lancamento.query.all()]
        mes = date.today().isoformat()[:7]
        return (
            jsonify(
                {
                    "a_receber": round(
                        sum(
                            item["valor_total"]
                            for item in todos
                            if item["tipo"] == "receber" and item["status"] != "pago"
                        ),
                        2,
                    ),
                    "a_pagar": round(
                        sum(
                            item["valor_total"]
                            for item in todos
                            if item["tipo"] == "pagar" and item["status"] != "pago"
                        ),
                        2,
                    ),
                    "atrasados": len(
                        [item for item in todos if item["status"] == "atrasado"]
                    ),
                    "recebido_mes": round(
                        sum(
                            item["valor"]
                            for item in todos
                            if item["tipo"] == "receber"
                            and item["data_pagamento"]
                            and item["data_pagamento"][:7] == mes
                        ),
                        2,
                    ),
                }
            ),
            200,
        )
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("", methods=["POST"])
@require_permissions("financeiro")
def criar_lancamento():
    try:
        data = request.get_json() or {}
        tipo = data.get("tipo", "").strip()
        descricao = data.get("descricao", "").strip()
        vencimento_str = data.get("vencimento", "")
        if tipo not in ("receber", "pagar"):
            return jsonify({"erro": "Tipo inválido."}), 400
        if not descricao:
            return jsonify({"erro": "Descrição é obrigatória."}), 400
        if not vencimento_str:
            return jsonify({"erro": "Vencimento é obrigatório."}), 400
        n_parcelas = int(data.get("parcelas", 1) or 1)
        valor_total = float(data.get("valor", 0))
        valor_parcela = round(valor_total / n_parcelas, 2)
        base_vencimento = date.fromisoformat(vencimento_str)
        prazo_dias = int(data.get("prazo_dias") or 30)
        criados = []
        for indice in range(n_parcelas):
            vencimento = base_vencimento + timedelta(days=prazo_dias * indice)
            lancamento = Lancamento(
                tipo=tipo,
                cliente_id=data.get("cliente_id") or None,
                descricao=(
                    descricao
                    if n_parcelas == 1
                    else f"{descricao} ({indice + 1}/{n_parcelas})"
                ),
                nfe=data.get("nfe", "").strip() or None,
                prazo_dias=data.get("prazo_dias") or None,
                vencimento=vencimento,
                valor=valor_parcela,
                forma_pagamento=data.get("forma_pagamento", "").strip() or None,
                observacao=data.get("observacao", "").strip() or None,
                parcelas=n_parcelas,
                parcela_num=indice + 1,
            )
            db.session.add(lancamento)
            criados.append(lancamento)
        db.session.commit()
        return (
            jsonify(
                [item.to_dict() for item in criados]
                if n_parcelas > 1
                else criados[0].to_dict()
            ),
            201,
        )
    except ValueError:
        return jsonify({"erro": "Data inválida. Use YYYY-MM-DD."}), 400
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("financeiro")
def editar_lancamento(id):
    try:
        lancamento = Lancamento.query.get_or_404(id)
        data = request.get_json() or {}
        grupo_atual = consultar_grupo(lancamento)
        parcelas_atuais = max(int(lancamento.parcelas or 1), 1)

        tipo = data.get("tipo", lancamento.tipo)
        if tipo not in ("receber", "pagar"):
            tipo = lancamento.tipo

        descricao = data.get("descricao", lancamento.descricao)
        descricao = descricao.strip() if descricao is not None else lancamento.descricao
        cliente_id = data.get("cliente_id", lancamento.cliente_id)
        cliente_id = cliente_id or None
        nfe = data.get("nfe", lancamento.nfe)
        nfe = nfe.strip() if isinstance(nfe, str) else nfe
        prazo_dias = data.get("prazo_dias", lancamento.prazo_dias)
        prazo_dias = int(prazo_dias or 30)
        vencimento = (
            date.fromisoformat(data["vencimento"])
            if data.get("vencimento")
            else lancamento.vencimento
        )
        forma_pagamento = data.get("forma_pagamento", lancamento.forma_pagamento)
        forma_pagamento = (
            forma_pagamento.strip()
            if isinstance(forma_pagamento, str)
            else forma_pagamento
        ) or None
        observacao = data.get("observacao", lancamento.observacao)
        observacao = observacao.strip() if isinstance(observacao, str) else observacao
        data_pagamento = (
            date.fromisoformat(data["data_pagamento"])
            if data.get("data_pagamento")
            else None if "data_pagamento" in data else lancamento.data_pagamento
        )
        parcelas_desejadas = max(int(data.get("parcelas", parcelas_atuais) or 1), 1)

        if "valor" in data:
            valor_total = float(data["valor"])
        elif parcelas_atuais > 1:
            valor_total = sum(float(item.valor) for item in grupo_atual)
        else:
            valor_total = float(lancamento.valor)

        usa_grupo = parcelas_desejadas > 1 or parcelas_atuais > 1
        if usa_grupo:
            if any(item.data_pagamento for item in grupo_atual):
                return (
                    jsonify(
                        {
                            "erro": "Nao e possivel reparcelar um grupo com parcelas pagas."
                        }
                    ),
                    400,
                )

            valores = distribuir_valor_total(valor_total, parcelas_desejadas)
            base = descricao_base(descricao)

            for item in grupo_atual:
                db.session.delete(item)
            db.session.flush()

            criados = []
            for indice, valor_parcela in enumerate(valores):
                item = Lancamento(
                    tipo=tipo,
                    cliente_id=cliente_id,
                    descricao=(
                        base
                        if parcelas_desejadas == 1
                        else f"{base} ({indice + 1}/{parcelas_desejadas})"
                    ),
                    nfe=nfe or None,
                    prazo_dias=(
                        prazo_dias
                        if parcelas_desejadas > 1
                        else (data.get("prazo_dias") or None)
                    ),
                    vencimento=vencimento + timedelta(days=prazo_dias * indice),
                    valor=valor_parcela,
                    forma_pagamento=forma_pagamento,
                    observacao=observacao or None,
                    parcelas=parcelas_desejadas,
                    parcela_num=indice + 1,
                    data_pagamento=None,
                )
                db.session.add(item)
                criados.append(item)

            db.session.commit()
            return jsonify(criados[0].to_dict()), 200

        lancamento.tipo = tipo
        lancamento.descricao = descricao
        lancamento.cliente_id = cliente_id
        lancamento.nfe = nfe or None
        lancamento.prazo_dias = data.get("prazo_dias") or None
        lancamento.vencimento = vencimento
        lancamento.valor = valor_total
        lancamento.forma_pagamento = forma_pagamento
        lancamento.observacao = observacao or None
        lancamento.data_pagamento = data_pagamento

        db.session.commit()
        return jsonify(lancamento.to_dict()), 200
    except ValueError:
        return jsonify({"erro": "Data inválida."}), 400
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/<int:id>/pagar", methods=["PATCH"])
@require_permissions("financeiro")
def marcar_pago(id):
    try:
        lancamento = Lancamento.query.get_or_404(id)
        data = request.get_json() or {}
        lancamento.data_pagamento = date.fromisoformat(
            data.get("data_pagamento", date.today().isoformat())
        )
        lancamento.forma_pagamento = data.get(
            "forma_pagamento", lancamento.forma_pagamento
        )
        db.session.commit()
        return jsonify(lancamento.to_dict()), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("financeiro")
def excluir_lancamento(id):
    try:
        lancamento = Lancamento.query.get_or_404(id)
        modo = request.args.get("modo", "unico")
        if modo == "grupo" and lancamento.parcelas and lancamento.parcelas > 1:
            desc_base = re.sub(r"\s*\(\d+/\d+\)$", "", lancamento.descricao).strip()
            irmas = Lancamento.query.filter(
                Lancamento.tipo == lancamento.tipo,
                Lancamento.cliente_id == lancamento.cliente_id,
                Lancamento.parcelas == lancamento.parcelas,
                Lancamento.descricao.like(f"{desc_base}%"),
            ).all()
            count = len(irmas)
            for irma in irmas:
                db.session.delete(irma)
            db.session.commit()
            return jsonify({"mensagem": f"{count} parcela(s) excluída(s)."}), 200
        db.session.delete(lancamento)
        db.session.commit()
        return jsonify({"mensagem": "Lançamento excluído."}), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/boleto", methods=["POST"])
@require_permissions("financeiro")
def parsear_boleto():
    try:
        body = request.get_json() or {}
        pdf_b64 = body.get("pdf_base64", "")
        tipo_hint = body.get("tipo", "pagar")
        if not pdf_b64:
            return jsonify({"erro": "PDF não enviado."}), 400
        pdf_bytes = base64.b64decode(pdf_b64)
        texto_total = ""
        try:
            import pdfplumber

            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    texto = page.extract_text()
                    if texto:
                        texto_total += texto + "\n"
        except Exception:
            pass
        if not texto_total.strip():
            try:
                import PyPDF2

                for page in PyPDF2.PdfReader(io.BytesIO(pdf_bytes)).pages:
                    texto = page.extract_text()
                    if texto:
                        texto_total += texto + "\n"
            except Exception:
                pass
        if not texto_total.strip():
            return (
                jsonify(
                    {"erro": "PDF sem texto extraível. Preencha os dados manualmente."}
                ),
                422,
            )
        dados = extrair_dados_boleto(texto_total)
        return (
            jsonify(
                {
                    "tipo": tipo_hint,
                    "descricao": dados["descricao"] or "Boleto bancário",
                    "valor": dados["valor"],
                    "vencimento": dados["vencimento"],
                    "nfe": dados["nfe"],
                    "beneficiario": dados["beneficiario"],
                    "pagador": dados["pagador"],
                }
            ),
            200,
        )
    except Exception as exc:
        logging.error(f"❌ Boleto: {exc}")
        return jsonify({"erro": f"Erro ao processar PDF: {str(exc)}"}), 500
