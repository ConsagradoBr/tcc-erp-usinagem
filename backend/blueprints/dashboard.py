from datetime import date, timedelta

from flask import Blueprint, jsonify
from werkzeug.exceptions import HTTPException

from backend.api_utils import http_error_response, internal_error
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


@dashboard_bp.route("/resumo", methods=["GET"])
@require_permissions("dashboard")
def resumo_dashboard():
    try:
        hoje = date.today()
        primeiro_dia = hoje.replace(day=1)
        if hoje.month == 12:
            ultimo_dia = date(hoje.year + 1, 1, 1) - timedelta(days=1)
        else:
            ultimo_dia = date(hoje.year, hoje.month + 1, 1) - timedelta(days=1)

        total_clientes = Cliente.query.count()

        a_receber = (
            db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
            .filter(Lancamento.tipo == "receber", Lancamento.data_pagamento.is_(None))
            .scalar()
        )

        a_pagar = (
            db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
            .filter(Lancamento.tipo == "pagar", Lancamento.data_pagamento.is_(None))
            .scalar()
        )

        atrasados = Lancamento.query.filter(
            Lancamento.data_pagamento.is_(None), Lancamento.vencimento < hoje
        ).count()

        recebido_mes = (
            db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
            .filter(
                Lancamento.tipo == "receber",
                Lancamento.data_pagamento >= primeiro_dia,
                Lancamento.data_pagamento <= ultimo_dia,
            )
            .scalar()
        )

        os_por_status = {}
        for status in STATUS_OS_VALIDOS:
            os_por_status[status] = OrdemServico.query.filter_by(status=status).count()
        total_os = sum(os_por_status.values())
        atraso_real = 0
        ordens = OrdemServico.query.filter(OrdemServico.status != "concluido").all()
        for ordem in ordens:
            if ordem.prazo:
                try:
                    prazo = date.fromisoformat(ordem.prazo)
                    if prazo < hoje:
                        atraso_real += 1
                except (ValueError, TypeError):
                    pass

        orc_por_status = {}
        for status in STATUS_ORCAMENTO_VALIDOS:
            orc_por_status[status] = Orcamento.query.filter_by(status=status).count()
        total_orc = sum(orc_por_status.values())

        valor_total_orc = round(
            float(
                db.session.query(
                    db.func.coalesce(db.func.sum(Orcamento.valor), 0)
                ).scalar()
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
                Lancamento.descricao.like(
                    db.func.concat("%[ORC:", Orcamento.numero, "]%")
                ),
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

        return (
            jsonify(
                {
                    "clientes": {"total": total_clientes},
                    "financeiro": {
                        "a_receber": round(float(a_receber), 2),
                        "a_pagar": round(float(a_pagar), 2),
                        "atrasados": atrasados,
                        "recebido_mes": round(float(recebido_mes), 2),
                    },
                    "ordens_servico": {
                        **os_por_status,
                        "total": total_os,
                        "atrasadas": atraso_real,
                    },
                    "orcamentos": {
                        **orc_por_status,
                        "total": total_orc,
                        "valor_total": round(float(valor_total_orc), 2),
                        "valor_aprovado": round(float(valor_aprovado), 2),
                        "valor_aprovado_ativo": round(float(valor_aprovado_ativo), 2),
                    },
                }
            ),
            200,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)
