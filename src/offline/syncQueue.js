import db from "../db/localDB";
import { getScopeForUser } from "./offlineStore";

export async function enqueueSyncItem(item, user) {
  const scope = getScopeForUser(user);
  if (!scope) {
    throw new Error("Sessão necessária para fila de sincronização.");
  }

  return db.syncQueue.add({
    scopeId: scope.scopeId,
    ownerUserId: scope.ownerUserId,
    endpoint: item.endpoint,
    method: item.method,
    payload: item.payload ?? null,
    entityType: item.entityType,
    entityId: item.entityId ?? null,
    idempotencyKey: item.idempotencyKey,
    createdAt: new Date().toISOString(),
    retries: 0,
    lastError: "",
    status: "pending",
  });
}

export async function listPendingSyncItems(user) {
  const scope = getScopeForUser(user);
  if (!scope) return [];

  return db.syncQueue.where("scopeId").equals(scope.scopeId).sortBy("createdAt");
}

export async function clearSyncQueueForUser(user) {
  const scope = getScopeForUser(user);
  if (!scope) return;

  await db.syncQueue.where("scopeId").equals(scope.scopeId).delete();
}
