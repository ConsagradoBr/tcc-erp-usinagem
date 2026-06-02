"""
Teste de capacidade — mede tempo de resposta dos endpoints de resumo
com uma base de dados de tamanho realístico (~500 clientes, ~2000 lançamentos).
"""
import importlib.metadata
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path
from decimal import Decimal
from random import choice, randint, random, seed as random_seed

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

# ── configuração antes de importar o app ──
CAPACITY_DB = ROOT / "backend" / "capacity_test.sqlite3"
if CAPACITY_DB.exists():
    CAPACITY_DB.unlink()

os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = f"sqlite:///{CAPACITY_DB.as_posix()}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-32-characters!!"
os.environ["SECRET_KEY"] = "test-secret-key-with-32-characters!!"

random_seed(42)

from backend.app import app
from backend.extensions import db
from backend.models import Cliente, Lancamento, Orcamento, OrdemServico, TermoAceite, Usuario
from werkzeug.security import generate_password_hash

# ── helpers ──
NOMES = [
    "Metal Forte Indústria Ltda", "Aço Brasil S.A.", "Usinagem Premium Ltda",
    "Torneados Precisos Eireli", "Fundição Nacional", "InoxTech Soluções",
    "FerroVelho Comércio", "Mecânica Pesada S.A.", "Corte a Laser Express",
    "Solda Fina Indústria", "Retífica ABC", "Fresagem Controle Ltda",
    "Mandrilagem Total", "Cilindros RG", "Engrenagens Brasil",
    "Polimento Arte Final", "Tratamento Térmico Plus", "Caldeiraria Sul",
    "Tornos Automáticos SP", "Usinagem 5 Eixos", "Indústria MetalMec",
    "Fundição Artesanal", "Arames e Soldas", "Corte Plasma Tech",
    "Dobras e Perfis", "Molas São João", "Parafusos Milly",
    "Eixos e Árvores", "Buchas Metalcard", "Bronzinas S.A.",
    "Estamparia Leve", "Ferragens Gerais", "Perfilados ABC",
    "Trefilaria Brasil", "Laminados Finos", "Chapa Dobra Ltda",
    "Conectores Forte", "Válvulas Indus", "Mancais Rolimã",
    "Polias Correias", "Acoplamentos RH", "Redutores Veloz",
    "Motores Elétricos Sul", "Pneumática Fácil", "Hidráulica Press",
    "Automação Linear", "Robótica Leve", "Sensores On",
    "Instrumentação Precisa", "Controle Qualitas",
]

STATUS_OS = ["solicitado", "em_andamento", "revisao", "concluido"]
STATUS_ORC = ["rascunho", "enviado", "aprovado", "reprovado", "cancelado"]
TODAY = date.today()


def seed_database(num_clientes=500, num_orcamentos=800, num_lancamentos=1500, num_os=400):
    print(f"\n=== SEMEANDO {num_clientes} clientes, {num_orcamentos} orçamentos, {num_lancamentos} lançamentos, {num_os} OS ===\n")

    admin = Usuario(
        nome="Admin Capacidade",
        email="admin@capacidade.com",
        senha_hash=generate_password_hash("Senha123"),
        perfil="administrador",
        ativo=True,
    )
    db.session.add(admin)
    db.session.flush()

    TermoAceite(
        usuario_id=admin.id,
        versao_termo="2026.06.02",
        ip_usuario="127.0.0.1",
        user_agent="capacity-test",
    )
    db.session.flush()

    clientes = []
    t0 = time.time()
    for i in range(num_clientes):
        nome = choice(NOMES) + f" #{i}"
        c = Cliente(
            nome=nome,
            documento=str(randint(10000000000000, 99999999999999)),
            email=nome.lower().replace(" ", "") + "@teste.com",
            telefone=f"119{randint(10000000, 99999999)}",
            municipio=choice(["São Paulo", "Campinas", "Sorocaba", "Jundiaí", "Ribeirão Preto"]),
            uf=choice(["SP", "RJ", "MG", "RS", "PR"]),
        )
        db.session.add(c)
        clientes.append(c)
    db.session.flush()
    print(f"  Clientes criados: {len(clientes)} em {time.time() - t0:.2f}s")

    orcamentos = []
    t0 = time.time()
    for i in range(num_orcamentos):
        valor = round(random() * 50000 + 500, 2)
        orc = Orcamento(
            numero=f"ORC-CAP-{i+1:04d}",
            cliente_id=choice(clientes).id,
            titulo=f"Orçamento capacidade #{i+1}",
            descricao=f"Descrição do orçamento {i+1} para testes de capacidade",
            valor=Decimal(str(valor)),
            validade=TODAY + timedelta(days=randint(1, 90)),
            status=choice(STATUS_ORC),
            observacao="Capacidade" if random() > 0.5 else None,
        )
        db.session.add(orc)
        orcamentos.append(orc)
    db.session.flush()
    print(f"  Orçamentos criados: {len(orcamentos)} em {time.time() - t0:.2f}s")

    lancamentos = []
    t0 = time.time()
    for i in range(num_lancamentos):
        tipo = choice(["receber", "pagar"])
        valor = round(random() * 10000 + 50, 2)
        dias_atraso = -randint(1, 60) if random() > 0.6 else randint(0, 90)
        venc = TODAY + timedelta(days=dias_atraso)
        pago = dias_atraso < -30 or random() > 0.7
        parcela_num = randint(1, 3)
        total_parc = randint(parcela_num, 3)
        desc = f"Lançamento CAP #{i+1}"
        if total_parc > 1:
            desc += f" ({parcela_num}/{total_parc})"
        l = Lancamento(
            tipo=tipo,
            cliente_id=choice(clientes).id if random() > 0.15 else None,
            descricao=desc,
            nfe=str(randint(100000, 999999)) if random() > 0.5 else None,
            prazo_dias=30 if total_parc > 1 else None,
            vencimento=venc,
            valor=Decimal(str(valor)),
            data_pagamento=TODAY if pago else None,
            forma_pagamento=choice(["PIX", "Boleto", "Transferência", None]),
            observacao="Pago" if pago else None,
            parcelas=total_parc if total_parc > 1 else 1,
            parcela_num=parcela_num,
        )
        db.session.add(l)
        lancamentos.append(l)
    db.session.flush()

    for i, l in enumerate(lancamentos):
        if i < 50:
            l.descricao = f"[ORC:CAP-{i+1:04d}] {l.descricao}"

    db.session.flush()
    print(f"  Lançamentos criados: {len(lancamentos)} em {time.time() - t0:.2f}s")

    ordens = []
    t0 = time.time()
    for i in range(num_os):
        os = OrdemServico(
            numero=f"OS-CAP-{i+1:04d}",
            cliente=choice(NOMES),
            servico=choice(["Torneamento", "Fresagem", "Solda", "Corte", "Mandrilagem"]),
            prioridade=choice(["baixa", "media", "alta"]),
            prazo=(TODAY + timedelta(days=randint(-10, 60))).isoformat(),
            responsavel=choice(["Carlos", "Ana", "João", "Maria", "Pedro"]),
            descricao=f"Ordem de Serviço CAP #{i+1}",
            status=choice(STATUS_OS),
        )
        db.session.add(os)
        ordens.append(os)
    db.session.flush()
    print(f"  OS criadas: {len(ordens)} em {time.time() - t0:.2f}s")

    db.session.commit()
    print(f"\n  Total de registros: {num_clientes + num_orcamentos + num_lancamentos + num_os}")
    return admin


def measure(label, func, warmup=True):
    if warmup:
        for _ in range(3):
            func()
    times = []
    for _ in range(10):
        t0 = time.perf_counter()
        func()
        elapsed = time.perf_counter() - t0
        times.append(elapsed)
    avg = sum(times) / len(times)
    best = min(times)
    worst = max(times)
    print(f"  {label:45s}  avg={avg*1000:7.2f}ms  best={best*1000:7.2f}ms  worst={worst*1000:7.2f}ms")
    return avg


def old_financeiro_resumo():
    todos = [l.to_dict() for l in Lancamento.query.all()]
    mes = TODAY.isoformat()[:7]
    a_receber = sum(
        item["valor_total"]
        for item in todos
        if item["tipo"] == "receber" and item["status"] != "pago"
    )
    a_pagar = sum(
        item["valor_total"]
        for item in todos
        if item["tipo"] == "pagar" and item["status"] != "pago"
    )
    atrasados = len([item for item in todos if item["status"] == "atrasado"])
    recebido_mes = sum(
        item["valor"]
        for item in todos
        if item["tipo"] == "receber"
        and item["data_pagamento"]
        and item["data_pagamento"][:7] == mes
    )
    return {"a_receber": a_receber, "a_pagar": a_pagar, "atrasados": atrasados, "recebido_mes": recebido_mes}


def old_orcamentos_resumo():
    todos = Orcamento.query.all()
    aprovados = [o for o in todos if o.status == "aprovado"]
    lancamentos_abertos = Lancamento.query.filter(
        Lancamento.tipo == "receber", Lancamento.data_pagamento.is_(None)
    ).all()
    orcamentos_ativos = {
        o.numero for o in aprovados
        if any(f"[ORC:{o.numero}]" in (l.descricao or "") for l in lancamentos_abertos)
    }
    result = {s: len([o for o in todos if o.status == s]) for s in ["rascunho", "enviado", "aprovado", "reprovado", "cancelado"]}
    result["total"] = len(todos)
    result["valor_total"] = round(sum(float(o.valor) for o in todos), 2)
    result["valor_aprovado"] = round(sum(float(o.valor) for o in aprovados), 2)
    result["valor_aprovado_ativo"] = round(
        sum(float(o.valor) for o in aprovados if o.numero in orcamentos_ativos), 2
    )
    return result


def run_capacity_tests(client):
    print("\n=== TESTES DE CAPACIDADE ===\n")
    print("Medições após warmup (3 iterações), média de 10 execuções:\n")

    results = {}

    admin_id = None
    with app.app_context():
        admin = Usuario.query.filter_by(email="admin@capacidade.com").first()
        from flask_jwt_extended import create_access_token
        admin_id = admin.id
        token = create_access_token(identity=str(admin.id))

    auth_headers = {"Authorization": f"Bearer {token}"}

    # ── ENDPOINTS OTIMIZADOS ──
    print("── Endpoints otimizados ──")

    results["financeiro_resumo"] = measure("GET /financeiro/resumo",
        lambda: client.get("/financeiro/resumo", headers=auth_headers))

    results["orcamentos_resumo"] = measure("GET /orcamentos/resumo",
        lambda: client.get("/orcamentos/resumo", headers=auth_headers))

    results["ordens_servico_resumo"] = measure("GET /ordens-servico/resumo",
        lambda: client.get("/ordens-servico/resumo", headers=auth_headers))

    results["dashboard_resumo"] = measure("GET /dashboard/resumo",
        lambda: client.get("/dashboard/resumo", headers=auth_headers))

    results["financeiro"] = measure("GET /financeiro",
        lambda: client.get("/financeiro", headers=auth_headers))

    results["orcamentos"] = measure("GET /orcamentos",
        lambda: client.get("/orcamentos", headers=auth_headers))

    results["ordens_servico"] = measure("GET /ordens-servico",
        lambda: client.get("/ordens-servico", headers=auth_headers))

    results["clientes"] = measure("GET /clientes",
        lambda: client.get("/clientes", headers=auth_headers))

    # ── VERSÃO ANTIGA (Python puro) ──
    print("\n── Simulação da versão antiga (Python puro) ──")

    def run_old_fin():
        with app.app_context():
            old_financeiro_resumo()
    results["old_financeiro_resumo"] = measure("  old /financeiro/resumo (Python)",
        run_old_fin, warmup=False)

    def run_old_orc():
        with app.app_context():
            old_orcamentos_resumo()
    results["old_orcamentos_resumo"] = measure("  old /orcamentos/resumo (Python)",
        run_old_orc, warmup=False)

    # ── RESUMO ──
    print(f"\n{'='*70}")
    print(f"{'Métrica':40s} {'Antigo (ms)':>14s} {'Novo (ms)':>14s} {'Ganho':>10s}")
    print(f"{'='*70}")

    for key, label in [
        ("financeiro_resumo", "/financeiro/resumo"),
        ("orcamentos_resumo", "/orcamentos/resumo"),
    ]:
        old_key = f"old_{key}"
        if old_key in results and key in results:
            old_ms = results[old_key] * 1000
            new_ms = results[key] * 1000
            ratio = old_ms / new_ms if new_ms > 0 else float('inf')
            print(f"{label:40s} {old_ms:>11.2f}ms {new_ms:>11.2f}ms {ratio:>7.1f}x")

    print(f"\n{'-'*70}")
    print("Legenda: avg = média de 10 execuções após 3 iterações de warmup")
    print(f"{'-'*70}")

    # ── Validação: resultados batem? ──
    print("\n── Validação de equivalência de resultados ──")
    old_fin = old_financeiro_resumo()
    new_resp = client.get("/financeiro/resumo", headers=auth_headers)
    new_fin = new_resp.get_json()

    if (abs(old_fin["a_receber"] - new_fin["a_receber"]) < 0.01
            and old_fin["atrasados"] == new_fin["atrasados"]):
        print("  /financeiro/resumo:  ✓ resultados equivalentes")
    else:
        print("  /financeiro/resumo:  ✗ DIFERENÇA DETECTADA")
        print(f"    old: {old_fin}")
        print(f"    new: {new_fin}")

    old_orc = old_orcamentos_resumo()
    new_resp = client.get("/orcamentos/resumo", headers=auth_headers)
    new_orc = new_resp.get_json()

    if (abs(old_orc["valor_total"] - new_orc["valor_total"]) < 0.01
            and abs(old_orc["valor_aprovado"] - new_orc["valor_aprovado"]) < 0.01
            and abs(old_orc["valor_aprovado_ativo"] - new_orc["valor_aprovado_ativo"]) < 0.01):
        print("  /orcamentos/resumo:  ✓ resultados equivalentes")
    else:
        print("  /orcamentos/resumo:  ✗ DIFERENÇA DETECTADA")
        print(f"    old: {old_orc}")
        print(f"    new: {new_orc}")

    return results


def main():
    import atexit

    def cleanup():
        if CAPACITY_DB.exists():
            CAPACITY_DB.unlink()

    atexit.register(cleanup)

    with app.app_context():
        db.drop_all()
        db.create_all()
        seed_database()

    with app.app_context():
        with app.test_client() as client:
            run_capacity_tests(client)

    try:
        cleanup()
    except Exception:
        pass
    print("\nTeste de capacidade concluído.\n")


if __name__ == "__main__":
    main()
