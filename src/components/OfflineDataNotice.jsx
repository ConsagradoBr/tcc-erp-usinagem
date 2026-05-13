function formatSyncDate(value) {
  if (!value) return "sem sincronização anterior";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "sincronização anterior indisponível";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function OfflineDataNotice({ info }) {
  if (!info?.offline && !info?.fromCache) return null;

  return (
    <div className={`amp-offline-notice${info.cacheMiss ? " is-warning" : ""}`}>
      <div>
        <strong>{info.cacheMiss ? "Modo offline sem cache completo" : "Modo offline"}</strong>
        <span>
          {info.cacheMiss
            ? " alguns dados ainda não foram sincronizados neste navegador."
            : " exibindo dados salvos localmente."}
        </span>
      </div>
      <span>Última sincronização: {formatSyncDate(info.lastSync)}</span>
    </div>
  );
}
