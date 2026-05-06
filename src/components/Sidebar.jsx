import { useNavigate, useLocation } from "react-router-dom";
import { hasPermission } from "../auth";

const NAV_ITEMS = [
  { id:"DB", label:"Dashboard",              color:"#14b8a6", path:"/app/dashboard", permissao:"dashboard" },
  { id:"CR", label:"Clientes e Fornecedores",color:"#3b82f6", path:"/app/clientes", permissao:"clientes" },
  { id:"OC", label:"Orçamentos",             color:"#f97316", path:"/app/orcamentos", permissao:"orcamentos" },
  { id:"OS", label:"Ordem de Serviço",       color:"#22c55e", path:"/app/ordemservico", permissao:"ordens_servico" },
  { id:"FN", label:"Financeiro",             color:"#fb923c", path:"/app/financeiro", permissao:"financeiro" },
  { id:"US", label:"Usuários",               color:"#60a5fa", path:"/app/usuarios", permissao:"usuarios" },
  { id:"BK", label:"Backup",                 color:"#9ca3af", path:"/app/backup", permissao:"backup" },
];

import logo from "../assets/gif_transparente.png";

export default function Sidebar({ user, open, mobileOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = NAV_ITEMS.filter((item) => hasPermission(user, item.permissao));

  return (
    <>
      <style>{`
        .amp-shell-sidebar {
          min-height: 100vh;
          width: 100%;
          max-width: 100%;
          border-radius: clamp(16px, 1.1vw, 28px);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .amp-shell-sidebar-inner {
          min-height: 100%;
          display: flex;
          flex-direction: column;
          gap: clamp(16px, 1vw, 24px);
          padding: clamp(16px, 1.2vw, 22px);
        }

        .amp-shell-brand-copy h2 {
          margin-top: 4px;
          font-size: clamp(1rem, 1.2vw, 1.25rem);
          line-height: 1.1;
        }

        .amp-shell-brand-copy p {
          margin: 0;
          color: var(--amp-shell-soft);
          font-size: clamp(0.8rem, 0.9vw, 1rem);
        }

        .amp-shell-link {
          width: 100%;
          cursor: pointer;
        }

        .amp-shell-link-label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .sb-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          padding: 10px 12px;
        }

        .amp-shell-sidebar.is-collapsed .sb-item {
          justify-content: center;
          padding-left: 0;
          padding-right: 0;
        }

        .amp-shell-sidebar.is-collapsed .sb-label,
        .amp-shell-sidebar.is-collapsed .sb-sub,
        .amp-shell-sidebar.is-collapsed .sb-tag,
        .amp-shell-sidebar.is-collapsed .sb-name {
          display: none;
        }

        .amp-shell-sidebar.is-collapsed .sb-row {
          justify-content: center;
        }

        .amp-shell-sidebar.is-collapsed .sb-div {
          margin: 0;
        }

        .amp-shell-sidebar.is-collapsed .amp-shell-user-card {
          justify-content: center;
          padding-inline: 0;
        }

        .amp-shell-user-card {
          border-radius: 18px;
          padding: 14px 16px;
          gap: 14px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .amp-shell-user-avatar {
          width: 44px;
          height: 44px;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.16), rgba(251, 146, 60, 0.16));
          color: #fff;
          font-weight: 800;
          display: grid;
          place-items: center;
        }

        .amp-shell-control-btn {
          width: 100%;
          margin-top: auto;
          justify-content: center;
          font-size: 0.82rem;
        }

        /* Legacy sidebar styles for current markup */
        .amp-shell-sidebar {
          background: #ffffff;
          border-right: 1px solid #fde8d4;
          padding: clamp(12px, 1.2vw, 18px);
          gap: clamp(8px, 1vw, 12px);
        }
        .dark .amp-shell-sidebar { background: #141420; border-right-color: #262638; }

        .sb-brand { padding: 16px 14px 12px; flex-shrink: 0; }
        .amp-shell-sidebar.is-collapsed .sb-brand {
          padding: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .sb-tag { font-size: 8px; font-weight: 700; letter-spacing: 3px;
                  text-transform: uppercase; color: #8a7060; margin-bottom: 7px; }
        .dark .sb-tag { color: #6b7280; }
        .sb-row { display: flex; align-items: center; gap: 9px; }
        .amp-shell-sidebar.is-collapsed .sb-row {
          gap: 0;
        }
        .sb-icon { border-radius: 9px;
                  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .amp-shell-sidebar.is-collapsed .sb-icon {
          border-radius: 12px;
        }
        .sb-name { font-size: 13px; font-weight: 800; color: #1a1205; line-height: 1.2; }
        .dark .sb-name { color: #f0f0f5; }
        .sb-sub { font-size: 10px; color: #8a7060; }
        .dark .sb-sub { color: #6b7280; }

        .sb-div { height: 1px; background: #fde8d4; margin: 0 12px; flex-shrink: 0; }
        .dark .sb-div { background: #262638; }

        .sb-nav { flex: 1; overflow-y: auto; padding: 8px 7px 0; }
        .sb-nav::-webkit-scrollbar { width: 3px; }
        .sb-nav::-webkit-scrollbar-thumb { background: #f97316; border-radius: 2px; }

        .sb-item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; padding: 8px 9px;
          border-radius: 9px; border: none; border-left: 3px solid transparent;
          background: transparent; cursor: pointer;
          margin-bottom: 2px; transition: background .15s;
        }
        .sb-item:hover { background: rgba(249,115,22,.06); }
        .sb-item.active { background: #fff7f0; border-left-color: #f97316; }
        .dark .sb-item:hover { background: rgba(249,115,22,.08); }
        .dark .sb-item.active { background: rgba(249,115,22,.12); border-left-color: #f97316; }

        .sb-badge { width: 27px; height: 27px; border-radius: 7px; font-size: 10px;
                    font-weight: 700; color: #fff; display: flex; align-items: center;
                    justify-content: center; flex-shrink: 0; }
        .sb-label { font-size: 12px; font-weight: 500; color: #1a1205; }
        .sb-label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dark .sb-label { color: #e0e0e8; }
        .sb-item.active .sb-label { color: #f97316; font-weight: 600; }

        .sb-footer {
          flex-shrink: 0;
          margin-top: auto;
          padding: 10px 12px 14px;
          border-top: 1px solid #fde8d4;
        }
        .dark .sb-footer { border-top-color: #262638; }

        .sb-user {
          display: flex; align-items: center; gap: 9px;
          padding: 9px 10px; border-radius: 10px;
          background: #fff7f0; border: 1px solid #fde8d4;
        }
        .dark .sb-user { background: rgba(249,115,22,.08); border-color: rgba(249,115,22,.2); }

        .sb-user-copy {
          min-width: 0;
        }

        .sb-item .sb-badge {
          min-width: 36px;
          min-height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .sb-user {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
          width: 100%;
        }
        .amp-shell-sidebar.is-collapsed .sb-user {
          flex-direction: column;
          gap: 8px;
        }

        .sb-avatar {
          width: 34px; height: 34px; border-radius: 8px;
          background: #f97316; color: #fff;
          font-size: 12px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .sb-user-copy {
          min-width: 0;
          flex: 1;
        }
        .amp-shell-sidebar.is-collapsed .sb-user-copy {
          flex: none;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          width: 100%;
        }
        .sb-uname {
          font-size: 12px; font-weight: 700; color: #1a1205;
          line-height: 1.3; white-space: nowrap;
          overflow: hidden; text-overflow: ellipsis;
        }
        .amp-shell-sidebar.is-collapsed .sb-uname {
          display: none;
        }
        .dark .sb-uname { color: #f0f0f5; }
        .sb-urole {
          font-size: 10px; color: #f97316; font-weight: 600;
          text-align: center;
        }
        .amp-shell-sidebar.is-collapsed .sb-urole {
          text-align: center;
          white-space: normal;
          line-height: 1.2;
        }
      `}</style>

      <aside className={`amp-shell-sidebar${open ? "" : " is-collapsed"}${mobileOpen ? " is-mobile-open" : ""}`}>
        {/* Branding */}
        <div className="sb-brand">
          <p className="sb-tag">AMP Terminal</p>
          <div className="sb-row">
            <div className="sb-icon">
              <img src={logo} alt="Logo AMP" style={{ width:60, height:60 }} />              
            </div>
            <div>
              <p className="sb-name">AMP Usinagem</p>
              <p className="sb-sub">Painel industrial local-first</p>
            </div>
          </div>
        </div>

        <div className="sb-div" />

        {/* Navegação */}
        <nav className="sb-nav">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                className={`sb-item${active ? " active" : ""}`}
                onClick={() => {
                  navigate(item.path);
                  if (mobileOpen && onClose) onClose();
                }}
              >
                <span className="sb-badge" style={{ background: item.color }}>
                  {item.id}
                </span>
                <span className="sb-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
