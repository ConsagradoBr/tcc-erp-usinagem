# AMP ERP para Usinagem Industrial

Sistema ERP web e desktop desenvolvido como TCC para empresas de usinagem de pequeno e médio porte.

Stack principal: React 18 + Vite, Flask, SQLAlchemy, JWT, SQLite local e PostgreSQL/Supabase em produção.

## Figma / Protótipo visual

Arquivo Figma do projeto para apresentação e ajustes visuais:

https://www.figma.com/design/rWaKAvacY9oAWU1w8aM1HI

## Situação atual

O projeto está em fase funcional de MVP validável e possui fluxo completo para demonstração local, desktop e web:

- autenticação com JWT
- clientes
- financeiro
- ordens de serviço
- orçamentos
- dashboard com dados reais
- empacotamento desktop com Flask + Waitress + build do Vite

Para apresentação, o caminho mais seguro é executar a versão local/desktop com banco SQLite populado. A versão web publicada pode ser usada como fallback quando o backend hospedado estiver ativo.

A antiga página de Notas Fiscais foi descontinuada e substituída pelo módulo de Orçamentos. A importação de NF-e continua existindo dentro do módulo de Clientes, e o campo NF-e continua sendo usado no Financeiro.

## Estrutura

```text
backend/
  app.py                API Flask com auth, clientes, financeiro, ordens de serviço e orçamentos
  create_tables.py      criação manual de tabelas
  migrate.py            migração manual antiga para parcelas
  requirements.txt      dependências do backend e testes
  tests/test_api.py     testes automatizados dos fluxos principais
src/
  components/           sidebar, header e componentes reutilizáveis
  layouts/              layout público e protegido
  pages/                AuthPage, Dashboard, Clientes, Financeiro, OrdemServico, Orcamentos
  api.js                cliente Axios com baseURL configurável por ambiente
desktop_app.py         launcher desktop usando o frontend buildado
.env.example            exemplo do frontend
backend/.env.example    exemplo do backend
```

## Rotas oficiais para apresentação

- `/login` - login oficial do sistema
- `/app/dashboard` - painel principal autenticado
- `/app/clientes` - clientes e fornecedores
- `/app/orcamentos` - orçamentos comerciais
- `/app/ordens-servico` - ordens de serviço
- `/app/financeiro` - financeiro
- `/app/usuarios` - usuários
- `/app/backup` - backup desktop

Não há rota oficial de cadastro público, Notas Fiscais ou preview de login na navegação da apresentação. A rota antiga `/app/ordemservico` existe apenas como compatibilidade e redireciona para `/app/ordens-servico`.

## Ambientes de demonstração

- **Local web:** Vite em `http://127.0.0.1:5173` consumindo a API Flask local em `http://127.0.0.1:5000`.
- **Desktop:** executável empacotado com frontend buildado e API Flask no mesmo processo.
- **Web publicada:** frontend em Vercel consumindo backend Flask em Render/Supabase, quando os serviços estiverem ativos.

Para banca, recomenda-se usar local/desktop como ambiente principal e a web publicada como plano B.

## Módulos implementados

### Autenticação
- cadastro e login com JWT
- proteção de rotas no frontend
- perfil autenticado em `/auth/perfil`

### Clientes
- CRUD completo
- importação de NF-e XML e JSON
- prevenção básica de duplicidade por documento
- exportação de cliente em JSON

### Financeiro
- contas a pagar e a receber
- parcelamento automático
- cálculo de juros e status
- baixa manual de pagamento
- resumo para dashboard
- importação de boleto PDF
- exportação de lançamento em CSV

### Ordens de serviço
- CRUD completo
- quadro em colunas por status
- mudança rápida de status
- resumo por etapa para o dashboard

### Orçamentos
- CRUD completo
- vínculo com cliente
- status de proposta: rascunho, enviado, aprovado, reprovado e cancelado
- aprovação gera Ordem de Serviço automaticamente
- aprovação gera lançamento em Contas a Receber automaticamente
- reaprovação não duplica OS nem financeiro
- edição de orçamento aprovado sincroniza OS e financeiro gerados automaticamente
- resumo agregado com valor total e valor aprovado

## Configuração de ambiente

### Frontend
Crie `.env` na raiz com base em `.env.example`:

```env
VITE_API_BASE_URL=http://127.0.0.1:5000
```

### Backend
Crie `backend/.env` com base em `backend/.env.example`.

Desenvolvimento local:

```env
APP_ENV=development
DATABASE_URL=sqlite:///app.sqlite3
JWT_SECRET_KEY=dev_jwt_secret_local
SECRET_KEY=dev_secret_local
FLASK_HOST=127.0.0.1
FLASK_PORT=5000
FLASK_DEBUG=true
```

Produção/deploy:

```env
APP_ENV=production
DATABASE_URL=postgresql+psycopg2://usuario:senha@host:5432/postgres?sslmode=require
JWT_SECRET_KEY=uma_chave_segura_com_32_ou_mais_caracteres
SECRET_KEY=outra_chave_segura_com_32_ou_mais_caracteres
BOOTSTRAP_ADMIN_TOKEN=token_longo_unico_para_criar_o_primeiro_admin
CORS_ORIGINS=https://seu-frontend.vercel.app
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=false
```

Também é possível usar `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT` e `DB_NAME` separadamente.

Sem `APP_ENV`, o backend assume comportamento de produção. Fora de desenvolvimento, `DATABASE_URL` ou `DB_USER`/`DB_PASS`, `JWT_SECRET_KEY`, `SECRET_KEY` e `CORS_ORIGINS` são obrigatórios. O `BOOTSTRAP_ADMIN_TOKEN` é necessário para criar o primeiro administrador com segurança em produção.

Se nenhuma configuração de banco for informada, o backend só cai para SQLite local quando `APP_ENV=development` ou `APP_ENV=testing` estiver explícito.

________________________________________________________________________________________________________


## Como rodar

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend
```bash
npm install
npm run dev
```

Frontend padrão: `http://localhost:5173`
Backend padrão: `http://127.0.0.1:5000`

O frontend chama a API por `VITE_API_BASE_URL` ou, na ausência da variável, por `http://127.0.0.1:5000`. O Vite não usa proxy local para `/api`.

________________________________________________________________________________________________________


## Testes

O backend possui suíte automatizada cobrindo os fluxos principais da API.

```bash
python -m pytest backend/tests -q
```

Cobertura atual da suíte:
- autenticação e perfil
- criação de cliente
- listagem paginada e busca individual
- aprovação e reaprovação de orçamento
- sincronização de orçamento aprovado com OS e financeiro
- financeiro parcelado
- criação manual de ordem de serviço
- health check e tratamento padronizado de erros

________________________________________________________________________________________________________

## Deploy

### Frontend
Use `VITE_API_BASE_URL` apontando para a URL pública do backend e rode:

```bash
npm run build
```
________________________________________________________________________________________________________

### Backend
Defina `APP_ENV=production`, `DATABASE_URL`, `JWT_SECRET_KEY`, `SECRET_KEY`, `BOOTSTRAP_ADMIN_TOKEN`, `CORS_ORIGINS` e `PORT` no provedor de deploy.

O backend agora aceita:
- `DATABASE_URL` para ambientes como Railway, Render e containers
- `PORT` e `FLASK_HOST` para execução configurável
- fallback local em SQLite apenas com `APP_ENV=development` ou `APP_ENV=testing`

________________________________________________________________________________________________________

## Desktop

O arquivo `desktop_app.py` serve o frontend buildado junto com a API Flask no mesmo processo para distribuição desktop local.

Por padrão, o launcher desktop agora prioriza abrir em janela nativa e **não** cai automaticamente para o navegador. Se você quiser liberar esse fallback durante diagnóstico, defina:

```env
DESKTOP_ALLOW_BROWSER_FALLBACK=true
```

Para gerar o executável desktop oficial:

```bash
npm run build:desktop
```

O build oficial usa o spec `AMP Usinagem Industrial.spec` e deve ser executado em Windows. Instale as dependências de `desktop-requirements.txt` junto com `backend/requirements.txt`.

Para preparar os artefatos de release do desktop:

```bash
powershell -ExecutionPolicy Bypass -File scripts/Prepare-GitHubRelease.ps1 -Version v2026.03.24.000000
```

Esse script gera:
- o executável versionado em `release/`
- a pasta versionada com `LEIA-ME.txt`
- o `.zip` pronto para publicar no GitHub Releases

________________________________________________________________________________________________________

**Quesede Constantino**  
Desenvolvedor Fullstack — TCC: ERP para Usinagem Industrial

**Lucas Vital Davoli**  
Desenvolvedor Fullstack — TCC: ERP para Usinagem Industrial

**Lucas dos Santos Palandi**  
Desenvolvedor Fullstack — TCC: ERP para Usinagem Industrial
---

## 📄 Licença

Projeto acadêmico desenvolvido para fins de TCC. Todos os direitos reservados.
