import logging

from flask import jsonify, request

from backend.extensions import db


def json_body():
    return request.get_json() or {}


def error_response(message, status=400):
    return jsonify({"erro": message}), status


def internal_error(exc):
    logging.error(f"❌ {exc}")
    return jsonify({"erro": "Erro interno."}), 500


def get_or_404(model, entity_id, message):
    entity = db.session.get(model, entity_id)
    if not entity:
        return None, error_response(message, 404)
    return entity, None
