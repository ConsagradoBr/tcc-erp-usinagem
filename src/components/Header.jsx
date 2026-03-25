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
    <header className="sticky top-0 z-20 px-3 pt-3 sm:px-4 lg:px-6 lg:pt-5">
      <div className="cm-surface flex min-h-[82px] items-center justify-between gap-3 rounded-[32px] px-3 py-3 sm:px-4 lg:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[20px] border border-white/10 bg-[var(--cm-strong)] text-white shadow-[0_14px_30px_rgba(15,18,22,0.22)] hover:bg-[color:var(--cm-accent)]"
            aria-label="Abrir menu"
          >
            <img src={IconMenu} alt="Menu" className="w-6 sm:w-7 brightness-[3.4]" />
          </button>

          <div className="hidden min-w-0 items-center gap-3 md:flex">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/12 bg-[var(--cm-strong)] shadow-[0_14px_30px_rgba(15,18,22,0.18)]">
              <img src={LogoMain} alt="Logo AMP Usinagem" className="h-7 w-7 object-contain brightness-0 invert" />
            </div>
            <div className="min-w-0">
              <p className="cm-label truncate font-semibold">
                AMP Industrial
              </p>
              <h1 className="truncate text-xl font-bold tracking-[-0.03em] text-[var(--cm-text)]">Painel Operacional</h1>
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 items-center justify-center px-2 lg:flex">
          {user && (
            <div className="hidden min-w-0 items-center gap-3 rounded-full border border-[color:var(--cm-line)] bg-white/55 px-4 py-2 lg:flex">
              <span className="cm-label font-semibold">Ceramic Monolith</span>
              <div className="h-4 w-px bg-[color:var(--cm-line)]" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--cm-text)]">{user.nome}</p>
                <p className="truncate text-xs text-[var(--cm-muted)]">
                  {getProfileLabel(user.perfil)} • {today}
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user && (
            <div className="hidden h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-[var(--cm-strong)] text-sm font-bold text-white lg:flex">
              {user.nome?.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="rounded-[18px] border border-[color:var(--cm-line)] bg-white/60 px-2 py-1.5">
            <DesktopWindowControls compact />
          </div>
          <button
            onClick={handleLogout}
            className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[color:var(--cm-line)] bg-white/60 hover:border-[color:var(--cm-accent)] hover:bg-[var(--cm-accent-soft)]"
            aria-label="Sair"
          >
            <img src={IconPower} alt="Logout" className="w-5 sm:w-6" />
          </button>
        </div>
      </div>
    </header>
  );
}
