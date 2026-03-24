import logging

from flask import Blueprint, jsonify, request

from backend.extensions import db
from backend.models import OrdemServico, STATUS_OS_VALIDOS
from backend.security import require_permissions
from backend.services import proximo_numero_os

os_bp = Blueprint("ordens_servico", __name__, url_prefix="/ordens-servico")


@os_bp.route("", methods=["GET"])
@require_permissions("ordens_servico")
def listar_os():
    try:
        status = request.args.get("status", "").strip()
        q = request.args.get("q", "").strip()
        query = OrdemServico.query
        if status and status in STATUS_OS_VALIDOS:
            query = query.filter(OrdemServico.status == status)
        if q:
            query = query.filter(db.or_(OrdemServico.numero.ilike(f"%{q}%"), OrdemServico.cliente.ilike(f"%{q}%"), OrdemServico.servico.ilike(f"%{q}%")))
        return jsonify([ordem.to_dict() for ordem in query.order_by(OrdemServico.created_at.asc()).all()]), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@os_bp.route("/resumo", methods=["GET"])
@require_permissions("ordens_servico")
def resumo_os():
    try:
        resultado = {status: OrdemServico.query.filter_by(status=status).count() for status in STATUS_OS_VALIDOS}
        resultado["total"] = OrdemServico.query.count()
        return jsonify(resultado), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@os_bp.route("", methods=["POST"])
@require_permissions("ordens_servico")
def criar_os():
    try:
        data = request.get_json() or {}
        cliente = (data.get("cliente") or "").strip()
        servico = (data.get("servico") or "").strip()
        if not cliente or not servico:
            return jsonify({"erro": "Cliente e serviço são obrigatórios."}), 400
        status = data.get("status", "solicitado")
        if status not in STATUS_OS_VALIDOS:
            status = "solicitado"
        ordem = OrdemServico(numero=data.get("numero") or proximo_numero_os(), cliente=cliente, servico=servico, prioridade=data.get("prioridade", "media"), prazo=(data.get("prazo") or "").strip() or None, responsavel=(data.get("responsavel") or "").strip() or None, descricao=(data.get("descricao") or "").strip() or None, status=status)
        db.session.add(ordem)
        db.session.commit()
        return jsonify(ordem.to_dict()), 201
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@os_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("ordens_servico")
def editar_os(id):
    try:
        ordem = OrdemServico.query.get_or_404(id)
        data = request.get_json() or {}
        if "cliente" in data:
            ordem.cliente = data["cliente"].strip()
        if "servico" in data:
            ordem.servico = data["servico"].strip()
        if "prioridade" in data:
            ordem.prioridade = data["prioridade"]
        if "prazo" in data:
            ordem.prazo = data["prazo"].strip() or None
        if "responsavel" in data:
            ordem.responsavel = (data["responsavel"] or "").strip() or None
        if "descricao" in data:
            ordem.descricao = (data["descricao"] or "").strip() or None
        if "status" in data and data["status"] in STATUS_OS_VALIDOS:
            ordem.status = data["status"]
        db.session.commit()
        return jsonify(ordem.to_dict()), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@os_bp.route("/<int:id>/status", methods=["PATCH"])
@require_permissions("ordens_servico")
def mover_os(id):
    try:
        ordem = OrdemServico.query.get_or_404(id)
        data = request.get_json() or {}
        status = data.get("status", "")
        if status not in STATUS_OS_VALIDOS:
            return jsonify({"erro": "Status inválido."}), 400
        ordem.status = status
        db.session.commit()
        return jsonify(ordem.to_dict()), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@os_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("ordens_servico")
def excluir_os(id):
    try:
        ordem = OrdemServico.query.get_or_404(id)
        db.session.delete(ordem)
        db.session.commit()
        return jsonify({"mensagem": "OS excluída."}), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500

