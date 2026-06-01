import { useLocation, useNavigate } from "react-router-dom";

import { clearSession } from "../auth";
import { useTheme } from "./ThemeProvider";

const ROUTE_TITLES = {
  "/app/dashboard": "Dashboard",
  "/app/clientes": "Clientes",
  "/app/orcamentos": "Orçamentos",
  "/app/ordemservico": "Ordem de Serviço",
  "/app/ordens-servico": "Ordem de Serviço",
  "/app/financeiro": "Financeiro",
  "/app/usuarios": "Usuários",
  "/app/backup": "Backup",
  "/app/home": "Home",
};

const MONTH_ABBR = {
  "JAN": "JAN", "FEV": "FEV", "MAR": "MAR", "ABR": "ABR",
  "MAIO": "MAI", "JUN": "JUN", "JUL": "JUL", "AGO": "AGO",
  "SET": "SET", "OUT": "OUT", "NOV": "NOV", "DEZ": "DEZ",
};

function formatDate(compact) {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, "0");
  const monthLong = d.toLocaleDateString("pt-BR", { month: "long" }).toUpperCase();
  const monthShort = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "").toUpperCase();
  const year = d.getFullYear();
  if (compact) return `${day}/${monthShort}/${year}`;
  return `${day} DE ${MONTH_ABBR[monthLong] || monthLong} DE ${year}`;
}

export default function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const currentTitle = ROUTE_TITLES[location.pathname] || "Dashboard";

  return (
    <header className="amp-shell-header shrink-0 min-w-0 max-w-full" style={{ width: "100%", flexWrap: "wrap" }}>
      <div className="amp-shell-header-copy min-w-0 max-w-full">
        <button
          type="button"
          className="amp-shell-control-btn is-strong"
          onClick={onMenuToggle}
          aria-label="Alternar menu"
          style={{ flex: "0 0 auto", minWidth: 42, width: 42, padding: 0 }}
        >
          ☰
        </button>

        <div className="min-w-0 max-w-full">
          <div className="amp-shell-title-row">
            <h1 className="amp-shell-title truncate">{currentTitle}</h1>
          </div>
        </div>
      </div>

      <div className="amp-shell-header-actions min-w-0 max-w-full">
        <div className="amp-shell-theme">
          <button
            type="button"
            className={`amp-shell-theme-btn${theme === "light" ? " is-active" : ""}`}
            onClick={() => setTheme("light")}
            aria-pressed={theme === "light"}
            aria-label="Tema claro"
          >
            <span className="sm:hidden">☀</span>
            <span className="hidden sm:inline">Light</span>
          </button>
          <button
            type="button"
            className={`amp-shell-theme-btn${theme === "dark" ? " is-active" : ""}`}
            onClick={() => setTheme("dark")}
            aria-pressed={theme === "dark"}
            aria-label="Tema escuro"
          >
            <span className="sm:hidden">☾</span>
            <span className="hidden sm:inline">Dark</span>
          </button>
        </div>

        <span className="amp-shell-chip">
          <span className="hidden sm:inline">{formatDate(false)}</span>
          <span className="sm:hidden">{formatDate(true)}</span>
        </span>

        <button
          type="button"
          className="amp-exit-btn"
          onClick={() => {
            clearSession();
            navigate("/login");
          }}
          aria-label="Sair"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span className="hidden sm:inline" style={{ marginLeft: 6 }}>SAIR</span>
        </button>
      </div>
    </header>
  );
}
