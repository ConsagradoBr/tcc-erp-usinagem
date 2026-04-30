/**
 * Header.jsx — AMP Usinagem Industrial
 * Tema laranja — Light/Dark toggle integrado
 */

import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Obter título da página atual */
  const currentTitle = ROUTE_TITLES[location.pathname] || "Dashboard";

  /* ── tema — sincroniza com Dashboard.jsx via localStorage ── */
  const [dark, setDark] = useState(
    () => localStorage.getItem("amp-theme") === "dark"
  );

  const applyTheme = (isDark) => {
    setDark(isDark);
    localStorage.setItem("amp-theme", isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
    /* dispara evento para o Dashboard.jsx ouvir */
    window.dispatchEvent(new Event("storage"));
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, []); // aplica na montagem

  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric",
  }).toUpperCase();

  return (
    <>
      <style>{`
        /* ── HEADER LIGHT ── */
        .amp-hdr {
          background: #ffffff;
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
        .dark .amp-hdr-title   { color: #f0f0f5; }
        .dark .amp-hdr-sub     { color: #6b7280; }
        .dark .amp-hdr-date    { color: #6b7280; }
        .dark .amp-tog         { border-color: #262638; }
        .dark .amp-tog-act     { background: #f97316; color: #fff; }
        .dark .amp-tog-in      { background: transparent; color: #6b7280; }
        .dark .amp-exit-btn    { color: #f87171; }
        .dark .amp-pulse-lbl  { color: #4ade80; }
        .dark .amp-pulse-dot  { background: #4ade80; }
      `}</style>

      <header className="amp-hdr flex items-center justify-between px-6 py-3 shrink-0">
        {/* esquerda */}
        <div
          className="flex items-start gap-2"
          style={{ background: "none", border: "none", padding: 0 }}
        >
          <div>
            <p style={{ fontSize:9, fontWeight:700, letterSpacing:"2.5px",
                        textTransform:"uppercase", color:"var(--muted,#8a7060)", marginBottom:2 }}>
              AMP Industrial Suite
            </p>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <h1 style={{ fontSize:20, fontWeight:800 }} className="amp-hdr-title">
                {currentTitle}
              </h1>
              <span style={{ display:"flex", alignItems:"center", gap:5 }}>
                <span className="amp-pulse-dot" />
                <span className="amp-pulse-lbl">TRADER SHELL ATIVO</span>
              </span>
            </div>
            <p className="amp-hdr-sub" style={{ fontSize:12, marginTop:2 }}>
              Mesa analítica de comercial, produção, estoque e caixa.
            </p>
          </div>
        </div>

        {/* direita */}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          {/* toggle */}
          <div className="amp-tog">
            <button
              className={`amp-tog-btn ${!dark ? "amp-tog-act" : "amp-tog-in"}`}
              onClick={() => applyTheme(false)}
            >
              Light
            </button>
            <button
              className={`amp-tog-btn ${dark ? "amp-tog-act" : "amp-tog-in"}`}
              onClick={() => applyTheme(true)}
            >
              Dark
            </button>
          </div>

          <span className="amp-hdr-date" style={{ fontSize:11 }}>{today}</span>

          {/* botão sair */}
          <button className="amp-exit-btn" onClick={() => navigate("/login")}>
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