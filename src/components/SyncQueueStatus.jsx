import { useSyncQueueStatus } from "../hooks/useSyncQueueStatus";

export default function SyncQueueStatus({ user }) {
  const { summary, syncing, syncNow } = useSyncQueueStatus(user);
  if (!summary.total) return null;

  const hasConflict = summary.conflicts > 0;
  const label = hasConflict
    ? `${summary.conflicts} conflito(s) de sincronização`
    : `${summary.pending} ação(ões) aguardando sincronização`;

  return (
    <div className={`amp-sync-queue${hasConflict ? " is-conflict" : ""}`} role="status">
      <div>
        <strong>{label}</strong>
        <span>
          {hasConflict
            ? " Revise os itens bloqueados antes de tentar novamente."
            : " As alterações locais serão enviadas quando houver conexão."}
        </span>
      </div>
      <button type="button" onClick={syncNow} disabled={syncing} className="amp-sync-queue-btn">
        {syncing ? "Sincronizando..." : "Sincronizar agora"}
      </button>
    </div>
  );
}
