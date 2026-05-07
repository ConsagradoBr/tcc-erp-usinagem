# Índice De Documentação

Use estes arquivos como referência oficial para apresentação e manutenção:

- [README.md](README.md): visão geral, módulos, ambiente, testes e desktop.
- [QUICK_START.md](QUICK_START.md): execução rápida e rotas principais.
- [ROUTES_NAVIGATION.md](ROUTES_NAVIGATION.md): mapa técnico das rotas e permissões.
- [VALIDATION_CHECKLIST.md](VALIDATION_CHECKLIST.md): checklist manual de validação.
- [CHANGELOG.md](CHANGELOG.md): histórico de mudanças.

Os demais arquivos Markdown na raiz são registros auxiliares de fases anteriores. Para explicar o sistema no TCC, priorize os documentos acima e o código em `src/routes.jsx`, `src/auth.js`, `src/pages/` e `backend/blueprints/`.

## Rotas Oficiais

```text
/login
/app/dashboard
/app/clientes
/app/orcamentos
/app/ordens-servico
/app/financeiro
/app/usuarios
/app/backup
```

`/app/ordemservico` existe apenas como alias legado e redireciona para `/app/ordens-servico`.

## Diretórios Gerados

Não use `node_modules/`, `dist/`, `build/`, `.tmp/`, `backend/venv/`, `__pycache__/` ou `.pytest_cache/` para explicar a estrutura do projeto. Eles são gerados localmente e podem ser recriados pelos comandos documentados.
