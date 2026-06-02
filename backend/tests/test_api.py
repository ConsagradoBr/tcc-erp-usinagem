import base64
import os
import sqlite3
import subprocess
from pathlib import Path

import pytest

TEST_DB = Path(__file__).resolve().parents[1] / "test_app.sqlite3"
os.environ["APP_ENV"] = "testing"
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


def criar_admin_inicial(client, nome="Teste", email="teste@amp.com", senha="Senha123"):
    response = client.post(
        "/auth/usuarios", json={"nome": nome, "email": email, "senha": senha}
    )
    assert response.status_code == 201
    return response.get_json()["user"]


def login(client, email="teste@amp.com", senha="Senha123"):
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
        json={"nome": "Intruso", "email": "intruso@amp.com", "senha": "Senha123"},
    )
    assert bloqueado.status_code == 401

    criado = client.post(
        "/auth/usuarios",
        headers=headers,
        json={
            "nome": "Financeiro",
            "email": "fin@amp.com",
            "senha": "Senha123",
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
            "senha": "Senha123",
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


def test_cliente_persiste_campos_fiscais_nfe(client):
    headers = auth_headers(client)
    payload = {
        "nome": "FUNDICAO REGALI BRASIL LTDA.",
        "documento": "07.702.969/0001-53",
        "telefone": "19380574001",
        "endereco": "R DR.JOSE FABIANO DE CHRISTO GURJAO, 490, DISTRITO II, Mogi Mirim, SP - CEP: 13803705",
        "inscricao_estadual": "456064276113",
        "indicador_ie_destinatario": "1",
        "logradouro": "R DR.JOSE FABIANO DE CHRISTO GURJAO",
        "numero": "490",
        "bairro": "DISTRITO II",
        "codigo_municipio": "3530805",
        "municipio": "Mogi Mirim",
        "uf": "SP",
        "cep": "13803705",
        "codigo_pais": "1058",
        "pais": "BRASIL",
    }

    criado = client.post("/clientes", headers=headers, json=payload)
    assert criado.status_code == 201
    data = criado.get_json()
    assert data["inscricao_estadual"] == "456064276113"
    assert data["municipio"] == "Mogi Mirim"
    assert data["uf"] == "SP"
    assert data["cep"] == "13803705"

    busca = client.get("/clientes", headers=headers, query_string={"q": "13803705"})
    assert busca.status_code == 200
    assert busca.get_json()[0]["documento"] == "07.702.969/0001-53"

    editado = client.put(
        f"/clientes/{data['id']}",
        headers=headers,
        json={"nome": payload["nome"], "municipio": "Mogi Guaçu", "uf": "sp"},
    )
    assert editado.status_code == 200
    assert editado.get_json()["municipio"] == "Mogi Guaçu"
    assert editado.get_json()["uf"] == "SP"


def test_cruds_retornam_404_sem_virar_500(client):
    headers = auth_headers(client)

    cliente = client.put("/clientes/9999", headers=headers, json={"nome": "Nao existe"})
    assert cliente.status_code == 404

    cliente_delete = client.delete("/clientes/9999", headers=headers)
    assert cliente_delete.status_code == 404

    os_put = client.put(
        "/ordens-servico/9999", headers=headers, json={"cliente": "X"}
    )
    assert os_put.status_code == 404

    os_patch = client.patch(
        "/ordens-servico/9999/status", headers=headers, json={"status": "concluido"}
    )
    assert os_patch.status_code == 404

    os_delete = client.delete("/ordens-servico/9999", headers=headers)
    assert os_delete.status_code == 404

    financeiro_put = client.put(
        "/financeiro/9999", headers=headers, json={"descricao": "Nao existe"}
    )
    assert financeiro_put.status_code == 404

    financeiro_patch = client.patch("/financeiro/9999/pagar", headers=headers, json={})
    assert financeiro_patch.status_code == 404

    financeiro_delete = client.delete("/financeiro/9999", headers=headers)
    assert financeiro_delete.status_code == 404

    orcamento_put = client.put(
        "/orcamentos/9999", headers=headers, json={"titulo": "Nao existe"}
    )
    assert orcamento_put.status_code == 404

    orcamento_patch = client.patch(
        "/orcamentos/9999/status", headers=headers, json={"status": "aprovado"}
    )
    assert orcamento_patch.status_code == 404

    orcamento_delete = client.delete("/orcamentos/9999", headers=headers)
    assert orcamento_delete.status_code == 404


def test_json_invalido_e_tipos_invalidos_retornam_400(client):
    headers = auth_headers(client)

    malformado = client.post(
        "/clientes",
        headers=headers,
        data="{json",
        content_type="application/json",
    )
    assert malformado.status_code == 400

    content_type_errado = client.post(
        "/clientes",
        headers=headers,
        data='{"nome": "Metal Forte"}',
        content_type="text/plain",
    )
    assert content_type_errado.status_code == 400
    assert "Content-Type" in content_type_errado.get_json()["erro"]

    lista = client.post("/financeiro", headers=headers, json=["nao", "objeto"])
    assert lista.status_code == 400

    tipo_errado = client.post("/clientes", headers=headers, json={"nome": 123})
    assert tipo_errado.status_code == 400


def test_bootstrap_rejeita_email_invalido_e_senha_fraca(client):
    email_invalido = client.post(
        "/auth/usuarios",
        json={"nome": "Admin Local", "email": "admin-local", "senha": "Senha123"},
    )
    assert email_invalido.status_code == 400
    assert email_invalido.get_json()["erro"] == "Informe um e-mail valido."

    senha_fraca = client.post(
        "/auth/usuarios",
        json={"nome": "Admin Local", "email": "admin@amp.com", "senha": "123456"},
    )
    assert senha_fraca.status_code == 400
    assert "Senha precisa ter pelo menos" in senha_fraca.get_json()["erro"]

    sem_maiuscula = client.post(
        "/auth/usuarios",
        json={"nome": "Admin Local", "email": "admin@amp.com", "senha": "senha123"},
    )
    assert sem_maiuscula.status_code == 400
    assert sem_maiuscula.get_json()["erro"] == (
        "Senha precisa ter ao menos uma letra maiuscula."
    )


def test_login_exige_campos_validos(client):
    criar_admin_inicial(client)

    sem_email = client.post("/auth/login", json={"senha": "Senha123"})
    assert sem_email.status_code == 400
    assert sem_email.get_json()["erro"] == "E-mail e obrigatorio."

    email_invalido = client.post(
        "/auth/login", json={"email": "admin-amp", "senha": "Senha123"}
    )
    assert email_invalido.status_code == 400
    assert email_invalido.get_json()["erro"] == "Informe um e-mail valido."

    sem_senha = client.post("/auth/login", json={"email": "teste@amp.com"})
    assert sem_senha.status_code == 400
    assert sem_senha.get_json()["erro"] == "Senha e obrigatoria."


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

    resumo_atualizado = client.get("/orcamentos/resumo", headers=headers)
    assert resumo_atualizado.status_code == 200
    assert resumo_atualizado.get_json()["valor_aprovado_ativo"] == 8500.0


def test_excluir_cliente_com_orcamento_retorna_conflito(client):
    headers = auth_headers(client)
    cliente_id = criar_cliente(client, headers)
    criar_orcamento(client, headers, cliente_id)

    response = client.delete(f"/clientes/{cliente_id}", headers=headers)

    assert response.status_code == 409
    assert "orcamentos vinculados" in response.get_json()["erro"]


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

    data_invalida = client.put(
        f"/orcamentos/{item_id}",
        headers=headers,
        json={"validade": "15/05/2026"},
    )
    assert data_invalida.status_code == 400


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


def test_financeiro_valida_dados_e_preserva_total_parcelado(client):
    headers = auth_headers(client)
    cliente_id = criar_cliente(client, headers)

    valor_zero = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "receber",
            "descricao": "Receita",
            "vencimento": "2026-03-25",
            "valor": 0,
        },
    )
    assert valor_zero.status_code == 400

    valor_negativo = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "receber",
            "descricao": "Receita",
            "vencimento": "2026-03-25",
            "valor": -10,
        },
    )
    assert valor_negativo.status_code == 400

    parcelas_zero = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "receber",
            "descricao": "Receita",
            "vencimento": "2026-03-25",
            "valor": 100,
            "parcelas": 0,
        },
    )
    assert parcelas_zero.status_code == 400

    cliente_inexistente = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "receber",
            "descricao": "Receita",
            "vencimento": "2026-03-25",
            "valor": 100,
            "cliente_id": 9999,
        },
    )
    assert cliente_inexistente.status_code == 404

    data_invalida = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "receber",
            "descricao": "Receita",
            "vencimento": "25/03/2026",
            "valor": 100,
        },
    )
    assert data_invalida.status_code == 400

    criado = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "pagar",
            "descricao": "Despesa",
            "vencimento": "2026-03-25",
            "valor": 100,
        },
    )
    assert criado.status_code == 201
    pagamento_invalido = client.patch(
        f"/financeiro/{criado.get_json()['id']}/pagar",
        headers=headers,
        json={"data_pagamento": "25/03/2026"},
    )
    assert pagamento_invalido.status_code == 400

    parcelado = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "receber",
            "descricao": "Receita arredondada",
            "vencimento": "2026-03-25",
            "valor": 100,
            "parcelas": 3,
            "cliente_id": cliente_id,
        },
    )
    assert parcelado.status_code == 201
    valores = [item["valor"] for item in parcelado.get_json()]
    assert valores == [33.33, 33.33, 33.34]
    assert round(sum(valores), 2) == 100.0


def test_edicao_de_lancamento_permite_reparcelar_recebimento(client):
    headers = auth_headers(client)

    criado = client.post(
        "/financeiro",
        headers=headers,
        json={
            "tipo": "receber",
            "descricao": "Receita da OS-15",
            "vencimento": "2026-03-25",
            "valor": 2000.0,
        },
    )
    assert criado.status_code == 201
    item_id = criado.get_json()["id"]

    editado = client.put(
        f"/financeiro/{item_id}",
        headers=headers,
        json={
            "descricao": "Receita da OS-15",
            "vencimento": "2026-03-25",
            "valor": 2000.0,
            "parcelas": 4,
            "prazo_dias": 30,
        },
    )
    assert editado.status_code == 200
    assert editado.get_json()["parcelas"] == 4

    financeiro = client.get("/financeiro", headers=headers)
    assert financeiro.status_code == 200
    grupo = [
        item
        for item in financeiro.get_json()
        if item["descricao"].startswith("Receita da OS-15")
    ]
    assert len(grupo) == 4
    assert sum(item["valor"] for item in grupo) == 2000.0


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
    assert "caminho_banco" not in info.get_json()
    assert "pasta_backups" in info.get_json()

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
    assert "/" not in restore.get_json()["backup_seguranca"]

    listar_depois = client.get("/clientes", headers=headers)
    payload = listar_depois.get_json()
    assert len(payload) == 1
    assert payload[0]["id"] == cliente_original_id


def test_restore_rejeita_sqlite_sem_schema_minimo(client, tmp_path):
    headers = auth_headers(client)
    invalido = tmp_path / "invalido.sqlite3"
    with sqlite3.connect(invalido) as conn:
        conn.execute("CREATE TABLE qualquer (id INTEGER PRIMARY KEY)")

    response = client.post(
        "/sistema/restaurar",
        headers=headers,
        json={
            "nome_arquivo": "invalido.sqlite3",
            "arquivo_base64": base64.b64encode(invalido.read_bytes()).decode("utf-8"),
        },
    )

    assert response.status_code == 400
    assert "schema minimo" in response.get_json()["erro"]


def test_restore_rejeita_payload_acima_do_limite(client, monkeypatch):
    headers = auth_headers(client)
    monkeypatch.setenv("BACKUP_MAX_BYTES", "16")

    response = client.post(
        "/sistema/restaurar",
        headers=headers,
        json={
            "nome_arquivo": "grande.sqlite3",
            "arquivo_base64": base64.b64encode(b"x" * 32).decode("utf-8"),
        },
    )

    assert response.status_code == 413


def test_scripts_legados_usam_factory_e_extensions(tmp_path):
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///{(tmp_path / 'scripts.sqlite3').as_posix()}"
    env["SECRET_KEY"] = "test-secret-key-with-32-characters!!"
    env["JWT_SECRET_KEY"] = "test-secret-key-with-32-characters!!"
    env["APP_ENV"] = "testing"
    root = Path(__file__).resolve().parents[2]

    create = subprocess.run(
        [sys.executable, "backend/create_tables.py"],
        cwd=root,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    assert create.returncode == 0, create.stderr
    assert "Tabelas verificadas/criadas" in create.stdout

    migrate = subprocess.run(
        [sys.executable, "backend/migrate.py"],
        cwd=root,
        env=env,
        check=False,
        capture_output=True,
        text=True,
    )
    assert migrate.returncode == 0, migrate.stderr
    assert "Schema ja estava atualizado" in migrate.stdout
