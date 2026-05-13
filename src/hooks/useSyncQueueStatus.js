import { useCallback, useEffect, useState } from "react";

import { getStoredUser } from "../auth";
import { processSyncQueue } from "../offline/syncProcessor";
import { summarizeSyncQueue } from "../offline/syncQueue";

const EMPTY_SUMMARY = {
  total: 0,
  pending: 0,
  conflicts: 0,
  items: [],
};

export function useSyncQueueStatus(user = getStoredUser()) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setSummary(EMPTY_SUMMARY);
      return EMPTY_SUMMARY;
    }
    const next = await summarizeSyncQueue(user);
    setSummary(next);
    return next;
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!user?.id) return;
    setSyncing(true);
    try {
      await processSyncQueue(user, { force: true });
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh, user]);

  useEffect(() => {
    refresh();
    const handleQueue = () => refresh();
    const handleOnline = () => {
      processSyncQueue(user).finally(refresh);
    };
    window.addEventListener("amp:sync-queue-changed", handleQueue);
    window.addEventListener("online", handleOnline);
    window.addEventListener("focus", handleQueue);
    return () => {
      window.removeEventListener("amp:sync-queue-changed", handleQueue);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("focus", handleQueue);
    };
  }, [refresh, user]);

  return { summary, syncing, syncNow, refresh };
}
