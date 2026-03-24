import { useMemo, useState } from "react";

function getDesktopApi() {
  if (typeof window === "undefined") return null;
  return window.webview2?.api ?? null;
}

export default function DesktopWindowControls({ compact = false, className = "" }) {
  const api = useMemo(() => getDesktopApi(), []);
  const [maximized, setMaximized] = useState(false);

  if (!api) return null;

  const baseButton = compact
    ? "h-9 w-9 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
    : "h-10 w-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700";

  const handleMinimize = async () => {
    await api.minimize();
  };

  const handleToggleMaximize = async () => {
    if (maximized) {
      await api.restore();
      setMaximized(false);
      return;
    }
    await api.maximize();
    setMaximized(true);
  };

  const handleClose = async () => {
    await api.close();
  };

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
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
