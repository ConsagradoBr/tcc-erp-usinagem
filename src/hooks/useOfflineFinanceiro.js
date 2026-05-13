import { useCallback } from "react";

import api from "../api";
import { loadListResource, loadMetadataResource } from "../offline/offlineStore";
import { includesTerm, useOfflineModuleState } from "./offlineHookUtils";

function financeiroMatches(item, { filtro, tipo, status }) {
  if (tipo && item.tipo !== tipo) return false;
  if (status && item.status !== status) return false;
  if (!filtro) return true;

  return (
    includesTerm(item.cliente_nome, filtro) ||
    includesTerm(item.descricao, filtro) ||
    includesTerm(item.nfe, filtro) ||
    includesTerm(item.forma_pagamento, filtro) ||
    includesTerm(item.observacao, filtro)
  );
}

export function useOfflineFinanceiro(user) {
  const { offlineInfo, updateOfflineInfo, resetOfflineInfo } = useOfflineModuleState();

  const getFinanceiro = useCallback(
    ({ filtro = "", tipo = "", status = "" } = {}) => {
      const params = {};
      if (tipo) params.tipo = tipo;
      if (status) params.status = status;
      if (filtro) params.q = filtro;

      return loadListResource({
        tableName: "financeiro",
        endpoint: "/financeiro",
        params,
        request: () => api.get("/financeiro", { params }),
        user,
        localFilter: (item) => financeiroMatches(item, { filtro, tipo, status }),
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
        key: "financeiro:resumo",
        request: () => api.get("/financeiro/resumo"),
        user,
        fallback: null,
      }),
    [user]
  );

  return {
    offlineInfo,
    updateOfflineInfo,
    resetOfflineInfo,
    getFinanceiro,
    getClientes,
    getResumo,
  };
}
