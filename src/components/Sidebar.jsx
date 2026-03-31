import React from "react";
import { NavLink } from "react-router-dom";

import { getProfileLabel, hasPermission } from "../auth";
import { LogoMenu } from "../assets/assets-map";

const MENU_ITEMS = [
  { to: "/app/dashboard", code: "DB", label: "Dashboard", permissao: "dashboard" },
  { to: "/app/clientes", code: "CR", label: "Clientes e Fornecedores", permissao: "clientes" },
  { to: "/app/orcamentos", code: "OC", label: "Orçamentos", permissao: "orcamentos" },
  { to: "/app/ordemservico", code: "OS", label: "OS", permissao: "ordens_servico" },
  { to: "/app/financeiro", code: "FN", label: "Financeiro", permissao: "financeiro" },
  { to: "/app/usuarios", code: "US", label: "Usuarios", permissao: "usuarios" },
  { to: "/app/backup", code: "BK", label: "Backup", permissao: "backup" },
];

export default function Sidebar({ user, open, mobileOpen, onClose }) {
  const expanded = open || mobileOpen;
  const menuItems = React.useMemo(
    () => MENU_ITEMS.filter((item) => hasPermission(user, item.permissao)),
    [user]
  );
  const asideRef = React.useRef(null);

  const handleSidebarWheel = (event) => {
    const container = asideRef.current;
    if (!container || container.scrollHeight <= container.clientHeight) return;
    container.scrollTop += event.deltaY;
    event.preventDefault();
    event.stopPropagation();
  };

  React.useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return undefined;

    const nativeWheel = (event) => {
      if (aside.scrollHeight <= aside.clientHeight) return;
      aside.scrollTop += event.deltaY;
      event.preventDefault();
    };

    aside.addEventListener("wheel", nativeWheel, { passive: false });
    return () => aside.removeEventListener("wheel", nativeWheel);
  }, [menuItems.length, expanded]);

  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar menu lateral"
        className={`fixed inset-0 z-30 bg-[rgba(2,6,12,0.62)] transition-opacity lg:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        ref={asideRef}
        onWheelCapture={handleSidebarWheel}
        className={`amp-shell-sidebar ${expanded ? "is-expanded" : "is-collapsed"} ${mobileOpen ? "is-mobile-open" : ""}`}
      >
        <div className="amp-shell-sidebar-inner">
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

          <section className={`amp-shell-console ${expanded ? "" : "is-collapsed"}`}>
            <div className="amp-shell-console-head">
              <p>Pulse operacional</p>
              <span>Live</span>
            </div>
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
          </section>

          {user && (
            <div className={`amp-shell-user-card ${expanded ? "" : "is-collapsed"}`}>
              <div className="amp-shell-user-avatar">{user.nome?.slice(0, 2).toUpperCase()}</div>
              {expanded && (
                <div className="amp-shell-user-copy">
                  <p>{user.nome}</p>
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
  const preventMiddleOpen = (event) => {
    if (event.button !== 1) return;
    event.preventDefault();
    event.stopPropagation();
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
      {expanded && <span className="amp-shell-link-label">{label}</span>}
    </NavLink>
  );
}
