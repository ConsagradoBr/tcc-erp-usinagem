# Rotas e Navegação — AMP Usinagem Industrial

## Estrutura de Rotas

O sistema utiliza **React Router v6** com as seguintes estruturas:

### Rotas Públicas (PublicLayout)
```
/                    → Redireciona para /login
/login              → AuthPage (login)
/login-preview      → LoginPreview (demonstração)
/signup             → Redireciona para /login
```

### Rotas Protegidas (ProtectedLayout)
```
/app                           → Redireciona para /app/dashboard
├── /app/dashboard            → Dashboard (painel principal)
├── /app/clientes             → Clientes e Fornecedores
├── /app/orcamentos           → Orçamentos Comerciais
├── /app/ordemservico         → Ordens de Serviço (OS)
├── /app/financeiro           → Gestão Financeira
├── /app/usuarios             → Administração de Usuários
├── /app/backup               → Backup e Segurança
└── /app/home                 → Home (reservado)
```

## Navegação entre Páginas

### 1️⃣ Header (Componente Global)
**Arquivo:** `src/components/Header.jsx`

O header aparece em todas as páginas protegidas e oferece:
- **Logo clicável**: Navega para `/app/dashboard`
- **Toggle Light/Dark**: Sincroniza com localStorage
- **Data atual**: Exibição formatada
- **Botão Sair**: Navega para `/login`

```jsx
const navigate = useNavigate();
navigate("/app/dashboard");  // Volta ao dashboard
```

### 2️⃣ Sidebar (Navegação Lateral)
**Arquivo:** `src/components/Sidebar.jsx`

Menu lateral com itens filtrados por permissão:
- Clientes e Fornecedores (`/app/clientes`)
- Orçamentos (`/app/orcamentos`)
- OS - Ordens de Serviço (`/app/ordemservico`)
- Financeiro (`/app/financeiro`)
- Usuários (`/app/usuarios`)
- Backup (`/app/backup`)

### 3️⃣ Dashboard (Hub Central)
**Arquivo:** `src/pages/Dashboard.jsx`

Oferece dois tipos de navegação:

#### A) KPIs Clicáveis (4 cards principais)
Cada card é um botão que navega para sua página relacionada:
```
Clientes Ativos       → /app/clientes
Recebido MTD          → /app/financeiro
Aprovado Ativo        → /app/orcamentos
Ticket por OS         → /app/ordemservico
```

#### B) Seção "Navegação Rápida" (6 botões)
```
Clientes              → /app/clientes
Orçamentos            → /app/orcamentos
Ordens de Serviço     → /app/ordemservico
Financeiro            → /app/financeiro
Usuários              → /app/usuarios
Backup                → /app/backup
```

Cada botão tem:
- Efeito hover (scale 1.05)
- Transição suave
- Descrição breve
- Estilo consistente com o tema

### 4️⃣ Páginas Principais

#### Clientes (`src/pages/Clientes.jsx`)
- Importa: `useNavigate`
- Permite navegar de volta ao dashboard via header

#### Orçamentos (`src/pages/Orcamentos.jsx`)
- Importa: `useNavigate`
- Permite navegar de volta ao dashboard via header

#### Ordens de Serviço (`src/pages/OrdemServico.jsx`)
- Importa: `useNavigate`
- Permite navegar de volta ao dashboard via header

#### Financeiro (`src/pages/Financeiro.jsx`)
- Importa: `useNavigate`
- Permite navegar de volta ao dashboard via header

#### Usuários (`src/pages/Usuarios.jsx`)
- Importa: `useNavigate`
- Permite navegar de volta ao dashboard via header

#### Backup (`src/pages/BackupDesktop.jsx`)
- Importa: `useNavigate`
- Permite navegar de volta ao dashboard via header

## Padrão de Importação

Todas as páginas devem importar `useNavigate`:

```jsx
import { useNavigate } from "react-router-dom";

export default function MinhaPage() {
  const navigate = useNavigate();
  
  // Para navegar:
  navigate("/app/dashboard");
}
```

## Sincronização de Tema

O tema (light/dark) é sincronizado via `localStorage`:

1. **Header.jsx** dispara mudança: `localStorage.setItem("amp-theme", isDark ? "dark" : "light")`
2. **Dashboard.jsx** escuta: `window.addEventListener("storage", ...)`
3. Todas as páginas aplicam a classe `dark` ao `<html>` conforme necessário

## Fluxo de Autenticação

```
Login
  ↓
checkBootstrapStatus()
  ├─ Se bootstrap_required=true
  │    → Criar admin inicial + fazer login
  ├─ Se bootstrap_required=false
  │    → Fazer login normal
  ↓
persistSession(token, user)
  ↓
getDefaultAppRoute(user) → /app/dashboard
  ↓
ProtectedLayout (sidebar + header)
  ↓
Dashboard (navegação central)
```

## Permissões por Página

Cada página/menu item tem um campo `permissao`:

- `dashboard` → Dashboard
- `clientes` → Clientes
- `orcamentos` → Orçamentos
- `ordens_servico` → OS
- `financeiro` → Financeiro
- `usuarios` → Usuários
- `backup` → Backup

O Sidebar filtra automaticamente itens sem permissão:
```jsx
const menuItems = MENU_ITEMS.filter((item) => hasPermission(user, item.permissao));
```

## Mapeamento Completo

| Página | Rota | Componente | Permissão | Links Saintes |
|--------|------|-----------|-----------|----------------|
| Login | `/login` | AuthPage | Pública | `/app/dashboard` |
| Dashboard | `/app/dashboard` | Dashboard | `dashboard` | Todas as 6 páginas |
| Clientes | `/app/clientes` | Clientes | `clientes` | Via header: dashboard |
| Orçamentos | `/app/orcamentos` | Orcamentos | `orcamentos` | Via header: dashboard |
| OS | `/app/ordemservico` | OrdemServico | `ordens_servico` | Via header: dashboard |
| Financeiro | `/app/financeiro` | Financeiro | `financeiro` | Via header: dashboard |
| Usuários | `/app/usuarios` | Usuarios | `usuarios` | Via header: dashboard |
| Backup | `/app/backup` | BackupDesktop | `backup` | Via header: dashboard |

## Como Adicionar Novas Rotas

1. **Crie o componente** em `src/pages/NovaPage.jsx`
2. **Importe em** `src/routes.jsx`
3. **Adicione ao array** em `createBrowserRouter()`
4. **Adicione ao MENU_ITEMS** em `src/components/Sidebar.jsx`
5. **Importe `useNavigate`** no componente

```jsx
// routes.jsx
const NovaPage = lazy(() => import("./pages/NovaPage"));

{
  path: "novapagina",
  element: screen(NovaPage)
}

// Sidebar.jsx
{ to: "/app/novapagina", code: "NP", label: "Nova Página", permissao: "nova_pagina" }
```

## Referências

- **Routes:** [src/routes.jsx](src/routes.jsx)
- **Header:** [src/components/Header.jsx](src/components/Header.jsx)
- **Sidebar:** [src/components/Sidebar.jsx](src/components/Sidebar.jsx)
- **Dashboard:** [src/pages/Dashboard.jsx](src/pages/Dashboard.jsx)
- **Auth:** [src/auth.js](src/auth.js)
