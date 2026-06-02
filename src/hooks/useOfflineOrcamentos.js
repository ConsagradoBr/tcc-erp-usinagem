import { useCallback } from "react";

import api from "../api";
import { loadListResource, loadMetadataResource } from "../offline/offlineStore";
import { includesTerm, useOfflineModuleState } from "./offlineHookUtils";

function orcamentoMatches(item, filtro, status) {
  const statusOk = !status || item.status === status;
  if (!statusOk) return false;
  if (!filtro) return true;

  return (
    includesTerm(item.numero, filtro) ||
    includesTerm(item.cliente_nome, filtro) ||
    includesTerm(item.titulo, filtro) ||
    includesTerm(item.descricao, filtro) ||
    includesTerm(item.observacao, filtro)
  );
}

export function useOfflineOrcamentos(user) {
  const { offlineInfo, updateOfflineInfo, resetOfflineInfo } = useOfflineModuleState();

  const getOrcamentos = useCallback(
    ({ filtro = "", status = "", filtroRapido = "", page = 1, perPage = 50 } = {}) => {
      const params = { page, per_page: perPage };
      if (filtroRapido) params.filtro_rapido = filtroRapido;
      if (!filtroRapido && status) params.status = status;
      if (filtro) params.q = filtro;
      return loadListResource({
        tableName: "orcamentos",
        endpoint: "/orcamentos",
        params,
        request: () => api.get("/orcamentos", { params }),
        user,
        localFilter: (item) => orcamentoMatches(item, filtro, status),
      });
    },
    [user]
  );

  const getClientes = useCallback(
    () =>
      loadListResource({
        tableName: "clientes",
        endpoint: "/clientes",
        request: () => api.get("/clientes"),
        user,
      }),
    [user]
  );

  const getResumo = useCallback(
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
        request: () => api.get("/ordens-servico"),
        user,
      }),
    [user]
  );

  const getFinanceiro = useCallback(
    () =>
      loadListResource({
        tableName: "financeiro",
        endpoint: "/financeiro",
        request: () => api.get("/financeiro"),
        user,
      }),
    [user]
  );

  return {
    offlineInfo,
    updateOfflineInfo,
    resetOfflineInfo,
    getOrcamentos,
    getClientes,
    getResumo,
    getOrdensServico,
    getFinanceiro,
  };
}
