import { useCallback, useState } from "react";

const EMPTY_INFO = {
  offline: false,
  fromCache: false,
  cacheMiss: false,
  lastSync: null,
};

export function summarizeOfflineResults(results) {
  const values = results
    .map((item) => {
      if (item?.status === "fulfilled") return item.value;
      return item;
    })
    .filter(Boolean);

  const timestamps = values
    .map((item) => item.syncedAt)
    .filter(Boolean)
    .sort();

  return {
    offline: values.some((item) => item.offline),
    fromCache: values.some((item) => item.fromCache),
    cacheMiss: values.some((item) => item.cacheMiss),
    lastSync: timestamps.at(-1) || null,
  };
}

export function useOfflineModuleState() {
  const [offlineInfo, setOfflineInfo] = useState(EMPTY_INFO);

  const updateOfflineInfo = useCallback((results) => {
    const info = summarizeOfflineResults(Array.isArray(results) ? results : [results]);
    setOfflineInfo(info);
    return info;
  }, []);

  const resetOfflineInfo = useCallback(() => {
    setOfflineInfo(EMPTY_INFO);
  }, []);

  return { offlineInfo, updateOfflineInfo, resetOfflineInfo };
}

export function includesTerm(value, term) {
  return String(value || "").toLowerCase().includes(String(term || "").trim().toLowerCase());
}
