from flask import Blueprint, jsonify, request
from werkzeug.exceptions import HTTPException

from backend.api_utils import (
    error_response,
    get_or_404,
    http_error_response,
    internal_error,
    json_body,
)
from backend.extensions import db
from backend.models import Cliente
from backend.security import require_permissions

clientes_bp = Blueprint("clientes", __name__, url_prefix="/clientes")

CLIENTE_CAMPOS_TEXTO = [
    "documento",
    "telefone",
    "email",
    "endereco",
    "inscricao_estadual",
    "indicador_ie_destinatario",
    "logradouro",
    "numero",
    "complemento",
    "bairro",
    "codigo_municipio",
    "municipio",
    "uf",
    "cep",
    "codigo_pais",
    "pais",
]


def texto_limpo(data, campo):
    valor = data.get(campo)
    if valor is None:
        return None
    return str(valor).strip() or None


def aplicar_campos_cliente(cliente, data):
    for campo in CLIENTE_CAMPOS_TEXTO:
        if campo in data:
            valor = texto_limpo(data, campo)
            if campo == "email" and valor:
                valor = valor.lower()
            if campo == "uf" and valor:
                valor = valor.upper()[:2]
            setattr(cliente, campo, valor)


@clientes_bp.route("", methods=["GET"])
@require_permissions("clientes")
def listar_clientes():
    try:
        q = request.args.get("q", "").strip()
        query = Cliente.query
        if q:
            query = query.filter(
                db.or_(
                    Cliente.nome.ilike(f"%{q}%"),
                    Cliente.documento.ilike(f"%{q}%"),
                    Cliente.email.ilike(f"%{q}%"),
                    Cliente.inscricao_estadual.ilike(f"%{q}%"),
                    Cliente.bairro.ilike(f"%{q}%"),
                    Cliente.municipio.ilike(f"%{q}%"),
                    Cliente.uf.ilike(f"%{q}%"),
                    Cliente.cep.ilike(f"%{q}%"),
                )
            )
        return (
            jsonify(
                [cliente.to_dict() for cliente in query.order_by(Cliente.nome).all()]
            ),
            200,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@clientes_bp.route("", methods=["POST"])
@require_permissions("clientes")
def criar_cliente():
    try:
        data = json_body()
        nome_raw = data.get("nome", "")
        if not isinstance(nome_raw, str):
            return error_response("Nome deve ser texto.")
        nome = nome_raw.strip()
        if not nome:
            return error_response("Nome e obrigatorio.")
        cliente = Cliente(nome=nome)
        aplicar_campos_cliente(cliente, data)
        db.session.add(cliente)
        db.session.commit()
        return jsonify(cliente.to_dict()), 201
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@clientes_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("clientes")
def editar_cliente(id):
    try:
        cliente, error = get_or_404(Cliente, id, "Cliente nao encontrado.")
        if error:
            return error
        data = json_body()
        if "nome" in data:
            nome_raw = data["nome"]
            if not isinstance(nome_raw, str):
                return error_response("Nome deve ser texto.")
            nome = nome_raw.strip()
            if not nome:
                return error_response("Nome e obrigatorio.")
            cliente.nome = nome
        aplicar_campos_cliente(cliente, data)
        db.session.commit()
        return jsonify(cliente.to_dict()), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@clientes_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("clientes")
def excluir_cliente(id):
    try:
        cliente, error = get_or_404(Cliente, id, "Cliente nao encontrado.")
        if error:
            return error
        db.session.delete(cliente)
        db.session.commit()
        return jsonify({"mensagem": "Cliente excluido."}), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)
