import { useEffect, useState } from "react";

export function isOfflineNow(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function isNetworkError(error: any): boolean {
  if (isOfflineNow()) return true;
  if (!error) return false;
  if (!error.response) return true;
  return error.code === "ERR_NETWORK" || error.message === "Network Error";
}

/**
 * Register a callback that fires once when the browser transitions
 * from offline to online. Returns an unsubscribe function.
 */
export function onOnline(cb: () => void): () => void {
  let called = false;
  const handler = () => {
    if (!called) {
      called = true;
      cb();
    }
    window.removeEventListener("online", handler);
  };
  window.addEventListener("online", handler);
  return () => {
    window.removeEventListener("online", handler);
    called = true;
  };
}

export function useNetworkStatus(): { online: boolean; offline: boolean } {
  const [online, setOnline] = useState(() => !isOfflineNow());

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online, offline: !online };
}
