# 🚀 Quick Start - Navegação e Rotas

## TL;DR (Resumido)

- **Dashboard** é o hub central (`/app/dashboard`)
- **6 páginas principais** estão todas linkadas com botões clicáveis no Dashboard
- **Header** aparece em todas as páginas com menu, tema e saída
- **Sidebar** oferece menu persistente com filtro de permissões
- **Tema** (light/dark) sincroniza via localStorage automaticamente
- **Login oficial** fica em `/login`; não há cadastro público ou preview de login no fluxo de apresentação

## 📍 Arquitetura de Rotas

```
/                    → Redireciona para /login
/login              → Login oficial
/app                → Redireciona para /app/dashboard
└── /app/dashboard       → Hub central
    ├── /app/clientes
    ├── /app/orcamentos
    ├── /app/ordens-servico
    ├── /app/financeiro
    ├── /app/usuarios
    └── /app/backup
```

Compatibilidade: `/app/ordemservico` redireciona para `/app/ordens-servico`. Use sempre `/app/ordens-servico` em docs, botões novos e apresentação.

## 🎯 Os 10 Links do Dashboard

### 4 KPIs Clicáveis
```jsx
<button onClick={() => navigate("/app/clientes")}>
  Clientes Ativos: 42
</button>

<button onClick={() => navigate("/app/financeiro")}>
  Recebido MTD: R$ 50.000
</button>

<button onClick={() => navigate("/app/orcamentos")}>
  Aprovado Ativo: R$ 120.000
</button>

<button onClick={() => navigate("/app/ordens-servico")}>
  Ticket por OS: 85%
</button>
```

### 6 Botões de Navegação Rápida
```jsx
<button onClick={() => navigate("/app/clientes")}>Clientes</button>
<button onClick={() => navigate("/app/orcamentos")}>Orçamentos</button>
<button onClick={() => navigate("/app/ordens-servico")}>Ordens de Serviço</button>
<button onClick={() => navigate("/app/financeiro")}>Financeiro</button>
<button onClick={() => navigate("/app/usuarios")}>Usuários</button>
<button onClick={() => navigate("/app/backup")}>Backup</button>
```

## 🔄 Como Voltar ao Dashboard

### Opção 1: Menu Sidebar
Item "Dashboard" no menu lateral vai para `/app/dashboard`

### Opção 2: Programático
```jsx
const navigate = useNavigate();
navigate("/app/dashboard");
```

## 📦 Estrutura de Arquivos

```
src/
├── routes.jsx                 ← Define todas as rotas
├── pages/
│   ├── Dashboard.jsx          ← Hub com 10 links
│   ├── Clientes.jsx           ← Com useNavigate
│   ├── Orcamentos.jsx         ← Com useNavigate
│   ├── OrdemServico.jsx       ← Com useNavigate
│   ├── Financeiro.jsx         ← Com useNavigate
│   ├── Usuarios.jsx           ← Com useNavigate
│   └── BackupDesktop.jsx      ← Com useNavigate
├── components/
│   ├── Header.jsx             ← Menu, tema e sair
│   ├── Sidebar.jsx            ← Menu com links
│   └── ...
└── auth.js                    ← Autenticação e permissões
```

## ⚙️ Configuração Necessária

### 1. useNavigate em todas as páginas
```jsx
import { useNavigate } from "react-router-dom";

export default function MinhaPage() {
  const navigate = useNavigate();
  // Pronto para navegar
}
```

### 2. Rotas em routes.jsx
✅ Já está feito - todas as 8 rotas estão configuradas

### 3. Menu items em Sidebar.jsx
✅ Já está feito - todos os 7 itens estão configurados

## 🎨 Estilos Aplicados

- As páginas protegidas usam o wrapper padrão `amp-bg` com cards `amp-card`.
- A identidade visual é controlada por tokens `--amp-*` em `src/index.css`.
- O Dashboard e os módulos operacionais respeitam permissões para links e ações.

## 📱 Responsividade

| Size | KPIs | Nav | Layout |
|------|------|-----|--------|
| Mobile | 1 col | 1 col | Stack |
| Tablet | 2 col | 2 col | Side |
| Desktop | 4 col | 4+ col | Full |

## 🔐 Permissões

Cada página tem uma permissão que filtra no menu:

```javascript
const MENU_ITEMS = [
  { permissao: "dashboard" },     // Dashboard
  { permissao: "clientes" },      // Clientes
  { permissao: "orcamentos" },    // Orçamentos
  { permissao: "ordens_servico" },// OS
  { permissao: "financeiro" },    // Financeiro
  { permissao: "usuarios" },      // Usuários
  { permissao: "backup" },        // Backup
];

// Sidebar filtra automaticamente
const menuItems = MENU_ITEMS.filter(
  (item) => hasPermission(user, item.permissao)
);
```

## 🌓 Tema (Light/Dark)

Sincroniza automaticamente via localStorage:

```javascript
// ThemeProvider.jsx persiste tema
localStorage.setItem("amp-theme", isDark ? "dark" : "light");
```

## 🔗 Fluxo de Login

```
1. Usuário clica "Entrar"
2. api.post("/auth/login", { email, senha })
3. persistSession(token, user)
4. navigate(getDefaultAppRoute(user))
5. → primeira rota permitida, normalmente /app/dashboard
6. Header + Sidebar + Dashboard aparecem
7. Links e ações são filtrados por permissão
```

## ✅ Checklist para Novos Desenvolvedores

- [ ] Entendi que Dashboard é o hub central
- [ ] Vi os 10 links no Dashboard (4 KPIs + 6 botões)
- [ ] Testei clique em pelo menos 3 links
- [ ] Testei voltar via Sidebar menu
- [ ] Testei toggle de tema (light/dark)
- [ ] Testei em mobile, tablet e desktop
- [ ] Li ROUTES_NAVIGATION.md para detalhes
- [ ] Li NAVIGATION_EXAMPLES.md para exemplos
- [ ] Entendi como adicionar novas páginas

## 🆘 FAQ Rápido

### P: Como adiciono uma nova página?
R: 
1. Crie em `src/pages/NovaPage.jsx`
2. Importe em `routes.jsx`
3. Adicione a rota
4. Adicione ao MENU_ITEMS do Sidebar
5. Importe `useNavigate` na página

### P: Por que o tema não sincroniza?
R: localStorage depende de `window.dispatchEvent("storage")`. Verifique console.

### P: Como navego com dados?
R: `navigate("/app/clientes", { state: { id: 123 } })`

### P: Menu sidebar não aparece?
R: Verifique permissões via `hasPermission(user, permissao)`

## 📚 Documentação Completa

Para detalhes completos, leia:
- **ROUTES_NAVIGATION.md** - Referência técnica
- **NAVIGATION_DIAGRAM.md** - Diagramas visuais
- **NAVIGATION_EXAMPLES.md** - 12+ exemplos de código
- **VALIDATION_CHECKLIST.md** - Checklist de validação
- **LINKAGE_SUMMARY.md** - Status e estatísticas

## 🎬 Próximos Passos

### Para Testar
```bash
npm run dev
# Acesse http://localhost:5173
# Login com credenciais de teste
# Clique nos 10 links do Dashboard
# Teste tema light/dark
```

API local padrão: `http://127.0.0.1:5000`. Para outro backend, defina `VITE_API_BASE_URL`; o Vite não usa proxy `/api`.

Não inclua no zip de apresentação diretórios gerados como `node_modules/`, `dist/`, `build/`, `release/`, `__pycache__/` e `.pytest_cache/`.

### Para Estender
```bash
# Adicione uma nova página em src/pages/
# Atualize routes.jsx
# Atualize Sidebar.jsx
# Adicione useNavigate e pronto!
```

---

**Última atualização**: 6 de Maio de 2026
**Status**: ✅ Produção
**Suporte**: Veja documentação em root do projeto
