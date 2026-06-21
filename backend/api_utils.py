"""Utility helpers for API layer.

Provides validation, pagination, error envelopes, and decorators
used across all Flask blueprints.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from functools import wraps
from typing import Any, Callable, Optional, TypeVar

from flask import Response, jsonify, request
from flask_sqlalchemy.query import Query
from werkzeug.exceptions import BadRequest, HTTPException

from backend.extensions import db

T = TypeVar("T")

# ---------------------------------------------------------------------------
# Standardized response envelope
# ---------------------------------------------------------------------------

APP_VERSION = "2.0.0"


def error_response(message: str, status: int = 400) -> tuple[Response, int]:
    """Return a standardized error envelope.

    Format: ``{"error": {"code": "<STATUS_CODE>", "message": "..."}}``
    """
    code = _error_code_from_status(status)
    return (
        jsonify({"error": {"code": code, "message": message}}),
        status,
    )


def success_response(data: Any, status: int = 200) -> tuple[Response, int]:
    """Return a standardized success envelope.

    Format: ``{"data": <payload>}``
    """
    return jsonify({"data": data}), status


def paginated_response(
    items: list[Any],
    total: int,
    page: int,
    per_page: int,
) -> tuple[Response, int]:
    """Return a standardized paginated envelope.

    Format: ``{"data": [...], "meta": {"total": N, "page": N, "per_page": N, "pages": N}}``
    """
    pages = (total + per_page - 1) // per_page
    return (
        jsonify(
            {
                "data": items,
                "meta": {
                    "total": total,
                    "page": page,
                    "per_page": per_page,
                    "pages": pages,
                },
            }
        ),
        200,
    )


def _error_code_from_status(status: int) -> str:
    codes = {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        409: "CONFLICT",
        413: "PAYLOAD_TOO_LARGE",
        422: "UNPROCESSABLE_ENTITY",
        429: "RATE_LIMITED",
        500: "INTERNAL_ERROR",
    }
    return codes.get(status, "ERROR")


# ---------------------------------------------------------------------------
# Legacy response helpers (kept for backward compatibility)
# ---------------------------------------------------------------------------


def legacy_error_response(message: str, status: int = 400) -> tuple[Response, int]:
    """Legacy error format ``{"erro": "..."}`` — kept for frontend compat."""
    return jsonify({"erro": message}), status


def json_body() -> dict[str, Any]:
    """Parse and validate incoming JSON request body."""
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


def internal_error(exc: Exception) -> tuple[Response, int]:
    """Log and return a generic 500 error."""
    logging.exception("Erro interno.")
    return (
        jsonify({"error": {"code": "INTERNAL_ERROR", "message": "Erro interno."}}),
        500,
    )


def http_error_response(exc: HTTPException) -> tuple[Response, int]:
    """Convert a Werkzeug HTTPException into our error envelope."""
    if isinstance(exc, HTTPException):
        code = _error_code_from_status(exc.code or 500)
        return (
            jsonify({"error": {"code": code, "message": exc.description}}),
            exc.code or 500,
        )
    return internal_error(exc)


def get_or_404(
    model: type, entity_id: int, message: str
) -> tuple[Optional[Any], Optional[tuple[Response, int]]]:
    """Fetch a model instance by ID or return a 404 tuple."""
    entity = db.session.get(model, entity_id)
    if not entity:
        return None, error_response(message, 404)
    return entity, None


# ---------------------------------------------------------------------------
# Decorator: error handling
# ---------------------------------------------------------------------------


def handle_errors(fn: Callable[..., Any]) -> Callable[..., Any]:
    """Wrap a route to catch HTTPException and unexpected errors."""

    @wraps(fn)
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        try:
            return fn(*args, **kwargs)
        except HTTPException as exc:
            return http_error_response(exc)
        except Exception as exc:
            return internal_error(exc)

    return wrapper


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


def parse_pagination(args: Any) -> tuple[int, int]:
    """Extract ``page`` and ``per_page`` from query args with safe defaults."""
    try:
        page = max(int(args.get("page", 1)), 1)
        per_page = max(min(int(args.get("per_page", 50)), 200), 1)
    except (TypeError, ValueError):
        page, per_page = 1, 50
    return page, per_page


def pagination_response(
    query: Query,
    page: int,
    per_page: int,
    serialize_fn: Callable[..., Any],
) -> tuple[Response, int]:
    """Execute a paginated query and return ``{"items": [...], "total": ..., ...}``."""
    total = query.count()
    items = [
        serialize_fn(item)
        for item in query.offset((page - 1) * per_page).limit(per_page).all()
    ]
    pages = (total + per_page - 1) // per_page
    return (
        jsonify(
            {
                "items": items,
                "total": total,
                "page": page,
                "per_page": per_page,
                "pages": pages,
            }
        ),
        200,
    )


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------


def month_boundaries(
    ref_date: Optional[date] = None,
) -> tuple[date, date, date]:
    """Return ``(today, first_day_of_month, last_day_of_month)``."""
    hoje = ref_date or date.today()
    primeiro_dia = hoje.replace(day=1)
    if hoje.month == 12:
        ultimo_dia = date(hoje.year + 1, 1, 1) - timedelta(days=1)
    else:
        ultimo_dia = date(hoje.year, hoje.month + 1, 1) - timedelta(days=1)
    return hoje, primeiro_dia, ultimo_dia


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------


def texto_obrigatorio(
    value: Any, campo: str
) -> tuple[Optional[str], Optional[tuple[Response, int]]]:
    """Validate that *value* is a non-empty string."""
    if not isinstance(value, str):
        return None, error_response(f"{campo} deve ser texto.")
    texto = value.strip()
    if not texto:
        return None, error_response(f"{campo} e obrigatoria.")
    return texto, None


def texto_opcional(
    value: Any, campo: str
) -> tuple[Optional[str], Optional[tuple[Response, int]]]:
    """Validate *value* if provided, otherwise return ``None``."""
    if value is None:
        return None, None
    if not isinstance(value, str):
        return None, error_response(f"{campo} deve ser texto.")
    return value.strip() or None, None


def parse_int(
    value: Any,
    campo: str,
    minimo: Optional[int] = None,
    padrao: Optional[int] = None,
) -> tuple[Optional[int], Optional[tuple[Response, int]]]:
    """Parse *value* as int with optional minimum and default."""
    if value in (None, ""):
        value = padrao
    try:
        numero = int(value)
    except (TypeError, ValueError):
        return None, error_response(f"{campo} deve ser um numero inteiro.")
    if minimo is not None and numero < minimo:
        return None, error_response(f"{campo} deve ser maior ou igual a {minimo}.")
    return numero, None


def parse_valor_positivo(
    value: Any,
) -> tuple[Optional[float], Optional[tuple[Response, int]]]:
    """Parse *value* as a positive decimal with 2-digit precision."""
    try:
        valor = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None, error_response("Valor deve ser numerico.")
    if valor <= 0:
        return None, error_response("Valor deve ser maior que zero.")
    return float(valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)), None


def parse_data(
    value: Any,
    campo: str,
    obrigatorio: bool = False,
) -> tuple[Optional[date], Optional[tuple[Response, int]]]:
    """Parse *value* as ISO date (YYYY-MM-DD)."""
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


def parse_cliente_id(
    value: Any,
) -> tuple[Optional[int], Optional[tuple[Response, int]]]:
    """Validate and resolve a client FK, returning ``None`` if not provided."""
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
