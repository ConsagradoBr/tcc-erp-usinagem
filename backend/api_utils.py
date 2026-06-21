import logging
from datetime import date
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

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


def parse_pagination(args):
    try:
        page = max(int(args.get("page", 1)), 1)
        per_page = max(min(int(args.get("per_page", 50)), 200), 1)
    except (TypeError, ValueError):
        page, per_page = 1, 50
    return page, per_page


def pagination_response(query, page, per_page, serialize_fn):
    total = query.count()
    items = [serialize_fn(item) for item in query.offset((page - 1) * per_page).limit(per_page).all()]
    pages = (total + per_page - 1) // per_page
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page, "pages": pages}), 200


def texto_obrigatorio(value, campo):
    if not isinstance(value, str):
        return None, error_response(f"{campo} deve ser texto.")
    texto = value.strip()
    if not texto:
        return None, error_response(f"{campo} e obrigatoria.")
    return texto, None


def texto_opcional(value, campo):
    if value is None:
        return None, None
    if not isinstance(value, str):
        return None, error_response(f"{campo} deve ser texto.")
    return value.strip() or None, None


def parse_int(value, campo, minimo=None, padrao=None):
    if value in (None, ""):
        value = padrao
    try:
        numero = int(value)
    except (TypeError, ValueError):
        return None, error_response(f"{campo} deve ser um numero inteiro.")
    if minimo is not None and numero < minimo:
        return None, error_response(f"{campo} deve ser maior ou igual a {minimo}.")
    return numero, None


def parse_valor_positivo(value):
    try:
        valor = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None, error_response("Valor deve ser numerico.")
    if valor <= 0:
        return None, error_response("Valor deve ser maior que zero.")
    return float(valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)), None


def parse_data(value, campo, obrigatorio=False):
    if value in (None, ""):
        if obrigatorio:
            return None, error_response(f"{campo} e obrigatoria.")
        return None, None
    if not isinstance(value, str):
        return None, error_response(f"{campo} deve usar YYYY-MM-DD.")
    try:
        return date.fromisoformat(value), None
    except ValueError:
        return None, error_response(f"{campo} invalida. Use YYYY-MM-DD.")


def parse_cliente_id(value):
    if value in (None, ""):
        return None, None
    try:
        cliente_id = int(value)
    except (TypeError, ValueError):
        return None, error_response("Cliente invalido.")
    if cliente_id <= 0:
        return None, error_response("Cliente invalido.")
    from backend.models import Cliente
    if not db.session.get(Cliente, cliente_id):
        return None, error_response("Cliente nao encontrado.", 404)
    return cliente_id, None
