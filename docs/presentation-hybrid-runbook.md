# AMP Usinagem — roteiro de apresentação híbrida

## Objetivo da demonstração

Mostrar que o AMP ERP funciona em dois modelos reais de uso:

1. **Local/offline**: operação interna, banco SQLite local e backup no computador da empresa.
2. **Web/publicado**: frontend hospedado, API pública e possibilidade de apontar domínio próprio.

Também existe um terceiro caminho de contingência para apresentação: **túnel temporário** expondo a API local quando um provedor externo estiver instável.

---

## Plano A — Local/offline

Use quando quiser máxima confiabilidade na banca.

### Estado validado

- Build frontend: OK
- Host desktop/local: OK
- SQLite local: OK
- Login/admin inicial: OK
- Clientes: OK
- Orçamentos: OK
- Aprovação gerando OS: OK
- Aprovação gerando financeiro: OK
- Backup: OK

### Mensagem para a banca

> Esta versão atende empresas que querem operar internamente, sem depender de conexão constante. O sistema roda localmente, usa banco SQLite e permite backup dos dados.

---

## Plano B — Web/publicado

Frontend em produção:

```text
https://tcc-erp-usinagem.vercel.app
```

### Estado validado

- Vercel production deploy: OK
- SPA rewrite em `/app/dashboard`: OK
- Manifest/PWA: OK
- API pública configurada via `VITE_API_BASE_URL`: OK
- Fluxo web validado: admin → login → cliente → orçamento → aprovação → OS → financeiro.

### Configuração atual para apresentação

No momento, a Vercel está apontando para a API exposta por túnel ngrok:

```text
https://afterlife-cubbyhole-statue.ngrok-free.dev
```

Essa URL funciona enquanto o túnel local estiver ativo.

### Mensagem para a banca

> A mesma base do sistema pode ser publicada em ambiente web. O frontend fica hospedado na Vercel, a API pode ficar em Render, Railway, VPS ou outro provedor, e o cliente pode usar domínio próprio quando quiser.

---

## Plano C — Túnel de contingência

Use quando o backend hospedado externo estiver instável ou dormindo.

### Subir API local

```bash
mkdir -p .runtime-web-demo .tmp

APP_ENV=development \
FLASK_DEBUG=false \
FLASK_HOST=127.0.0.1 \
FLASK_PORT=5000 \
DATABASE_URL="sqlite:////CAMINHO_ABSOLUTO_DO_PROJETO/.runtime-web-demo/app.sqlite3" \
SECRET_KEY="web_demo_secret_key_amp_usinagem_32_chars" \
JWT_SECRET_KEY="web_demo_jwt_secret_key_amp_usinagem_32_chars" \
CORS_ORIGINS="https://tcc-erp-usinagem.vercel.app,https://tcc-erp-usinagem-consagradobrs-projects.vercel.app,http://localhost:5173,http://127.0.0.1:5173" \
.venv/bin/python backend/app.py
```

Health check local:

```bash
python - <<'PY'
import urllib.request
with urllib.request.urlopen('http://127.0.0.1:5000/auth/bootstrap-status') as r:
    print(r.status, r.read().decode())
PY
```

### Expor API com ngrok

```bash
ngrok http 5000
```

Health check público:

```bash
python - <<'PY'
import urllib.request
url = 'https://SUA-URL-NGROK/auth/bootstrap-status'
req = urllib.request.Request(url, headers={'ngrok-skip-browser-warning': 'true'})
with urllib.request.urlopen(req) as r:
    print(r.status, r.read().decode())
PY
```

### Atualizar Vercel para a URL do túnel

```bash
vercel env rm VITE_API_BASE_URL production --yes
printf '%s' 'https://SUA-URL-NGROK' | vercel env add VITE_API_BASE_URL production

VITE_API_BASE_URL='https://SUA-URL-NGROK' vercel build --prod
vercel deploy --prebuilt --prod
```

### Restaurar backend hospedado definitivo

Quando Render/Railway/VPS estiver corrigido, troque novamente:

```bash
vercel env rm VITE_API_BASE_URL production --yes
printf '%s' 'https://URL-DO-BACKEND-DEFINITIVO' | vercel env add VITE_API_BASE_URL production
vercel deploy --prod
```

---

## Credenciais de demonstração web atual

Ambiente da API local via túnel:

```text
E-mail: admin.web@amp.local
Senha: Senha123
```

Essas credenciais pertencem ao banco SQLite local `.runtime-web-demo/` e podem ser recriadas se o banco for removido.

---

## Observação importante

Para produção real do cliente, use backend permanente em Render/Railway/VPS com PostgreSQL/Supabase. O túnel é apenas contingência de apresentação.
