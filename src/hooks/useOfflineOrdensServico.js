import { useCallback } from "react";

import api from "../api";
import { loadListResource } from "../offline/offlineStore";
import { useOfflineModuleState } from "./offlineHookUtils";

export function useOfflineOrdensServico(user) {
  const { offlineInfo, updateOfflineInfo, resetOfflineInfo } = useOfflineModuleState();

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

  return {
    offlineInfo,
    updateOfflineInfo,
    resetOfflineInfo,
    getOrdensServico,
    getClientes,
  };
}
