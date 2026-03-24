import React from "react";
import { useNavigate } from "react-router-dom";

import { clearSession, getProfileLabel } from "../auth";
import { IconMenu, IconPower, LogoMain } from "../assets/assets-map";
import DesktopWindowControls from "./DesktopWindowControls";

export default function Header({ onMenuToggle, user }) {
  const navigate = useNavigate();
  const today = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());

  const handleLogout = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4 lg:px-6 lg:pt-4">
      <div className="flex min-h-[72px] items-center justify-between gap-3 rounded-[28px] border border-white/60 bg-white/72 px-3 py-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="shrink-0 rounded-2xl border border-slate-200/80 bg-white/90 p-2.5 hover:border-orange-200 hover:bg-orange-50"
            aria-label="Abrir menu"
          >
            <img src={IconMenu} alt="Menu" className="w-6 sm:w-7" />
          </button>

          <div className="hidden min-w-0 items-center gap-3 md:flex">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-slate-900/15">
              <img src={LogoMain} alt="Logo AMP Usinagem" className="h-7 w-7 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                AMP Industrial
              </p>
              <h1 className="truncate text-lg font-bold text-slate-900">Painel Operacional</h1>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 items-center justify-center px-2 lg:flex">
          {user && (
            <div className="hidden min-w-0 items-center gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-4 py-2 lg:flex">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-100 text-sm font-bold text-orange-600">
                {user.nome?.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-800">{user.nome}</p>
                <p className="truncate text-xs text-slate-500">
                  {getProfileLabel(user.perfil)} • {today}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-2xl border border-slate-200/70 bg-white/85 px-2 py-1.5">
            <DesktopWindowControls compact />
          </div>
          <button
            onClick={handleLogout}
            className="rounded-2xl border border-red-100 bg-white/90 p-2.5 hover:border-red-200 hover:bg-red-50"
            aria-label="Sair"
          >
            <img src={IconPower} alt="Logout" className="w-5 sm:w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
