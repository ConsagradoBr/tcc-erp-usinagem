import { useCallback } from "react";

import api from "../api";
import { loadListResource, loadMetadataResource } from "../offline/offlineStore";
import { useOfflineModuleState } from "./offlineHookUtils";

export function useOfflineDashboard(user) {
  const { offlineInfo, updateOfflineInfo, resetOfflineInfo } = useOfflineModuleState();

  const getClientes = useCallback(
    () =>
      loadListResource({
        tableName: "clientes",
        endpoint: "/clientes",
        request: () => api.get("/clientes", { params: { per_page: 500 } }),
        user,
      }),
    [user]
  );

  const getFinanceiro = useCallback(
    () =>
      loadListResource({
        tableName: "financeiro",
        endpoint: "/financeiro",
        request: () => api.get("/financeiro", { params: { per_page: 1000 } }),
        user,
      }),
    [user]
  );

  const getFinanceiroResumo = useCallback(
    () =>
      loadMetadataResource({
        key: "financeiro:resumo",
        request: () => api.get("/financeiro/resumo"),
        user,
        fallback: null,
      }),
    [user]
  );

  const getOrcamentosResumo = useCallback(
    () =>
      loadMetadataResource({
        key: "orcamentos:resumo",
        request: () => api.get("/orcamentos/resumo"),
        user,
        fallback: null,
      }),
    [user]
  );

  const getOrdensServico = useCallback(
    () =>
      loadListResource({
        tableName: "ordensServico",
        endpoint: "/ordens-servico",
        request: () => api.get("/ordens-servico", { params: { per_page: 500 } }),
        user,
      }),
    [user]
  );

  return {
    offlineInfo,
    updateOfflineInfo,
    resetOfflineInfo,
    getClientes,
    getFinanceiro,
    getFinanceiroResumo,
    getOrcamentosResumo,
    getOrdensServico,
  };
}
