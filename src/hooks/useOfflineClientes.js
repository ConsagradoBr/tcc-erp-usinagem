import { useCallback } from "react";

import api from "../api";
import { loadListResource } from "../offline/offlineStore";
import { includesTerm, useOfflineModuleState } from "./offlineHookUtils";

function clienteMatches(cliente, termo) {
  if (!termo) return true;
  return (
    includesTerm(cliente.nome, termo) ||
    includesTerm(cliente.documento, termo) ||
    includesTerm(cliente.email, termo) ||
    includesTerm(cliente.telefone, termo) ||
    includesTerm(cliente.contato, termo)
  );
}

export function useOfflineClientes(user) {
  const { offlineInfo, updateOfflineInfo, resetOfflineInfo } = useOfflineModuleState();

  const getClientes = useCallback(
    (filtro = "") =>
      loadListResource({
        tableName: "clientes",
        endpoint: "/clientes",
        params: filtro ? { q: filtro } : {},
        request: () => api.get("/clientes", { params: filtro ? { q: filtro } : {} }),
        user,
        localFilter: (cliente) => clienteMatches(cliente, filtro),
      }),
    [user]
  );

  const getOrcamentosContexto = useCallback(
    () =>
      loadListResource({
        tableName: "orcamentos",
        endpoint: "/orcamentos",
        request: () => api.get("/orcamentos"),
        user,
      }),
    [user]
  );

  const getFinanceiroContexto = useCallback(
    () =>
      loadListResource({
        tableName: "financeiro",
        endpoint: "/financeiro",
        request: () => api.get("/financeiro"),
        user,
      }),
    [user]
  );

  const getOrdensContexto = useCallback(
    () =>
      loadListResource({
        tableName: "ordensServico",
        endpoint: "/ordens-servico",
        request: () => api.get("/ordens-servico"),
        user,
      }),
    [user]
  );

  return {
    offlineInfo,
    updateOfflineInfo,
    resetOfflineInfo,
    getClientes,
    getOrcamentosContexto,
    getFinanceiroContexto,
    getOrdensContexto,
  };
}
