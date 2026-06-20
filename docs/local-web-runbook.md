# AMP Usinagem — execução web local

## Objetivo

Rodar a versão web local com frontend Vite e backend Flask usando SQLite local.

## Ambiente

Crie um `.env` na raiz do projeto com:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
APP_ENV=development
DATABASE_URL=sqlite:////CAMINHO_ABSOLUTO_DO_PROJETO/.runtime/app.sqlite3
JWT_SECRET_KEY=dev_jwt_secret_local_amp_usinagem_32_chars
SECRET_KEY=dev_secret_local_amp_usinagem_32_chars
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=false
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
```

> O diretório `.runtime/` é local, ignorado pelo Git e guarda o SQLite de desenvolvimento.

## Subir backend

```bash
python -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt -r dev-requirements.txt
mkdir -p .runtime .tmp
FLASK_DEBUG=false .venv/bin/python backend/app.py
```

Health check:

```bash
python - <<'PY'
import urllib.request
with urllib.request.urlopen('http://127.0.0.1:5000/auth/bootstrap-status') as r:
    print(r.status, r.read().decode())
PY
```

## Subir frontend

```bash
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

Se a porta `5173` estiver ocupada:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

## Primeiro acesso

1. Acesse `http://127.0.0.1:5173` ou `http://127.0.0.1:5174`.
2. Aceite os termos.
3. Como o banco está vazio, a tela cria o primeiro administrador.
4. Credenciais locais usadas na validação:
   - E-mail: `admin@amp.local`
   - Senha: `Senha123`

## Gate local recomendado

```bash
npm run build
npm run lint
npm audit --audit-level=low
.venv/bin/python -m pytest backend/tests -q
.venv/bin/python -m black --check backend desktop_app.py
.venv/bin/python -m ruff check backend desktop_app.py
.venv/bin/python -m compileall -q backend desktop_app.py
.venv/bin/python -m pip_audit -r backend/requirements.txt
```

## Estado validado

- Backend Flask: `http://127.0.0.1:5000`
- Frontend Vite: `http://127.0.0.1:5174`
- Bootstrap de admin: OK
- Login: OK
- Dashboard: OK
- Clientes: OK
- Orçamentos: OK
- Aprovação de orçamento gerando OS + financeiro: OK
- Ordens de serviço: OK
- Financeiro: OK
- Usuários: OK
- Backup: OK
