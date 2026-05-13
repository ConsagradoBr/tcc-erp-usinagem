import { clearOfflineDataForUser } from "./offlineStore";

let configured = false;

export function setupOfflineSessionCleanup() {
  if (configured || typeof window === "undefined") return;
  configured = true;

  window.addEventListener("amp:session-cleared", (event) => {
    const user = event.detail?.user;
    if (!user?.id) return;

    clearOfflineDataForUser(user).catch(() => {
      // A limpeza local não deve bloquear o logout.
    });
  });
}
