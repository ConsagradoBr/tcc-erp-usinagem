import { useNetworkStatus } from "../offline/networkStatus";

export default function OfflineStatus() {
  const { offline } = useNetworkStatus();
  if (!offline) return null;

  return (
    <div className="amp-offline-global" role="status">
      Modo offline: leitura local habilitada quando houver dados sincronizados. Ações de edição exigem conexão.
    </div>
  );
}
