# AMP ERP para Usinagem Industrial

Sistema ERP web/Desktop desenvolvido como TCC para empresas de usinagem de pequeno e médio porte.

Stack principal: React 18 + Vite, Flask, SQLAlchemy, JWT e PostgreSQL/Supabase.

## Figma / Protótipo visual

Arquivo Figma do projeto para apresentação e ajustes visuais:

https://www.figma.com/design/rWaKAvacY9oAWU1w8aM1HI

## Situação atual

O projeto está em fase de polimento de MVP e hoje já possui fluxo funcional para:

- autenticação com JWT
- clientes
- financeiro
- ordens de serviço
- orçamentos
- dashboard com dados reais
- empacotamento desktop com Flask + Waitress + build do Vite

A antiga página de Notas Fiscais foi descontinuada e substituída pelo módulo de Orçamentos. A importação de NF-e continua existindo dentro do módulo de Clientes, e o campo NF-e continua sendo usado no Financeiro.

## Estrutura

```text
backend/
  app.py                API Flask com auth, clientes, financeiro, ordens de serviço e orçamentos
  create_tables.py      criação manual de tabelas
  migrate.py            migração manual antiga para parcelas
  requirements.txt      dependências do backend e testes
  tests/test_api.py     testes automatizados básicos
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

## Testes

Foi adicionada uma suíte inicial de testes para os fluxos principais do backend.

```bash
python -m pytest backend/tests -q
```

Cobertura atual da suíte:
- autenticação e perfil
- criação de cliente
- aprovação e reaprovação de orçamento
- sincronização de orçamento aprovado com OS e financeiro
- financeiro parcelado
- criação manual de ordem de serviço

## Deploy

### Frontend
Use `VITE_API_BASE_URL` apontando para a URL pública do backend e rode:

```bash
npm run build
```

### Backend
Defina `APP_ENV=production`, `DATABASE_URL`, `JWT_SECRET_KEY`, `SECRET_KEY`, `BOOTSTRAP_ADMIN_TOKEN`, `CORS_ORIGINS` e `PORT` no provedor de deploy.

O backend agora aceita:
- `DATABASE_URL` para ambientes como Railway, Render e containers
- `PORT` e `FLASK_HOST` para execução configurável
- fallback local em SQLite apenas com `APP_ENV=development` ou `APP_ENV=testing`

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

## Releases Desktop

Os binarios de distribuicao nao devem mais ser versionados no Git. O codigo-fonte permanece no repositório, e o `.exe`/`.zip` devem ser publicados em **GitHub Releases**.

Fluxo recomendado para novas versoes:

1. garantir que a branch esteja com CI verde
2. criar uma tag no formato `vYYYY.MM.DD.HHMMSS`
3. enviar a tag para o GitHub
4. o workflow `Desktop Release` gera o `.exe` em Windows e publica o release automaticamente

Esse criterio deixa o historico do Git leve e concentra os artefatos de distribuicao no lugar certo.

## Limpeza para apresentação

Diretórios gerados localmente não devem entrar no zip ou na revisão de apresentação: `node_modules/`, `dist/`, `build/`, `release/`, `__pycache__/`, `.pytest_cache/` e caches equivalentes. Eles podem existir no ambiente de desenvolvimento, mas devem ser regenerados pelos comandos documentados.

## Próximas prioridades sugeridas

- quebrar `backend/app.py` em módulos menores por domínio
- adicionar paginação e validações mais rígidas no backend
- reduzir o tamanho do bundle frontend com code splitting
- ampliar testes para financeiro parcelado e ordens de serviço
- adicionar observabilidade e logs estruturados para deploy

**Quesede Constantino**  
Desenvolvedor Fullstack — TCC: ERP para Usinagem Industrial

**Lucas Vital Davoli**  
Desenvolvedor — TCC: ERP para Usinagem Industrial

**A definir**  
— TCC: ERP para Usinagem Industrial

---

## 📄 Licença

Projeto acadêmico desenvolvido para fins de TCC. Todos os direitos reservados.
