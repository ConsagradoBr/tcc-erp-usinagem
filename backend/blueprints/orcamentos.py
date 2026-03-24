from datetime import date

from flask import Blueprint, jsonify, request

from backend.api_utils import (error_response, get_or_404, internal_error,
                               json_body)
from backend.extensions import db
from backend.models import STATUS_ORCAMENTO_VALIDOS, Cliente, Orcamento
from backend.security import require_permissions
from backend.services import (garantir_lancamento_para_orcamento,
                              garantir_os_para_orcamento,
                              proximo_numero_orcamento,
                              serializar_orcamento_integrado)

orc_bp = Blueprint("orcamentos", __name__, url_prefix="/orcamentos")


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
    except Exception as exc:
        return internal_error(exc)


@orc_bp.route("/resumo", methods=["GET"])
@require_permissions("orcamentos")
def resumo_orcamentos():
    try:
        todos = Orcamento.query.all()
        resultado = {
            status: Orcamento.query.filter_by(status=status).count()
            for status in STATUS_ORCAMENTO_VALIDOS
        }
        resultado["total"] = len(todos)
        resultado["valor_total"] = round(
            sum(float(orcamento.valor) for orcamento in todos), 2
        )
        resultado["valor_aprovado"] = round(
            sum(
                float(orcamento.valor)
                for orcamento in todos
                if orcamento.status == "aprovado"
            ),
            2,
        )
        return jsonify(resultado), 200
    except Exception as exc:
        return internal_error(exc)


@orc_bp.route("", methods=["POST"])
@require_permissions("orcamentos")
def criar_orcamento():
    try:
        data = json_body()
        titulo = (data.get("titulo") or "").strip()
        cliente_id = data.get("cliente_id")
        valor = float(data.get("valor") or 0)
        if not cliente_id:
            return error_response("Cliente é obrigatório.")
        if not db.session.get(Cliente, cliente_id):
            return error_response("Cliente não encontrado.", 404)
        if not titulo:
            return error_response("Título é obrigatório.")
        if valor <= 0:
            return error_response("Valor deve ser maior que zero.")
        status = data.get("status", "rascunho")
        if status not in STATUS_ORCAMENTO_VALIDOS:
            status = "rascunho"
        orcamento = Orcamento(
            numero=data.get("numero") or proximo_numero_orcamento(),
            cliente_id=cliente_id,
            titulo=titulo,
            descricao=(data.get("descricao") or "").strip() or None,
            valor=valor,
            validade=(
                date.fromisoformat(data["validade"]) if data.get("validade") else None
            ),
            status=status,
            observacao=(data.get("observacao") or "").strip() or None,
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
    except ValueError:
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
            cliente_id = data["cliente_id"]
            if not cliente_id:
                return error_response("Cliente é obrigatório.")
            if not db.session.get(Cliente, cliente_id):
                return error_response("Cliente não encontrado.", 404)
            orcamento.cliente_id = cliente_id
        if "titulo" in data:
            titulo = (data["titulo"] or "").strip()
            if not titulo:
                return error_response("Título é obrigatório.")
            orcamento.titulo = titulo
        if "descricao" in data:
            orcamento.descricao = (data["descricao"] or "").strip() or None
        if "valor" in data:
            valor = float(data["valor"] or 0)
            if valor <= 0:
                return error_response("Valor deve ser maior que zero.")
            orcamento.valor = valor
        if "validade" in data:
            orcamento.validade = (
                date.fromisoformat(data["validade"]) if data["validade"] else None
            )
        if "status" in data and data["status"] in STATUS_ORCAMENTO_VALIDOS:
            orcamento.status = data["status"]
        if "observacao" in data:
            orcamento.observacao = (data["observacao"] or "").strip() or None
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
    except ValueError:
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
    except Exception as exc:
        return internal_error(exc)
