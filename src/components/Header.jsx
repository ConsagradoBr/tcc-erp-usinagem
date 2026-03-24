import React from "react";
import { useNavigate } from "react-router-dom";

import { clearSession, getProfileLabel } from "../auth";
import { IconMenu, IconPower, LogoMain } from "../assets/assets-map";
import DesktopWindowControls from "./DesktopWindowControls";

export default function Header({ onMenuToggle, user }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="w-full min-h-16 bg-white flex items-center justify-between gap-3 px-3 sm:px-4 lg:px-6 py-3 border-b shadow-sm">
      <button
        onClick={onMenuToggle}
        className="p-2 rounded-lg hover:bg-gray-100 transition shrink-0"
        aria-label="Abrir menu"
      >
        <img src={IconMenu} alt="Menu" className="w-6 sm:w-7" />
      </button>

      <div className="min-w-0 flex-1 flex items-center justify-center gap-3 px-2">
        <img src={LogoMain} alt="Logo" className="w-24 sm:w-28 lg:w-32 max-w-full object-contain" />
        {user && (
          <div className="hidden md:flex flex-col min-w-0">
            <span className="text-sm font-semibold text-gray-800 truncate">{user.nome}</span>
            <span className="text-xs text-gray-500 truncate">{getProfileLabel(user.perfil)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <DesktopWindowControls compact />
        <button
          onClick={handleLogout}
          className="p-2 rounded-lg hover:bg-gray-100 transition shrink-0"
          aria-label="Sair"
        >
          <img src={IconPower} alt="Logout" className="w-5 sm:w-6" />
        </button>
      </div>
    </header>
  );
}
