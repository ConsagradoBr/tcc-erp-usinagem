from datetime import date

from backend.extensions import db
from backend.models import Cliente, Lancamento, Orcamento, OrdemServico


def proximo_numero_os():
    ultima = OrdemServico.query.order_by(OrdemServico.id.desc()).first()
    if not ultima:
        return "OS-001"
    try:
        n = int(ultima.numero.split("-")[1]) + 1
    except Exception:
        n = OrdemServico.query.count() + 1
    return f"OS-{str(n).zfill(3)}"


def proximo_numero_orcamento():
    ultima = Orcamento.query.order_by(Orcamento.id.desc()).first()
    if not ultima:
        return "ORC-001"
    try:
        n = int(ultima.numero.split("-")[1]) + 1
    except Exception:
        n = Orcamento.query.count() + 1
    return f"ORC-{str(n).zfill(3)}"


def marcador_orcamento(numero):
    return f"[ORC:{numero}]"


def buscar_os_por_orcamento(numero_orcamento):
    return OrdemServico.query.filter(
        OrdemServico.descricao.ilike(f"%{marcador_orcamento(numero_orcamento)}%")
    ).first()


def buscar_lancamento_por_orcamento(numero_orcamento):
    marcador = marcador_orcamento(numero_orcamento)
    return Lancamento.query.filter(
        Lancamento.tipo == "receber", Lancamento.descricao.ilike(f"%{marcador}%")
    ).first()


def _descricao_orcamento(orcamento):
    partes = [marcador_orcamento(orcamento.numero)]
    if orcamento.descricao:
        partes.append(orcamento.descricao.strip())
    if orcamento.observacao:
        partes.append(f"Observação: {orcamento.observacao.strip()}")
    return " | ".join(partes)


def _observacao_lancamento(orcamento):
    partes = ["Gerado automaticamente a partir do orçamento aprovado."]
    if orcamento.observacao:
        partes.append(orcamento.observacao.strip())
    return " | ".join(partes)


def garantir_os_para_orcamento(orcamento):
    if orcamento.status != "aprovado":
        return None, False
    cliente = db.session.get(Cliente, orcamento.cliente_id)
    if not cliente:
        return None, False

    existente = buscar_os_por_orcamento(orcamento.numero)
    if existente:
        existente.cliente = cliente.nome
        existente.servico = orcamento.titulo
        existente.prazo = (
            orcamento.validade.strftime("%d/%m/%Y") if orcamento.validade else None
        )
        existente.descricao = _descricao_orcamento(orcamento)
        return existente, False

    nova_os = OrdemServico(
        numero=proximo_numero_os(),
        cliente=cliente.nome,
        servico=orcamento.titulo,
        prioridade="media",
        prazo=orcamento.validade.strftime("%d/%m/%Y") if orcamento.validade else None,
        responsavel="Comercial",
        descricao=_descricao_orcamento(orcamento),
        status="solicitado",
    )
    db.session.add(nova_os)
    db.session.flush()
    return nova_os, True


def garantir_lancamento_para_orcamento(orcamento):
    if orcamento.status != "aprovado":
        return None, False
    cliente = db.session.get(Cliente, orcamento.cliente_id)
    if not cliente:
        return None, False

    existente = buscar_lancamento_por_orcamento(orcamento.numero)
    if existente:
        existente.cliente_id = orcamento.cliente_id
        existente.descricao = f"{marcador_orcamento(orcamento.numero)} Orçamento aprovado - {orcamento.titulo}"
        existente.vencimento = orcamento.validade or date.today()
        existente.valor = float(orcamento.valor)
        existente.observacao = _observacao_lancamento(orcamento)
        return existente, False

    lancamento = Lancamento(
        tipo="receber",
        cliente_id=orcamento.cliente_id,
        descricao=f"{marcador_orcamento(orcamento.numero)} Orçamento aprovado - {orcamento.titulo}",
        nfe=None,
        prazo_dias=None,
        vencimento=orcamento.validade or date.today(),
        valor=float(orcamento.valor),
        forma_pagamento=None,
        observacao=_observacao_lancamento(orcamento),
        parcelas=1,
        parcela_num=1,
    )
    db.session.add(lancamento)
    db.session.flush()
    return lancamento, True


def serializar_orcamento_integrado(
    orcamento,
    ordem_servico=None,
    ordem_servico_criada=False,
    lancamento=None,
    lancamento_criado=False,
):
    payload = orcamento.to_dict()
    if ordem_servico:
        payload["ordem_servico"] = ordem_servico.to_dict()
        payload["ordem_servico_criada"] = ordem_servico_criada
    if lancamento:
        payload["lancamento_financeiro"] = lancamento.to_dict()
        payload["lancamento_financeiro_criado"] = lancamento_criado
    return payload
