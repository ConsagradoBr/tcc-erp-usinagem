import db from "../db/localDB";
import { getScopeForUser } from "./offlineStore";

const ALLOWED_ENTITY_TYPES = new Set(["clientes", "ordensServico"]);
const ALLOWED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function notifySyncQueueChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("amp:sync-queue-changed"));
  }
}

function requireValidQueueItem(item) {
  if (!ALLOWED_ENTITY_TYPES.has(item.entityType)) {
    throw new Error("Entidade não permitida para sincronização offline.");
  }
  if (!ALLOWED_METHODS.has(item.method)) {
    throw new Error("Método não permitido para sincronização offline.");
  }
  if (!item.idempotencyKey) {
    throw new Error("idempotencyKey obrigatório para sincronização offline.");
  }
}

export async function enqueueSyncItem(item, user) {
  requireValidQueueItem(item);
  const scope = getScopeForUser(user);
  if (!scope) {
    throw new Error("Sessão necessária para fila de sincronização.");
  }

  const id = await db.syncQueue.add({
    scopeId: scope.scopeId,
    ownerUserId: scope.ownerUserId,
    endpoint: item.endpoint,
    method: item.method,
    payload: item.payload ?? null,
    entityType: item.entityType,
    entityId: item.entityId ?? null,
    localId: item.localId ?? item.entityId ?? null,
    idempotencyKey: item.idempotencyKey,
    operation: item.operation || item.method.toLowerCase(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    retries: 0,
    lastError: "",
    nextAttemptAt: null,
    status: "pending",
    baseSnapshot: item.baseSnapshot ?? null,
  });
  notifySyncQueueChanged();
  return id;
}

export async function listPendingSyncItems(user) {
  const scope = getScopeForUser(user);
  if (!scope) return [];

  return db.syncQueue
    .where("scopeId")
    .equals(scope.scopeId)
    .and((item) => ["pending", "retry"].includes(item.status))
    .sortBy("createdAt");
}

export async function listSyncItems(user) {
  const scope = getScopeForUser(user);
  if (!scope) return [];

  return db.syncQueue.where("scopeId").equals(scope.scopeId).sortBy("createdAt");
}

export async function summarizeSyncQueue(user) {
  const items = await listSyncItems(user);
  return {
    total: items.length,
    pending: items.filter((item) => ["pending", "retry", "processing"].includes(item.status)).length,
    conflicts: items.filter((item) => ["conflict", "blocked", "blocked_auth"].includes(item.status)).length,
    items,
  };
}

export async function updateSyncItem(id, patch) {
  await db.syncQueue.update(id, {
    ...patch,
    updatedAt: new Date().toISOString(),
  });
  notifySyncQueueChanged();
}

export async function deleteSyncItem(id) {
  await db.syncQueue.delete(id);
  notifySyncQueueChanged();
}

export async function updateQueuedLocalCreate(user, entityType, localId, payload) {
  const scope = getScopeForUser(user);
  if (!scope) return false;

  const items = await db.syncQueue
    .where("scopeId")
    .equals(scope.scopeId)
    .and(
      (item) =>
        item.entityType === entityType &&
        String(item.localId || item.entityId) === String(localId) &&
        item.method === "POST" &&
        ["pending", "retry"].includes(item.status)
    )
    .toArray();

  if (!items.length) return false;

  await Promise.all(
    items.map((item) =>
      updateSyncItem(item.id, {
        payload,
        lastError: "",
        status: "pending",
        retries: 0,
        nextAttemptAt: null,
      })
    )
  );
  return true;
}

export async function removeSyncItemsForLocalId(user, entityType, localId) {
  const scope = getScopeForUser(user);
  if (!scope) return;

  const items = await db.syncQueue
    .where("scopeId")
    .equals(scope.scopeId)
    .and(
      (item) =>
        item.entityType === entityType &&
        String(item.localId || item.entityId) === String(localId) &&
        ["pending", "retry", "conflict", "blocked"].includes(item.status)
    )
    .toArray();

  await Promise.all(items.map((item) => db.syncQueue.delete(item.id)));
  notifySyncQueueChanged();
}

export async function clearSyncQueueForUser(user) {
  const scope = getScopeForUser(user);
  if (!scope) return;

  await db.syncQueue.where("scopeId").equals(scope.scopeId).delete();
  notifySyncQueueChanged();
}
