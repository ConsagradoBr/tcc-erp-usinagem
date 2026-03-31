import { useEffect, useState } from "react";

import { getDesktopApi, getDesktopWindowMaximized, toggleDesktopMaximize } from "../utils/desktopWindow";

export default function DesktopWindowControls({ compact = false, className = "" }) {
  const [api, setApi] = useState(() => getDesktopApi());
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (api) return undefined;

    const intervalId = window.setInterval(() => {
      const resolvedApi = getDesktopApi();
      if (resolvedApi) {
        setApi(resolvedApi);
        window.clearInterval(intervalId);
      }
    }, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return undefined;

    let active = true;

    const syncState = async () => {
      const next = await getDesktopWindowMaximized();
      if (active) setMaximized(next);
    };

    syncState();
    window.addEventListener("focus", syncState);
    window.addEventListener("resize", syncState);
    const intervalId = window.setInterval(syncState, 1200);

    return () => {
      active = false;
      window.removeEventListener("focus", syncState);
      window.removeEventListener("resize", syncState);
      window.clearInterval(intervalId);
    };
  }, [api]);

  if (!api) return null;

  const baseButton = compact
    ? "h-8 w-11 rounded-[10px] text-white/64 hover:bg-white/10 hover:text-white"
    : "h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700";
  const groupGap = compact ? "gap-1" : "gap-2";

  const handleMinimize = async () => {
    try {
      await api.minimize?.();
    } catch {
      // Keep the shell responsive even if the native bridge glitches.
    }
  };

  const handleToggleMaximize = async () => {
    const next = await toggleDesktopMaximize();
    setMaximized(next);
  };

  const handleClose = async () => {
    try {
      await api.close?.();
    } catch {
      // Ignore bridge errors here; the fallback shell state is still valid.
    }
  };

  return (
    <div className={`flex items-center ${groupGap} ${className}`.trim()} data-no-drag="true">
      <button
        type="button"
        onClick={handleMinimize}
        className={`${baseButton} transition`}
        aria-label="Minimizar janela"
        title="Minimizar"
      >
        <span className="mx-auto block h-0.5 w-4 rounded-full bg-current" />
      </button>

      <button
        type="button"
        onClick={handleToggleMaximize}
        className={`${baseButton} transition`}
        aria-label={maximized ? "Restaurar janela" : "Maximizar janela"}
        title={maximized ? "Restaurar" : "Maximizar"}
      >
        {maximized ? (
          <span className="relative mx-auto block h-4 w-4">
            <span className="absolute left-0 top-1 h-3 w-3 rounded-[2px] border-2 border-current bg-transparent" />
            <span className="absolute left-1 top-0 h-3 w-3 rounded-[2px] border-2 border-current bg-transparent" />
          </span>
        ) : (
          <span className="mx-auto block h-4 w-4 rounded-[2px] border-2 border-current" />
        )}
      </button>

      <button
        type="button"
        onClick={handleClose}
        className={`${baseButton} transition hover:bg-red-500 hover:text-white`}
        aria-label="Fechar janela"
        title="Fechar"
      >
        <span className="relative mx-auto block h-4 w-4">
          <span className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 rotate-45 rounded-full bg-current" />
          <span className="absolute left-1/2 top-0 h-4 w-0.5 -translate-x-1/2 -rotate-45 rounded-full bg-current" />
        </span>
      </button>
    </div>
  );
}
