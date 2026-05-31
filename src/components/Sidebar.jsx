import { Link, useLocation } from "react-router-dom";

import { hasPermission } from "../auth";
import logoGif from "../assets/gif_transparente.png";

const NAV_ITEMS = [
  { id: "DB", label: "Dashboard", tone: "teal", path: "/app/dashboard", permissao: "dashboard" },
  { id: "CR", label: "Clientes e Fornecedores", tone: "blue", path: "/app/clientes", permissao: "clientes" },
  { id: "OC", label: "Orçamentos", tone: "orange", path: "/app/orcamentos", permissao: "orcamentos" },
  { id: "OS", label: "Ordem de Serviço", tone: "green", path: "/app/ordens-servico", permissao: "ordens_servico" },
  { id: "FN", label: "Financeiro", tone: "orange", path: "/app/financeiro", permissao: "financeiro" },
  { id: "US", label: "Usuários", tone: "sky", path: "/app/usuarios", permissao: "usuarios" },
  { id: "BK", label: "Backup", tone: "muted", path: "/app/backup", permissao: "backup" },
];

export default function Sidebar({ user, open, mobileOpen, onClose }) {
  const location = useLocation();
  const navItems = NAV_ITEMS.filter((item) => hasPermission(user, item.permissao));
  const collapsed = !open && !mobileOpen;

  return (
    <aside className={`amp-shell-sidebar${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}>
      <div className="amp-shell-sidebar-inner min-w-0 max-w-full">
        <div className="amp-shell-brand min-w-0">
          <div className="amp-shell-brand-mark">
            <img src={logoGif} alt="Logo AMP" className="h-12 w-12 object-contain" />
          </div>

          {!collapsed && (
            <div className="amp-shell-brand-copy min-w-0">
              <h2>AMP Usinagem</h2>
            </div>
          )}
        </div>

        <nav className="amp-shell-nav min-w-0">
          {navItems.map((item) => {
            const active = location.pathname.startsWith(item.path);

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`amp-shell-link${active ? " is-active" : ""}${collapsed ? " is-collapsed" : ""}`}
                title={collapsed ? item.label : undefined}
                onClick={() => {
                  if (mobileOpen && onClose) onClose();
                }}
              >
                <span className={`amp-shell-link-code is-${item.tone}`}>
                  {item.id}
                </span>
                {!collapsed && <span className="amp-shell-link-label truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
