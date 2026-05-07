import base64
import binascii
import contextlib
import os
import sqlite3
from datetime import datetime
from pathlib import Path

from flask import Blueprint, current_app, jsonify, send_file
from sqlalchemy.engine.url import make_url

from backend.api_utils import json_body
from backend.config import get_runtime_data_dir
from backend.extensions import db
from backend.security import require_permissions

sistema_bp = Blueprint("sistema", __name__, url_prefix="/sistema")

ALLOWED_RESTORE_SUFFIXES = {".sqlite3", ".db", ".bak"}
DEFAULT_MAX_BACKUP_BYTES = 50 * 1024 * 1024
REQUIRED_BACKUP_TABLES = {
    "usuarios",
    "clientes",
    "lancamentos",
    "ordens_servico",
    "orcamentos",
}


def _max_backup_bytes():
    try:
        return int(os.getenv("BACKUP_MAX_BYTES", DEFAULT_MAX_BACKUP_BYTES))
    except ValueError:
        return DEFAULT_MAX_BACKUP_BYTES


def _sqlite_db_path():
    database_uri = current_app.config.get("SQLALCHEMY_DATABASE_URI", "")
    if not database_uri.startswith("sqlite"):
        return None
    database = make_url(database_uri).database
    if not database:
        return None
    return Path(database).resolve()


def _backup_dir():
    backup_dir = get_runtime_data_dir() / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    return backup_dir


def _copy_sqlite_database(source_path, target_path):
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(source_path) as source_conn:
        with sqlite3.connect(target_path) as target_conn:
            source_conn.backup(target_conn)


def _validate_backup_schema(conn):
    tabelas = {
        row[0]
        for row in conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table'"
        ).fetchall()
    }
    faltando = sorted(REQUIRED_BACKUP_TABLES - tabelas)
    if faltando:
        return "Backup nao contem o schema minimo do ERP."
    return None


def _ensure_local_sqlite():
    db_path = _sqlite_db_path()
    if not db_path or not db_path.exists():
        msg = "Backup local disponivel apenas para o banco SQLite " "do app desktop."
        return None, (jsonify({"erro": msg}), 400)
    return db_path, None


@sistema_bp.route("/backup-info", methods=["GET"])
@require_permissions("backup")
def backup_info():
    db_path = _sqlite_db_path()
    if not db_path or not db_path.exists():
        msg = (
            "O backup automatico desta tela funciona apenas "
            "quando o sistema usa o banco local SQLite."
        )
        return (
            jsonify(
                {"modo": "externo", "suporta_backup_local": False, "mensagem": msg}
            ),
            200,
        )

    backup_dir = _backup_dir()
    return (
        jsonify(
            {
                "modo": "sqlite_local",
                "suporta_backup_local": True,
                "banco": db_path.name,
                "pasta_backups": backup_dir.name,
                "tamanho_maximo_mb": round(_max_backup_bytes() / (1024 * 1024), 1),
                "ultima_atualizacao": datetime.fromtimestamp(
                    db_path.stat().st_mtime
                ).isoformat(),
            }
        ),
        200,
    )


@sistema_bp.route("/backup", methods=["POST"])
@require_permissions("backup")
def criar_backup():
    db_path, error = _ensure_local_sqlite()
    if error:
        return error
    if db_path.stat().st_size > _max_backup_bytes():
        return (
            jsonify({"erro": "Banco local excede o tamanho maximo para backup."}),
            413,
        )

    db.session.remove()
    db.engine.dispose()

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_name = f"amp-backup-{timestamp}.sqlite3"
    backup_path = _backup_dir() / backup_name
    _copy_sqlite_database(db_path, backup_path)

    return send_file(
        backup_path,
        as_attachment=True,
        download_name=backup_name,
        mimetype="application/octet-stream",
    )


@sistema_bp.route("/restaurar", methods=["POST"])
@require_permissions("backup")
def restaurar_backup():
    db_path, error = _ensure_local_sqlite()
    if error:
        return error

    data = json_body()
    arquivo_base64 = data.get("arquivo_base64", "")
    nome_arquivo = (data.get("nome_arquivo") or "backup.sqlite3").strip()

    if not isinstance(arquivo_base64, str) or not arquivo_base64:
        return jsonify({"erro": "Nenhum arquivo de backup enviado."}), 400
    if len(arquivo_base64) > (_max_backup_bytes() * 4 // 3) + 8:
        return jsonify({"erro": "Arquivo de backup excede o tamanho maximo."}), 413

    suffix = Path(nome_arquivo).suffix.lower()
    if suffix and suffix not in ALLOWED_RESTORE_SUFFIXES:
        return (
            jsonify(
                {
                    "erro": "Use um arquivo de backup SQLite valido (.sqlite3, .db ou .bak)."
                }
            ),
            400,
        )

    try:
        payload = base64.b64decode(arquivo_base64, validate=True)
    except (binascii.Error, ValueError):
        return jsonify({"erro": "Arquivo de backup invalido ou corrompido."}), 400
    if len(payload) > _max_backup_bytes():
        return jsonify({"erro": "Arquivo de backup excede o tamanho maximo."}), 413

    backup_dir = _backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    temp_restore_path = backup_dir / f"restore-temp-{timestamp}.sqlite3"
    safety_backup_path = backup_dir / f"antes-da-restauracao-{timestamp}.sqlite3"

    try:
        temp_restore_path.write_bytes(payload)
        with sqlite3.connect(temp_restore_path) as conn:
            status = conn.execute("PRAGMA integrity_check").fetchone()[0]
            if status != "ok":
                msg = (
                    "O arquivo informado nao passou na validacao de "
                    "integridade do SQLite."
                )
                return (jsonify({"erro": msg}), 400)
            schema_error = _validate_backup_schema(conn)
            if schema_error:
                return jsonify({"erro": schema_error}), 400

        db.session.remove()
        db.engine.dispose()
        _copy_sqlite_database(db_path, safety_backup_path)
        _copy_sqlite_database(temp_restore_path, db_path)
    finally:
        if temp_restore_path.exists():
            with contextlib.suppress(PermissionError, FileNotFoundError):
                temp_restore_path.unlink()

    return (
        jsonify(
            {
                "mensagem": "Backup restaurado com sucesso.",
                "backup_seguranca": safety_backup_path.name,
            }
        ),
        200,
    )
