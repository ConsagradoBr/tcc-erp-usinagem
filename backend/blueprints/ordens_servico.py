from flask import Blueprint, jsonify, request
from werkzeug.exceptions import HTTPException

from backend.api_utils import (
    error_response,
    get_or_404,
    http_error_response,
    internal_error,
    json_body,
    parse_pagination,
    texto_obrigatorio,
    texto_opcional,
)
from backend.extensions import db
from backend.models import STATUS_OS_VALIDOS, OrdemServico
from backend.security import require_permissions
from backend.services import proximo_numero_os

os_bp = Blueprint("ordens_servico", __name__, url_prefix="/ordens-servico")


@os_bp.route("", methods=["GET"])
@require_permissions("ordens_servico")
def listar_os():
    try:
        status = request.args.get("status", "").strip()
        q = request.args.get("q", "").strip()
        page, per_page = parse_pagination(request.args)
        query = OrdemServico.query
        if status and status in STATUS_OS_VALIDOS:
            query = query.filter(OrdemServico.status == status)
        if q:
            query = query.filter(
                db.or_(
                    OrdemServico.numero.ilike(f"%{q}%"),
                    OrdemServico.cliente.ilike(f"%{q}%"),
                    OrdemServico.servico.ilike(f"%{q}%"),
                )
            )
        total = query.count()
        items = [
            ordem.to_dict()
            for ordem in query.order_by(OrdemServico.created_at.asc())
            .offset((page - 1) * per_page)
            .limit(per_page)
            .all()
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
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@os_bp.route("/<int:id>", methods=["GET"])
@require_permissions("ordens_servico")
def obter_os(id):
    try:
        ordem, error = get_or_404(OrdemServico, id, "OS nao encontrada.")
        if error:
            return error
        return jsonify(ordem.to_dict()), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@os_bp.route("/resumo", methods=["GET"])
@require_permissions("ordens_servico")
def resumo_os():
    try:
        resultado = {
            status: OrdemServico.query.filter_by(status=status).count()
            for status in STATUS_OS_VALIDOS
        }
        resultado["total"] = OrdemServico.query.count()
        return jsonify(resultado), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@os_bp.route("", methods=["POST"])
@require_permissions("ordens_servico")
def criar_os():
    try:
        data = json_body()
        cliente, error = texto_obrigatorio(data.get("cliente") or "", "Cliente")
        if error:
            return error
        servico, error = texto_obrigatorio(data.get("servico") or "", "Servico")
        if error:
            return error
        prazo, error = texto_opcional(data.get("prazo"), "Prazo")
        if error:
            return error
        responsavel, error = texto_opcional(data.get("responsavel"), "Responsavel")
        if error:
            return error
        descricao, error = texto_opcional(data.get("descricao"), "Descricao")
        if error:
            return error
        status = data.get("status", "solicitado")
        if status not in STATUS_OS_VALIDOS:
            status = "solicitado"
        ordem = OrdemServico(
            numero=data.get("numero") or proximo_numero_os(),
            cliente=cliente,
            servico=servico,
            prioridade=data.get("prioridade", "media"),
            prazo=prazo,
            responsavel=responsavel,
            descricao=descricao,
            status=status,
        )
        db.session.add(ordem)
        db.session.commit()
        return jsonify(ordem.to_dict()), 201
    except HTTPException as exc:
        return http_error_response(exc)
    except (TypeError, ValueError):
        return error_response("Dados invalidos para ordem de servico.")
    except Exception as exc:
        return internal_error(exc)


@os_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("ordens_servico")
def editar_os(id):
    try:
        ordem, error = get_or_404(OrdemServico, id, "OS nao encontrada.")
        if error:
            return error
        data = json_body()
        if "cliente" in data:
            cliente, error = texto_obrigatorio(data["cliente"], "Cliente")
            if error:
                return error
            ordem.cliente = cliente
        if "servico" in data:
            servico, error = texto_obrigatorio(data["servico"], "Servico")
            if error:
                return error
            ordem.servico = servico
        if "prioridade" in data:
            ordem.prioridade = data["prioridade"]
        if "prazo" in data:
            prazo, error = texto_opcional(data["prazo"], "Prazo")
            if error:
                return error
            ordem.prazo = prazo
        if "responsavel" in data:
            responsavel, error = texto_opcional(data["responsavel"], "Responsavel")
            if error:
                return error
            ordem.responsavel = responsavel
        if "descricao" in data:
            descricao, error = texto_opcional(data["descricao"], "Descricao")
            if error:
                return error
            ordem.descricao = descricao
        if "status" in data and data["status"] in STATUS_OS_VALIDOS:
            ordem.status = data["status"]
        db.session.commit()
        return jsonify(ordem.to_dict()), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except (TypeError, ValueError):
        return error_response("Dados invalidos para ordem de servico.")
    except Exception as exc:
        return internal_error(exc)


@os_bp.route("/<int:id>/status", methods=["PATCH"])
@require_permissions("ordens_servico")
def mover_os(id):
    try:
        ordem, error = get_or_404(OrdemServico, id, "OS nao encontrada.")
        if error:
            return error
        data = json_body()
        status = data.get("status", "")
        if status not in STATUS_OS_VALIDOS:
            return error_response("Status inválido.")
        ordem.status = status
        db.session.commit()
        return jsonify(ordem.to_dict()), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@os_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("ordens_servico")
def excluir_os(id):
    try:
        ordem, error = get_or_404(OrdemServico, id, "OS nao encontrada.")
        if error:
            return error
        db.session.delete(ordem)
        db.session.commit()
        return jsonify({"mensagem": "OS excluída."}), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)
