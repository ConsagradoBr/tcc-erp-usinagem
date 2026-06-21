import api from "../api";
import { getStoredUser } from "../auth";
import {
  removeLocalEntity,
  upsertLocalEntity,
} from "./offlineStore";
import { isNetworkError, onOnline } from "./networkStatus";
import {
  deleteSyncItem,
  listPendingSyncItems,
  updateSyncItem,
} from "./syncQueue";

const TABLE_BY_ENTITY: Record<string, string> = {
  clientes: "clientes",
  ordensServico: "ordensServico",
};

let processing = false;
let onlineListenerAttached = false;

/** Callbacks registered by the UI to show sync status toasts. */
const listeners: Array<(event: SyncEvent) => void> = [];

export type SyncEvent =
  | { type: "sync_started"; count: number }
  | { type: "sync_completed"; processed: number }
  | { type: "sync_failed"; item_id: string; error: string }
  | { type: "retry_scheduled"; item_id: string; nextAttemptAt: string };

export function onSyncEvent(cb: (event: SyncEvent) => void): () => void {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function emit(event: SyncEvent) {
  for (const cb of listeners) {
    try {
      cb(event);
    } catch {
      /* swallow listener errors */
    }
  }
}

function isTransientError(error: any): boolean {
  const status = error?.response?.status;
  return isNetworkError(error) || [408, 429, 500, 502, 503, 504].includes(status);
}

/** Exponential backoff with jitter: 5s, 15s, 45s, 2min, 5min, 15min */
function retryDelay(retries: number): number {
  const schedule = [5000, 15000, 45000, 120000, 300000, 900000];
  const base = schedule[Math.min(retries, schedule.length - 1)];
  // Add 20% jitter to prevent thundering herd
  const jitter = base * 0.2 * Math.random();
  return Math.round(base + jitter);
}

function isLocalId(id: string | number): boolean {
  return String(id || "").startsWith("local_");
}

async function callApi(item: any): Promise<any> {
  if (item.method === "POST") return api.post(item.endpoint, item.payload);
  if (item.method === "PUT") return api.put(item.endpoint, item.payload);
  if (item.method === "PATCH") return api.patch(item.endpoint, item.payload);
  if (item.method === "DELETE") return api.delete(item.endpoint);
  throw new Error(`Método não suportado: ${item.method}`);
}

async function applySuccess(item: any, response: any, user: any): Promise<void> {
  const tableName = TABLE_BY_ENTITY[item.entityType];
  if (!tableName) return;

  if (item.method === "DELETE") {
    await removeLocalEntity(tableName, item.entityId, { user });
    await deleteSyncItem(item.id);
    return;
  }

  if (item.method === "POST" && isLocalId(item.localId)) {
    await removeLocalEntity(tableName, item.localId, { user });
  }

  await upsertLocalEntity(tableName, response.data, {
    user,
    dirty: false,
    syncedAt: new Date().toISOString(),
  });
  await deleteSyncItem(item.id);
}

function serverMessage(error: any): string {
  // Handle both old {"erro": "..."} and new {"error": {"message": "..."}} formats
  const errData = error?.response?.data;
  if (errData?.error?.message) return errData.error.message;
  if (errData?.erro) return errData.erro;
  if (errData?.mensagem) return errData.mensagem;
  return error?.message || "Erro ao sincronizar.";
}

async function applyFailure(item: any, error: any): Promise<void> {
  const status = error?.response?.status;
  if ([400, 409].includes(status)) {
    const tableName = TABLE_BY_ENTITY[item.entityType];
    if (status === 409 && item.method === "DELETE" && tableName && item.baseSnapshot) {
      await upsertLocalEntity(tableName, item.baseSnapshot, {
        user: getStoredUser(),
        dirty: false,
        deletedLocal: false,
        syncedAt: item.baseSnapshot?.updated_at || item.baseSnapshot?.created_at || null,
      });
    }
    await updateSyncItem(item.id, {
      status: status === 409 ? "conflict" : "blocked",
      lastError: serverMessage(error),
      nextAttemptAt: null,
    });
    emit({ type: "sync_failed", item_id: item.id, error: serverMessage(error) });
    return;
  }

  if ([401, 403].includes(status)) {
    await updateSyncItem(item.id, {
      status: "blocked_auth",
      lastError: serverMessage(error),
      nextAttemptAt: null,
    });
    return;
  }

  if (status === 404 && item.method === "DELETE") {
    await deleteSyncItem(item.id);
    return;
  }

  if (isTransientError(error)) {
    const retries = Number(item.retries || 0) + 1;
    const delay = retryDelay(retries);
    const nextAttemptAt = retries >= 8 ? null : new Date(Date.now() + delay).toISOString();
    await updateSyncItem(item.id, {
      status: retries >= 8 ? "blocked" : "retry",
      retries,
      lastError: serverMessage(error),
      nextAttemptAt,
    });
    emit({
      type: "retry_scheduled",
      item_id: item.id,
      nextAttemptAt: nextAttemptAt || "blocked",
    });
    return;
  }

  await updateSyncItem(item.id, {
    status: "blocked",
    lastError: serverMessage(error),
    nextAttemptAt: null,
  });
  emit({ type: "sync_failed", item_id: item.id, error: serverMessage(error) });
}

export async function processSyncQueue(
  user: any = getStoredUser(),
  options: { force?: boolean } = {},
): Promise<{ processed: number }> {
  if (processing || !user?.id) return { processed: 0 };
  processing = true;
  let processed = 0;

  try {
    const now = Date.now();
    const items = await listPendingSyncItems(user);
    if (items.length > 0) {
      emit({ type: "sync_started", count: items.length });
    }
    for (const item of items) {
      if (String(item.ownerUserId) !== String(user.id)) continue;
      if (
        item.nextAttemptAt &&
        new Date(item.nextAttemptAt).getTime() > now &&
        !options.force
      )
        continue;

      await updateSyncItem(item.id, { status: "processing" });
      try {
        const response = await callApi(item);
        await applySuccess(item, response, user);
        processed += 1;
      } catch (error: any) {
        await applyFailure(item, error);
        if ([401, 403].includes(error?.response?.status)) break;
      }
    }
    if (processed > 0) {
      emit({ type: "sync_completed", processed });
    }
  } finally {
    processing = false;
  }

  return { processed };
}

/**
 * Auto-trigger sync when the browser comes back online.
 * Attaches a one-time listener on the window 'online' event.
 */
export function enableAutoSyncOnReconnect(): void {
  if (onlineListenerAttached) return;
  onlineListenerAttached = true;
  onOnline(() => {
    processSyncQueue().catch(() => {
      /* best-effort */
    });
  });
}
