---
name: amp-usinagem-industrial
version: 2.0.0
author: 'Codex + Equipe TCC - AMP Usinagem'
description: 'Skill suprema do projeto tcc-erp-usinagem. Use em qualquer tarefa deste repositório, especialmente redesign visual, integração entre módulos, automações de fluxo, desktop nativo, build/release e validação final.'
tags: ["tcc","erp","usinagem","amp","desktop","produto"]
---

# Skill: AMP Usinagem Industrial

Esta é a skill-mãe do projeto. Ela deve orientar qualquer trabalho neste repositório para que o ERP evolua como um produto único, coeso e memorável, e não como um conjunto de telas ou CRUDs isolados.

## Quando usar

Use esta skill em toda tarefa do `tcc-erp-usinagem`, incluindo:
- redesign de interface
- ajustes de UX e fluxo
- novas funcionalidades
- integrações entre módulos
- backend, testes e refatorações
- desktop nativo, empacotamento e releases

## Norte do produto

- O sistema deve parecer um **centro de comando industrial premium**.
- O fluxo deve ser **conectado**, com contexto e próxima ação clara.
- Toda evolução relevante deve fortalecer a cadeia:
  `cliente -> orçamento -> ordem de serviço -> financeiro`
- O desktop nativo é superfície de primeira classe.
- O usuário deve sentir menos navegação entre páginas e mais continuidade operacional.

## Classifique a tarefa antes de agir

Antes de implementar, identifique em qual trilha a tarefa cai. Uma mesma tarefa pode usar mais de uma.

- `visual-system`
  Leia [references/visual-system.md](references/visual-system.md) para qualquer trabalho em shell, dashboard, tabelas, formulários, modais ou identidade visual.
- `operational-flow`
  Leia [references/operational-flows.md](references/operational-flows.md) para qualquer trabalho que envolva integração entre módulos, automação, preenchimento automático, status, atalhos ou visão 360 do cliente.
- `quality-gates`
  Leia [references/quality-gates.md](references/quality-gates.md) para validação, build, desktop, release e critérios de entrega.

## Mapa atual do repositório

- Frontend React/Vite na raiz, com rotas em `src/routes.jsx`
- Layout autenticado em `src/layouts/ProtectedLayout.jsx`
- Shell desktop em `desktop_app.py`
- Backend Flask factory em `backend/factory.py`
- Blueprints: `auth`, `clientes`, `financeiro`, `orcamentos`, `ordens_servico`, `sistema`
- Scripts oficiais de release em `scripts/Prepare-GitHubRelease.ps1` e `scripts/Publish-GitHubRelease.ps1`
- Testes backend em `backend/tests/`

Rotas de produto já existentes:
- `/app/dashboard`
- `/app/clientes`
- `/app/financeiro`
- `/app/ordemservico`
- `/app/orcamentos`
- `/app/backup`
- `/app/usuarios`

## Regras supremas de execução

- Não trate módulos como ilhas. Sempre pergunte o que vem antes e o que vem depois no fluxo.
- Não adicione UI bonita sem aumentar clareza operacional.
- Não adicione automação sem manter rastreabilidade e previsibilidade.
- Não regrida o desktop nativo para comportamento de navegador por padrão.
- Não crie lógica duplicada entre frontend e backend se o backend pode centralizar a regra.
- Não entregue uma tela nova se ela quebrar a linguagem visual do restante do sistema.

## Padrões obrigatórios

### Produto e UX

- Prefira experiências guiadas por contexto, histórico, status e próxima ação.
- Cada tela deve responder rapidamente:
  - onde o usuário está
  - o que está pendente
  - o que pode fazer agora
  - o que acontece depois
- Sempre que possível, exponha relações entre cliente, orçamento, OS e financeiro na própria interface.

### Frontend

- Use `src/api.js` como cliente centralizado.
- Preserve a linguagem visual do shell e aplique a mesma coerência em páginas internas.
- Prefira composição, clareza de hierarquia e densidade controlada.
- Modal é para ação rápida; fluxo longo pede página, painel ou seções claras.

### Backend

- Mantenha factory pattern e blueprints por domínio.
- Registre rotas pelo `backend/factory.py`.
- Preserve compatibilidade com SQLite local e PostgreSQL configurado por ambiente.
- Mudanças estruturais devem ser compatíveis com a base local existente.

### Desktop e release

- O launcher deve priorizar janela nativa.
- O build desktop oficial usa `npm run build:desktop`.
- Releases oficiais devem usar os scripts do diretório `scripts/`.

## Definição de pronto

Uma entrega boa para este projeto normalmente precisa passar por estes filtros:

- melhora a clareza visual ou a clareza operacional
- respeita a cadeia de negócio do sistema
- mantém a aplicação coerente em desktop e web empacotada
- considera permissões e perfis
- valida lint, build, testes e, quando necessário, desktop/release

## Sinais de que a solução está no caminho errado

- parece um dashboard SaaS genérico
- exige muitos cliques para avançar no fluxo
- cria telas sem ligação com entidades vizinhas
- mostra dados, mas não mostra decisão ou ação
- usa muitos cards como muleta de layout
- depende de fallback para navegador para “funcionar”

## Referências desta skill

- Visual e direção de interface: [references/visual-system.md](references/visual-system.md)
- Fluxos e automações de negócio: [references/operational-flows.md](references/operational-flows.md)
- Validação, desktop e release: [references/quality-gates.md](references/quality-gates.md)
