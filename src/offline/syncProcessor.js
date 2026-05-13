import api from "../api";
import { getStoredUser } from "../auth";
import {
  removeLocalEntity,
  upsertLocalEntity,
} from "./offlineStore";
import { isNetworkError } from "./networkStatus";
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

function isTransientError(error) {
  const status = error?.response?.status;
  return isNetworkError(error) || [408, 429, 500, 502, 503, 504].includes(status);
}

function retryDelay(retries) {
  const schedule = [5000, 15000, 45000, 120000, 300000, 900000];
  return schedule[Math.min(retries, schedule.length - 1)];
}

function isLocalId(id) {
  return String(id || "").startsWith("local_");
}

async function callApi(item) {
  if (item.method === "POST") return api.post(item.endpoint, item.payload);
  if (item.method === "PUT") return api.put(item.endpoint, item.payload);
  if (item.method === "PATCH") return api.patch(item.endpoint, item.payload);
  if (item.method === "DELETE") return api.delete(item.endpoint);
  throw new Error(`Método não suportado: ${item.method}`);
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
  return error?.response?.data?.erro || error?.response?.data?.mensagem || error?.message || "Erro ao sincronizar.";
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
    await updateSyncItem(item.id, {
      status: retries >= 8 ? "blocked" : "retry",
      retries,
      lastError: serverMessage(error),
      nextAttemptAt: retries >= 8 ? null : new Date(Date.now() + retryDelay(retries)).toISOString(),
    });
    return;
  }

  await updateSyncItem(item.id, {
    status: "blocked",
    lastError: serverMessage(error),
    nextAttemptAt: null,
  });
}

export async function processSyncQueue(user = getStoredUser(), options = {}) {
  if (processing || !user?.id) return { processed: 0 };
  processing = true;
  let processed = 0;

  try {
    const now = Date.now();
    const items = await listPendingSyncItems(user);
    for (const item of items) {
      if (String(item.ownerUserId) !== String(user.id)) continue;
      if (item.nextAttemptAt && new Date(item.nextAttemptAt).getTime() > now && !options.force) continue;

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
  } finally {
    processing = false;
  }

  return { processed };
}
