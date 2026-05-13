import { API_BASE_URL } from "../api";
import { getStoredUser, hasPermission } from "../auth";
import db from "../db/localDB";
import { isNetworkError } from "./networkStatus";

const ENTITY_TABLES = new Set(["clientes", "orcamentos", "ordensServico", "financeiro"]);

function encodeScopePart(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]/g, "_");
}

export function getScopeForUser(user = getStoredUser()) {
  if (!user?.id) return null;

  return {
    scopeId: `amp:${encodeScopePart(API_BASE_URL)}:user:${encodeScopePart(user.id)}:v1`,
    ownerUserId: String(user.id),
    user,
  };
}

function requireEntityTable(tableName) {
  if (!ENTITY_TABLES.has(tableName)) {
    throw new Error(`Tabela offline inválida: ${tableName}`);
  }
}

function getRemoteId(tableName, item) {
  if (item?.id != null) return String(item.id);
  if (tableName === "ordensServico" && item?.numero != null) return String(item.numero);
  if (tableName === "ordensServico" && item?.os != null) return String(item.os);
  if (item?.numero != null) return String(item.numero);
  return "";
}

function getUpdatedAt(item, fallback) {
  return item?.updated_at || item?.updatedAt || item?.created_at || item?.createdAt || fallback;
}

function ensureArray(data) {
  return Array.isArray(data) ? data : [];
}

export async function saveEntityList(tableName, rows, options = {}) {
  requireEntityTable(tableName);
  const scope = getScopeForUser(options.user);
  if (!scope) return null;

  if (tableName === "financeiro" && !hasPermission(scope.user, "financeiro")) {
    return null;
  }

  const now = new Date().toISOString();
  const records = ensureArray(rows)
    .map((item) => {
      const remoteId = getRemoteId(tableName, item);
      if (!remoteId) return null;

      return {
        scopeId: scope.scopeId,
        ownerUserId: scope.ownerUserId,
        remoteId,
        updatedAt: getUpdatedAt(item, now),
        syncedAt: now,
        dirty: false,
        deletedLocal: false,
        sourceEndpoint: options.endpoint || "",
        sourceParams: options.params || null,
        payload: item,
      };
    })
    .filter(Boolean);

  if (records.length) {
    await db.table(tableName).bulkPut(records);
  }

  await setMetadata(`${tableName}:lastSync`, { syncedAt: now, count: records.length }, options);
  return now;
}

export async function readEntityList(tableName, options = {}) {
  requireEntityTable(tableName);
  const scope = getScopeForUser(options.user);
  if (!scope) return [];

  if (tableName === "financeiro" && !hasPermission(scope.user, "financeiro")) {
    return [];
  }

  const records = await db
    .table(tableName)
    .where("scopeId")
    .equals(scope.scopeId)
    .and((record) => !record.deletedLocal)
    .toArray();

  const rows = records.map((record) => record.payload);
  return typeof options.filter === "function" ? rows.filter(options.filter) : rows;
}

export async function setMetadata(key, value, options = {}) {
  const scope = getScopeForUser(options.user);
  if (!scope) return null;

  const now = new Date().toISOString();
  await db.metadata.put({
    scopeId: scope.scopeId,
    ownerUserId: scope.ownerUserId,
    key,
    value,
    updatedAt: now,
    syncedAt: now,
  });
  return now;
}

export async function getMetadata(key, options = {}) {
  const scope = getScopeForUser(options.user);
  if (!scope) return null;
  return db.metadata.get([scope.scopeId, key]);
}

export async function loadListResource({
  tableName,
  endpoint,
  params,
  request,
  user,
  localFilter,
}) {
  try {
    const response = await request();
    const syncedAt = await saveEntityList(tableName, response.data, { user, endpoint, params });
    return { data: response.data, fromCache: false, offline: false, cacheMiss: false, syncedAt };
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    const metadata = await getMetadata(`${tableName}:lastSync`, { user });
    const rows = await readEntityList(tableName, { user, filter: localFilter });
    return {
      data: rows,
      fromCache: true,
      offline: true,
      cacheMiss: rows.length === 0,
      syncedAt: metadata?.value?.syncedAt || metadata?.syncedAt || null,
    };
  }
}

export async function loadMetadataResource({ key, request, user, fallback = null }) {
  try {
    const response = await request();
    const syncedAt = await setMetadata(key, response.data, { user });
    return { data: response.data, fromCache: false, offline: false, cacheMiss: false, syncedAt };
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    const record = await getMetadata(key, { user });
    return {
      data: record?.value ?? fallback,
      fromCache: true,
      offline: true,
      cacheMiss: !record,
      syncedAt: record?.value?.syncedAt || record?.syncedAt || null,
    };
  }
}

export async function clearOfflineDataForUser(user) {
  const scope = getScopeForUser(user);
  if (!scope) return;

  await db.transaction("rw", db.clientes, db.orcamentos, db.ordensServico, db.financeiro, db.syncQueue, db.metadata, async () => {
    await Promise.all([
      db.clientes.where("scopeId").equals(scope.scopeId).delete(),
      db.orcamentos.where("scopeId").equals(scope.scopeId).delete(),
      db.ordensServico.where("scopeId").equals(scope.scopeId).delete(),
      db.financeiro.where("scopeId").equals(scope.scopeId).delete(),
      db.syncQueue.where("scopeId").equals(scope.scopeId).delete(),
      db.metadata.where("scopeId").equals(scope.scopeId).delete(),
    ]);
  });
}

export async function clearFinanceiroForUser(user) {
  const scope = getScopeForUser(user);
  if (!scope) return;

  await Promise.all([
    db.financeiro.where("scopeId").equals(scope.scopeId).delete(),
    db.metadata
      .where("scopeId")
      .equals(scope.scopeId)
      .and((item) => String(item.key || "").startsWith("financeiro"))
      .delete(),
  ]);
}
