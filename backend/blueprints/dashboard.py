from flask import Blueprint, jsonify

from backend.api_utils import handle_errors, month_boundaries
from backend.extensions import db
from backend.models import (
    Cliente,
    Lancamento,
    Orcamento,
    OrdemServico,
    STATUS_ORCAMENTO_VALIDOS,
    STATUS_OS_VALIDOS,
)
from backend.security import require_permissions

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


def _resumo_financeiro(primeiro_dia, ultimo_dia, hoje):
    a_receber = float(
        db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
        .filter(Lancamento.tipo == "receber", Lancamento.data_pagamento.is_(None))
        .scalar()
        or 0
    )
    a_pagar = float(
        db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
        .filter(Lancamento.tipo == "pagar", Lancamento.data_pagamento.is_(None))
        .scalar()
        or 0
    )
    atrasados = Lancamento.query.filter(
        Lancamento.data_pagamento.is_(None), Lancamento.vencimento < hoje
    ).count()
    recebido_mes = float(
        db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
        .filter(
            Lancamento.tipo == "receber",
            Lancamento.data_pagamento >= primeiro_dia,
            Lancamento.data_pagamento <= ultimo_dia,
        )
        .scalar()
        or 0
    )
    return {
        "a_receber": round(a_receber, 2),
        "a_pagar": round(a_pagar, 2),
        "atrasados": atrasados,
        "recebido_mes": round(recebido_mes, 2),
    }


def _resumo_os(hoje):
    os_por_status = {
        status: OrdemServico.query.filter_by(status=status).count()
        for status in STATUS_OS_VALIDOS
    }
    total_os = sum(os_por_status.values())
    atraso_real = sum(
        1
        for ordem in OrdemServico.query.filter(OrdemServico.status != "concluido").all()
        if ordem.prazo and _prazo_atrasado(ordem.prazo, hoje)
    )
    return {**os_por_status, "total": total_os, "atrasadas": atraso_real}


def _prazo_atrasado(prazo_str, hoje):
    try:
        return __import__("datetime").date.fromisoformat(prazo_str) < hoje
    except (ValueError, TypeError):
        return False


def _resumo_orcamentos():
    orc_por_status = {
        status: Orcamento.query.filter_by(status=status).count()
        for status in STATUS_ORCAMENTO_VALIDOS
    }
    total_orc = sum(orc_por_status.values())
    valor_total = round(
        float(
            db.session.query(db.func.coalesce(db.func.sum(Orcamento.valor), 0)).scalar()
            or 0
        ),
        2,
    )
    valor_aprovado = round(
        float(
            db.session.query(db.func.coalesce(db.func.sum(Orcamento.valor), 0))
            .filter(Orcamento.status == "aprovado")
            .scalar()
            or 0
        ),
        2,
    )
    open_subq = (
        db.session.query(Lancamento.id)
        .filter(
            Lancamento.tipo == "receber",
            Lancamento.data_pagamento.is_(None),
            Lancamento.descricao.like(db.func.concat("%[ORC:", Orcamento.numero, "]%")),
        )
        .exists()
    )
    valor_aprovado_ativo = round(
        float(
            db.session.query(db.func.coalesce(db.func.sum(Orcamento.valor), 0))
            .filter(Orcamento.status == "aprovado", open_subq)
            .scalar()
            or 0
        ),
        2,
    )
    return {
        **orc_por_status,
        "total": total_orc,
        "valor_total": valor_total,
        "valor_aprovado": valor_aprovado,
        "valor_aprovado_ativo": valor_aprovado_ativo,
    }


@dashboard_bp.route("/resumo", methods=["GET"])
@require_permissions("dashboard")
@handle_errors
def resumo_dashboard():
    hoje, primeiro_dia, ultimo_dia = month_boundaries()
    return (
        jsonify(
            {
                "clientes": {"total": Cliente.query.count()},
                "financeiro": _resumo_financeiro(primeiro_dia, ultimo_dia, hoje),
                "ordens_servico": _resumo_os(hoje),
                "orcamentos": _resumo_orcamentos(),
            }
        ),
        200,
    )
