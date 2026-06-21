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

const TABLE_BY_ENTITY = {
  clientes: "clientes",
  ordensServico: "ordensServico",
};

let processing = false;
let onlineListenerAttached = false;

/** Callbacks registered by the UI to show sync status toasts. */
const listeners = [];

/**
 * @typedef {{ type: string, count?: number, processed?: number, item_id?: string, error?: string, nextAttemptAt?: string }} SyncEvent
 */

export function onSyncEvent(cb) {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function emit(event) {
  for (const cb of listeners) {
    try {
      cb(event);
    } catch {
      /* swallow listener errors */
    }
  }
}

function isTransientError(error) {
  const status = error?.response?.status;
  return isNetworkError(error) || [408, 429, 500, 502, 503, 504].includes(status);
}

/** Exponential backoff with jitter: 5s, 15s, 45s, 2min, 5min, 15min */
function retryDelay(retries) {
  const schedule = [5000, 15000, 45000, 120000, 300000, 900000];
  const base = schedule[Math.min(retries, schedule.length - 1)];
  const jitter = base * 0.2 * Math.random();
  return Math.round(base + jitter);
}

function isLocalId(id) {
  return String(id || "").startsWith("local_");
}

async function callApi(item) {
  if (item.method === "POST") return api.post(item.endpoint, item.payload);
  if (item.method === "PUT") return api.put(item.endpoint, item.payload);
  if (item.method === "PATCH") return api.patch(item.endpoint, item.payload);
  if (item.method === "DELETE") return api.delete(item.endpoint);
  throw new Error(`Metodo nao suportado: ${item.method}`);
}

async function applySuccess(item, response, user) {
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

function serverMessage(error) {
  const errData = error?.response?.data;
  if (errData?.error?.message) return errData.error.message;
  if (errData?.erro) return errData.erro;
  if (errData?.mensagem) return errData.mensagem;
  return error?.message || "Erro ao sincronizar.";
}

async function applyFailure(item, error) {
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

export async function processSyncQueue(user, options) {
  user = user || getStoredUser();
  options = options || {};
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
      } catch (error) {
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
export function enableAutoSyncOnReconnect() {
  if (onlineListenerAttached) return;
  onlineListenerAttached = true;
  onOnline(() => {
    processSyncQueue().catch(() => {
      /* best-effort */
    });
  });
}
