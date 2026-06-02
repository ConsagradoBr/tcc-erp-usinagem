"""
Teste de estresse progressivo — mede o ponto de ruptura do sistema.
A cada iteração dobra a base de dados e mede todas as rotas.
"""
import os
import sys
import time
import tracemalloc
from datetime import date, timedelta
from decimal import Decimal
from pathlib import Path
from random import choice, randint, random, seed as random_seed

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

STRESS_DB = ROOT / "backend" / "stress_test.sqlite3"

os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = f"sqlite:///{STRESS_DB.as_posix()}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-32-characters!!"
os.environ["SECRET_KEY"] = "test-secret-key-with-32-characters!!"

random_seed(42)

# Garante banco limpo antes de importar o app (que roda factory.create_app)
STRESS_DB.unlink(missing_ok=True)

from backend.app import app
from backend.extensions import db
from backend.models import Cliente, Lancamento, Orcamento, OrdemServico, TermoAceite, Usuario
from werkzeug.security import generate_password_hash

NOMES = [
    "Metal Forte Indústria Ltda", "Aço Brasil S.A.", "Usinagem Premium Ltda",
    "Torneados Precisos Eireli", "Fundição Nacional", "InoxTech Soluções",
    "FerroVelho Comércio", "Mecânica Pesada S.A.", "Corte a Laser Express",
    "Solda Fina Indústria", "Retífica ABC", "Fresagem Controle Ltda",
    "Mandrilagem Total", "Cilindros RG", "Engrenagens Brasil",
    "Polimento Arte Final", "Tratamento Térmico Plus", "Caldeiraria Sul",
    "Tornos Automáticos SP", "Usinagem 5 Eixos",
]

STATUS_OS = ["solicitado", "em_andamento", "revisao", "concluido"]
STATUS_ORC = ["rascunho", "enviado", "aprovado", "reprovado", "cancelado"]
TODAY = date.today()


def seed_batch(clientes_iniciais, por_lote):
    """Adiciona `por_lote` registros a cada tabela."""
    t0 = time.time()

    clientes_novos = []
    for i in range(por_lote):
        c = Cliente(
            nome=choice(NOMES) + f" #{clientes_iniciais + i}",
            documento=str(randint(10000000000000, 99999999999999)),
            email=f"cliente{clientes_iniciais + i}@teste.com",
            telefone=f"119{randint(10000000, 99999999)}",
            municipio=choice(["São Paulo", "Campinas", "Sorocaba"]),
            uf=choice(["SP", "RJ", "MG"]),
        )
        db.session.add(c)
        clientes_novos.append(c)
    db.session.flush()
    todos_clientes = Cliente.query.all()
    dt = time.time() - t0

    for i in range(por_lote):
        valor = round(random() * 50000 + 500, 2)
        orc = Orcamento(
            numero=f"STRESS-{clientes_iniciais + i:06d}",
            cliente_id=choice(todos_clientes).id,
            titulo=f"Orçamento estresse #{clientes_iniciais + i}",
            descricao=f"Descrição longa para teste de estresse #{clientes_iniciais + i}",
            valor=Decimal(str(valor)),
            validade=TODAY + timedelta(days=randint(1, 90)),
            status=choice(STATUS_ORC),
        )
        db.session.add(orc)
    db.session.flush()

    for i in range(por_lote):
        tipo = choice(["receber", "pagar"])
        valor = round(random() * 10000 + 50, 2)
        dias_atraso = -randint(1, 60) if random() > 0.6 else randint(0, 90)
        venc = TODAY + timedelta(days=dias_atraso)
        pago = dias_atraso < -30 or random() > 0.7
        l = Lancamento(
            tipo=tipo,
            cliente_id=choice(todos_clientes).id if random() > 0.15 else None,
            descricao=f"Lançamento STRESS #{clientes_iniciais + i}",
            nfe=str(randint(100000, 999999)) if random() > 0.5 else None,
            vencimento=venc,
            valor=Decimal(str(valor)),
            data_pagamento=TODAY if pago else None,
            forma_pagamento=choice(["PIX", "Boleto", "Transferência", None]),
            parcelas=1,
            parcela_num=1,
        )
        db.session.add(l)
    db.session.flush()

    for i in range(por_lote):
        os = OrdemServico(
            numero=f"OS-STRESS-{clientes_iniciais + i:06d}",
            cliente=choice(NOMES),
            servico=choice(["Torneamento", "Fresagem", "Solda", "Corte"]),
            prioridade=choice(["baixa", "media", "alta"]),
            prazo=(TODAY + timedelta(days=randint(-10, 60))).isoformat(),
            responsavel=choice(["Carlos", "Ana", "João", "Maria"]),
            descricao=f"OS estresse #{clientes_iniciais + i}",
            status=choice(STATUS_OS),
        )
        db.session.add(os)

    db.session.commit()
    return dt


ENDPOINTS = [
    ("GET /financeiro/resumo", lambda c, h: c.get("/financeiro/resumo", headers=h)),
    ("GET /orcamentos/resumo", lambda c, h: c.get("/orcamentos/resumo", headers=h)),
    ("GET /ordens-servico/resumo", lambda c, h: c.get("/ordens-servico/resumo", headers=h)),
    ("GET /dashboard/resumo", lambda c, h: c.get("/dashboard/resumo", headers=h)),
    ("GET /clientes", lambda c, h: c.get("/clientes", headers=h)),
    ("GET /financeiro", lambda c, h: c.get("/financeiro", headers=h)),
    ("GET /orcamentos", lambda c, h: c.get("/orcamentos", headers=h)),
    ("GET /ordens-servico", lambda c, h: c.get("/ordens-servico", headers=h)),
]


def measure_endpoints(client, auth_headers, level, total_records):
    resultados = {}
    for name, req in ENDPOINTS:
        times = []
        errors = 0
        for _ in range(5):
            t0 = time.perf_counter()
            try:
                resp = req(client, auth_headers)
                elapsed = time.perf_counter() - t0
                times.append(elapsed)
                if resp.status_code >= 500:
                    errors += 1
            except Exception:
                elapsed = time.perf_counter() - t0
                times.append(elapsed)
                errors += 1
        avg = sum(times) / len(times) if times else 0
        best = min(times) if times else 0
        worst = max(times) if times else 0
        resultados[name] = {
            "avg_ms": round(avg * 1000, 2),
            "best_ms": round(best * 1000, 2),
            "worst_ms": round(worst * 1000, 2),
            "errors": errors,
            "ok": errors == 0,
        }
    return resultados


def print_resultado(level, total, seed_time, resultados):
    slow = [n for n, r in resultados.items() if r["avg_ms"] > 5000]
    errors = [n for n, r in resultados.items() if not r["ok"]]
    print(f"  | {level:>5} | {total:>7} | {seed_time*1000:>8.0f}ms |", end="")
    for name, r in resultados.items():
        tag = name.split("/")[1].split(" ")[0]
        flag = " ⚠" if r["worst_ms"] > 2000 else ""
        print(f" {tag}={r['avg_ms']:.0f}ms{flag}", end="")
    if slow:
        print(f" | LENTOS: {', '.join(slow)}", end="")
    if errors:
        print(f" | ERROS: {', '.join(errors)}", end="")
    print()


def main():
    # factory.create_app() (na importação do app) já criou as tabelas.
    # Apenas garante que temos um admin para os testes.

    print("\n" + "=" * 80)
    print("TESTE DE ESTRESSE PROGRESSIVO — ERP Usinagem")
    print("=" * 80)

    niveis = [100, 200, 400, 800, 1600, 3200, 6400, 12800, 25600]
    with app.app_context():
        admin = Usuario(
            nome="Admin Estresse",
            email="admin@estresse.com",
            senha_hash=generate_password_hash("Senha123"),
            perfil="administrador",
            ativo=True,
        )
        db.session.add(admin)
        TermoAceite(usuario_id=1, versao_termo="2026.06.02", ip_usuario="127.0.0.1")
        db.session.commit()

    from flask_jwt_extended import create_access_token
    with app.app_context():
        token = create_access_token(identity="1")
    auth_headers = {"Authorization": f"Bearer {token}"}

    header = "  | Nivel | Registros | Seed   |"
    cols = [n.split("/")[1].split(" ")[0] for n, _ in ENDPOINTS]
    for c in cols:
        header += f" {c:>10s}"
    print(header)
    print("  |" + "-" * 5 + "|" + "-" * 9 + "|" + "-" * 8 + "|" + "-" * (len(cols) * 11) + "|")

    total_acumulado = 0
    with app.app_context():
        with app.test_client() as client:
            for nivel in niveis:
                # nunca ultrapassar 25600 registros por tabela
                if total_acumulado >= 25600:
                    break

                lote = min(nivel, 25600 - total_acumulado)
                if lote <= 0:
                    break

                seed_time = seed_batch(total_acumulado, lote)
                total_acumulado += lote

                with app.app_context():
                    total = (
                        Cliente.query.count()
                        + Orcamento.query.count()
                        + Lancamento.query.count()
                        + OrdemServico.query.count()
                    )

                resultados = measure_endpoints(client, auth_headers, nivel, total)

                print_resultado(nivel, total, seed_time, resultados)

                # Para se algum endpoint estourar 5s
                if any(r["avg_ms"] > 5000 for r in resultados.values()):
                    print(f"\n  ⛔ PONTO DE RUPTURA: médias acima de 5s no nível {nivel}")
                    break

                # Para se houver erros 500
                if any(not r["ok"] for r in resultados.values()):
                    print(f"\n  ⛔ PONTO DE RUPTURA: erros 500 no nível {nivel}")
                    break

    db_path = STRESS_DB
    tamanho_mb = db_path.stat().st_size / (1024 * 1024) if db_path.exists() else 0
    print(f"\n  Tamanho final do banco: {tamanho_mb:.1f} MB")
    print(f"  Total de registros: {total_acumulado * 4} (clientes+orcamentos+lancamentos+OS)")
    try:
        STRESS_DB.unlink()
    except Exception:
        pass
    print("\nTeste de estresse concluído.\n")


if __name__ == "__main__":
    main()
