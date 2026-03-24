import logging
import os
import traceback

from flask import Flask
from sqlalchemy import inspect, text

from backend.blueprints.auth import auth_bp
from backend.blueprints.clientes import clientes_bp
from backend.blueprints.financeiro import financeiro_bp
from backend.blueprints.ordens_servico import os_bp
from backend.blueprints.orcamentos import orc_bp
from backend.blueprints.sistema import sistema_bp
from backend.config import configure_app
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
        db.session.execute(text("UPDATE usuarios SET perfil = 'administrador' WHERE perfil IS NULL OR perfil = ''"))
        db.session.execute(text("UPDATE usuarios SET ativo = TRUE WHERE ativo IS NULL"))
        db.session.commit()
        logging.info("Estrutura de usuarios atualizada para suportar perfis e permissoes.")


def create_app():
    app = Flask(__name__)
    configure_app(app)
    db.init_app(app)
    jwt.init_app(app)
    app.register_blueprint(auth_bp)
    app.register_blueprint(clientes_bp)
    app.register_blueprint(financeiro_bp)
    app.register_blueprint(os_bp)
    app.register_blueprint(orc_bp)
    app.register_blueprint(sistema_bp)
    with app.app_context():
        try:
            db.create_all()
            _garantir_colunas_usuarios()
            logging.info("Tabelas verificadas/criadas.")
        except Exception as exc:
            logging.error(f"Erro ao criar tabelas: {exc}")

    @app.errorhandler(Exception)
    def handle_exception(exc):
        print("\n" + "=" * 80)
        print("ERRO DETECTADO - TRACEBACK COMPLETO")
        print("=" * 80)
        print(traceback.format_exc())
        print("=" * 80 + "\n")
        return {"error": "Erro interno do servidor"}, 500

    return app


def run_dev_server(app):
    host = os.getenv("FLASK_HOST", "0.0.0.0")
    port = int(os.getenv("PORT", os.getenv("FLASK_PORT", "5000")))
    debug = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    app.run(debug=debug, host=host, port=port)

