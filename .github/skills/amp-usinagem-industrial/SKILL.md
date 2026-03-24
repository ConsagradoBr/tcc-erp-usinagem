---
name: amp-usinagem-industrial
description: 'Regras e padrões específicos do TCC ERP Usinagem Industrial (AMP Usinagem). Sempre siga esta skill quando trabalhar no projeto tcc-erp-usinagem.'
---

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

## Prioridades do Projeto TCC
1. Funcionalidade correta
2. Seguir a arquitetura existente (factory + blueprints)
3. Código limpo e legível
4. Testes passando
5. Boa experiência com Tailwind (UI limpa e responsiva)

---

**Esta skill tem prioridade máxima** sobre as demais skills genéricas quando o contexto for este repositório.

Sempre que o usuário pedir algo relacionado a este projeto, aplique estas regras automaticamente.