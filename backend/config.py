import logging
import os
import sys
from datetime import timedelta
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv
from flask_cors import CORS


def get_runtime_data_dir():
    if getattr(sys, "frozen", False):
        base_dir = (
            Path(os.getenv("LOCALAPPDATA") or Path.home()) / "AMP Usinagem Industrial"
        )
    else:
        base_dir = Path(__file__).resolve().parent
    base_dir.mkdir(parents=True, exist_ok=True)
    return base_dir


def build_database_uri():
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        if database_url.startswith("postgres://"):
            return database_url.replace("postgres://", "postgresql://", 1)
        return database_url

    db_user = os.getenv("DB_USER", "").strip()
    db_pass = os.getenv("DB_PASS", "").strip()
    db_host = os.getenv("DB_HOST", "localhost").strip()
    db_port = os.getenv("DB_PORT", "5432").strip()
    db_name = os.getenv("DB_NAME", "postgres").strip()

    if db_user and db_pass:
        return (
            f"postgresql+psycopg2://{quote_plus(db_user)}:{quote_plus(db_pass)}"
            f"@{db_host}:{db_port}/{db_name}?sslmode=require"
        )

    default_sqlite_path = get_runtime_data_dir() / "app.sqlite3"
    logging.warning(
        "DATABASE_URL/credenciais nao informadas; usando SQLite local para desenvolvimento."
    )
    return f"sqlite:///{default_sqlite_path.as_posix()}"


def build_engine_options(database_uri):
    if database_uri.startswith("sqlite"):
        return {}
    return {
        "pool_pre_ping": True,
        "pool_recycle": 300,
        "connect_args": {"sslmode": "require", "connect_timeout": 10},
    }


def configure_app(app):
    load_dotenv()
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
    )
    CORS(
        app,
        origins="*",
        allow_headers=["Content-Type", "Authorization"],
        methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        supports_credentials=False,
    )

    database_uri = build_database_uri()
    app.config["SQLALCHEMY_DATABASE_URI"] = database_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = build_engine_options(database_uri)
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "amp_secret_dev")
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "chave_jwt_segura")
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
