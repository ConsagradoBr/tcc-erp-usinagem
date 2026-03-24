import base64
import contextlib
import sqlite3
from datetime import datetime
from pathlib import Path

from flask import Blueprint, current_app, jsonify, request, send_file
from sqlalchemy.engine.url import make_url

from backend.config import get_runtime_data_dir
from backend.extensions import db
from backend.security import require_permissions

sistema_bp = Blueprint("sistema", __name__, url_prefix="/sistema")

ALLOWED_RESTORE_SUFFIXES = {".sqlite3", ".db", ".bak"}


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


def _ensure_local_sqlite():
    db_path = _sqlite_db_path()
    if not db_path or not db_path.exists():
        return None, (jsonify({"erro": "Backup local disponivel apenas para o banco SQLite do app desktop."}), 400)
    return db_path, None


@sistema_bp.route("/backup-info", methods=["GET"])
@require_permissions("backup")
def backup_info():
    db_path = _sqlite_db_path()
    if not db_path or not db_path.exists():
        return jsonify({
            "modo": "externo",
            "suporta_backup_local": False,
            "mensagem": "O backup automatico desta tela funciona apenas quando o sistema usa o banco local SQLite.",
        }), 200

    backup_dir = _backup_dir()
    return jsonify({
        "modo": "sqlite_local",
        "suporta_backup_local": True,
        "caminho_banco": str(db_path),
        "pasta_backups": str(backup_dir),
        "ultima_atualizacao": datetime.fromtimestamp(db_path.stat().st_mtime).isoformat(),
    }), 200


@sistema_bp.route("/backup", methods=["POST"])
@require_permissions("backup")
def criar_backup():
    db_path, error = _ensure_local_sqlite()
    if error:
        return error

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

    data = request.get_json() or {}
    arquivo_base64 = data.get("arquivo_base64", "")
    nome_arquivo = (data.get("nome_arquivo") or "backup.sqlite3").strip()

    if not arquivo_base64:
        return jsonify({"erro": "Nenhum arquivo de backup enviado."}), 400

    suffix = Path(nome_arquivo).suffix.lower()
    if suffix and suffix not in ALLOWED_RESTORE_SUFFIXES:
        return jsonify({"erro": "Use um arquivo de backup SQLite valido (.sqlite3, .db ou .bak)."}), 400

    try:
        payload = base64.b64decode(arquivo_base64)
    except Exception:
        return jsonify({"erro": "Arquivo de backup invalido ou corrompido."}), 400

    backup_dir = _backup_dir()
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    temp_restore_path = backup_dir / f"restore-temp-{timestamp}.sqlite3"
    safety_backup_path = backup_dir / f"antes-da-restauracao-{timestamp}.sqlite3"

    try:
        temp_restore_path.write_bytes(payload)
        with sqlite3.connect(temp_restore_path) as conn:
            status = conn.execute("PRAGMA integrity_check").fetchone()[0]
            if status != "ok":
                return jsonify({"erro": "O arquivo informado nao passou na validacao de integridade do SQLite."}), 400

        db.session.remove()
        db.engine.dispose()
        _copy_sqlite_database(db_path, safety_backup_path)
        _copy_sqlite_database(temp_restore_path, db_path)
    finally:
        if temp_restore_path.exists():
            with contextlib.suppress(PermissionError, FileNotFoundError):
                temp_restore_path.unlink()

    return jsonify({
        "mensagem": "Backup restaurado com sucesso.",
        "backup_seguranca": str(safety_backup_path),
        "caminho_banco": str(db_path),
    }), 200

