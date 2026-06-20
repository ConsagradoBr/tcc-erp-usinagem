import base64
import binascii
import io
import logging
import re
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

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
from backend.financeiro_utils import extrair_dados_boleto
from backend.models import Cliente, Lancamento
from backend.security import require_permissions

financeiro_bp = Blueprint("financeiro", __name__, url_prefix="/financeiro")
MAX_BOLETO_PDF_BYTES = 5 * 1024 * 1024


def descricao_base(texto):
    return re.sub(r"\s*\(\d+/\d+\)$", "", (texto or "")).strip()


def consultar_grupo(lancamento):
    base = descricao_base(lancamento.descricao)
    query = Lancamento.query.filter(Lancamento.tipo == lancamento.tipo)
    if lancamento.cliente_id is None:
        query = query.filter(Lancamento.cliente_id.is_(None))
    else:
        query = query.filter(Lancamento.cliente_id == lancamento.cliente_id)
    query = query.filter(Lancamento.descricao.like(f"{base}%"))
    if lancamento.parcelas and lancamento.parcelas > 1:
        query = query.filter(Lancamento.parcelas == lancamento.parcelas)
    return query.order_by(Lancamento.parcela_num.asc(), Lancamento.id.asc()).all()


def distribuir_valor_total(valor_total, parcelas):
    parcelas = int(parcelas)
    centavos = int(
        (Decimal(str(valor_total)) * Decimal("100")).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    )
    valor_base, sobra = divmod(centavos, parcelas)
    valores = [valor_base for _ in range(parcelas)]
    valores[-1] += sobra
    return [float(Decimal(valor) / Decimal("100")) for valor in valores]


def _texto_obrigatorio(value, campo):
    if not isinstance(value, str):
        return None, error_response(f"{campo} deve ser texto.")
    texto = value.strip()
    if not texto:
        return None, error_response(f"{campo} é obrigatória.")
    return texto, None


def _texto_opcional(value, campo):
    if value is None:
        return None, None
    if not isinstance(value, str):
        return None, error_response(f"{campo} deve ser texto.")
    return value.strip() or None, None


def _parse_int(value, campo, minimo=None, padrao=None):
    if value in (None, ""):
        value = padrao
    try:
        numero = int(value)
    except (TypeError, ValueError):
        return None, error_response(f"{campo} deve ser um numero inteiro.")
    if minimo is not None and numero < minimo:
        return None, error_response(f"{campo} deve ser maior ou igual a {minimo}.")
    return numero, None


def _parse_valor_positivo(value):
    try:
        valor = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None, error_response("Valor deve ser numerico.")
    if valor <= 0:
        return None, error_response("Valor deve ser maior que zero.")
    return float(valor.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)), None


def _parse_data(value, campo, obrigatorio=False):
    if value in (None, ""):
        if obrigatorio:
            return None, error_response(f"{campo} é obrigatória.")
        return None, None
    if not isinstance(value, str):
        return None, error_response(f"{campo} deve usar YYYY-MM-DD.")
    try:
        return date.fromisoformat(value), None
    except ValueError:
        return None, error_response(f"{campo} invalida. Use YYYY-MM-DD.")


def _parse_cliente_id(value):
    if value in (None, ""):
        return None, None
    try:
        cliente_id = int(value)
    except (TypeError, ValueError):
        return None, error_response("Cliente invalido.")
    if cliente_id <= 0:
        return None, error_response("Cliente invalido.")
    if not db.session.get(Cliente, cliente_id):
        return None, error_response("Cliente nao encontrado.", 404)
    return cliente_id, None


@financeiro_bp.route("", methods=["GET"])
@require_permissions("financeiro")
def listar_lancamentos():
    try:
        tipo = request.args.get("tipo", "").strip()
        status = request.args.get("status", "").strip()
        q = request.args.get("q", "").strip()
        filtro_rapido = request.args.get("filtro_rapido", "").strip()
        try:
            page = max(int(request.args.get("page", 1)), 1)
            per_page = max(min(int(request.args.get("per_page", 50)), 200), 1)
        except (TypeError, ValueError):
            page, per_page = 1, 50

        hoje = date.today()
        query = Lancamento.query

        if tipo:
            query = query.filter(Lancamento.tipo == tipo)
        if q:
            query = query.join(Cliente, isouter=True).filter(
                db.or_(
                    Lancamento.descricao.ilike(f"%{q}%"),
                    Lancamento.nfe.ilike(f"%{q}%"),
                    Cliente.nome.ilike(f"%{q}%"),
                )
            )

        # quick filters — aplicados no SQL
        if filtro_rapido == "receber":
            query = query.filter(Lancamento.tipo == "receber")
        elif filtro_rapido == "pagar":
            query = query.filter(Lancamento.tipo == "pagar")
        elif filtro_rapido == "atrasado":
            query = query.filter(
                Lancamento.data_pagamento.is_(None),
                Lancamento.vencimento < hoje,
            )
        elif filtro_rapido == "parcelado":
            query = query.filter(Lancamento.parcelas > 1)
        elif filtro_rapido == "sem_vinculo":
            query = query.filter(Lancamento.cliente_id.is_(None))

        # status filter (pago/pendente/atrasado) — aplicado no SQL
        if status:
            if status == "pago":
                query = query.filter(Lancamento.data_pagamento.isnot(None))
            elif status == "pendente":
                query = query.filter(
                    Lancamento.data_pagamento.is_(None),
                    Lancamento.vencimento >= hoje,
                )
            elif status == "atrasado":
                query = query.filter(
                    Lancamento.data_pagamento.is_(None),
                    Lancamento.vencimento < hoje,
                )

        total = query.count()
        items = [
            lancamento.to_dict()
            for lancamento in query.order_by(Lancamento.vencimento.asc())
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


@financeiro_bp.route("/resumo", methods=["GET"])
@require_permissions("financeiro")
def resumo():
    try:
        hoje = date.today()
        primeiro_dia = hoje.replace(day=1)
        if hoje.month == 12:
            ultimo_dia = date(hoje.year + 1, 1, 1) - timedelta(days=1)
        else:
            ultimo_dia = date(hoje.year, hoje.month + 1, 1) - timedelta(days=1)

        a_receber = round(
            float(
                db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
                .filter(
                    Lancamento.tipo == "receber", Lancamento.data_pagamento.is_(None)
                )
                .scalar()
                or 0
            ),
            2,
        )

        a_pagar = round(
            float(
                db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
                .filter(Lancamento.tipo == "pagar", Lancamento.data_pagamento.is_(None))
                .scalar()
                or 0
            ),
            2,
        )

        atrasados = Lancamento.query.filter(
            Lancamento.data_pagamento.is_(None), Lancamento.vencimento < hoje
        ).count()

        recebido_mes = round(
            float(
                db.session.query(db.func.coalesce(db.func.sum(Lancamento.valor), 0))
                .filter(
                    Lancamento.tipo == "receber",
                    Lancamento.data_pagamento >= primeiro_dia,
                    Lancamento.data_pagamento <= ultimo_dia,
                )
                .scalar()
                or 0
            ),
            2,
        )

        return (
            jsonify(
                {
                    "a_receber": a_receber,
                    "a_pagar": a_pagar,
                    "atrasados": atrasados,
                    "recebido_mes": recebido_mes,
                }
            ),
            200,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@financeiro_bp.route("", methods=["POST"])
@require_permissions("financeiro")
def criar_lancamento():
    try:
        data = json_body()
        tipo = data.get("tipo", "")
        tipo = tipo.strip() if isinstance(tipo, str) else ""
        descricao, error = _texto_obrigatorio(data.get("descricao", ""), "Descrição")
        if error:
            return error
        base_vencimento, error = _parse_data(
            data.get("vencimento"), "Vencimento", obrigatorio=True
        )
        if error:
            return error
        if tipo not in ("receber", "pagar"):
            return error_response("Tipo inválido.")
        n_parcelas, error = _parse_int(
            data.get("parcelas", 1), "Parcelas", minimo=1, padrao=1
        )
        if error:
            return error
        valor_total, error = _parse_valor_positivo(data.get("valor", 0))
        if error:
            return error
        cliente_id, error = _parse_cliente_id(data.get("cliente_id"))
        if error:
            return error
        prazo_dias, error = _parse_int(
            data.get("prazo_dias", 30), "Prazo em dias", minimo=0, padrao=30
        )
        if error:
            return error
        nfe, error = _texto_opcional(data.get("nfe"), "NFe")
        if error:
            return error
        forma_pagamento, error = _texto_opcional(
            data.get("forma_pagamento"), "Forma de pagamento"
        )
        if error:
            return error
        observacao, error = _texto_opcional(data.get("observacao"), "Observacao")
        if error:
            return error
        valores = distribuir_valor_total(valor_total, n_parcelas)
        criados = []
        for indice, valor_parcela in enumerate(valores):
            vencimento = base_vencimento + timedelta(days=prazo_dias * indice)
            lancamento = Lancamento(
                tipo=tipo,
                cliente_id=cliente_id,
                descricao=(
                    descricao
                    if n_parcelas == 1
                    else f"{descricao} ({indice + 1}/{n_parcelas})"
                ),
                nfe=nfe,
                prazo_dias=(
                    prazo_dias if n_parcelas > 1 or "prazo_dias" in data else None
                ),
                vencimento=vencimento,
                valor=valor_parcela,
                forma_pagamento=forma_pagamento,
                observacao=observacao,
                parcelas=n_parcelas,
                parcela_num=indice + 1,
            )
            db.session.add(lancamento)
            criados.append(lancamento)
        db.session.commit()
        return (
            jsonify(
                [item.to_dict() for item in criados]
                if n_parcelas > 1
                else criados[0].to_dict()
            ),
            201,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@financeiro_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("financeiro")
def editar_lancamento(id):
    try:
        lancamento, error = get_or_404(Lancamento, id, "Lancamento nao encontrado.")
        if error:
            return error
        data = json_body()
        grupo_atual = consultar_grupo(lancamento)
        parcelas_atuais = max(int(lancamento.parcelas or 1), 1)

        tipo = data.get("tipo", lancamento.tipo)
        tipo = tipo.strip() if isinstance(tipo, str) else ""
        if tipo not in ("receber", "pagar"):
            return error_response("Tipo inválido.")

        descricao = data.get("descricao", lancamento.descricao)
        descricao, error = _texto_obrigatorio(descricao, "Descrição")
        if error:
            return error
        cliente_id = data.get("cliente_id", lancamento.cliente_id)
        cliente_id, error = _parse_cliente_id(cliente_id)
        if error:
            return error
        nfe = data.get("nfe", lancamento.nfe)
        nfe, error = _texto_opcional(nfe, "NFe")
        if error:
            return error
        prazo_dias = data.get("prazo_dias", lancamento.prazo_dias)
        prazo_dias, error = _parse_int(prazo_dias, "Prazo em dias", minimo=0, padrao=30)
        if error:
            return error
        vencimento, error = _parse_data(data.get("vencimento"), "Vencimento")
        if error:
            return error
        vencimento = vencimento or lancamento.vencimento
        forma_pagamento = data.get("forma_pagamento", lancamento.forma_pagamento)
        forma_pagamento, error = _texto_opcional(forma_pagamento, "Forma de pagamento")
        if error:
            return error
        observacao = data.get("observacao", lancamento.observacao)
        observacao, error = _texto_opcional(observacao, "Observacao")
        if error:
            return error
        data_pagamento, error = _parse_data(data.get("data_pagamento"), "Pagamento")
        if error:
            return error
        if "data_pagamento" not in data:
            data_pagamento = lancamento.data_pagamento
        parcelas_desejadas, error = _parse_int(
            data.get("parcelas", parcelas_atuais),
            "Parcelas",
            minimo=1,
            padrao=parcelas_atuais,
        )
        if error:
            return error

        if "valor" in data:
            valor_total, error = _parse_valor_positivo(data["valor"])
            if error:
                return error
        elif parcelas_atuais > 1:
            valor_total = sum(float(item.valor) for item in grupo_atual)
        else:
            valor_total = float(lancamento.valor)
        if valor_total <= 0:
            return error_response("Valor deve ser maior que zero.")

        usa_grupo = parcelas_desejadas > 1 or parcelas_atuais > 1
        if usa_grupo:
            if any(item.data_pagamento for item in grupo_atual):
                return (
                    jsonify(
                        {
                            "erro": "Nao e possivel reparcelar um grupo com parcelas pagas."
                        }
                    ),
                    400,
                )

            valores = distribuir_valor_total(valor_total, parcelas_desejadas)
            base = descricao_base(descricao)

            for item in grupo_atual:
                db.session.delete(item)
            db.session.flush()

            criados = []
            for indice, valor_parcela in enumerate(valores):
                item = Lancamento(
                    tipo=tipo,
                    cliente_id=cliente_id,
                    descricao=(
                        base
                        if parcelas_desejadas == 1
                        else f"{base} ({indice + 1}/{parcelas_desejadas})"
                    ),
                    nfe=nfe or None,
                    prazo_dias=(
                        prazo_dias
                        if parcelas_desejadas > 1
                        else (prazo_dias if "prazo_dias" in data else None)
                    ),
                    vencimento=vencimento + timedelta(days=prazo_dias * indice),
                    valor=valor_parcela,
                    forma_pagamento=forma_pagamento,
                    observacao=observacao or None,
                    parcelas=parcelas_desejadas,
                    parcela_num=indice + 1,
                    data_pagamento=None,
                )
                db.session.add(item)
                criados.append(item)

            db.session.commit()
            return jsonify(criados[0].to_dict()), 200

        lancamento.tipo = tipo
        lancamento.descricao = descricao
        lancamento.cliente_id = cliente_id
        lancamento.nfe = nfe or None
        lancamento.prazo_dias = prazo_dias if "prazo_dias" in data else None
        lancamento.vencimento = vencimento
        lancamento.valor = valor_total
        lancamento.forma_pagamento = forma_pagamento
        lancamento.observacao = observacao or None
        lancamento.data_pagamento = data_pagamento

        db.session.commit()
        return jsonify(lancamento.to_dict()), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@financeiro_bp.route("/<int:id>/pagar", methods=["PATCH"])
@require_permissions("financeiro")
def marcar_pago(id):
    try:
        lancamento, error = get_or_404(Lancamento, id, "Lancamento nao encontrado.")
        if error:
            return error
        data = json_body()
        data_pagamento, error = _parse_data(
            data.get("data_pagamento", date.today().isoformat()), "Pagamento"
        )
        if error:
            return error
        forma_pagamento = data.get("forma_pagamento", lancamento.forma_pagamento)
        forma_pagamento, error = _texto_opcional(forma_pagamento, "Forma de pagamento")
        if error:
            return error
        lancamento.data_pagamento = data_pagamento
        lancamento.forma_pagamento = forma_pagamento
        db.session.commit()
        return jsonify(lancamento.to_dict()), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@financeiro_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("financeiro")
def excluir_lancamento(id):
    try:
        lancamento, error = get_or_404(Lancamento, id, "Lancamento nao encontrado.")
        if error:
            return error
        modo = request.args.get("modo", "unico")
        if modo == "grupo" and lancamento.parcelas and lancamento.parcelas > 1:
            desc_base = re.sub(r"\s*\(\d+/\d+\)$", "", lancamento.descricao).strip()
            irmas = Lancamento.query.filter(
                Lancamento.tipo == lancamento.tipo,
                Lancamento.cliente_id == lancamento.cliente_id,
                Lancamento.parcelas == lancamento.parcelas,
                Lancamento.descricao.like(f"{desc_base}%"),
            ).all()
            count = len(irmas)
            for irma in irmas:
                db.session.delete(irma)
            db.session.commit()
            return jsonify({"mensagem": f"{count} parcela(s) excluída(s)."}), 200
        db.session.delete(lancamento)
        db.session.commit()
        return jsonify({"mensagem": "Lançamento excluído."}), 200
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        return internal_error(exc)


@financeiro_bp.route("/boleto", methods=["POST"])
@require_permissions("financeiro")
def parsear_boleto():
    try:
        body = json_body()
        pdf_b64 = body.get("pdf_base64", "")
        tipo_hint = body.get("tipo", "pagar")
        if not isinstance(pdf_b64, str) or not pdf_b64:
            return jsonify({"erro": "PDF não enviado."}), 400
        if len(pdf_b64) > (MAX_BOLETO_PDF_BYTES * 4 // 3) + 8:
            return jsonify({"erro": "PDF excede o tamanho maximo permitido."}), 413
        try:
            pdf_bytes = base64.b64decode(pdf_b64, validate=True)
        except (binascii.Error, ValueError):
            return jsonify({"erro": "PDF invalido."}), 400
        if len(pdf_bytes) > MAX_BOLETO_PDF_BYTES:
            return jsonify({"erro": "PDF excede o tamanho maximo permitido."}), 413
        if not pdf_bytes.startswith(b"%PDF"):
            return (
                jsonify({"erro": "Arquivo enviado nao parece ser um PDF valido."}),
                400,
            )
        texto_total = ""
        try:
            import pdfplumber

            with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                for page in pdf.pages:
                    texto = page.extract_text()
                    if texto:
                        texto_total += texto + "\n"
        except Exception:
            pass
        if not texto_total.strip():
            try:
                import PyPDF2

                for page in PyPDF2.PdfReader(io.BytesIO(pdf_bytes)).pages:
                    texto = page.extract_text()
                    if texto:
                        texto_total += texto + "\n"
            except Exception:
                pass
        if not texto_total.strip():
            return (
                jsonify(
                    {"erro": "PDF sem texto extraível. Preencha os dados manualmente."}
                ),
                422,
            )
        dados = extrair_dados_boleto(texto_total)
        return (
            jsonify(
                {
                    "tipo": tipo_hint,
                    "descricao": dados["descricao"] or "Boleto bancário",
                    "valor": dados["valor"],
                    "vencimento": dados["vencimento"],
                    "nfe": dados["nfe"],
                    "beneficiario": dados["beneficiario"],
                    "pagador": dados["pagador"],
                }
            ),
            200,
        )
    except HTTPException as exc:
        return http_error_response(exc)
    except Exception as exc:
        logging.exception("Erro ao processar boleto.")
        return jsonify({"erro": f"Erro ao processar PDF: {str(exc)}"}), 500
