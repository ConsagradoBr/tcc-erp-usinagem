import logging
import os

from flask import Flask
from sqlalchemy import inspect, text
from werkzeug.exceptions import HTTPException

from backend.api_utils import http_error_response
from backend.blueprints.auth import auth_bp
from backend.blueprints.clientes import clientes_bp
from backend.blueprints.dashboard import dashboard_bp
from backend.blueprints.financeiro import financeiro_bp
from backend.blueprints.orcamentos import orc_bp
from backend.blueprints.ordens_servico import os_bp
from backend.blueprints.sistema import sistema_bp
from backend.config import configure_app
from backend.config import is_development_env
from backend.extensions import db, jwt


def _garantir_colunas_usuarios():
    inspector = inspect(db.engine)
    if "usuarios" not in inspector.get_table_names():
        return

    colunas = {coluna["name"] for coluna in inspector.get_columns("usuarios")}
    alteracoes = []
    if "perfil" not in colunas:
        alteracoes.append("ALTER TABLE usuarios ADD COLUMN perfil VARCHAR(40)")
    if "ativo" not in colunas:
        alteracoes.append("ALTER TABLE usuarios ADD COLUMN ativo BOOLEAN")

    for sql in alteracoes:
        db.session.execute(text(sql))

    if alteracoes:
        db.session.execute(
            text(
                "UPDATE usuarios SET perfil = 'administrador' "
                "WHERE perfil IS NULL OR perfil = ''"
            )
        )
        db.session.execute(text("UPDATE usuarios SET ativo = TRUE WHERE ativo IS NULL"))
        db.session.commit()
        logging.info(
            "Estrutura de usuarios atualizada para suportar perfis e permissoes."
        )


def _garantir_colunas_clientes():
    inspector = inspect(db.engine)
    if "clientes" not in inspector.get_table_names():
        return

    colunas = {coluna["name"] for coluna in inspector.get_columns("clientes")}
    campos = {
        "inscricao_estadual": "VARCHAR(20)",
        "indicador_ie_destinatario": "VARCHAR(2)",
        "logradouro": "VARCHAR(160)",
        "numero": "VARCHAR(20)",
        "complemento": "VARCHAR(80)",
        "bairro": "VARCHAR(80)",
        "codigo_municipio": "VARCHAR(10)",
        "municipio": "VARCHAR(80)",
        "uf": "VARCHAR(2)",
        "cep": "VARCHAR(8)",
        "codigo_pais": "VARCHAR(8)",
        "pais": "VARCHAR(60)",
    }
    alteracoes = [
        f"ALTER TABLE clientes ADD COLUMN {campo} {tipo}"
        for campo, tipo in campos.items()
        if campo not in colunas
    ]

    for sql in alteracoes:
        db.session.execute(text(sql))

    if alteracoes:
        db.session.commit()
        logging.info("Estrutura de clientes atualizada para dados fiscais NF-e.")


def create_app():
    app = Flask(__name__)
    configure_app(app)
    db.init_app(app)
    jwt.init_app(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(clientes_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(financeiro_bp)
    app.register_blueprint(os_bp)
    app.register_blueprint(orc_bp)
    app.register_blueprint(sistema_bp)
    with app.app_context():
        try:
            db.create_all()
            _garantir_colunas_usuarios()
            _garantir_colunas_clientes()
            logging.info("Tabelas verificadas/criadas.")
        except Exception:
            logging.exception("Erro ao criar/verificar tabelas.")
            raise

    @app.errorhandler(Exception)
    def handle_exception(exc):
        if isinstance(exc, HTTPException):
            return http_error_response(exc)
        logging.exception("Erro interno do servidor nao tratado.")
        return {"error": "Erro interno do servidor"}, 500

    return app


def run_dev_server(app):
    host = os.getenv("FLASK_HOST", "127.0.0.1")
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", "5000")))
    debug_requested = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    if debug_requested and not is_development_env():
        raise RuntimeError(
            "FLASK_DEBUG=true bloqueado fora de ambiente de desenvolvimento."
        )
    debug = debug_requested and is_development_env()
    app.run(debug=debug, host=host, port=port)
