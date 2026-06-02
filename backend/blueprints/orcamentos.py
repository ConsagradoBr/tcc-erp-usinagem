from datetime import date

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
from backend.models import STATUS_ORCAMENTO_VALIDOS, Cliente, Lancamento, Orcamento
from backend.security import require_permissions
from backend.services import (
    garantir_lancamento_para_orcamento,
    garantir_os_para_orcamento,
    marcador_orcamento,
    proximo_numero_orcamento,
    serializar_orcamento_integrado,
)

orc_bp = Blueprint("orcamentos", __name__, url_prefix="/orcamentos")


def _parse_cliente_id(value):
    try:
        cliente_id = int(value)
    except (TypeError, ValueError):
        return None
    return cliente_id if cliente_id > 0 else None


def _texto_obrigatorio(value):
    if not isinstance(value, str):
        return None
    return value.strip()


def _texto_opcional(value):
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError
    return value.strip() or None


def _parse_valor_positivo(value):
    try:
        valor = float(value or 0)
    except (TypeError, ValueError):
        return None, error_response("Valor deve ser numerico.")
    if valor <= 0:
        return None, error_response("Valor deve ser maior que zero.")
    return valor, None


def _parse_validade(value):
    if not value:
        return None, None
    if not isinstance(value, str):
        return None, error_response("Validade deve usar YYYY-MM-DD.")
    try:
        return date.fromisoformat(value), None
    except ValueError:
        return None, error_response("Validade invalida. Use YYYY-MM-DD.")


@orc_bp.route("", methods=["GET"])
@require_permissions("orcamentos")
def listar_orcamentos():
    try:
        status = request.args.get("status", "").strip()
        q = request.args.get("q", "").strip()
        query = Orcamento.query.join(Cliente)
        if status and status in STATUS_ORCAMENTO_VALIDOS:
            query = query.filter(Orcamento.status == status)
        if q:
            query = query.filter(
                db.or_(
                    Orcamento.numero.ilike(f"%{q}%"),
                    Orcamento.titulo.ilike(f"%{q}%"),
                    Cliente.nome.ilike(f"%{q}%"),
                )
            )
        return (
            jsonify(
                [
                    orcamento.to_dict()
                    for orcamento in query.order_by(Orcamento.created_at.desc()).all()
                ]
            ),
            200,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@orc_bp.route("/resumo", methods=["GET"])
@require_permissions("orcamentos")
def resumo_orcamentos():
    try:
        resultado = {
            status: Orcamento.query.filter_by(status=status).count()
            for status in STATUS_ORCAMENTO_VALIDOS
        }
        resultado["total"] = Orcamento.query.count()
        resultado["valor_total"] = round(float(
            db.session.query(db.func.coalesce(db.func.sum(Orcamento.valor), 0))
            .scalar() or 0
        ), 2)
        resultado["valor_aprovado"] = round(float(
            db.session.query(db.func.coalesce(db.func.sum(Orcamento.valor), 0))
            .filter(Orcamento.status == "aprovado")
            .scalar() or 0
        ), 2)
        open_subq = (
            db.session.query(Lancamento.id)
            .filter(
                Lancamento.tipo == "receber",
                Lancamento.data_pagamento.is_(None),
                Lancamento.descricao.like(
                    db.func.concat("%[ORC:", Orcamento.numero, "]%")
                ),
            )
            .exists()
        )
        resultado["valor_aprovado_ativo"] = round(float(
            db.session.query(db.func.coalesce(db.func.sum(Orcamento.valor), 0))
            .filter(Orcamento.status == "aprovado", open_subq)
            .scalar() or 0
        ), 2)
        return jsonify(resultado), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@orc_bp.route("", methods=["POST"])
@require_permissions("orcamentos")
def criar_orcamento():
    try:
        data = json_body()
        titulo = _texto_obrigatorio(data.get("titulo") or "")
        cliente_id = _parse_cliente_id(data.get("cliente_id"))
        valor, error = _parse_valor_positivo(data.get("valor"))
        if error:
            return error
        validade, error = _parse_validade(data.get("validade"))
        if error:
            return error
        if not cliente_id:
            return error_response("Cliente é obrigatório.")
        if not db.session.get(Cliente, cliente_id):
            return error_response("Cliente não encontrado.", 404)
        if not titulo:
            return error_response("Título é obrigatório.")
        status = data.get("status", "rascunho")
        if status not in STATUS_ORCAMENTO_VALIDOS:
            status = "rascunho"
        orcamento = Orcamento(
            numero=data.get("numero") or proximo_numero_orcamento(),
            cliente_id=cliente_id,
            titulo=titulo,
            descricao=_texto_opcional(data.get("descricao")),
            valor=valor,
            validade=validade,
            status=status,
            observacao=_texto_opcional(data.get("observacao")),
        )
        db.session.add(orcamento)
        ordem_servico, ordem_servico_criada = garantir_os_para_orcamento(orcamento)
        lancamento, lancamento_criado = garantir_lancamento_para_orcamento(orcamento)
        db.session.commit()
        return (
            jsonify(
                serializar_orcamento_integrado(
                    orcamento,
                    ordem_servico,
                    ordem_servico_criada,
                    lancamento,
                    lancamento_criado,
                )
            ),
            201,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except (TypeError, ValueError):
        return error_response("Dados inválidos para orçamento.")
    except Exception as exc:
        return internal_error(exc)


@orc_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("orcamentos")
def editar_orcamento(id):
    try:
        orcamento, error = get_or_404(Orcamento, id, "Orçamento não encontrado.")
        if error:
            return error
        data = json_body()
        if "cliente_id" in data:
            cliente_id = _parse_cliente_id(data["cliente_id"])
            if not cliente_id:
                return error_response("Cliente é obrigatório.")
            if not db.session.get(Cliente, cliente_id):
                return error_response("Cliente não encontrado.", 404)
            orcamento.cliente_id = cliente_id
        if "titulo" in data:
            titulo = _texto_obrigatorio(data["titulo"])
            if not titulo:
                return error_response("Título é obrigatório.")
            orcamento.titulo = titulo
        if "descricao" in data:
            orcamento.descricao = _texto_opcional(data["descricao"])
        if "valor" in data:
            valor, error = _parse_valor_positivo(data["valor"])
            if error:
                return error
            orcamento.valor = valor
        if "validade" in data:
            validade, error = _parse_validade(data["validade"])
            if error:
                return error
            orcamento.validade = validade
        if "status" in data and data["status"] in STATUS_ORCAMENTO_VALIDOS:
            orcamento.status = data["status"]
        if "observacao" in data:
            orcamento.observacao = _texto_opcional(data["observacao"])
        ordem_servico, ordem_servico_criada = garantir_os_para_orcamento(orcamento)
        lancamento, lancamento_criado = garantir_lancamento_para_orcamento(orcamento)
        db.session.commit()
        return (
            jsonify(
                serializar_orcamento_integrado(
                    orcamento,
                    ordem_servico,
                    ordem_servico_criada,
                    lancamento,
                    lancamento_criado,
                )
            ),
            200,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except (TypeError, ValueError):
        return error_response("Dados inválidos para orçamento.")
    except Exception as exc:
        return internal_error(exc)


@orc_bp.route("/<int:id>/status", methods=["PATCH"])
@require_permissions("orcamentos")
def alterar_status_orcamento(id):
    try:
        orcamento, error = get_or_404(Orcamento, id, "Orçamento não encontrado.")
        if error:
            return error
        data = json_body()
        status = data.get("status", "")
        if status not in STATUS_ORCAMENTO_VALIDOS:
            return error_response("Status inválido.")
        orcamento.status = status
        ordem_servico, ordem_servico_criada = garantir_os_para_orcamento(orcamento)
        lancamento, lancamento_criado = garantir_lancamento_para_orcamento(orcamento)
        db.session.commit()
        return (
            jsonify(
                serializar_orcamento_integrado(
                    orcamento,
                    ordem_servico,
                    ordem_servico_criada,
                    lancamento,
                    lancamento_criado,
                )
            ),
            200,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@orc_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("orcamentos")
def excluir_orcamento(id):
    try:
        orcamento, error = get_or_404(Orcamento, id, "Orçamento não encontrado.")
        if error:
            return error
        db.session.delete(orcamento)
        db.session.commit()
        return jsonify({"mensagem": "Orçamento excluído."}), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)
