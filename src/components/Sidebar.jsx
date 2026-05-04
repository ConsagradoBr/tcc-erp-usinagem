import React from "react";
import { NavLink } from "react-router-dom";

import { getProfileLabel, hasPermission } from "../auth";
import { LogoMenu } from "../assets/assets-map";

const MENU_ITEMS = [
  { to: "/app/dashboard",    code: "DB", label: "Dashboard",                permissao: "dashboard"      },
  { to: "/app/clientes",     code: "CR", label: "Clientes e Fornecedores",  permissao: "clientes"       },
  { to: "/app/orcamentos",   code: "OC", label: "Orçamentos",               permissao: "orcamentos"     },
  { to: "/app/ordemservico", code: "OS", label: "OS",                       permissao: "ordens_servico" },
  { to: "/app/financeiro",   code: "FN", label: "Financeiro",               permissao: "financeiro"     },
  { to: "/app/usuarios",     code: "US", label: "Usuarios",                 permissao: "usuarios"       },
  { to: "/app/backup",       code: "BK", label: "Backup",                   permissao: "backup"         },
];

export default function Sidebar({ user, open, mobileOpen, onClose }) {
  const expanded = open || mobileOpen;

  const menuItems = React.useMemo(
    () => MENU_ITEMS.filter((item) => hasPermission(user, item.permissao)),
    [user]
  );

  const asideRef = React.useRef(null);

  /* ─ scroll nativo no aside ─ */
  React.useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return undefined;

    const nativeWheel = (e) => {
      if (aside.scrollHeight <= aside.clientHeight) return;
      aside.scrollTop += e.deltaY;
      e.preventDefault();
    };

    aside.addEventListener("wheel", nativeWheel, { passive: false });
    return () => aside.removeEventListener("wheel", nativeWheel);
  }, [menuItems.length, expanded]);

  /* ─ fecha ao apertar ESC (mobile) ─ */
  React.useEffect(() => {
    if (!mobileOpen) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, onClose]);

  return (
    <>
      {/* ── Overlay escuro no mobile ── */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar menu lateral"
        className={`
          fixed inset-0 z-30 bg-[rgba(2,6,12,0.62)]
          transition-opacity duration-200
          lg:hidden
          ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}
        `}
      />

      {/* ── Sidebar ── */}
      <aside
        ref={asideRef}
        className={`
          amp-shell-sidebar
          ${expanded   ? "is-expanded"    : "is-collapsed"}
          ${mobileOpen ? "is-mobile-open" : ""}
        `}
      >
        <div className="amp-shell-sidebar-inner">

          {/* ─ Brand ─ */}
          <div className="amp-shell-brand">
            <div className="amp-shell-brand-mark">
              <img src={LogoMenu} alt="AMP" className="h-9 w-9 object-contain" />
            </div>

            {expanded && (
              <div className="amp-shell-brand-copy">
                <p className="amp-shell-brand-kicker">AMP terminal</p>
                <h2>AMP Usinagem</h2>
                <p>Painel industrial local-first</p>
              </div>
            )}
          </div>

          {/* ─ Nav ─ */}
          <nav className="amp-shell-nav" aria-label="Navegacao principal">
            {menuItems.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                code={item.code}
                label={item.label}
                expanded={expanded}
                onNavigate={onClose}
              />
            ))}
          </nav>

          {/* ─ Console operacional ─ */}
          <section className={`amp-shell-console ${expanded ? "" : "is-collapsed"}`}>
            <div className="amp-shell-console-head">
              <p>Pulse operacional</p>
              <span>Live</span>
            </div>
            {expanded && (
              <div className="amp-shell-console-grid">
                <article>
                  <span>Ambiente</span>
                  <strong>Desktop</strong>
                </article>
                <article>
                  <span>Frame</span>
                  <strong>Native</strong>
                </article>
                <article>
                  <span>Perfil</span>
                  <strong>{user ? getProfileLabel(user.perfil) : "--"}</strong>
                </article>
                <article>
                  <span>Sessao</span>
                  <strong>Ativa</strong>
                </article>
              </div>
            )}
          </section>

          {/* ─ Usuário ─ */}
          {user && (
            <div className={`amp-shell-user-card ${expanded ? "" : "is-collapsed"}`}>
              <div className="amp-shell-user-avatar">
                {user.nome?.slice(0, 2).toUpperCase()}
              </div>
              {expanded && (
                <div className="amp-shell-user-copy">
                  <p className="truncate max-w-[140px]">{user.nome}</p>
                  <span>{getProfileLabel(user.perfil)}</span>
                </div>
              )}
            </div>
          )}

        </div>
      </aside>
    </>
  );
}

function SidebarItem({ to, code, label, expanded, onNavigate }) {
  const preventMiddleOpen = (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <NavLink
      to={to}
      title={!expanded ? label : undefined}
      onClick={onNavigate}
      onMouseDown={preventMiddleOpen}
      onAuxClick={preventMiddleOpen}
      className={({ isActive }) =>
        `amp-shell-link ${isActive ? "is-active" : ""} ${expanded ? "" : "is-collapsed"}`
      }
    >
      <span className="amp-shell-link-code">{code}</span>
      {expanded && (
        <span className="amp-shell-link-label truncate">{label}</span>
      )}
    </NavLink>
  );
}