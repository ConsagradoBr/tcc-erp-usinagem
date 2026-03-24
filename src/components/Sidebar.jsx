import React from "react";
import { NavLink } from "react-router-dom";

import { hasPermission } from "../auth";
import {
  IconDashboard,
  IconClients,
  IconServiceOrder,
  IconFinance,
  IconQuotes,
  LogoMenu,
  IconPower,
} from "../assets/assets-map";

const MENU_ITEMS = [
  { to: "/app/dashboard", icon: IconDashboard, label: "Dashboard", permissao: "dashboard" },
  { to: "/app/clientes", icon: IconClients, label: "Clientes", permissao: "clientes" },
  { to: "/app/ordemservico", icon: IconServiceOrder, label: "Ordem de Serviço", permissao: "ordens_servico" },
  { to: "/app/financeiro", icon: IconFinance, label: "Financeiro", permissao: "financeiro" },
  { to: "/app/orcamentos", icon: IconQuotes, label: "Orçamentos", permissao: "orcamentos" },
  { to: "/app/backup", icon: IconPower, label: "Backup", permissao: "backup" },
  { to: "/app/usuarios", icon: IconClients, label: "Usuários", permissao: "usuarios" },
];

export default function Sidebar({ user, open, mobileOpen, onClose }) {
  const desktopWidth = open ? "lg:w-64" : "lg:w-20";
  const mobileState = mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0";
  const menuItems = MENU_ITEMS.filter((item) => hasPermission(user, item.permissao));

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 max-w-[86vw] bg-white shadow-xl transition-all duration-300 ${desktopWidth} ${mobileState}`}
      >
        <div className="flex items-center justify-center py-5 px-3 border-b min-h-20">
          <img src={LogoMenu} alt="Logo Menu" className={`transition-all max-w-full object-contain ${open ? "w-32" : "lg:w-10 w-28"}`} />
        </div>

        <nav className="mt-4 flex flex-col gap-2 px-2">
          {menuItems.map((item) => (
            <SidebarItem key={item.to} to={item.to} icon={item.icon} label={item.label} open={open} onNavigate={onClose} />
          ))}
        </nav>
      </aside>
    </>
  );
}

function SidebarItem({ to, icon, label, open, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg transition min-w-0 ${
          isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
        } ${open ? "justify-start" : "lg:justify-center"}`
      }
    >
      <img src={icon} alt={label} className="w-6 shrink-0" />
      <span className={`font-medium truncate ${open ? "block" : "lg:hidden"}`}>{label}</span>
    </NavLink>
  );
}
