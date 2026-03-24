---
name: amp-usinagem-industrial
version: 1.0.0
author: 'Equipe TCC - AMP Usinagem'
description: 'Regras e padrões específicos do TCC ERP Usinagem Industrial (AMP Usinagem). Sempre siga esta skill quando trabalhar no projeto tcc-erp-usinagem.'
tags: ["tcc","erp","usinagem","amp"]
---

# Skill: AMP Usinagem Industrial

Resumo
- Esta skill contém regras, padrões, convenções e exemplos para trabalhar com o repositório tcc-erp-usinagem. Deve ser consultada e aplicada em PRs, issues e durante desenvolvimento.

## Quando usar esta skill
Use esta skill em **todas** as tarefas relacionadas a este repositório: criação de componentes, endpoints, testes, refatorações, correções de bugs, adição de funcionalidades, reviews de código, etc.

## Stack e Tecnologias Obrigatórias
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Python + Flask (factory pattern)
- **Banco de dados**: SQLAlchemy + PostgreSQL (produção) / SQLite (dev e testes)
- **Autenticação**: JWT com Flask-JWT-Extended
- **Desktop**: Python + built frontend servido pelo Flask

## Estrutura do Projeto (obrigatório respeitar)
- Frontend → raiz do projeto (`src/`, `routes.jsx`, `api.js`, `main.jsx`)
- Backend → pasta `backend/` (blueprints por domínio)
- Desktop → `desktop_app.py`
- Testes → `backend/tests/`

## Padrões do Backend (Flask)
- Sempre use o **factory pattern** (`backend/factory.py` → `create_app()`)
- Blueprints organizados por domínio: `auth`, `clientes`, `orcamentos`, `ordens_servico`, `financeiro`, `sistema`
- Endpoints REST previsíveis: `/auth/*`, `/clientes`, `/orcamentos`, `/ordens-servico`, etc.
- Use `current_app` e `g` quando necessário
- Nunca crie rotas diretamente em `app.py`
- Sempre registre blueprints no factory

## Padrões do Frontend
- Use o cliente centralizado: `src/api.js` (nunca use axios diretamente)
- Componentes em `src/` com Tailwind (classe `className`, não `class`)
- Prefira composição de componentes
- Mantenha rotas em `src/routes.jsx`

## Nomenclatura
- Backend: snake_case (funções, variáveis, arquivos)
- Frontend: camelCase + PascalCase para componentes
- Pastas e blueprints: kebab-case ou snake_case consistente
- Modelos: nomes claros em português (Cliente, Orcamento, OrdemServico, etc.)

## Testes
- Backend: pytest
- Sempre mantenha testes idempotentes
- Use `test_client` do Flask quando possível
- Consulte `backend/tests/test_api.py` como referência de fluxos

## Environment Variables
- Frontend: `VITE_API_BASE_URL`
- Backend: `DATABASE_URL`, `JWT_SECRET_KEY`, `SECRET_KEY`, `FLASK_HOST`, `FLASK_PORT`, `FLASK_DEBUG`

## Regras Importantes
- Nunca altere o schema do banco sem cuidado (veja `_garantir_colunas_usuarios()` em factory.py)
- Migrations não automatizadas → prefira alterações compatíveis ou documente
- Erros: o handler global retorna JSON 500 + traceback (útil em dev)
- Sempre rode `npm run build` antes de testar o desktop
- Mantenha o código limpo e com comentários educativos quando possível

## Exemplos de uso
- Ao criar um endpoint de clientes, siga os blueprints e nomeie o arquivo como `backend/clients/routes.py` (ou `clientes` em pt).
- Para mudanças de DB, crie uma migration compatível e documente passos no PR.

## Checklist de PRs (aplicar em cada PR deste repositório)
- [ ] Segue estrutura de pastas e padrões descritos
- [ ] Testes novos/atualizados adicionados e passando
- [ ] Variáveis de ambiente necessárias documentadas
- [ ] Não há secrets em código

---

Esta skill tem prioridade máxima sobre as demais skills genéricas quando o contexto for este repositório.
