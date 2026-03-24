# AMP ERP para Usinagem Industrial

Sistema ERP web/Desktop desenvolvido como TCC para empresas de usinagem de pequeno e médio porte.

Stack principal: React 18 + Vite, Flask, SQLAlchemy, JWT e PostgreSQL/Supabase.

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
  pages/                Auth, Dashboard, Clientes, Financeiro, OrdemServico, Orcamentos
  api.js                cliente Axios com baseURL configurável por ambiente
desktop_app.py         launcher desktop usando o frontend buildado
.env.example            exemplo do frontend
backend/.env.example    exemplo do backend
```

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

Opção recomendada para deploy e testes:

```env
DATABASE_URL=postgresql+psycopg2://usuario:senha@host:5432/postgres?sslmode=require
JWT_SECRET_KEY=uma_chave_segura_com_32_ou_mais_caracteres
SECRET_KEY=outra_chave_segura_com_32_ou_mais_caracteres
FLASK_HOST=0.0.0.0
FLASK_PORT=5000
FLASK_DEBUG=true
```

Também é possível usar `DB_USER`, `DB_PASS`, `DB_HOST`, `DB_PORT` e `DB_NAME` separadamente.

Se nenhuma configuração de banco for informada, o backend cai para SQLite local em desenvolvimento.

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
Defina `DATABASE_URL`, `JWT_SECRET_KEY`, `SECRET_KEY` e `PORT` no provedor de deploy.

O backend agora aceita:
- `DATABASE_URL` para ambientes como Railway, Render e containers
- `PORT` e `FLASK_HOST` para execução configurável
- fallback local em SQLite para desenvolvimento rápido

## Desktop

O arquivo `desktop_app.py` serve o frontend buildado junto com a API Flask no mesmo processo para distribuição desktop local.

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
