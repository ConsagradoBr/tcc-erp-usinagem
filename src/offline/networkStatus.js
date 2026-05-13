import { useEffect, useState } from "react";

export function isOfflineNow() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

export function isNetworkError(error) {
  if (isOfflineNow()) return true;
  if (!error) return false;
  if (!error.response) return true;
  return error.code === "ERR_NETWORK" || error.message === "Network Error";
}

export function useNetworkStatus() {
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
