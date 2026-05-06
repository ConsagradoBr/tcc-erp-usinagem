import logging

from flask import Blueprint, jsonify, request

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
    except Exception as exc:
        logging.error(f"Erro ao listar clientes: {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@clientes_bp.route("", methods=["POST"])
@require_permissions("clientes")
def criar_cliente():
    try:
        data = request.get_json() or {}
        nome = data.get("nome", "").strip()
        if not nome:
            return jsonify({"erro": "Nome e obrigatorio."}), 400
        cliente = Cliente(nome=nome)
        aplicar_campos_cliente(cliente, data)
        db.session.add(cliente)
        db.session.commit()
        return jsonify(cliente.to_dict()), 201
    except Exception as exc:
        logging.error(f"Erro ao criar cliente: {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@clientes_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("clientes")
def editar_cliente(id):
    try:
        cliente = Cliente.query.get_or_404(id)
        data = request.get_json() or {}
        cliente.nome = data.get("nome", cliente.nome).strip()
        aplicar_campos_cliente(cliente, data)
        db.session.commit()
        return jsonify(cliente.to_dict()), 200
    except Exception as exc:
        logging.error(f"Erro ao editar cliente: {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@clientes_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("clientes")
def excluir_cliente(id):
    try:
        cliente = Cliente.query.get_or_404(id)
        db.session.delete(cliente)
        db.session.commit()
        return jsonify({"mensagem": "Cliente excluido."}), 200
    except Exception as exc:
        logging.error(f"Erro ao excluir cliente: {exc}")
        return jsonify({"erro": "Erro interno."}), 500
