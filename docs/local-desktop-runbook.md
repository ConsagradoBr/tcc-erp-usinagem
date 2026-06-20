# AMP Usinagem — validação desktop local

## Objetivo

Validar a versão desktop local sem gerar o `.exe` Windows.

O executável oficial deve ser produzido em Windows pelo fluxo de release. No repositório, os binários de distribuição (`.exe`/`.zip`) não são versionados; eles devem ser publicados em GitHub Releases.

## Pré-requisitos

```bash
python -m venv .venv
.venv/bin/python -m pip install -r backend/requirements.txt -r dev-requirements.txt -r desktop-requirements.txt
npm ci
npm run build
```

## Smoke test do host desktop

O teste abaixo valida o mesmo host local usado pelo `desktop_app.py`, servindo o build Vite por Flask/Waitress em uma porta isolada.

```bash
mkdir -p .runtime-desktop .tmp

DESKTOP_PORT=5055 \
PORT=5055 \
APP_ENV=development \
DATABASE_URL="sqlite:////CAMINHO_ABSOLUTO_DO_PROJETO/.runtime-desktop/app.sqlite3" \
AMP_RUNTIME_DIR="/CAMINHO_ABSOLUTO_DO_PROJETO/.runtime-desktop" \
SECRET_KEY="desktop_local_secret_key_amp_usinagem_32_chars" \
JWT_SECRET_KEY="desktop_local_jwt_secret_key_amp_usinagem_32_chars" \
.venv/bin/python - <<'PY'
import json
import time
import urllib.request
from threading import Thread

import desktop_app

Thread(target=desktop_app.run_server, daemon=True).start()
if not desktop_app.wait_for_server(timeout=20):
    raise SystemExit("desktop waitress server did not start")

checks = {}
for path in ["/auth/bootstrap-status", "/", "/app/dashboard", "/manifest.webmanifest"]:
    url = desktop_app.URL + path
    with urllib.request.urlopen(url, timeout=10) as response:
        body = response.read(500).decode("utf-8", errors="ignore")
        checks[path] = {"status": response.status, "sample": body[:120]}

print(json.dumps(checks, ensure_ascii=False, indent=2))
time.sleep(1)
PY
```

## Estado validado

- Build web em `dist/`: OK
- `desktop_app.py` importando backend e registrando rota SPA: OK
- Servidor local Waitress: OK
- `/auth/bootstrap-status`: OK
- `/`: OK
- `/app/dashboard`: OK
- `/manifest.webmanifest`: OK
- SQLite desktop isolado em `.runtime-desktop/`: OK

## Caminho esperado do executável

Quando gerado no Windows, o executável esperado é:

```text
dist/AMP Usinagem Industrial.exe
```

## Release oficial no Windows

```bash
npm run build:desktop
```

O build usa `AMP Usinagem Industrial.spec` e deve ser executado em Windows porque o artefato final é `.exe`.
