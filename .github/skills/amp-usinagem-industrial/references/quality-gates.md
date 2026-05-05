# Quality Gates

## Objetivo

Toda mudança relevante neste projeto deve preservar quatro coisas:

- clareza visual
- coerência de fluxo
- estabilidade do desktop nativo
- previsibilidade de build e release

## Comandos padrão de validação

### Frontend

```bash
npm run lint
npm run build
```

### Backend

```bash
python -m pytest backend\\tests -q
```

### Desktop

```bash
npm run build:desktop
```

## Quando validar desktop

Rode validação desktop sempre que mexer em:

- `desktop_app.py`
- shell global
- build desktop
- assets essenciais do app
- release ou scripts de empacotamento

Quando possível, confirme:
- abre em janela nativa
- não cai no navegador por padrão
- primeira abertura funciona em outro computador

## Release oficial

Prepare os artefatos:

```bash
powershell -ExecutionPolicy Bypass -File scripts/Prepare-GitHubRelease.ps1 -Version vYYYY.MM.DD.HHMMSS
```

Publique a release:

```bash
powershell -ExecutionPolicy Bypass -File scripts/Publish-GitHubRelease.ps1 -Version vYYYY.MM.DD.HHMMSS
```

## Checklist antes de encerrar uma entrega forte

- lint limpo
- build web ok
- testes backend ok
- desktop validado se afetado
- release atualizada se afetada
- solução coerente com a cadeia `cliente -> orçamento -> OS -> financeiro`
- interface final coerente com a direção visual da AMP

## Compatibilidade e segurança operacional

- preserve compatibilidade com SQLite local
- trate PostgreSQL como ambiente configurável, não como dependência fixa
- mudanças de estrutura devem respeitar bases existentes
- evite regressão de fluxo por ajustes visuais
- evite regressão visual por automação improvisada
