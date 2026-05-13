import Dexie from "dexie";

export const db = new Dexie("AMPUsinagemOffline");

db.version(1).stores({
  clientes:
    "[scopeId+remoteId], scopeId, ownerUserId, remoteId, updatedAt, syncedAt, dirty, deletedLocal",
  orcamentos:
    "[scopeId+remoteId], scopeId, ownerUserId, remoteId, updatedAt, syncedAt, dirty, deletedLocal",
  ordensServico:
    "[scopeId+remoteId], scopeId, ownerUserId, remoteId, updatedAt, syncedAt, dirty, deletedLocal",
  financeiro:
    "[scopeId+remoteId], scopeId, ownerUserId, remoteId, updatedAt, syncedAt, dirty, deletedLocal",
  syncQueue:
    "++id, scopeId, ownerUserId, entityType, entityId, createdAt, retries, lastError",
  metadata:
    "[scopeId+key], scopeId, ownerUserId, key, updatedAt, syncedAt",
});

export default db;
