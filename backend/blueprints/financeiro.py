import base64
import binascii
import io
import re
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP

from flask import Blueprint, jsonify, request

from backend.api_utils import (
    error_response,
    get_or_404,
    handle_errors,
    json_body,
    month_boundaries,
    parse_cliente_id,
    parse_data,
    parse_int,
    parse_pagination,
    parse_valor_positivo,
    pagination_response,
    texto_obrigatorio,
    texto_opcional,
)
from backend.extensions import db
from backend.financeiro_utils import extrair_dados_boleto
from backend.models import Cliente, Lancamento
from backend.security import require_permissions

financeiro_bp = Blueprint("financeiro", __name__, url_prefix="/financeiro")
MAX_BOLETO_PDF_BYTES = 5 * 1024 * 1024


# ---------------------------------------------------------------------------
# Domain helpers
# ---------------------------------------------------------------------------


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


def _aplicar_filtros_query(query, hoje, tipo, status, q, filtro_rapido):
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
    _aplicar_filtro_rapido(query, filtro_rapido, hoje)
    _aplicar_filtro_status(query, status, hoje)
    return query


def _aplicar_filtro_rapido(query, filtro_rapido, hoje):
    filtros = {
        "receber": Lancamento.tipo == "receber",
        "pagar": Lancamento.tipo == "pagar",
        "atrasado": db.and_(
            Lancamento.data_pagamento.is_(None), Lancamento.vencimento < hoje
        ),
        "parcelado": Lancamento.parcelas > 1,
        "sem_vinculo": Lancamento.cliente_id.is_(None),
    }
    if filtro_rapido in filtros:
        query = query.filter(filtros[filtro_rapido])


def _aplicar_filtro_status(query, status, hoje):
    if status == "pago":
        query = query.filter(Lancamento.data_pagamento.isnot(None))
    elif status == "pendente":
        query = query.filter(
            Lancamento.data_pagamento.is_(None), Lancamento.vencimento >= hoje
        )
    elif status == "atrasado":
        query = query.filter(
            Lancamento.data_pagamento.is_(None), Lancamento.vencimento < hoje
        )


def _validar_campos_lancamento(data, parcelas_atuais=1, editing=False):
    tipo = (
        (data.get("tipo", "") or "").strip()
        if isinstance(data.get("tipo"), str)
        else ""
    )
    descricao, error = texto_obrigatorio(data.get("descricao", ""), "Descricao")
    if error:
        return None, error
    base_vencimento, error = parse_data(
        data.get("vencimento"), "Vencimento", obrigatorio=not editing
    )
    if error:
        return None, error
    if tipo not in ("receber", "pagar"):
        return None, error_response("Tipo invalido.")
    n_parcelas, error = parse_int(
        data.get("parcelas", parcelas_atuais),
        "Parcelas",
        minimo=1,
        padrao=parcelas_atuais,
    )
    if error:
        return None, error
    valor_raw = data.get("valor")
    if valor_raw is not None:
        valor_total, error = parse_valor_positivo(valor_raw)
        if error:
            return None, error
    elif editing:
        # During edit, if valor not sent, caller will resolve from existing record
        valor_total = 0
    else:
        valor_total, error = parse_valor_positivo(0)
        if error:
            return None, error
    cliente_id, error = parse_cliente_id(data.get("cliente_id"))
    if error:
        return None, error
    prazo_dias, error = parse_int(
        data.get("prazo_dias", 30), "Prazo em dias", minimo=0, padrao=30
    )
    if error:
        return None, error
    nfe, error = texto_opcional(data.get("nfe"), "NFe")
    if error:
        return None, error
    forma_pagamento, error = texto_opcional(
        data.get("forma_pagamento"), "Forma de pagamento"
    )
    if error:
        return None, error
    observacao, error = texto_opcional(data.get("observacao"), "Observacao")
    if error:
        return None, error

    return {
        "tipo": tipo,
        "descricao": descricao,
        "base_vencimento": base_vencimento,
        "n_parcelas": n_parcelas,
        "valor_total": valor_total,
        "cliente_id": cliente_id,
        "prazo_dias": prazo_dias,
        "nfe": nfe,
        "forma_pagamento": forma_pagamento,
        "observacao": observacao,
    }, None


def _criar_parcelas(campos, data, data_pagamento=None):
    valores = distribuir_valor_total(campos["valor_total"], campos["n_parcelas"])
    criados = []
    for indice, valor_parcela in enumerate(valores):
        vencimento = campos["base_vencimento"] + timedelta(
            days=campos["prazo_dias"] * indice
        )
        lancamento = Lancamento(
            tipo=campos["tipo"],
            cliente_id=campos["cliente_id"],
            descricao=(
                campos["descricao"]
                if campos["n_parcelas"] == 1
                else f"{campos['descricao']} ({indice + 1}/{campos['n_parcelas']})"
            ),
            nfe=campos["nfe"],
            prazo_dias=(
                campos["prazo_dias"]
                if campos["n_parcelas"] > 1 or "prazo_dias" in data
                else None
            ),
            vencimento=vencimento,
            valor=valor_parcela,
            forma_pagamento=campos["forma_pagamento"],
            observacao=campos["observacao"],
            parcelas=campos["n_parcelas"],
            parcela_num=indice + 1,
            data_pagamento=data_pagamento,
        )
        db.session.add(lancamento)
        criados.append(lancamento)
    return criados


def _reparcelar_grupo(grupo_atual, campos, data):
    if any(item.data_pagamento for item in grupo_atual):
        return None, error_response(
            "Nao e possivel reparcelar um grupo com parcelas pagas."
        )

    valores = distribuir_valor_total(campos["valor_total"], campos["n_parcelas"])
    base = descricao_base(campos["descricao"])

    for item in grupo_atual:
        db.session.delete(item)
    db.session.flush()

    criados = []
    for indice, valor_parcela in enumerate(valores):
        item = Lancamento(
            tipo=campos["tipo"],
            cliente_id=campos["cliente_id"],
            descricao=(
                base
                if campos["n_parcelas"] == 1
                else f"{base} ({indice + 1}/{campos['n_parcelas']})"
            ),
            nfe=campos["nfe"] or None,
            prazo_dias=(
                campos["prazo_dias"]
                if campos["n_parcelas"] > 1
                else (campos["prazo_dias"] if "prazo_dias" in data else None)
            ),
            vencimento=campos["base_vencimento"]
            + timedelta(days=campos["prazo_dias"] * indice),
            valor=valor_parcela,
            forma_pagamento=campos["forma_pagamento"],
            observacao=campos["observacao"] or None,
            parcelas=campos["n_parcelas"],
            parcela_num=indice + 1,
            data_pagamento=None,
        )
        db.session.add(item)
        criados.append(item)
    return criados, None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@financeiro_bp.route("", methods=["GET"])
@require_permissions("financeiro")
@handle_errors
def listar_lancamentos():
    tipo = request.args.get("tipo", "").strip()
    status = request.args.get("status", "").strip()
    q = request.args.get("q", "").strip()
    filtro_rapido = request.args.get("filtro_rapido", "").strip()
    page, per_page = parse_pagination(request.args)

    hoje = date.today()
    query = Lancamento.query
    _aplicar_filtros_query(query, hoje, tipo, status, q, filtro_rapido)
    return pagination_response(
        query.order_by(Lancamento.vencimento.asc()),
        page,
        per_page,
        lambda item: item.to_dict(),
    )


@financeiro_bp.route("/<int:id>", methods=["GET"])
@require_permissions("financeiro")
@handle_errors
def obter_lancamento(id):
    lancamento, error = get_or_404(Lancamento, id, "Lancamento nao encontrado.")
    if error:
        return error
    return jsonify(lancamento.to_dict()), 200


@financeiro_bp.route("/resumo", methods=["GET"])
@require_permissions("financeiro")
@handle_errors
def resumo():
    hoje, primeiro_dia, ultimo_dia = month_boundaries()

    def _sum_pendente(tipo):
        query = db.session.query(
            db.func.coalesce(db.func.sum(Lancamento.valor), 0)
        ).filter(Lancamento.tipo == tipo, Lancamento.data_pagamento.is_(None))
        return round(float(query.scalar() or 0), 2)

    def _sum_pago_no_periodo(tipo, data_inicio, data_fim):
        query = db.session.query(
            db.func.coalesce(db.func.sum(Lancamento.valor), 0)
        ).filter(
            Lancamento.tipo == tipo,
            Lancamento.data_pagamento >= data_inicio,
            Lancamento.data_pagamento <= data_fim,
        )
        return round(float(query.scalar() or 0), 2)

    return (
        jsonify(
            {
                "a_receber": _sum_pendente("receber"),
                "a_pagar": _sum_pendente("pagar"),
                "atrasados": Lancamento.query.filter(
                    Lancamento.data_pagamento.is_(None),
                    Lancamento.vencimento < hoje,
                ).count(),
                "recebido_mes": _sum_pago_no_periodo(
                    "receber", primeiro_dia, ultimo_dia
                ),
            }
        ),
        200,
    )


@financeiro_bp.route("", methods=["POST"])
@require_permissions("financeiro")
@handle_errors
def criar_lancamento():
    campos, error = _validar_campos_lancamento(json_body())
    if error:
        return error
    criados = _criar_parcelas(campos, json_body())
    db.session.commit()
    return (
        jsonify(
            [item.to_dict() for item in criados]
            if campos["n_parcelas"] > 1
            else criados[0].to_dict()
        ),
        201,
    )


@financeiro_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("financeiro")
@handle_errors
def editar_lancamento(id):
    lancamento, error = get_or_404(Lancamento, id, "Lancamento nao encontrado.")
    if error:
        return error
    data = json_body()
    grupo_atual = consultar_grupo(lancamento)
    parcelas_atuais = max(int(lancamento.parcelas or 1), 1)

    if "tipo" not in data:
        data["tipo"] = lancamento.tipo
    campos, error = _validar_campos_lancamento(data, parcelas_atuais, editing=True)
    if error:
        return error

    if "valor" in data:
        pass  # ja validado em _validar_campos_lancamento
    elif parcelas_atuais > 1:
        campos["valor_total"] = sum(float(item.valor) for item in grupo_atual)
    else:
        campos["valor_total"] = float(lancamento.valor)

    vencimento, error = parse_data(data.get("vencimento"), "Vencimento")
    if error:
        return error
    campos["base_vencimento"] = vencimento or lancamento.vencimento

    data_pagamento, error = parse_data(data.get("data_pagamento"), "Pagamento")
    if error:
        return error
    if "data_pagamento" not in data:
        data_pagamento = lancamento.data_pagamento

    usa_grupo = campos["n_parcelas"] > 1 or parcelas_atuais > 1
    if usa_grupo:
        criados, error = _reparcelar_grupo(grupo_atual, campos, data)
        if error:
            return error
        db.session.commit()
        return jsonify(criados[0].to_dict()), 200

    lancamento.tipo = campos["tipo"]
    lancamento.descricao = campos["descricao"]
    lancamento.cliente_id = campos["cliente_id"]
    lancamento.nfe = campos["nfe"] or None
    lancamento.prazo_dias = campos["prazo_dias"] if "prazo_dias" in data else None
    lancamento.vencimento = campos["base_vencimento"]
    lancamento.valor = campos["valor_total"]
    lancamento.forma_pagamento = campos["forma_pagamento"]
    lancamento.observacao = campos["observacao"] or None
    lancamento.data_pagamento = data_pagamento

    db.session.commit()
    return jsonify(lancamento.to_dict()), 200


@financeiro_bp.route("/<int:id>/pagar", methods=["PATCH"])
@require_permissions("financeiro")
@handle_errors
def marcar_pago(id):
    lancamento, error = get_or_404(Lancamento, id, "Lancamento nao encontrado.")
    if error:
        return error
    data = json_body()
    data_pagamento, error = parse_data(
        data.get("data_pagamento", date.today().isoformat()), "Pagamento"
    )
    if error:
        return error
    forma_pagamento, error = texto_opcional(
        data.get("forma_pagamento", lancamento.forma_pagamento), "Forma de pagamento"
    )
    if error:
        return error
    lancamento.data_pagamento = data_pagamento
    lancamento.forma_pagamento = forma_pagamento
    db.session.commit()
    return jsonify(lancamento.to_dict()), 200


@financeiro_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("financeiro")
@handle_errors
def excluir_lancamento(id):
    lancamento, error = get_or_404(Lancamento, id, "Lancamento nao encontrado.")
    if error:
        return error
    modo = request.args.get("modo", "unico")
    if modo == "grupo" and lancamento.parcelas and lancamento.parcelas > 1:
        desc_base = descricao_base(lancamento.descricao)
        irmas = Lancamento.query.filter(
            Lancamento.tipo == lancamento.tipo,
            Lancamento.cliente_id == lancamento.cliente_id,
            Lancamento.parcelas == lancamento.parcelas,
            Lancamento.descricao.like(f"{desc_base}%"),
        ).all()
        for irma in irmas:
            db.session.delete(irma)
        db.session.commit()
        return jsonify({"mensagem": f"{len(irmas)} parcela(s) excluida(s)."}), 200
    db.session.delete(lancamento)
    db.session.commit()
    return jsonify({"mensagem": "Lancamento excluido."}), 200


# ---------------------------------------------------------------------------
# Boleto PDF parsing
# ---------------------------------------------------------------------------


def _decodificar_pdf(pdf_b64):
    if not isinstance(pdf_b64, str) or not pdf_b64:
        return None, error_response("PDF nao enviado.")
    if len(pdf_b64) > (MAX_BOLETO_PDF_BYTES * 4 // 3) + 8:
        return None, error_response("PDF excede o tamanho maximo permitido.")
    try:
        pdf_bytes = base64.b64decode(pdf_b64, validate=True)
    except (binascii.Error, ValueError):
        return None, error_response("PDF invalido.")
    if len(pdf_bytes) > MAX_BOLETO_PDF_BYTES:
        return None, error_response("PDF excede o tamanho maximo permitido.")
    if not pdf_bytes.startswith(b"%PDF"):
        return None, error_response("Arquivo enviado nao parece ser um PDF valido.")
    return pdf_bytes, None


def _extrair_texto_pdf(pdf_bytes):
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
    return texto_total


@financeiro_bp.route("/boleto", methods=["POST"])
@require_permissions("financeiro")
@handle_errors
def analisar_boleto():
    body = json_body()
    pdf_bytes, error = _decodificar_pdf(body.get("pdf_base64", ""))
    if error:
        return error

    texto_total = _extrair_texto_pdf(pdf_bytes)
    if not texto_total.strip():
        return (
            jsonify(
                {"erro": "PDF sem texto extraivel. Preencha os dados manualmente."}
            ),
            422,
        )

    dados = extrair_dados_boleto(texto_total)
    return (
        jsonify(
            {
                "tipo": body.get("tipo", "pagar"),
                "descricao": dados["descricao"] or "Boleto bancario",
                "valor": dados["valor"],
                "vencimento": dados["vencimento"],
                "nfe": dados["nfe"],
                "beneficiario": dados["beneficiario"],
                "pagador": dados["pagador"],
            }
        ),
        200,
    )
