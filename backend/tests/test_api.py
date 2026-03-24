import base64
import os
from pathlib import Path

import pytest

TEST_DB = Path(__file__).resolve().parents[1] / "test_app.sqlite3"
os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB.as_posix()}"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-with-32-characters!!"
os.environ["SECRET_KEY"] = "test-secret-key-with-32-characters!!"

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from backend.app import app
from backend.extensions import db


@pytest.fixture()
def client():
    with app.app_context():
        db.session.remove()
        db.drop_all()
        db.create_all()

    with app.test_client() as test_client:
        yield test_client

    with app.app_context():
        db.session.remove()
        db.drop_all()


def criar_admin_inicial(client, nome="Teste", email="teste@amp.com", senha="123456"):
    response = client.post(
        "/auth/usuarios", json={"nome": nome, "email": email, "senha": senha}
    )
    assert response.status_code == 201
    return response.get_json()["user"]


def login(client, email="teste@amp.com", senha="123456"):
    response = client.post("/auth/login", json={"email": email, "senha": senha})
    assert response.status_code == 200
    return response.get_json()


def auth_headers(client):
    criar_admin_inicial(client)
    payload = login(client)
    return {"Authorization": f"Bearer {payload['token']}"}


def criar_cliente(client, headers, nome="Metal Forte"):
    response = client.post(
        "/clientes",
        headers=headers,
        json={"nome": nome, "email": f"{nome.lower().replace(' ', '')}@amp.com"},
    )
    assert response.status_code == 201
    return response.get_json()["id"]


def criar_orcamento(client, headers, cliente_id, **overrides):
    payload = {
        "cliente_id": cliente_id,
        "titulo": "Usinagem do lote A",
        "descricao": "20 peças em aço 1045",
        "valor": 8500.0,
        "validade": "2026-04-30",
        "status": "enviado",
    }
    payload.update(overrides)
    response = client.post("/orcamentos", headers=headers, json=payload)
    assert response.status_code == 201
    return response.get_json()


def test_bootstrap_cria_primeiro_admin(client):
    status = client.get("/auth/bootstrap-status")
    assert status.status_code == 200
    assert status.get_json()["bootstrap_required"] is True

    user = criar_admin_inicial(client, nome="Admin", email="admin@amp.com")
    assert user["perfil"] == "administrador"
    assert user["ativo"] is True
    assert "usuarios" in user["permissoes"]

    status_final = client.get("/auth/bootstrap-status")
    assert status_final.get_json()["bootstrap_required"] is False


def test_cadastro_publico_fica_bloqueado_apos_primeiro_usuario(client):
    headers = auth_headers(client)

    bloqueado = client.post(
        "/auth/usuarios",
        json={"nome": "Intruso", "email": "intruso@amp.com", "senha": "123456"},
    )
    assert bloqueado.status_code == 401

    criado = client.post(
        "/auth/usuarios",
        headers=headers,
        json={
            "nome": "Financeiro",
            "email": "fin@amp.com",
            "senha": "123456",
            "perfil": "financeiro",
            "ativo": True,
        },
    )
    assert criado.status_code == 201
    assert criado.get_json()["user"]["perfil"] == "financeiro"


def test_admin_cria_usuario_e_financeiro_tem_acesso_parcial(client):
    headers = auth_headers(client)
    client.post(
        "/auth/usuarios",
        headers=headers,
        json={
            "nome": "Financeiro",
            "email": "fin@amp.com",
            "senha": "123456",
            "perfil": "financeiro",
            "ativo": True,
        },
    )

    fin_login = login(client, email="fin@amp.com")
    fin_headers = {"Authorization": f"Bearer {fin_login['token']}"}

    cliente_id = criar_cliente(client, headers, nome="Cliente Admin")
    financeiro = client.get("/financeiro", headers=fin_headers)
    assert financeiro.status_code == 200

    orcamentos = client.get("/orcamentos", headers=fin_headers)
    assert orcamentos.status_code == 403

    clientes = client.get("/clientes", headers=fin_headers)
    assert clientes.status_code == 200

    os_response = client.get("/ordens-servico", headers=fin_headers)
    assert os_response.status_code == 403

    assert cliente_id > 0


def test_auth_profile_flow(client):
    headers = auth_headers(client)
    response = client.get("/auth/perfil", headers=headers)

    assert response.status_code == 200
    payload = response.get_json()["user"]
    assert payload["perfil"] == "administrador"
    assert "dashboard" in payload["permissoes"]


def test_clientes_e_orcamentos_flow(client):
    headers = auth_headers(client)
    cliente_id = criar_cliente(client, headers)
    criado = criar_orcamento(client, headers, cliente_id)

    numero = criado["numero"]
    assert numero.startswith("ORC-")

    listar = client.get("/orcamentos", headers=headers)
    assert listar.status_code == 200
    assert len(listar.get_json()) == 1

    resumo = client.get("/orcamentos/resumo", headers=headers)
    assert resumo.status_code == 200
    assert resumo.get_json()["enviado"] == 1

    item_id = listar.get_json()[0]["id"]
    patch = client.patch(
        f"/orcamentos/{item_id}/status", headers=headers, json={"status": "aprovado"}
    )
    assert patch.status_code == 200
    payload = patch.get_json()
    assert payload["status"] == "aprovado"
    assert payload["ordem_servico_criada"] is True
    assert payload["ordem_servico"]["servico"] == "Usinagem do lote A"
    assert payload["lancamento_financeiro_criado"] is True
    assert payload["lancamento_financeiro"]["tipo"] == "receber"
    assert payload["lancamento_financeiro"]["valor"] == 8500.0

    os_list = client.get("/ordens-servico", headers=headers)
    assert os_list.status_code == 200
    assert len(os_list.get_json()) == 1
    assert "[ORC:" in (os_list.get_json()[0]["descricao"] or "")

    financeiro = client.get("/financeiro", headers=headers)
    assert financeiro.status_code == 200
    assert len(financeiro.get_json()) == 1
    assert financeiro.get_json()[0]["tipo"] == "receber"
    assert "[ORC:" in financeiro.get_json()[0]["descricao"]


def test_reaprovar_orcamento_nao_duplica_os_ou_financeiro(client):
    headers = auth_headers(client)
    cliente_id = criar_cliente(client, headers)
    orc = criar_orcamento(client, headers, cliente_id)
    item_id = orc["id"]

    primeira = client.patch(
        f"/orcamentos/{item_id}/status", headers=headers, json={"status": "aprovado"}
    )
    assert primeira.status_code == 200
    segunda = client.patch(
        f"/orcamentos/{item_id}/status", headers=headers, json={"status": "aprovado"}
    )
    assert segunda.status_code == 200
    assert segunda.get_json()["ordem_servico_criada"] is False
    assert segunda.get_json()["lancamento_financeiro_criado"] is False

    os_list = client.get("/ordens-servico", headers=headers)
    financeiro = client.get("/financeiro", headers=headers)
    assert len(os_list.get_json()) == 1
    assert len(financeiro.get_json()) == 1


def test_edicao_de_orcamento_aprovado_sincroniza_os_e_financeiro(client):
    headers = auth_headers(client)
    cliente_id = criar_cliente(client, headers)
    orc = criar_orcamento(client, headers, cliente_id, status="aprovado")
    item_id = orc["id"]

    update = client.put(
        f"/orcamentos/{item_id}",
        headers=headers,
        json={
            "cliente_id": cliente_id,
            "titulo": "Usinagem do lote B",
            "descricao": "30 peças em aço 4140",
            "valor": 9100.0,
            "validade": "2026-05-15",
            "status": "aprovado",
            "observacao": "Entrega expressa",
        },
    )
    assert update.status_code == 200
    payload = update.get_json()
    assert payload["ordem_servico_criada"] is False
    assert payload["lancamento_financeiro_criado"] is False
    assert payload["ordem_servico"]["servico"] == "Usinagem do lote B"
    assert payload["lancamento_financeiro"]["valor"] == 9100.0
    assert payload["lancamento_financeiro"]["descricao"].endswith("Usinagem do lote B")


def test_financeiro_summary_e_parcelamento(client):
    headers = auth_headers(client)

    response = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "receber",
            "descricao": "Receita parcelada",
            "vencimento": "2026-03-25",
            "valor": 1500.0,
            "parcelas": 3,
            "prazo_dias": 30,
        },
    )
    assert response.status_code == 201
    assert len(response.get_json()) == 3

    resumo = client.get("/financeiro/resumo", headers=headers)
    data = resumo.get_json()
    assert resumo.status_code == 200
    assert data["a_receber"] >= 1500.0
    assert data["a_pagar"] == 0


def test_criacao_manual_de_os_permanece_funcional(client):
    headers = auth_headers(client)
    response = client.post(
        "/ordens-servico",
        headers=headers,
        json={
            "cliente": "Metal Forte",
            "servico": "Torneamento CNC",
            "prioridade": "alta",
            "prazo": "10/04/2026",
            "responsavel": "Carlos",
            "descricao": "Produção manual",
            "status": "solicitado",
        },
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["os"].startswith("OS-")
    assert payload["servico"] == "Torneamento CNC"


def test_backup_e_restauracao_do_sqlite_local(client):
    headers = auth_headers(client)
    cliente_original_id = criar_cliente(client, headers, nome="Cliente Base")

    info = client.get("/sistema/backup-info", headers=headers)
    assert info.status_code == 200
    assert info.get_json()["suporta_backup_local"] is True

    backup = client.post("/sistema/backup", headers=headers)
    assert backup.status_code == 200
    backup_bytes = backup.data
    assert backup_bytes

    criar_cliente(client, headers, nome="Cliente Temporario")
    listar_antes = client.get("/clientes", headers=headers)
    assert len(listar_antes.get_json()) == 2

    restore = client.post(
        "/sistema/restaurar",
        headers=headers,
        json={
            "nome_arquivo": "backup.sqlite3",
            "arquivo_base64": base64.b64encode(backup_bytes).decode("utf-8"),
        },
    )
    assert restore.status_code == 200

    listar_depois = client.get("/clientes", headers=headers)
    payload = listar_depois.get_json()
    assert len(payload) == 1
    assert payload[0]["id"] == cliente_original_id
