import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { clearSession } from "../auth";
import { useTheme } from "./ThemeProvider";

const ROUTE_META = [
  {
    match: "/app/dashboard",
    kicker: "AMP industrial suite",
    title: "Dashboard",
    note: "Mesa analítica de comercial, produção, estoque e caixa.",
  },
  {
    match: "/app/clientes",
    kicker: "Relacionamento unificado",
    title: "Clientes e fornecedores",
    note: "Conta, fiscal e próxima ação em uma só leitura.",
  },
  {
    match: "/app/orcamentos",
    kicker: "Fluxo comercial",
    title: "Orçamentos",
    note: "Propostas, aprovação e ponte para OS e caixa.",
  },
  {
    match: "/app/ordemservico",
    kicker: "Produção e andamento",
    title: "Ordem de Serviço",
    note: "Fila operacional com etapa, prioridade e ritmo.",
  },
  {
    match: "/app/financeiro",
    kicker: "Titulos, parcelas e caixa",
    title: "Financeiro",
    note: "Títulos, parcelas e risco em leitura direta.",
  },
  {
    match: "/app/usuarios",
    kicker: "Governança interna",
    title: "Usuarios",
    note: "Acesso interno e perfis por área.",
  },
  {
    match: "/app/backup",
    kicker: "Confiabilidade operacional",
    title: "Backup",
    note: "Backup local e restauração guiada.",
  },
];

function getRouteMeta(pathname) {
  return ROUTE_META.find((item) => pathname.startsWith(item.match)) || ROUTE_META[0];
}

function formatToday() {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

export default function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const meta = React.useMemo(() => getRouteMeta(location.pathname), [location.pathname]);

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="amp-shell-header-wrap">
      <div className="amp-shell-header">
        <div className="amp-shell-header-copy">
          <button type="button" onClick={onMenuToggle} className="amp-shell-control-btn lg:hidden">
            Menu
          </button>
          <div className="min-w-0">
            <p className="amp-shell-kicker">{meta.kicker}</p>
            <div className="amp-shell-title-row">
              <h1 className="amp-shell-title">{meta.title}</h1>
              <span className="amp-shell-pulse">
                <span className="amp-shell-pulse-dot" />
                Trader shell ativo
              </span>
            </div>
            <p className="amp-shell-note">{meta.note}</p>
          </div>
        </div>

        <div className="amp-shell-header-actions">
          <div className="amp-shell-theme" role="tablist" aria-label="Tema">
            <button
              type="button"
              role="tab"
              aria-selected={theme === "light"}
              className={`amp-shell-theme-btn ${theme === "light" ? "is-active" : ""}`}
              onClick={() => setTheme("light")}
            >
              Light
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={theme === "dark"}
              className={`amp-shell-theme-btn ${theme === "dark" ? "is-active" : ""}`}
              onClick={() => setTheme("dark")}
            >
              Dark
            </button>
          </div>

          <span className="amp-shell-chip">{formatToday()}</span>

          <button type="button" className="amp-shell-control-btn is-strong" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
