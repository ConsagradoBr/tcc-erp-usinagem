import logging

from flask import Blueprint, jsonify, request

from backend.extensions import db
from backend.models import Cliente
from backend.security import require_permissions

clientes_bp = Blueprint("clientes", __name__, url_prefix="/clientes")


@clientes_bp.route("", methods=["GET"])
@require_permissions("clientes")
def listar_clientes():
    try:
        q = request.args.get("q", "").strip()
        query = Cliente.query
        if q:
            query = query.filter(db.or_(Cliente.nome.ilike(f"%{q}%"), Cliente.documento.ilike(f"%{q}%"), Cliente.email.ilike(f"%{q}%")))
        return jsonify([cliente.to_dict() for cliente in query.order_by(Cliente.nome).all()]), 200
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
        cliente = Cliente(nome=nome, documento=data.get("documento", "").strip() or None, telefone=data.get("telefone", "").strip() or None, email=(data.get("email", "").strip().lower()) or None, endereco=data.get("endereco", "").strip() or None)
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
        cliente.documento = data.get("documento", cliente.documento)
        cliente.telefone = data.get("telefone", cliente.telefone)
        cliente.email = data.get("email", cliente.email)
        cliente.endereco = data.get("endereco", cliente.endereco)
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
