import logging

from flask import jsonify, request
from werkzeug.exceptions import BadRequest, HTTPException

from backend.extensions import db


def json_body():
    if not request.get_data(cache=True):
        return {}
    if not request.is_json:
        raise BadRequest("Content-Type deve ser application/json.")
    try:
        data = request.get_json()
    except BadRequest as exc:
        raise BadRequest("JSON invalido.") from exc
    if not isinstance(data, dict):
        raise BadRequest("JSON deve ser um objeto.")
    return data


def error_response(message, status=400):
    return jsonify({"erro": message}), status


def internal_error(exc):
    logging.exception("Erro interno.")
    return jsonify({"erro": "Erro interno."}), 500


def http_error_response(exc):
    if isinstance(exc, HTTPException):
        return jsonify({"erro": exc.description}), exc.code or 500
    return internal_error(exc)


def get_or_404(model, entity_id, message):
    entity = db.session.get(model, entity_id)
    if not entity:
        return None, error_response(message, 404)
    return entity, None
