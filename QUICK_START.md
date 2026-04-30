# 🚀 Quick Start - Navegação e Rotas

## TL;DR (Resumido)

- **Dashboard** é o hub central (`/app/dashboard`)
- **6 páginas principais** estão todas linkadas com botões clicáveis no Dashboard
- **Header** aparece em todas as páginas e tem logo clicável para dashboard
- **Sidebar** oferece menu persistente com filtro de permissões
- **Tema** (light/dark) sincroniza via localStorage automaticamente

## 📍 Arquitetura de Rotas

```
/                    → Redireciona para /login
/login              → Página de autenticação
/app                → Redireciona para /app/dashboard
└── /app/dashboard  → Hub central (coloca links para tudo)
    ├── /clientes
    ├── /orcamentos
    ├── /ordemservico
    ├── /financeiro
    ├── /usuarios
    └── /backup
```

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

<button onClick={() => navigate("/app/ordemservico")}>
  Ticket por OS: 85%
</button>
```

### 6 Botões de Navegação Rápida
```jsx
<button onClick={() => navigate("/app/clientes")}>Clientes</button>
<button onClick={() => navigate("/app/orcamentos")}>Orçamentos</button>
<button onClick={() => navigate("/app/ordemservico")}>Ordens de Serviço</button>
<button onClick={() => navigate("/app/financeiro")}>Financeiro</button>
<button onClick={() => navigate("/app/usuarios")}>Usuários</button>
<button onClick={() => navigate("/app/backup")}>Backup</button>
```

## 🔄 Como Voltar ao Dashboard

### Opção 1: Clique no Logo (Automático)
Logo no Header em todas as páginas clica para `/app/dashboard`

### Opção 2: Menu Sidebar
Item "Dashboard" no menu lateral vai para `/app/dashboard`

### Opção 3: Programático
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
│   ├── Header.jsx             ← Logo clicável
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

### Dashboard KPIs
- Border-left com cores diferentes
- Hover: scale 1.05
- Transição: 200ms ease
- Responsivo: 1-4 colunas

### Dashboard Nav. Rápida
- Grid responsivo
- Cards com descrição
- Hover: scale 1.05
- Cores consistentes com tema

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
// Header.jsx muda tema
localStorage.setItem("amp-theme", isDark ? "dark" : "light");
window.dispatchEvent(new Event("storage")); // Notifica outras abas

// Dashboard.jsx (e todas as páginas) escutam
window.addEventListener("storage", () => {
  setDark(localStorage.getItem("amp-theme") === "dark");
});
```

## 🔗 Fluxo de Login

```
1. Usuário clica "Entrar"
2. api.post("/auth/login", { email, senha })
3. persistSession(token, user)
4. navigate(getDefaultAppRoute(user))
5. → /app/dashboard (padrão)
6. Header + Sidebar + Dashboard aparecem
7. 10 links para outras páginas estão disponíveis
```

## ✅ Checklist para Novos Desenvolvedores

- [ ] Entendi que Dashboard é o hub central
- [ ] Vi os 10 links no Dashboard (4 KPIs + 6 botões)
- [ ] Testei clique em pelo menos 3 links
- [ ] Testei voltar ao Dashboard via Header logo
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

### P: Logo não funciona?
R: Verifique se `useNavigate` está importado em Header.jsx e se `/app/dashboard` está na rota.

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

### Para Estender
```bash
# Adicione uma nova página em src/pages/
# Atualize routes.jsx
# Atualize Sidebar.jsx
# Adicione useNavigate e pronto!
```

---

**Última atualização**: 29 de Abril de 2026
**Status**: ✅ Produção
**Suporte**: Veja documentação em root do projeto
