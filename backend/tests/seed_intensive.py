"""
Seed script: 6 meses de uso intensivo da AMP Usinagem Industrial.

Gera ~50 clientes, ~150 orçamentos, ~120 OS, ~350 lançamentos financeiros
com progressão realista de status, parcelamento e integração entre entidades.

Uso:
    cd tcc-erp-usinagem
    python -m backend.tests.seed_intensive

Ou via pytest:
    python -m pytest backend/tests/seed_intensive.py -v --tb=short
"""

import random
import sys
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

# ---------------------------------------------------------------------------
# Bootstrap environment
# ---------------------------------------------------------------------------

TEST_DB = Path(__file__).resolve().parents[1] / "seed_intensive.sqlite3"

import os

os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-32-characters!!"
os.environ["SECRET_KEY"] = "test-secret-key-with-32-characters!!"

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.app import app  # noqa: E402
from backend.extensions import db  # noqa: E402
from backend.models import (  # noqa: E402
    Cliente,
    Lancamento,
    LoginAttempt,
    Orcamento,
    OrdemServico,
    TermoAceite,
    Usuario,
)
from backend.services import (  # noqa: E402
    garantir_lancamento_para_orcamento,
    garantir_os_para_orcamento,
    proximo_numero_os,
)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SEED_START = date(2026, 1, 1)
SEED_END = date(2026, 6, 21)
NUM_DAYS = (SEED_END - SEED_START).days  # ~171 days

random.seed(42)  # Reproducible

# ---------------------------------------------------------------------------
# Domain data
# ---------------------------------------------------------------------------

CLIENTES_RAW = [
    ("Metalúrgica ABC Ltda", "12.345.678/0001-90", "SP"),
    ("Indústria de Precisão XYZ", "23.456.789/0001-01", "SP"),
    ("Fundição Rio Preto S.A.", "34.567.890/0001-12", "SP"),
    ("Usiminas Mineração", "45.678.901/0001-23", "MG"),
    ("Aços Villares", "56.789.012/0001-34", "SP"),
    ("Construtora Almeida", "67.890.123/0001-45", "RJ"),
    ("Automação Industrial Express", "78.901.234/0001-56", "SP"),
    ("Pneumáticos & Hidráulicos Ltda", "89.012.345/0001-67", "PR"),
    ("Plásticos Técnicos Brasil", "90.123.456/0001-78", "SC"),
    ("Serralheria Monteiro", "01.234.567/0001-89", "SP"),
    ("Ferramentaria São Jorge", "11.223.344/0001-55", "SP"),
    ("Equipamentos Agrícolas Fazenda", "22.334.455/0001-66", "MS"),
    ("Borrachas Industriais Paulista", "33.445.566/0001-77", "SP"),
    ("Tintas & Revestimentos TEC", "44.556.677/0001-88", "RJ"),
    ("Elétrica Nova Era", "55.667.788/0001-99", "MG"),
    ("Refratários Especiais", "66.778.899/0001-00", "SP"),
    ("Caldeiraria Pesada Brasil", "77.889.900/0001-11", "RJ"),
    ("Tubulações Industriais Ltda", "88.990.011/0001-22", "PR"),
    ("Manutenção Industrial Express", "99.001.122/0001-33", "SP"),
    ("Estamparia Metalúrgica Sul", "10.111.222/0001-44", "RS"),
    ("Corte & Solda Profissional", "20.222.333/0001-55", "SP"),
    ("Planta Industrial Engenharia", "30.333.444/0001-66", "MG"),
    ("Motores & Bombas Técnicas", "40.444.555/0001-77", "SP"),
    ("Rolamentos & Transmissões", "50.555.666/0001-88", "PR"),
    ("Sistemas Hidráulicos PR", "60.666.777/0001-99", "PR"),
    ("Aço Inox Premium", "70.777.888/0001-00", "SP"),
    ("Máquinas & Equipamentos BR", "80.888.999/0001-11", "SC"),
    ("Componentes Automotivos Ltda", "91.999.000/0001-22", "SP"),
    ("Peças sob Medida Express", "12.000.111/0001-33", "MG"),
    ("Industrial Parts Brasil", "23.111.222/0001-44", "SP"),
    ("Solda & Corte Industrial", "34.222.333/0001-55", "RJ"),
    ("Fábrica de Moldes Precision", "45.333.444/0001-66", "SP"),
    ("Alumínios & Ligas Especiais", "56.444.555/0001-77", "MG"),
    ("Injeção Plástica Industrial", "67.555.666/0001-88", "SP"),
    ("Acabamentos Metalúrgicos", "78.666.777/0001-99", "RJ"),
    ("Usinagem de Precisão SP", "89.777.888/0001-00", "SP"),
    ("Grupos Geradores Brasil", "90.888.999/0001-11", "MG"),
    ("Compressores Industriais", "01.999.000/0001-22", "SP"),
    ("Calor & Forno Industrial", "12.111.000/0001-33", "SP"),
    ("Transportadores & Esteiras", "23.222.111/0001-44", "PR"),
    ("Filtragem & Purificação", "34.333.222/0001-55", "SC"),
    ("Sensores & Instrumentação", "45.444.333/0001-66", "SP"),
    ("Automação & Controle Industrial", "56.555.444/0001-77", "RJ"),
    ("Energia Solar Industrial", "67.666.555/0001-88", "MG"),
    ("Resinas & Adesivos Técnicos", "78.777.666/0001-99", "SP"),
    ("Mineração & Beneficiamento", "89.888.777/0001-00", "MG"),
    ("Petroquímica Industrial", "90.999.888/0001-11", "RJ"),
    ("Celulose & Papel BR", "01.000.999/0001-22", "SP"),
    ("Siderurgia Nacional", "12.222.333/0001-33", "MG"),
]

SERVICOS = [
    "Usinagem CNC",
    "Torneamento CNC",
    "Fresagem CNC",
    "Fresagem Convencional",
    "Rectificação Plana",
    "Corte Plasma",
    "Corte Laser",
    "Solda MIG/MAG",
    "Solda TIG",
    "Solda Pontos",
    "Estamparia",
    "Punção",
    "Corte e Dobra",
    "Caldeiraria",
    "Manutenção Preventiva",
    "Manutenção Corretiva",
    "Montagem de Equipamentos",
    "Desbaste",
    "Acabamento Superficial",
    "Tratamento Térmico",
    "Anodização",
    "Galvanoplastia",
    "Pintura Industrial",
    "Injeção Plástica",
    "Extrusão",
    "Fabricação de Moldes",
    "Fabricação de Fixturas",
    "Usinagem de Peças Especiais",
    "Torneamento de Eixos",
    "Fresagem de Encaixes",
    "Brochamento",
    "Mandrilhamento",
    "Rosqueamento",
    "Furação de Precisão",
    "Alargamento",
]

MATERIAIS = [
    "Aço 1045",
    "Aço 4140",
    "Aço 1020",
    "Aço Inox 304",
    "Aço Inox 316",
    "Alumínio 6061",
    "Alumínio 7075",
    "Bronze SBCH",
    "Latão CuZn37",
    "Ferro Fundido GG25",
    "Ferro Fundido GG40",
    "Cobre Eletrolítico",
    "Titânio Grade 2",
    "Nylon PA6",
    "Peek",
    "Derlin (POM)",
]

PRIORIDADES = ["baixa", "media", "alta", "urgente"]
FORMAS_PAGAMENTO = [
    "Pix",
    "Boleto Bancário",
    "Transferência",
    "Cartão de Crédito",
    "Dinheiro",
    "Cheque",
    "Depósito",
    "Nota Promissória",
]
NOMES_CLIENTES = [c[0] for c in CLIENTES_RAW]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def random_date(start: date, end: date) -> date:
    delta = (end - start).days
    return start + timedelta(days=random.randint(0, delta))


def random_date_range(start: date, end: date, days_before: int = 0):
    """Return a tuple (vencimento_base, dias_para_pagamento)."""
    base = random_date(start, end)
    return base


def distribuir_valor(valor_total: float, parcelas: int) -> list[float]:
    centavos = int(
        (Decimal(str(valor_total)) * Decimal("100")).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    )
    base, sobra = divmod(centavos, parcelas)
    valores = [base] * parcelas
    valores[-1] += sobra
    return [float(Decimal(v) / Decimal("100")) for v in valores]


def criar_usuario(db_session, nome, email, perfil="administrador"):
    u = Usuario(nome=nome, email=email, perfil=perfil, ativo=True)
    u.set_password("Senha123")
    db_session.add(u)
    db_session.flush()
    return u


def criar_cliente_random(db_session, idx):
    dados = CLIENTES_RAW[idx % len(CLIENTES_RAW)]
    c = Cliente(
        nome=dados[0],
        documento=dados[1],
        telefone=f"11{random.randint(3000, 9999)}{random.randint(1000, 9999)}",
        email=f"contato@{dados[0].lower().replace(' ', '').replace('á', 'a').replace('ã', 'a').replace('é', 'e').replace('ó', 'o').replace('ô', 'o').replace('ú', 'u').replace('ç', 'c')[:30]}.com.br",
        municipio=f"Cidade {idx + 1}",
        uf=dados[2],
        cep=f"{random.randint(10000, 99999)}{random.randint(100, 999)}",
    )
    db_session.add(c)
    db_session.flush()
    return c


# ---------------------------------------------------------------------------
# Main seed logic
# ---------------------------------------------------------------------------


def seed():
    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.create_all()

        print("🔨 AMP Usinagem — Seed de 6 meses de uso intensivo")
        print("=" * 60)

        # --- Usuários ---
        usuarios = []
        usuarios.append(criar_usuario(db.session, "Carlos Silva", "carlos@amp.com", "administrador"))
        usuarios.append(criar_usuario(db.session, "Ana Oliveira", "ana@amp.com", "financeiro"))
        usuarios.append(criar_usuario(db.session, "Pedro Santos", "pedro@amp.com", "producao"))
        usuarios.append(criar_usuario(db.session, "Maria Costa", "maria@amp.com", "comercial"))
        print(f"  ✅ {len(usuarios)} usuários criados")

        # --- Clientes ---
        clientes = []
        for i in range(50):
            clientes.append(criar_cliente_random(db.session, i))
        print(f"  ✅ {len(clientes)} clientes criados")

        # --- Orçamentos ---
        orcamentos = []
        status_orc_possiveis = ["rascunho", "enviado", "aprovado", "reprovado", "cancelado"]
        pesos_orc = [0.05, 0.20, 0.50, 0.15, 0.10]

        # Track orçamentos aprovados para gerar OS e financeiro depois
        orcamentos_aprovados = []

        for i in range(150):
            cliente = random.choice(clientes)
            data_criacao = random_date(SEED_START, SEED_END - timedelta(days=10))
            validade = data_criacao + timedelta(days=random.randint(15, 60))
            valor = round(random.uniform(300, 45000), 2)
            status = random.choices(status_orc_possiveis, weights=pesos_orc, k=1)[0]
            servico = random.choice(SERVICOS)
            material = random.choice(MATERIAIS)
            qtd = random.randint(5, 200)

            o = Orcamento(
                numero=f"ORC-{2026}-{i + 1:04d}",
                cliente_id=cliente.id,
                titulo=f"{servico} — {qtd}x {material}",
                descricao=f"{qtd} peças em {material}. Serviço: {servico}. "
                f"Especificação: tolerância ±0.02mm, acabamento Ra 1.6.",
                valor=valor,
                validade=validade,
                status=status,
                observacao=random.choice([
                    None,
                    "Entrega urgente",
                    "Cliente solicitou amostra",
                    "Aguardando aprovação do projeto",
                    "Peça prototype — lote único",
                    "Retrabalho do lote anterior",
                    f"Material: {material}",
                    "Incluir relatório dimensional",
                    None,
                ]),
                created_at=data_criacao,
            )
            o.created_at = data_criacao
            db.session.add(o)
            db.session.flush()
            orcamentos.append(o)

            if status == "aprovado":
                orcamentos_aprovados.append(o)

        print(f"  ✅ {len(orcamentos)} orçamentos criados ({len(orcamentos_aprovados)} aprovados)")

        # --- Ordens de Serviço (via garantir_os_para_orcamento) ---
        os_count = 0
        os_list = []
        for o in orcamentos_aprovados:
            os_gerada, _ = garantir_os_para_orcamento(o)
            if os_gerada:
                # Progressão realista de status
                progresso = random.choices(
                    ["solicitado", "em_andamento", "revisao", "concluido"],
                    weights=[0.10, 0.35, 0.25, 0.30],
                    k=1,
                )[0]
                os_gerada.status = progresso
                os_gerada.prioridade = random.choice(PRIORIDADES)
                os_gerada.responsavel = random.choice([
                    "Carlos", "Pedro", "João", "Fernando", "Roberto",
                    "André", "Lucas", "Marcos",
                ])
                os_gerada.prazo = (
                    random_date(SEED_START + timedelta(days=30), SEED_END)
                    .isoformat()
                )
                db.session.flush()
                os_list.append(os_gerada)
                os_count += 1

        # Also create some manual OS (not from orçamentos)
        for i in range(30):
            cliente = random.choice(clientes)
            os_manual = OrdemServico(
                numero=proximo_numero_os(),
                cliente=cliente.nome,
                servico=random.choice(SERVICOS),
                prioridade=random.choice(PRIORIDADES),
                prazo=random_date(SEED_START + timedelta(days=15), SEED_END).isoformat(),
                responsavel=random.choice(["Carlos", "Pedro", "João", "Fernando"]),
                descricao=f"OS manual: {random.choice(SERVICOS)} em {random.choice(MATERIAIS)}",
                status=random.choices(
                    ["solicitado", "em_andamento", "revisao", "concluido"],
                    weights=[0.15, 0.30, 0.25, 0.30],
                    k=1,
                )[0],
            )
            db.session.add(os_manual)
            db.session.flush()
            os_list.append(os_manual)
            os_count += 1

        print(f"  ✅ {os_count} ordens de serviço criadas")

        # --- Lançamentos financeiros ---
        lanc_count = 0

        # 1) Financeiro derivado de orçamentos aprovados
        for o in orcamentos_aprovados:
            lanc, _ = garantir_lancamento_para_orcamento(o)
            if lanc:
                # Progressão de pagamento realista
                created = o.created_at
                created_date = created if isinstance(created, date) else created.date()
                dias_desde_criacao = (SEED_END - created_date).days
                if dias_desde_criacao > 45:
                    # Maioria paga após 45 dias
                    if random.random() < 0.75:
                        lanc.data_pagamento = created_date + timedelta(
                            days=random.randint(15, 60)
                        )
                        lanc.forma_pagamento = random.choice(FORMAS_PAGAMENTO)
                elif dias_desde_criacao > 20:
                    # Alguns pagos rapidamente
                    if random.random() < 0.30:
                        lanc.data_pagamento = created_date + timedelta(
                            days=random.randint(5, 20)
                        )
                        lanc.forma_pagamento = random.choice(FORMAS_PAGAMENTO)
                db.session.flush()
                lanc_count += 1

        # 2) Despesas fixas mensais (aluguel, energia, software, etc.)
        despesas_fixas = [
            ("Aluguel galpão", 8500.00, "pagar"),
            ("Energia elétrica", 2200.00, "pagar"),
            ("Água + esgoto", 450.00, "pagar"),
            ("Internet fibra", 280.00, "pagar"),
            ("Software CAD/CAM", 1200.00, "pagar"),
            ("Seguro patrimonial", 1800.00, "pagar"),
            ("Manutenção preventiva máquinas", 3500.00, "pagar"),
            ("Combível transportes", 1500.00, "pagar"),
            ("Refrigeração industrial", 900.00, "pagar"),
            ("Uniformes EPI", 600.00, "pagar"),
        ]

        for mes_offset in range(6):
            mes_atual = SEED_START + timedelta(days=30 * mes_offset)
            for desc, valor_base, tipo in despesas_fixas:
                valor = valor_base * random.uniform(0.85, 1.15)
                valor = round(valor, 2)
                vencimento = mes_atual.replace(day=random.randint(5, 20))
                if vencimento > SEED_END:
                    continue

                l = Lancamento(
                    tipo=tipo,
                    descricao=desc,
                    vencimento=vencimento,
                    valor=valor,
                    parcelas=1,
                    parcela_num=1,
                )
                # Pagamento realista
                if (SEED_END - vencimento).days > 10:
                    if random.random() < 0.85:
                        l.data_pagamento = vencimento + timedelta(
                            days=random.randint(1, 15)
                        )
                        l.forma_pagamento = random.choice(FORMAS_PAGAMENTO)
                db.session.add(l)
                lanc_count += 1

        # 3) Receitas avulsas (reparos, manutenções, serviços pontuais)
        receitas_avulsas = [
            "Reparo de urgência — fresa quebrada",
            "Manutenção corretiva prensa hidráulica",
            "Ajuste de fixtura — cambio rápido",
            "Retrabalho de peça defeituosa",
            "Serviço de usinagem emergencial",
            "Calibração de ferramental",
            "Troca de inserts de usinagem",
            "Serviço de solda emergencial",
            "Montagem de bancada de teste",
            "Protoype de componente novo",
        ]

        for i in range(80):
            cliente = random.choice(clientes)
            desc = random.choice(receitas_avulsas)
            vencimento = random_date(SEED_START, SEED_END)
            valor = round(random.uniform(200, 15000), 2)
            parcelas = random.choices([1, 2, 3, 4, 6], weights=[0.50, 0.20, 0.15, 0.10, 0.05], k=1)[0]

            if parcelas == 1:
                l = Lancamento(
                    tipo="receber",
                    cliente_id=cliente.id,
                    descricao=f"{desc} — {cliente.nome}",
                    vencimento=vencimento,
                    valor=valor,
                    parcelas=1,
                    parcela_num=1,
                )
                if (SEED_END - vencimento).days > 7 and random.random() < 0.70:
                    l.data_pagamento = vencimento + timedelta(days=random.randint(1, 20))
                    l.forma_pagamento = random.choice(FORMAS_PAGAMENTO)
                db.session.add(l)
                lanc_count += 1
            else:
                valores = distribuir_valor(valor, parcelas)
                for p in range(parcelas):
                    venc = vencimento + timedelta(days=30 * p)
                    if venc > SEED_END:
                        continue
                    l = Lancamento(
                        tipo="receber",
                        cliente_id=cliente.id,
                        descricao=f"{desc} — {cliente.nome} ({p + 1}/{parcelas})",
                        vencimento=venc,
                        valor=valores[p],
                        parcelas=parcelas,
                        parcela_num=p + 1,
                    )
                    if (SEED_END - venc).days > 7 and random.random() < 0.65:
                        l.data_pagamento = venc + timedelta(days=random.randint(1, 15))
                        l.forma_pagamento = random.choice(FORMAS_PAGAMENTO)
                    db.session.add(l)
                    lanc_count += 1

        # 4) Despesas parceladas (compras de material, equipamentos)
        compras_parceladas = [
            ("Compra de aço 1045 — lote grande", 45000.00, 6),
            ("Compra de aço 4140 — lote médio", 28000.00, 4),
            ("Compra de alumínio 6061", 18000.00, 3),
            ("Compra de inserts de usinagem", 8500.00, 2),
            ("Compra de ferramental CNC", 35000.00, 6),
            ("Manutenção preventiva torno CNC", 12000.00, 3),
            ("Compra de material eletrodo solda", 6000.00, 2),
            ("Atualização software CAD", 9500.00, 3),
            ("Compra de instrumentos medição", 15000.00, 4),
            ("Reforma do galpão", 42000.00, 6),
        ]

        for desc, valor_total, parcelas in compras_parceladas:
            vencimento_base = random_date(SEED_START, SEED_END - timedelta(days=60))
            valores = distribuir_valor(valor_total, parcelas)
            for p in range(parcelas):
                venc = vencimento_base + timedelta(days=30 * p)
                if venc > SEED_END:
                    continue
                l = Lancamento(
                    tipo="pagar",
                    descricao=f"{desc} ({p + 1}/{parcelas})",
                    vencimento=venc,
                    valor=valores[p],
                    parcelas=parcelas,
                    parcela_num=p + 1,
                )
                if (SEED_END - venc).days > 10 and random.random() < 0.80:
                    l.data_pagamento = venc + timedelta(days=random.randint(3, 20))
                    l.forma_pagamento = random.choice(FORMAS_PAGAMENTO)
                db.session.add(l)
                lanc_count += 1

        print(f"  ✅ {lanc_count} lançamentos financeiros criados")

        # --- Resumo ---
        db.session.commit()

        total_lanc = Lancamento.query.count()
        pagos = Lancamento.query.filter(Lancamento.data_pagamento.isnot(None)).count()
        pendentes = Lancamento.query.filter(Lancamento.data_pagamento.is_(None)).count()
        atrasados = Lancamento.query.filter(
            Lancamento.data_pagamento.is_(None),
            Lancamento.vencimento < SEED_END,
        ).count()

        total_receber = float(
            db.session.query(
                db.func.coalesce(db.func.sum(Lancamento.valor), 0)
            ).filter(Lancamento.tipo == "receber").scalar()
        )
        total_pagar = float(
            db.session.query(
                db.func.coalesce(db.func.sum(Lancamento.valor), 0)
            ).filter(Lancamento.tipo == "pagar").scalar()
        )

        print()
        print("=" * 60)
        print("📊 RESUMO DO BANCO SEED")
        print("=" * 60)
        print(f"  Usuários:          {Usuario.query.count()}")
        print(f"  Clientes:          {Cliente.query.count()}")
        print(f"  Orçamentos:        {Orcamento.query.count()}")
        print(f"    - Aprovados:     {Orcamento.query.filter_by(status='aprovado').count()}")
        print(f"    - Enviados:      {Orcamento.query.filter_by(status='enviado').count()}")
        print(f"    - Reprovados:    {Orcamento.query.filter_by(status='reprovado').count()}")
        print(f"  Ordens de Serviço: {OrdemServico.query.count()}")
        print(f"    - Solicitado:    {OrdemServico.query.filter_by(status='solicitado').count()}")
        print(f"    - Em andamento:  {OrdemServico.query.filter_by(status='em_andamento').count()}")
        print(f"    - Revisão:       {OrdemServico.query.filter_by(status='revisao').count()}")
        print(f"    - Concluído:     {OrdemServico.query.filter_by(status='concluido').count()}")
        print(f"  Lançamentos:       {total_lanc}")
        print(f"    - Pagos:         {pagos}")
        print(f"    - Pendentes:     {pendentes}")
        print(f"    - Atrasados:     {atrasados}")
        print(f"  Total a receber:   R$ {total_receber:,.2f}")
        print(f"  Total a pagar:     R$ {total_pagar:,.2f}")
        print(f"  Saldo previsto:    R$ {total_receber - total_pagar:,.2f}")
        print()
        print(f"  📁 Banco: {TEST_DB.as_posix()}")
        print(f"  📏 Tamanho: {TEST_DB.stat().st_size / 1024:.1f} KB")
        print()
        print("  ✅ Seed completo!")


if __name__ == "__main__":
    seed()
