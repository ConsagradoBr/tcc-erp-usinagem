import base64
import io
import logging
import re
from datetime import date, timedelta

from flask import Blueprint, jsonify, request

from backend.extensions import db
from backend.financeiro_utils import extrair_dados_boleto
from backend.models import Cliente, Lancamento
from backend.security import require_permissions

financeiro_bp = Blueprint("financeiro", __name__, url_prefix="/financeiro")


@financeiro_bp.route("", methods=["GET"])
@require_permissions("financeiro")
def listar_lancamentos():
    try:
        tipo = request.args.get("tipo", "").strip()
        status = request.args.get("status", "").strip()
        q = request.args.get("q", "").strip()
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
        resultado = [
            lancamento.to_dict()
            for lancamento in query.order_by(Lancamento.vencimento.asc()).all()
        ]
        if status:
            resultado = [item for item in resultado if item["status"] == status]
        return jsonify(resultado), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/resumo", methods=["GET"])
@require_permissions("financeiro")
def resumo():
    try:
        todos = [lancamento.to_dict() for lancamento in Lancamento.query.all()]
        mes = date.today().isoformat()[:7]
        return (
            jsonify(
                {
                    "a_receber": round(
                        sum(
                            item["valor_total"]
                            for item in todos
                            if item["tipo"] == "receber" and item["status"] != "pago"
                        ),
                        2,
                    ),
                    "a_pagar": round(
                        sum(
                            item["valor_total"]
                            for item in todos
                            if item["tipo"] == "pagar" and item["status"] != "pago"
                        ),
                        2,
                    ),
                    "atrasados": len(
                        [item for item in todos if item["status"] == "atrasado"]
                    ),
                    "recebido_mes": round(
                        sum(
                            item["valor"]
                            for item in todos
                            if item["tipo"] == "receber"
                            and item["data_pagamento"]
                            and item["data_pagamento"][:7] == mes
                        ),
                        2,
                    ),
                }
            ),
            200,
        )
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("", methods=["POST"])
@require_permissions("financeiro")
def criar_lancamento():
    try:
        data = request.get_json() or {}
        tipo = data.get("tipo", "").strip()
        descricao = data.get("descricao", "").strip()
        vencimento_str = data.get("vencimento", "")
        if tipo not in ("receber", "pagar"):
            return jsonify({"erro": "Tipo inválido."}), 400
        if not descricao:
            return jsonify({"erro": "Descrição é obrigatória."}), 400
        if not vencimento_str:
            return jsonify({"erro": "Vencimento é obrigatório."}), 400
        n_parcelas = int(data.get("parcelas", 1) or 1)
        valor_total = float(data.get("valor", 0))
        valor_parcela = round(valor_total / n_parcelas, 2)
        base_vencimento = date.fromisoformat(vencimento_str)
        prazo_dias = int(data.get("prazo_dias") or 30)
        criados = []
        for indice in range(n_parcelas):
            vencimento = base_vencimento + timedelta(days=prazo_dias * indice)
            lancamento = Lancamento(
                tipo=tipo,
                cliente_id=data.get("cliente_id") or None,
                descricao=(
                    descricao
                    if n_parcelas == 1
                    else f"{descricao} ({indice + 1}/{n_parcelas})"
                ),
                nfe=data.get("nfe", "").strip() or None,
                prazo_dias=data.get("prazo_dias") or None,
                vencimento=vencimento,
                valor=valor_parcela,
                forma_pagamento=data.get("forma_pagamento", "").strip() or None,
                observacao=data.get("observacao", "").strip() or None,
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
    except ValueError:
        return jsonify({"erro": "Data inválida. Use YYYY-MM-DD."}), 400
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/<int:id>", methods=["PUT"])
@require_permissions("financeiro")
def editar_lancamento(id):
    try:
        lancamento = Lancamento.query.get_or_404(id)
        data = request.get_json() or {}
        vencimento_mudou = (
            "vencimento" in data
            and data["vencimento"] != lancamento.vencimento.isoformat()
        )
        if "tipo" in data and data["tipo"] in ("receber", "pagar"):
            lancamento.tipo = data["tipo"]
        if "descricao" in data:
            lancamento.descricao = data["descricao"].strip()
        if "cliente_id" in data:
            lancamento.cliente_id = data["cliente_id"] or None
        if "nfe" in data:
            lancamento.nfe = data["nfe"].strip() or None
        if "prazo_dias" in data:
            lancamento.prazo_dias = data["prazo_dias"] or None
        if "vencimento" in data:
            lancamento.vencimento = date.fromisoformat(data["vencimento"])
        if "valor" in data:
            lancamento.valor = float(data["valor"])
        if "forma_pagamento" in data:
            lancamento.forma_pagamento = data["forma_pagamento"].strip() or None
        if "observacao" in data:
            lancamento.observacao = data["observacao"].strip() or None
        if "data_pagamento" in data:
            lancamento.data_pagamento = (
                date.fromisoformat(data["data_pagamento"])
                if data["data_pagamento"]
                else None
            )
        if vencimento_mudou and lancamento.parcelas and lancamento.parcelas > 1:
            prazo_dias = int(lancamento.prazo_dias or 30)
            base_parcela1 = lancamento.vencimento - timedelta(
                days=prazo_dias * (lancamento.parcela_num - 1)
            )
            desc_base = re.sub(r"\s*\(\d+/\d+\)$", "", lancamento.descricao).strip()
            irmas = Lancamento.query.filter(
                Lancamento.id != lancamento.id,
                Lancamento.tipo == lancamento.tipo,
                Lancamento.cliente_id == lancamento.cliente_id,
                Lancamento.parcelas == lancamento.parcelas,
                Lancamento.descricao.like(f"{desc_base}%"),
            ).all()
            for irma in irmas:
                if not irma.data_pagamento:
                    irma.vencimento = base_parcela1 + timedelta(
                        days=prazo_dias * (irma.parcela_num - 1)
                    )
        db.session.commit()
        return jsonify(lancamento.to_dict()), 200
    except ValueError:
        return jsonify({"erro": "Data inválida."}), 400
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/<int:id>/pagar", methods=["PATCH"])
@require_permissions("financeiro")
def marcar_pago(id):
    try:
        lancamento = Lancamento.query.get_or_404(id)
        data = request.get_json() or {}
        lancamento.data_pagamento = date.fromisoformat(
            data.get("data_pagamento", date.today().isoformat())
        )
        lancamento.forma_pagamento = data.get(
            "forma_pagamento", lancamento.forma_pagamento
        )
        db.session.commit()
        return jsonify(lancamento.to_dict()), 200
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/<int:id>", methods=["DELETE"])
@require_permissions("financeiro")
def excluir_lancamento(id):
    try:
        lancamento = Lancamento.query.get_or_404(id)
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
    except Exception as exc:
        logging.error(f"❌ {exc}")
        return jsonify({"erro": "Erro interno."}), 500


@financeiro_bp.route("/boleto", methods=["POST"])
@require_permissions("financeiro")
def parsear_boleto():
    try:
        body = request.get_json() or {}
        pdf_b64 = body.get("pdf_base64", "")
        tipo_hint = body.get("tipo", "pagar")
        if not pdf_b64:
            return jsonify({"erro": "PDF não enviado."}), 400
        pdf_bytes = base64.b64decode(pdf_b64)
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
    except Exception as exc:
        logging.error(f"❌ Boleto: {exc}")
        return jsonify({"erro": f"Erro ao processar PDF: {str(exc)}"}), 500
