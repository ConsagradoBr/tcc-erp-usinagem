# Exemplos de Navegação - AMP Usinagem

## 1️⃣ Navegação Simples

### Ir para uma página
```jsx
import { useNavigate } from "react-router-dom";

export default function MinhaPage() {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate("/app/dashboard")}>
      Voltar ao Dashboard
    </button>
  );
}
```

### Com parâmetros (state)
```jsx
navigate("/app/clientes", { state: { cliente_id: 123 } });

// Na página destino:
import { useLocation } from "react-router-dom";
const location = useLocation();
const cliente_id = location.state?.cliente_id;
```

## 2️⃣ Exemplo Real - Página de Clientes

```jsx
import { useNavigate } from "react-router-dom";

export default function Clientes() {
  const navigate = useNavigate();

  // Navegar quando clicar em um cliente
  const handleSelectCliente = (cliente) => {
    navigate("/app/orcamentos", { 
      state: { cliente_id: cliente.id, cliente_nome: cliente.nome } 
    });
  };

  return (
    <div>
      {/* Header + Sidebar vêm automaticamente via ProtectedLayout */}
      
      <button onClick={() => navigate("/app/dashboard")}>
        Voltar ao Dashboard
      </button>

      {/* Resto do conteúdo */}
    </div>
  );
}
```

## 3️⃣ Exemplo - Dashboard com Navegação

```jsx
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Card clicável */}
      <button onClick={() => navigate("/app/clientes")}>
        <h3>Clientes Ativos</h3>
        <p>42 clientes</p>
      </button>

      {/* Grid de navegação rápida */}
      <div className="grid grid-cols-3">
        <button onClick={() => navigate("/app/clientes")}>Clientes</button>
        <button onClick={() => navigate("/app/orcamentos")}>Orçamentos</button>
        <button onClick={() => navigate("/app/ordemservico")}>OS</button>
        <button onClick={() => navigate("/app/financeiro")}>Financeiro</button>
        <button onClick={() => navigate("/app/usuarios")}>Usuários</button>
        <button onClick={() => navigate("/app/backup")}>Backup</button>
      </div>
    </div>
  );
}
```

## 4️⃣ Exemplo - Confirmação antes de Navegar

```jsx
import { useNavigate } from "react-router-dom";

export default function Orcamentos() {
  const navigate = useNavigate();
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const handleNavigation = (path) => {
    if (unsavedChanges) {
      if (window.confirm("Você tem alterações não salvas. Deseja continuar?")) {
        navigate(path);
      }
    } else {
      navigate(path);
    }
  };

  return (
    <button onClick={() => handleNavigation("/app/dashboard")}>
      Voltar
    </button>
  );
}
```

## 5️⃣ Exemplo - Navegação com Histórico

```jsx
import { useNavigate } from "react-router-dom";

export default function OrdemServico() {
  const navigate = useNavigate();

  // Voltar para página anterior
  const handleGoBack = () => {
    navigate(-1); // Equivalente a browser back button
  };

  // Voltar 2 páginas
  const handleGoBackTwo = () => {
    navigate(-2);
  };

  return (
    <div>
      <button onClick={handleGoBack}>← Voltar</button>
      <button onClick={() => navigate("/app/dashboard")}>→ Dashboard</button>
    </div>
  );
}
```

## 6️⃣ Exemplo - Logout com Navegação

```jsx
import { useNavigate } from "react-router-dom";
import { removeSession } from "../auth";

export default function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    removeSession();
    navigate("/login");
  };

  return (
    <button onClick={handleLogout}>
      Sair
    </button>
  );
}
```

## 7️⃣ Exemplo - Redirecionamento Condicional

```jsx
import { useNavigate, useEffect } from "react-router-dom";
import { getStoredUser } from "../auth";

export default function AdminPanel() {
  const navigate = useNavigate();
  const user = getStoredUser();

  useEffect(() => {
    // Redirecionar se não for admin
    if (user?.perfil !== "administrador") {
      navigate("/app/dashboard");
    }
  }, [user, navigate]);

  return <div>Painel Admin</div>;
}
```

## 8️⃣ Exemplo - Navegação Programada após Ação

```jsx
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

export default function CreateCliente() {
  const navigate = useNavigate();

  const handleSubmit = async (formData) => {
    try {
      const response = await api.post("/clientes", formData);
      toast.success("Cliente criado com sucesso!");
      
      // Navegar para a página de clientes após sucesso
      navigate("/app/clientes", {
        state: { cliente_id: response.data.id }
      });
    } catch (error) {
      toast.error("Erro ao criar cliente");
    }
  };

  return <form onSubmit={handleSubmit}>{/* ... */}</form>;
}
```

## 9️⃣ Exemplo - Links Estilizados

```jsx
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <nav>
      {/* Link mantém scroll e evita reload */}
      <Link to="/app/clientes" className="nav-link">
        Clientes
      </Link>

      {/* NavLink aplica classe "active" automaticamente */}
      <NavLink 
        to="/app/dashboard" 
        className={({ isActive }) => isActive ? "active" : ""}
      >
        Dashboard
      </NavLink>
    </nav>
  );
}
```

## 🔟 Exemplo - Tema Sincronizado

```jsx
// Header.jsx
const applyTheme = (isDark) => {
  setDark(isDark);
  localStorage.setItem("amp-theme", isDark ? "dark" : "light");
  document.documentElement.classList.toggle("dark", isDark);
  window.dispatchEvent(new Event("storage")); // Notifica outras abas
};

// Dashboard.jsx
useEffect(() => {
  const onStorage = () => {
    setDark(localStorage.getItem("amp-theme") === "dark");
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}, []);
```

## 1️⃣1️⃣ Exemplo - Menu com Permissões

```jsx
// Sidebar.jsx
const MENU_ITEMS = [
  { to: "/app/dashboard", label: "Dashboard", permissao: "dashboard" },
  { to: "/app/clientes", label: "Clientes", permissao: "clientes" },
  { to: "/app/financeiro", label: "Financeiro", permissao: "financeiro" },
];

const menuItems = MENU_ITEMS.filter((item) => 
  hasPermission(user, item.permissao)
);

return (
  <nav>
    {menuItems.map((item) => (
      <NavLink key={item.to} to={item.to}>
        {item.label}
      </NavLink>
    ))}
  </nav>
);
```

## 1️⃣2️⃣ Exemplo - Forma Completa (Real)

```jsx
// src/pages/Financeiro.jsx
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import toast from "react-hot-toast";

export default function Financeiro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);

  // Carregar dados
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get("/financeiro");
      setData(response.data);
    } catch (error) {
      toast.error("Erro ao carregar financeiro");
      // Pode redirecionar em caso de erro crítico
      // navigate("/app/dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Clicar em um título para ver detalhes
  const handleViewTitulo = useCallback((titulo) => {
    navigate("/app/financeiro", {
      state: { 
        selectedTitulo: titulo,
        tab: "detalhes"
      }
    });
  }, [navigate]);

  // Voltar ao dashboard
  const handleBackToDashboard = useCallback(() => {
    navigate("/app/dashboard");
  }, [navigate]);

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      {/* Header vem automaticamente */}
      
      <h1>Financeiro</h1>
      
      <button onClick={handleBackToDashboard}>
        ← Voltar ao Dashboard
      </button>

      <div className="grid">
        {data.map((titulo) => (
          <button 
            key={titulo.id}
            onClick={() => handleViewTitulo(titulo)}
          >
            {titulo.descricao}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## 📋 Sumário de Padrões

| Padrão | Uso | Exemplo |
|--------|-----|---------|
| `navigate("/path")` | Navegação simples | `navigate("/app/dashboard")` |
| `navigate("/path", { state })` | Com dados | `navigate("/app/clientes", { state: { id: 1 } })` |
| `navigate(-1)` | Volta anterior | Botão "Voltar" |
| `<Link to="/path">` | Link estático | Menu items |
| `<NavLink to="/path">` | Link com classe active | Menu ativo |
| `useLocation()` | Acessar state | Ler dados passados |
| `localStorage` | Sincronizar estado | Tema light/dark |
| `window.dispatchEvent()` | Comunicar entre abas | Sincronização de tema |

---

## 🚀 Boas Práticas

✅ Sempre importe `useNavigate` em páginas que precisam navegar
✅ Use `navigate()` para transições programáticas
✅ Use `<Link>` para links estáticos
✅ Utilize `state` para passar dados entre páginas
✅ Sincronize estado via localStorage para múltiplas abas
✅ Redirecione após ações bem-sucedidas
✅ Valide permissões antes de navegar
✅ Mostre confirmações antes de perder dados

❌ Não use `window.location` (causa reload)
❌ Não passe dados sensíveis via URL
❌ Não navegue sem validar autenticação
❌ Não deixe listeners ativos (memory leak)
❌ Não redirecione em loops infinitos
