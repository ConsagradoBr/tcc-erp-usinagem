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


class TermoAceite(db.Model):
    __tablename__ = "termo_aceite"
    __table_args__ = (
        db.UniqueConstraint(
            "usuario_id", "versao_termo", name="uq_termo_usuario_versao"
        ),
        db.Index("ix_termo_aceite_usuario_id", "usuario_id"),
        db.Index("ix_termo_aceite_versao", "versao_termo"),
    )

    id = db.Column(db.Integer, primary_key=True)
    usuario_id = db.Column(
        db.Integer, db.ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False
    )
    versao_termo = db.Column(db.String(40), nullable=False)
    data_aceite = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    ip_usuario = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)

    usuario = db.relationship(
        "Usuario",
        backref=db.backref("termos_aceitos", cascade="all, delete-orphan"),
        lazy=True,
    )


class Cliente(db.Model):
    __tablename__ = "clientes"
    __table_args__ = (
        db.Index("ix_clientes_nome", "nome"),
        db.Index("ix_clientes_documento", "documento"),
        db.Index("ix_clientes_email", "email"),
    )
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(150), nullable=False)
    documento = db.Column(db.String(20), nullable=True)
    telefone = db.Column(db.String(20), nullable=True)
    email = db.Column(db.String(120), nullable=True)
    endereco = db.Column(db.String(255), nullable=True)
    inscricao_estadual = db.Column(db.String(20), nullable=True)
    indicador_ie_destinatario = db.Column(db.String(2), nullable=True)
    logradouro = db.Column(db.String(160), nullable=True)
    numero = db.Column(db.String(20), nullable=True)
    complemento = db.Column(db.String(80), nullable=True)
    bairro = db.Column(db.String(80), nullable=True)
    codigo_municipio = db.Column(db.String(10), nullable=True)
    municipio = db.Column(db.String(80), nullable=True)
    uf = db.Column(db.String(2), nullable=True)
    cep = db.Column(db.String(8), nullable=True)
    codigo_pais = db.Column(db.String(8), nullable=True)
    pais = db.Column(db.String(60), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    def to_dict(self):
        return {
            "id": self.id,
            "nome": self.nome,
            "documento": self.documento,
            "telefone": self.telefone,
            "email": self.email,
            "endereco": self.endereco,
            "inscricao_estadual": self.inscricao_estadual,
            "indicador_ie_destinatario": self.indicador_ie_destinatario,
            "logradouro": self.logradouro,
            "numero": self.numero,
            "complemento": self.complemento,
            "bairro": self.bairro,
            "codigo_municipio": self.codigo_municipio,
            "municipio": self.municipio,
            "uf": self.uf,
            "cep": self.cep,
            "codigo_pais": self.codigo_pais,
            "pais": self.pais,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Lancamento(db.Model):
    __tablename__ = "lancamentos"
    __table_args__ = (
        db.Index("ix_lancamentos_tipo", "tipo"),
        db.Index("ix_lancamentos_vencimento", "vencimento"),
        db.Index("ix_lancamentos_data_pagamento", "data_pagamento"),
        db.Index("ix_lancamentos_cliente_id", "cliente_id"),
        db.Index("ix_lancamentos_tipo_vencimento", "tipo", "vencimento"),
        db.Index("ix_lancamentos_tipo_pagamento", "tipo", "data_pagamento"),
    )
    id = db.Column(db.Integer, primary_key=True)
    tipo = db.Column(db.String(10), nullable=False)
    cliente_id = db.Column(db.Integer, db.ForeignKey("clientes.id"), nullable=True)
    orcamento_id = db.Column(db.Integer, db.ForeignKey("orcamentos.id"), nullable=True)
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
    orcamento = db.relationship("Orcamento", backref="lancamentos_vinculados", lazy=True)

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
            "orcamento_id": self.orcamento_id,
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
    __table_args__ = (
        db.Index("ix_ordens_servico_status", "status"),
        db.Index("ix_ordens_servico_created_at", "created_at"),
    )
    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.String(20), nullable=False, unique=True)
    cliente = db.Column(db.String(150), nullable=False)
    servico = db.Column(db.String(255), nullable=False)
    prioridade = db.Column(db.String(10), nullable=False, default="media")
    prazo = db.Column(db.String(10), nullable=True)
    responsavel = db.Column(db.String(100), nullable=True)
    descricao = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="solicitado")
    orcamento_id = db.Column(db.Integer, db.ForeignKey("orcamentos.id"), nullable=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    orcamento = db.relationship("Orcamento", backref="ordens_servico_vinculadas", lazy=True)

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
            "orcamento_id": self.orcamento_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class LoginAttempt(db.Model):
    __tablename__ = "login_attempts"
    __table_args__ = (
        db.Index("ix_login_attempts_ip_email", "ip_address", "email"),
        db.Index("ix_login_attempts_window", "window_start"),
    )
    id = db.Column(db.Integer, primary_key=True)
    ip_address = db.Column(db.String(45), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    tentativas = db.Column(db.Integer, nullable=False, default=1)
    window_start = db.Column(db.DateTime, nullable=False, server_default=db.func.now())


class Orcamento(db.Model):
    __tablename__ = "orcamentos"
    __table_args__ = (
        db.Index("ix_orcamentos_status", "status"),
        db.Index("ix_orcamentos_cliente_id", "cliente_id"),
        db.Index("ix_orcamentos_created_at", "created_at"),
    )
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
