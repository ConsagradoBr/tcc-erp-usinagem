```
┌─────────────────────────────────────────────────────────────────────┐
│                  AMP USINAGEM - ESTRUTURA DE NAVEGAÇÃO             │
└─────────────────────────────────────────────────────────────────────┘

┌─ AUTENTICAÇÃO (Público) ─────────────────────────────────────────┐
│                                                                    │
│  Login (/login)                                                  │
│    ↓ (persistSession + getDefaultAppRoute)                       │
│    ↓                                                              │
│  /app/dashboard ← Rota padrão após login                          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌─ APLICAÇÃO PROTEGIDA (ProtectedLayout) ──────────────────────────┐
│                                                                    │
│  ┌─── HEADER (Global) ─────────────────────────────────────────┐ │
│  │  Logo (clicável) ──→ /app/dashboard                          │ │
│  │  Toggle Light/Dark                                           │ │
│  │  Data Atual                                                  │ │
│  │  Botão Sair ──→ /login                                       │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  ┌─── LAYOUT PRINCIPAL ─────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  ┌── SIDEBAR (Menu Lateral) ──┐  ┌── CONTEÚDO PRINCIPAL ──┐ │ │
│  │  │ (Filtrado por permissão)   │  │                         │ │ │
│  │  │                            │  │  Dashboard             │ │ │
│  │  │ Dashboard    ──────────┐   │  │  ├─ KPIs Clicáveis    │ │ │
│  │  │ Clientes     ──────────┼──→│  │  │  ├─ Nav. Rápida    │ │ │
│  │  │ Orçamentos   ──────────┼──→│  │  │  ├─ Gráficos        │ │ │
│  │  │ OS           ──────────┼──→│  │  │  └─ Alertas         │ │ │
│  │  │ Financeiro   ──────────┼──→│  │                         │ │ │
│  │  │ Usuários     ──────────┼──→│  │  Clientes             │ │ │
│  │  │ Backup       ──────────┼──→│  │  Orçamentos           │ │ │
│  │  │              ──────────┘   │  │  Ordens de Serviço    │ │ │
│  │  │                            │  │  Financeiro           │ │ │
│  │  │ (Todos com logo clicável)  │  │  Usuários             │ │ │
│  │  │ ↓ via Header               │  │  Backup               │ │ │
│  │  └────────────────────────────┘  └─────────────────────────┘ │ │
│  │                    ↑                        ↑                 │ │
│  │                    └────────────────────────┘                 │ │
│  │                    (Via Header → /dashboard)                 │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌─ FLUXOS DE NAVEGAÇÃO PRINCIPAIS ─────────────────────────────────┐
│                                                                    │
│  1️⃣  ENTRADA RÁPIDA (Dashboard KPIs)                              │
│      ┌─────────────────────────────────────────────────────────┐ │
│      │ Clientes Ativos (card) ────→ /app/clientes              │ │
│      │ Recebido MTD (card) ────────→ /app/financeiro           │ │
│      │ Aprovado Ativo (card) ──────→ /app/orcamentos           │ │
│      │ Ticket por OS (card) ───────→ /app/ordemservico         │ │
│      └─────────────────────────────────────────────────────────┘ │
│                                                                    │
│  2️⃣  NAVEGAÇÃO RÁPIDA (Dashboard - 6 Botões)                      │
│      ┌─────────────────────────────────────────────────────────┐ │
│      │ Clientes ────────────→ /app/clientes                    │ │
│      │ Orçamentos ──────────→ /app/orcamentos                  │ │
│      │ Ordens de Serviço ───→ /app/ordemservico                │ │
│      │ Financeiro ──────────→ /app/financeiro                  │ │
│      │ Usuários ────────────→ /app/usuarios                    │ │
│      │ Backup ──────────────→ /app/backup                      │ │
│      └─────────────────────────────────────────────────────────┘ │
│                                                                    │
│  3️⃣  MENU SIDEBAR (Navegação Persistente)                         │
│      ┌─────────────────────────────────────────────────────────┐ │
│      │ Qualquer página → Clique no menu → Nova página          │ │
│      │ (Mantém contexto via localStorage)                      │ │
│      └─────────────────────────────────────────────────────────┘ │
│                                                                    │
│  4️⃣  VOLTAR AO DASHBOARD                                          │
│      ┌─────────────────────────────────────────────────────────┐ │
│      │ Clique no Logo no Header ───→ /app/dashboard            │ │
│      │ (Disponível em todas as páginas)                        │ │
│      └─────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌─ SINCRONIZAÇÃO DE TEMA ──────────────────────────────────────────┐
│                                                                    │
│  Header.jsx                           Dashboard.jsx               │
│  ┌───────────────────────────────┐  ┌──────────────────────────┐ │
│  │ applyTheme(isDark)            │  │ window.addEventListener   │ │
│  │   ↓                           │  │   ("storage", ...)         │ │
│  │ localStorage.setItem()        │  │   ↓                        │ │
│  │   ↓                           │  │ setDark(isDark)            │ │
│  │ window.dispatchEvent()        │  │   ↓                        │ │
│  │   ↓                           │  │ document.documentElement   │ │
│  │ "storage" event              │→→│   .classList.toggle()      │ │
│  │                              │  │                            │ │
│  └───────────────────────────────┘  └──────────────────────────┘ │
│                                                                    │
│  Todas as páginas aplicam a classe 'dark' via CSS variables      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌─ PERMISSÕES E ACESSO ────────────────────────────────────────────┐
│                                                                    │
│  Sidebar filtra itens automaticamente:                            │
│  hasPermission(user, "dashboard")      ✓ Dashboard               │
│  hasPermission(user, "clientes")       ✓ Clientes                │
│  hasPermission(user, "orcamentos")     ✓ Orçamentos              │
│  hasPermission(user, "ordens_servico") ✓ OS                      │
│  hasPermission(user, "financeiro")     ✓ Financeiro              │
│  hasPermission(user, "usuarios")       ✓ Usuários                │
│  hasPermission(user, "backup")         ✓ Backup                  │
│                                                                    │
│  Usuários sem permissão não veem esses itens no menu.             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

┌─ ARQUIVOS-CHAVE ─────────────────────────────────────────────────┐
│                                                                    │
│  src/routes.jsx                  → Definição de rotas             │
│  src/auth.js                      → Autenticação e permissões     │
│  src/components/Header.jsx        → Header global + navegação     │
│  src/components/Sidebar.jsx       → Menu lateral + navegação      │
│  src/pages/Dashboard.jsx          → Hub central de navegação      │
│  src/pages/Clientes.jsx           → Página com useNavigate        │
│  src/pages/Orcamentos.jsx         → Página com useNavigate        │
│  src/pages/OrdemServico.jsx       → Página com useNavigate        │
│  src/pages/Financeiro.jsx         → Página com useNavigate        │
│  src/pages/Usuarios.jsx           → Página com useNavigate        │
│  src/pages/BackupDesktop.jsx      → Página com useNavigate        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## Resumo Executivo

✅ **Tudo está linkado com o Dashboard:**
- Header: Logo clicável volta ao dashboard de qualquer página
- Sidebar: Menu persistente em todas as páginas
- Dashboard KPIs: 4 cards principais vão para páginas relacionadas
- Dashboard Nav. Rápida: 6 botões vão para principais páginas
- Todas as páginas: Importam `useNavigate` para navegação livre

✅ **Navegação está sincronizada:**
- localStorage sincroniza tema entre páginas
- Permissões filtram menu automaticamente
- Router protege rotas com ProtectedLayout
- Autenticação redireciona para dashboard por padrão

✅ **Estrutura é escalável:**
- Adicione novas páginas em `src/pages/`
- Adicione rotas em `routes.jsx`
- Adicione menu items em `Sidebar.jsx`
- Importe `useNavigate` para navegar
