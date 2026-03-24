import React from "react";
import { useNavigate } from "react-router-dom";

import {
  IconClients,
  IconDashboard,
  IconFinance,
  IconInvoices,
  IconMoon,
  IconPower,
  IconServiceOrder,
  IconSun,
  LogoMenu,
} from "../assets/assets-map";

const MENU_ITEMS = [
  { label: "Financeiro", icon: IconFinance },
  { label: "Clientes", icon: IconClients },
  { label: "Painel", icon: IconDashboard },
  { label: "O.S.", icon: IconServiceOrder },
  { label: "Notas fiscais", icon: IconInvoices },
];

export default function Slide({ isOpen, onClose }) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div
      onMouseLeave={onClose}
      className="fixed left-[6.5%] top-0 z-50 flex h-screen min-w-[240px] w-[22%] flex-col rounded-r-2xl bg-white p-6 font-bold text-orange-600 shadow-lg"
    >
      <div className="mb-6 w-full">
        <img
          src={LogoMenu}
          alt="Logo AMP Usinagem"
          style={{ width: "70%", paddingLeft: "10%" }}
        />
      </div>

      <div className="w-full flex-1 space-y-4">
        {MENU_ITEMS.map((item) => (
          <div key={item.label} className="border-b border-dashed border-orange-400 pb-3">
            <p className="flex items-center gap-3">
              {item.label}
              <img src={item.icon} alt="" className="h-5 w-5" />
            </p>
          </div>
        ))}
      </div>

      <div className="mt-2 flex w-full items-center justify-between">
        <div className="flex gap-3">
          <button
            type="button"
            className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-1"
          >
            <img src={IconSun} alt="" className="w-4" />
            Claro
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-md bg-gray-200 px-3 py-1"
          >
            <img src={IconMoon} alt="" className="w-4" />
            Escuro
          </button>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-full border bg-white p-2 shadow-md"
          aria-label="Sair do sistema"
        >
          <img src={IconPower} alt="" className="w-6" />
        </button>
      </div>
    </div>
  );
}
