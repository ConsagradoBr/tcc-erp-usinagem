import React from "react";
import { NavLink } from "react-router-dom";

import { getProfileLabel, hasPermission } from "../auth";
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
  const desktopWidth = open ? "lg:w-72" : "lg:w-28";
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
        className={`cm-rail fixed left-0 top-0 z-40 h-full w-80 max-w-[88vw] text-slate-100 transition-all duration-300 ${desktopWidth} ${mobileState}`}
      >
        <div className="border-b border-white/8 px-4 py-6 min-h-24">
          <div className={`flex items-center gap-3 ${open ? "justify-start px-2" : "justify-center"}`}>
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] border border-white/10 bg-white/6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <img
                src={LogoMenu}
                alt="Logo Menu"
                className={`max-w-full object-contain transition-all brightness-110 ${open ? "w-10" : "w-8"}`}
              />
            </div>
            {open && (
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.28em] text-slate-500">Ceramic Monolith</p>
                <p className="truncate text-base font-semibold text-white">AMP Usinagem</p>
              </div>
            )}
          </div>
        </div>

        <nav className="mt-5 flex flex-col gap-2 px-4">
          {menuItems.map((item) => (
            <SidebarItem key={item.to} to={item.to} icon={item.icon} label={item.label} open={open} onNavigate={onClose} />
          ))}
        </nav>

        {user && (
          <div className="absolute inset-x-0 bottom-0 border-t border-white/8 p-4">
            <div className={`rounded-[24px] border border-white/10 bg-white/5 px-3 py-4 ${open ? "" : "lg:px-2"}`}>
              <div className={`flex items-center gap-3 ${open ? "" : "lg:justify-center"}`}>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[18px] bg-[rgba(208,124,69,0.16)] text-sm font-bold text-[var(--cm-accent-strong)]">
                  {user.nome?.slice(0, 2).toUpperCase()}
                </div>
                <div className={`min-w-0 ${open ? "block" : "hidden lg:hidden"}`}>
                  <p className="truncate text-sm font-semibold text-white">{user.nome}</p>
                  <p className="truncate text-xs text-slate-400">{getProfileLabel(user.perfil)}</p>
                  <p className="truncate text-xs text-slate-500">{user.email || "Usuario autenticado"}</p>
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
        `group flex min-w-0 items-center gap-3 rounded-[20px] px-4 py-3 transition ${
          isActive
            ? "bg-[rgba(248,244,238,0.92)] text-[var(--cm-text)] shadow-[0_16px_38px_rgba(7,9,12,0.16)]"
            : "text-slate-300 hover:bg-white/7 hover:text-white"
        } ${open ? "justify-start" : "lg:justify-center"}`
      }
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-black/12 transition group-hover:bg-white/10">
        <img src={icon} alt={label} className="w-6 shrink-0" />
      </div>
      <span className={`font-medium truncate ${open ? "block" : "lg:hidden"}`}>{label}</span>
    </NavLink>
  );
}
