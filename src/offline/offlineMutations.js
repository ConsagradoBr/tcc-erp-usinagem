import api from "../api";
import { isNetworkError } from "./networkStatus";
import {
  enqueueSyncItem,
  removeSyncItemsForLocalId,
  updateQueuedLocalCreate,
} from "./syncQueue";
import {
  markLocalEntityDeleted,
  removeLocalEntity,
  upsertLocalEntity,
} from "./offlineStore";

const CLIENTE_FIELDS = [
  "nome",
  "documento",
  "telefone",
  "email",
  "endereco",
  "inscricao_estadual",
  "indicador_ie_destinatario",
  "logradouro",
  "numero",
  "complemento",
  "bairro",
  "codigo_municipio",
  "municipio",
  "uf",
  "cep",
  "codigo_pais",
  "pais",
];

const OS_FIELDS = [
  "os",
  "numero",
  "cliente",
  "servico",
  "prioridade",
  "prazo",
  "responsavel",
  "descricao",
  "status",
];

function randomId(prefix) {
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${id}`;
}

function idempotencyKey(entityType, operation, entityId) {
  return `${entityType}:${operation}:${entityId}:${randomId("op")}`;
}

function pickAllowed(payload, fields) {
  return fields.reduce((acc, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      acc[field] = payload[field];
    }
    return acc;
  }, {});
}

function isLocalId(id) {
  return String(id || "").startsWith("local_");
}

function normalizeCliente(payload) {
  const clean = pickAllowed(payload, CLIENTE_FIELDS);
  clean.nome = String(clean.nome || "").trim();
  clean.documento = String(clean.documento || "").trim();
  clean.telefone = String(clean.telefone || "").trim();
  clean.email = String(clean.email || "").trim().toLowerCase();
  clean.uf = String(clean.uf || "").trim().toUpperCase();
  return clean;
}

function normalizeOS(payload) {
  const clean = pickAllowed(payload, OS_FIELDS);
  clean.cliente = String(clean.cliente || "").trim();
  clean.servico = String(clean.servico || "").trim();
  clean.prioridade = clean.prioridade || "media";
  clean.status = clean.status || "solicitado";
  clean.prazo = clean.prazo || "";
  return clean;
}

function offlineClientePayload(localId, payload) {
  return {
    id: localId,
    ...payload,
    created_at: new Date().toISOString(),
    offlineStatus: "pending",
  };
}

function offlineOSPayload(localId, payload) {
  const numero = payload.numero || payload.os || `PEND-${String(localId).slice(-6).toUpperCase()}`;
  return {
    id: localId,
    ...payload,
    os: numero,
    numero,
    created_at: new Date().toISOString(),
    offlineStatus: "pending",
  };
}

export async function saveClienteWithOffline({ cliente, payload, user }) {
  const clean = normalizeCliente(payload);
  const editing = Boolean(cliente?.id);

  try {
    const response = editing
      ? await api.put(`/clientes/${cliente.id}`, clean)
      : await api.post("/clientes", clean);
    await upsertLocalEntity("clientes", response.data, { user, dirty: false, syncedAt: new Date().toISOString() });
    return { data: response.data, queued: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    const localId = editing ? String(cliente.id) : randomId("local_cliente");
    const localPayload = offlineClientePayload(localId, { ...(cliente || {}), ...clean });
    await upsertLocalEntity("clientes", localPayload, {
      user,
      remoteId: localId,
      dirty: true,
      endpoint: "/clientes",
    });
    const merged = editing && isLocalId(localId)
      ? await updateQueuedLocalCreate(user, "clientes", localId, clean)
      : false;
    if (!merged) await enqueueSyncItem(
      {
        entityType: "clientes",
        entityId: localId,
        localId,
        method: editing && !isLocalId(localId) ? "PUT" : "POST",
        endpoint: editing && !isLocalId(localId) ? `/clientes/${localId}` : "/clientes",
        payload: clean,
        operation: editing ? "update" : "create",
        idempotencyKey: idempotencyKey("clientes", editing ? "update" : "create", localId),
        baseSnapshot: cliente || null,
      },
      user
    );
    return { data: localPayload, queued: true };
  }
}

export async function deleteClienteWithOffline({ cliente, user }) {
  try {
    await api.delete(`/clientes/${cliente.id}`);
    await removeLocalEntity("clientes", cliente.id, { user });
    return { queued: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    if (isLocalId(cliente.id)) {
      await removeLocalEntity("clientes", cliente.id, { user });
      await removeSyncItemsForLocalId(user, "clientes", cliente.id);
      return { queued: false };
    }

    await markLocalEntityDeleted("clientes", cliente.id, { user });
    await enqueueSyncItem(
      {
        entityType: "clientes",
        entityId: cliente.id,
        localId: cliente.id,
        method: "DELETE",
        endpoint: `/clientes/${cliente.id}`,
        payload: null,
        operation: "delete",
        idempotencyKey: idempotencyKey("clientes", "delete", cliente.id),
        baseSnapshot: cliente,
      },
      user
    );
    return { queued: true };
  }
}

export async function saveOSWithOffline({ ordem, payload, user, status }) {
  const clean = normalizeOS({ ...payload, status: status || payload.status });
  const editing = Boolean(ordem?.id);

  try {
    const response = editing
      ? await api.put(`/ordens-servico/${ordem.id}`, clean)
      : await api.post("/ordens-servico", clean);
    await upsertLocalEntity("ordensServico", response.data, { user, dirty: false, syncedAt: new Date().toISOString() });
    return { data: response.data, queued: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    const localId = editing ? String(ordem.id) : randomId("local_os");
    const localPayload = offlineOSPayload(localId, { ...(ordem || {}), ...clean });
    await upsertLocalEntity("ordensServico", localPayload, {
      user,
      remoteId: localId,
      dirty: true,
      endpoint: "/ordens-servico",
    });
    const merged = editing && isLocalId(localId)
      ? await updateQueuedLocalCreate(user, "ordensServico", localId, clean)
      : false;
    if (!merged) await enqueueSyncItem(
      {
        entityType: "ordensServico",
        entityId: localId,
        localId,
        method: editing && !isLocalId(localId) ? "PUT" : "POST",
        endpoint: editing && !isLocalId(localId) ? `/ordens-servico/${localId}` : "/ordens-servico",
        payload: clean,
        operation: editing ? "update" : "create",
        idempotencyKey: idempotencyKey("ordensServico", editing ? "update" : "create", localId),
        baseSnapshot: ordem || null,
      },
      user
    );
    return { data: localPayload, queued: true };
  }
}

export async function moveOSWithOffline({ ordem, status, user }) {
  try {
    const response = await api.patch(`/ordens-servico/${ordem.id}/status`, { status });
    await upsertLocalEntity("ordensServico", response.data, { user, dirty: false, syncedAt: new Date().toISOString() });
    return { data: response.data, queued: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    const localPayload = { ...ordem, status, offlineStatus: "pending" };
    await upsertLocalEntity("ordensServico", localPayload, {
      user,
      remoteId: ordem.id,
      dirty: true,
      endpoint: "/ordens-servico",
    });

    if (isLocalId(ordem.id)) {
      await updateQueuedLocalCreate(user, "ordensServico", ordem.id, normalizeOS(localPayload));
    } else {
      await enqueueSyncItem(
        {
          entityType: "ordensServico",
          entityId: ordem.id,
          localId: ordem.id,
          method: "PATCH",
          endpoint: `/ordens-servico/${ordem.id}/status`,
          payload: { status },
          operation: "status",
          idempotencyKey: idempotencyKey("ordensServico", "status", ordem.id),
          baseSnapshot: ordem,
        },
        user
      );
    }

    return { data: localPayload, queued: true };
  }
}

export async function deleteOSWithOffline({ ordem, user }) {
  try {
    await api.delete(`/ordens-servico/${ordem.id}`);
    await removeLocalEntity("ordensServico", ordem.id, { user });
    return { queued: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;

    if (isLocalId(ordem.id)) {
      await removeLocalEntity("ordensServico", ordem.id, { user });
      await removeSyncItemsForLocalId(user, "ordensServico", ordem.id);
      return { queued: false };
    }

    await markLocalEntityDeleted("ordensServico", ordem.id, { user });
    await enqueueSyncItem(
      {
        entityType: "ordensServico",
        entityId: ordem.id,
        localId: ordem.id,
        method: "DELETE",
        endpoint: `/ordens-servico/${ordem.id}`,
        payload: null,
        operation: "delete",
        idempotencyKey: idempotencyKey("ordensServico", "delete", ordem.id),
        baseSnapshot: ordem,
      },
      user
    );
    return { queued: true };
  }
}
