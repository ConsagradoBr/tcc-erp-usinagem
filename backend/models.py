from datetime import date

from werkzeug.security import check_password_hash, generate_password_hash

from backend.extensions import db

TAXA_JUROS_MENSAL = 0.05
STATUS_OS_VALIDOS = ["solicitado", "em_andamento", "revisao", "concluido"]
STATUS_ORCAMENTO_VALIDOS = ["rascunho", "enviado", "aprovado", "reprovado", "cancelado"]


class Usuario(db.Model):
    __tablename__ = "usuarios"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    senha_hash = db.Column(db.String(255), nullable=False)
    perfil = db.Column(db.String(40), nullable=False, default="administrador")
    ativo = db.Column(db.Boolean, nullable=False, default=True)

    def set_password(self, senha):
        self.senha_hash = generate_password_hash(senha)

    def check_password(self, senha):
        return check_password_hash(self.senha_hash, senha)


class Cliente(db.Model):
    __tablename__ = "clientes"
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    documento = db.Column(db.String(20), nullable=True)
    telefone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    endereco = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "documento": self.documento,
            "telefone": self.telefone,
            "email": self.email,
            "endereco": self.endereco,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Lancamento(db.Model):
    __tablename__ = "lancamentos"
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(10), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.id"), nullable=True)
    descricao = db.Column(db.String(255), nullable=False)
    nfe = db.Column(db.String(50), nullable=True)
    prazo_dias = db.Column(db.Integer, nullable=True)
    vencimento = db.Column(db.Date, nullable=False)
    valor = db.Column(db.Numeric(12, 2), nullable=False)
    data_pagamento = db.Column(db.Date, nullable=True)
    forma_pagamento = db.Column(db.String(30), nullable=True)
    observacao = db.Column(db.Text, nullable=True)
    parcelas = db.Column(db.Integer, nullable=True, default=1)
    parcela_num = db.Column(db.Integer, nullable=True, default=1)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    cliente = db.relationship("Cliente", backref="lancamentos", lazy=True)

    def calcular_status(self):
        if self.data_pagamento:
            return "pago"
        if self.vencimento < date.today():
            return "atrasado"
        return "pendente"

    def calcular_juros(self):
        if self.data_pagamento or self.vencimento >= date.today():
            return 0.0
        dias = (date.today() - self.vencimento).days
        return round(float(self.valor) * (TAXA_JUROS_MENSAL / 30) * dias, 2)

    def to_dict(self):
        juros = self.calcular_juros()
        valor = float(self.valor)
        return {
            "id": self.id,
            "tipo": self.tipo,
            "cliente_id": self.cliente_id,
            "cliente_nome": self.cliente.nome if self.cliente else None,
            "descricao": self.descricao,
            "nfe": self.nfe,
            "prazo_dias": self.prazo_dias,
            "vencimento": self.vencimento.isoformat(),
            "valor": valor,
            "juros": juros,
            "valor_total": round(valor + juros, 2),
            "status": self.calcular_status(),
            "data_pagamento": (
                self.data_pagamento.isoformat() if self.data_pagamento else None
            ),
            "forma_pagamento": self.forma_pagamento,
            "observacao": self.observacao,
            "parcelas": self.parcelas or 1,
            "parcela_num": self.parcela_num or 1,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class OrdemServico(db.Model):
    __tablename__ = "ordens_servico"
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), nullable=False, unique=True)
    cliente = db.Column(db.String(150), nullable=False)
    servico = db.Column(db.String(255), nullable=False)
    prioridade = db.Column(db.String(10), nullable=False, default="media")
    prazo = db.Column(db.String(10), nullable=True)
    responsavel = db.Column(db.String(100), nullable=True)
    descricao = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="solicitado")
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "os": self.numero,
            "numero": self.numero,
            "cliente": self.cliente,
            "servico": self.servico,
            "prioridade": self.prioridade,
            "prazo": self.prazo,
            "responsavel": self.responsavel,
            "descricao": self.descricao,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Orcamento(db.Model):
    __tablename__ = "orcamentos"
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), nullable=False, unique=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.id"), nullable=False)
    titulo = db.Column(db.String(160), nullable=False)
    descricao = db.Column(db.Text, nullable=True)
    valor = db.Column(db.Numeric(12, 2), nullable=False)
    validade = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="rascunho")
    observacao = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    cliente = db.relationship("Cliente", backref="orcamentos", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "numero": self.numero,
            "cliente_id": self.cliente_id,
            "cliente_nome": self.cliente.nome if self.cliente else None,
            "titulo": self.titulo,
            "descricao": self.descricao,
            "valor": float(self.valor),
            "validade": self.validade.isoformat() if self.validade else None,
            "status": self.status,
            "observacao": self.observacao,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
