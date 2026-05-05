/**
 * Header.jsx — AMP Usinagem Industrial
 * Tema laranja — Light/Dark toggle integrado
 */

import { useNavigate, useLocation } from "react-router-dom";
import { clearSession } from "../auth";
import { useTheme } from "./ThemeProvider";

/* Mapear rotas para títulos de página */
const ROUTE_TITLES = {
  "/app/dashboard": "Dashboard",
  "/app/clientes": "Clientes",
  "/app/orcamentos": "Orçamentos",
  "/app/ordemservico": "Ordens de Serviço",
  "/app/financeiro": "Financeiro",
  "/app/usuarios": "Usuários",
  "/app/backup": "Backup",
  "/app/home": "Home",
};

export default function Header({ onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  /* Obter título da página atual */
  const currentTitle = ROUTE_TITLES[location.pathname] || "Dashboard";

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  }).toUpperCase();

  return (
    <>
      <style>{`
        /* ── HEADER LIGHT ── */
        .amp-hdr {
          background: #fff5ed;
          border-bottom: 1px solid #fde8d4;
          box-shadow: 0 1px 4px rgba(249,115,22,.08);
        }
        .amp-hdr-title     { color: #1a1205; }
        .amp-hdr-sub       { color: #8a7060; }
        .amp-hdr-date      { color: #8a7060; }
        .amp-tog           { border: 1px solid #fde8d4; border-radius: 8px; overflow: hidden; display: flex; }
        .amp-tog-btn       { padding: 5px 14px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; transition: .15s; }
        .amp-tog-act       { background: #f97316; color: #fff; }
        .amp-tog-in        { background: transparent; color: #8a7060; }
        .amp-exit-btn      { font-size: 11px; font-weight: 700; color: #dc2626;
                             background: none; border: none; cursor: pointer;
                             display: flex; align-items: center; gap: 5px;
                             transition: opacity .15s; }
        .amp-exit-btn:hover{ opacity: .7; }
        .amp-pulse-dot     { width: 6px; height: 6px; border-radius: 50%;
                             background: #22c55e; display: inline-block;
                             animation: hdr-pulse .9s ease-in-out infinite alternate; }
        @keyframes hdr-pulse { to { opacity: .3; } }
        .amp-pulse-lbl     { font-size: 9px; font-weight: 700; color: #16a34a; }

        /* ── HEADER DARK ── */
        .dark .amp-hdr         { background: #141420; border-bottom-color: #262638; box-shadow: 0 1px 6px rgba(0,0,0,.4); }
        .dark .amp-hdr-title   { color: #ffffff; }
        .dark .amp-hdr-sub     { color: #b8b8b8; }
        .dark .amp-hdr-date    { color: #b8b8b8; }
        .dark .amp-tog         { border-color: #262638; }
        .dark .amp-tog-act     { background: #f97316; color: #fff; }
        .dark .amp-tog-in      { background: transparent; color: #b8b8b8; }
        .dark .amp-exit-btn    { color: #f87171; }
        .dark .amp-pulse-lbl  { color: #4ade80; }
        .dark .amp-pulse-dot  { background: #4ade80; }
        `}</style>

      <header className="amp-hdr flex flex-col sm:flex-row items-center justify-between px-3 sm:px-4 lg:px-6 py-2 sm:py-3 shrink-0" style={{ borderRadius: "12px" }}>
        {/* esquerda */}
        <div
          className="flex items-start gap-2"
          style={{ background: "none", border: "none", padding: 0 }}
        >
            <button
              type="button"
              onClick={onMenuToggle}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "none",
                background: "#f97316",
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all .15s",
              }}
              onMouseEnter={(e) => e.target.style.opacity = "0.9"}
              onMouseLeave={(e) => e.target.style.opacity = "1"}
            >
              ☰
            </button>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <h1 style={{ fontSize:20, fontWeight:800 }} className="amp-hdr-title">
              {currentTitle}
            </h1>
          </div>
            <p className="amp-hdr-sub" style={{ fontSize:12, marginTop:2 }}>
              Mesa analítica de comercial, produção, estoque e caixa.
            </p>
          </div>
        </div>

        {/* direita */}
        <div style={{ display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
          {/* toggle */}
          <div className="amp-tog">
            <button
              className={`amp-tog-btn ${theme === "light" ? "amp-tog-act" : "amp-tog-in"}`}
              onClick={toggleTheme}
            >
              Light
            </button>
            <button
              className={`amp-tog-btn ${theme === "dark" ? "amp-tog-act" : "amp-tog-in"}`}
              onClick={toggleTheme}
            >
              Dark
            </button>
          </div>

          <span className="amp-hdr-date" style={{ fontSize:11 }}>{today}</span>

          {/* botão sair */}
          <button className="amp-exit-btn" onClick={() => {
            clearSession();
            navigate("/login");
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            SAIR
          </button>
        </div>
      </header>
    </>
  );
}
