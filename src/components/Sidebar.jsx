import React from "react";
import { NavLink } from "react-router-dom";
import {
  IconDashboard,
  IconClients,
  IconServiceOrder,
  IconFinance,
  IconInvoices,
  LogoMenu,
} from "../assets/assets-map";

export default function Sidebar({ open }) {
  return (
    <aside className={`fixed left-0 top-0 h-full bg-white shadow-xl z-40 transition-all duration-300 ${open ? "w-64" : "w-16"}`}>
      <div className="flex items-center justify-center py-6 border-b">
        <img src={LogoMenu} alt="Logo Menu" className={`transition-all ${open ? "w-32" : "w-10"}`} />
      </div>

      <nav className="mt-6 flex flex-col gap-2">
        <SidebarItem to="/app/dashboard" icon={IconDashboard} label="Dashboard" open={open} />
        <SidebarItem to="/app/clientes" icon={IconClients} label="Clientes" open={open} />
        <SidebarItem to="/app/ordemservico" icon={IconServiceOrder} label="Ordem de Serviço" open={open} />
        <SidebarItem to="/app/financeiro" icon={IconFinance} label="Financeiro" open={open} />
        <SidebarItem to="/app/nfs" icon={IconInvoices} label="Notas Fiscais" open={open} />
      </nav>
    </aside>
  );
}

function SidebarItem({ to, icon, label, open }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-3 rounded-lg mx-2 transition ${
          isActive ? "bg-blue-100 text-blue-700" : "text-gray-700 hover:bg-gray-100"
        }`
      }
    >
      <img src={icon} alt={label} className="w-6" />
      {open && <span className="font-medium">{label}</span>}
    </NavLink>
  );
}