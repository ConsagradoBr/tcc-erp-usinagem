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
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar menu lateral"
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity lg:hidden ${mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      <aside
        className={`fixed left-0 top-0 z-40 h-full w-72 max-w-[86vw] border-r border-white/10 bg-slate-950/92 text-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.32)] backdrop-blur-2xl transition-all duration-300 ${desktopWidth} ${mobileState}`}
      >
        <div className="border-b border-white/10 px-3 py-5 min-h-20">
          <div className={`flex items-center gap-3 ${open ? "justify-start px-3" : "justify-center"}`}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 shadow-inner shadow-white/10">
              <img
                src={LogoMenu}
                alt="Logo Menu"
                className={`max-w-full object-contain transition-all ${open ? "w-9" : "w-8"}`}
              />
            </div>
            {open && (
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-400">Desktop ERP</p>
                <p className="truncate text-sm font-semibold text-white">AMP Usinagem</p>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-2 px-3">
          {menuItems.map((item) => (
            <SidebarItem key={item.to} to={item.to} icon={item.icon} label={item.label} open={open} onNavigate={onClose} />
          ))}
        </nav>

        {user && (
          <div className="absolute inset-x-0 bottom-0 border-t border-white/10 p-3">
            <div className={`rounded-3xl border border-white/10 bg-white/5 px-3 py-3 ${open ? "" : "lg:px-2"}`}>
              <div className={`flex items-center gap-3 ${open ? "" : "lg:justify-center"}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-sm font-bold text-orange-300">
                  {user.nome?.slice(0, 2).toUpperCase()}
                </div>
                <div className={`min-w-0 ${open ? "block" : "hidden lg:hidden"}`}>
                  <p className="truncate text-sm font-semibold text-white">{user.nome}</p>
                  <p className="truncate text-xs text-slate-400">{user.email || "Usuario autenticado"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
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
        `group flex min-w-0 items-center gap-3 rounded-2xl px-4 py-3 transition ${
          isActive
            ? "bg-white text-slate-950 shadow-lg shadow-black/10"
            : "text-slate-300 hover:bg-white/8 hover:text-white"
        } ${open ? "justify-start" : "lg:justify-center"}`
      }
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black/10 transition group-hover:bg-white/10">
        <img src={icon} alt={label} className="w-6 shrink-0" />
      </div>
      <span className={`font-medium truncate ${open ? "block" : "lg:hidden"}`}>{label}</span>
    </NavLink>
  );
}
