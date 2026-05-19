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

export default function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  const currentTitle = ROUTE_TITLES[location.pathname] || "Dashboard";
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).toUpperCase();

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
          <p className="amp-shell-note">
            Mesa analítica de comercial, produção, estoque e caixa.
          </p>
        </div>
      </div>

      <div className="amp-shell-header-actions min-w-0 max-w-full">
        <div className="amp-shell-theme">
          <button
            type="button"
            className={`amp-shell-theme-btn${theme === "light" ? " is-active" : ""}`}
            onClick={() => setTheme("light")}
          >
            Light
          </button>
          <button
            type="button"
            className={`amp-shell-theme-btn${theme === "dark" ? " is-active" : ""}`}
            onClick={() => setTheme("dark")}
          >
            Dark
          </button>
        </div>

        <span className="amp-shell-chip">{today}</span>

        <button
          type="button"
          className="amp-exit-btn"
          onClick={() => {
            clearSession();
            navigate("/login");
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          SAIR
        </button>
      </div>
    </header>
  );
}
