import { useEffect, useRef, useState } from "react";

import api from "../api";

function bytesToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      resolve(result.split(",")[1] || "");
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

function StatusTag({ tone = "", children }) {
  return <span className={`status-tag ${tone}`}>{children}</span>;
}

export default function BackupDesktop() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backuping, setBackuping] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [message, setMessage] = useState(null);
  const inputRef = useRef(null);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const response = await api.get("/sistema/backup-info");
      setInfo(response.data);
    } catch (error) {
      setMessage({ tipo: "erro", texto: error.response?.data?.erro || "Não foi possível carregar os dados do backup." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInfo();
  }, []);

  const handleBackup = async () => {
    setBackuping(true);
    setMessage(null);
    try {
      const response = await api.post("/sistema/backup", {}, { responseType: "blob" });
      const blob = new Blob([response.data], { type: response.headers["content-type"] || "application/octet-stream" });
      const disposition = response.headers["content-disposition"] || "";
      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match?.[1] || `amp-backup-${Date.now()}.sqlite3`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(url);
      setMessage({ tipo: "sucesso", texto: "Backup gerado e download iniciado." });
      loadInfo();
    } catch (error) {
      setMessage({ tipo: "erro", texto: error.response?.data?.erro || "Não foi possível gerar o backup." });
    } finally {
      setBackuping(false);
    }
  };

  const handleRestoreSelect = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setRestoreFile(file);
    setMessage(null);
  };

  const confirmarRestore = async () => {
    if (!restoreFile) return;
    setRestoring(true);
    setMessage(null);
    try {
      const arquivo_base64 = await bytesToBase64(restoreFile);
      const response = await api.post("/sistema/restaurar", {
        nome_arquivo: restoreFile.name,
        arquivo_base64,
      });
      setMessage({
        tipo: "sucesso",
        texto: `${response.data.mensagem} Uma cópia de segurança foi salva antes da restauração.`,
      });
      setRestoreFile(null);
      loadInfo();
    } catch (error) {
      setMessage({ tipo: "erro", texto: error.response?.data?.erro || "Não foi possível restaurar o backup." });
    } finally {
      setRestoring(false);
    }
  };

  const backupDisabled = loading || !info?.suporta_backup_local || backuping || restoring;

  return (
    <div className="flex flex-col h-full overflow-hidden amp-bg px-3 py-2" style={{ borderRadius: "12px" }}>
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
        <div className="screen-grid screen-grid-admin">
          <section className="surface-panel">
            <div className="section-head">
              <div>
                <p className="eyebrow">Confiabilidade</p>
                <h3>Backup e restauração com leitura simples</h3>
              </div>
              <StatusTag tone="is-cool">
                {info?.suporta_backup_local ? "Saudável" : "Restrito"}
              </StatusTag>
            </div>

        {message && (
          <div className={`amp-terminal-inline-message ${message.tipo === "erro" ? "is-error" : "is-success"}`}>
            {message.texto}
          </div>
        )}

        {loading ? (
          <div className="amp-shell-loading min-h-[240px]">
            <div className="amp-shell-loader" />
            <p>Carregando informações do backup...</p>
          </div>
        ) : (
          <div className="action-list">
            <article className="action-row">
              <div>
                <strong>Backup local automático</strong>
                <p>
                  {info?.ultima_atualizacao
                    ? `Última geração em ${new Date(info.ultima_atualizacao).toLocaleString("pt-BR")}.`
                    : "Sem geração recente registrada."}
                </p>
              </div>
              <StatusTag tone="is-cool">Saudável</StatusTag>
            </article>

            <article className="action-row">
              <div>
                <strong>Exportar cópia manual</strong>
                <p>Fluxo para preservar dados fora da execução local.</p>
              </div>
              <div className="amp-terminal-inline-actions">
                <StatusTag>Ação</StatusTag>
                <button
                  type="button"
                  onClick={handleBackup}
                  disabled={backupDisabled}
                  className="amp-terminal-inline-btn"
                >
                  {backuping ? "Gerando..." : "Gerar backup"}
                </button>
              </div>
            </article>

            <article className="action-row">
              <div>
                <strong>Restauração guiada</strong>
                <p>Selecione o arquivo e confirme antes de substituir o banco atual.</p>
              </div>
              <div className="amp-terminal-inline-actions">
                <StatusTag>Técnico</StatusTag>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".sqlite3,.db,.bak"
                  className="hidden"
                  onChange={handleRestoreSelect}
                />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={backupDisabled}
                  className="amp-terminal-inline-btn"
                >
                  {restoring ? "Restaurando..." : "Restaurar arquivo"}
                </button>
              </div>
            </article>
          </div>
        )}
      </section>

      <aside className="inspector-panel">
        <p className="eyebrow">Desktop</p>
        <h3>Confiança operacional</h3>
        <p className="muted">
          O backup local preserva uma cópia do banco SQLite usado pelo aplicativo desktop.
        </p>

        <div className="balance-stack">
          <div className="balance-card">
            <span>Modo</span>
            <strong>{info?.suporta_backup_local ? "SQLite local" : "Indisponível"}</strong>
          </div>
          <div className="balance-card">
            <span>Banco atual</span>
            <strong>{info?.caminho_banco || "Não identificado"}</strong>
          </div>
          <div className="balance-card">
            <span>Pasta de backups</span>
            <strong>{info?.pasta_backups || "Não identificado"}</strong>
          </div>
        </div>
          </aside>
        </div>
      </div>
      {restoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(19,18,16,0.52)] p-4 backdrop-blur-md">
          <div className="surface-panel max-w-xl">
            <div className="section-head">
              <div>
                <p className="eyebrow">Confirmar restauração</p>
                <h3>Substituir o banco atual?</h3>
              </div>
            </div>
            <div className="action-list">
              <article className="action-row">
                <div>
                  <strong>{restoreFile.name}</strong>
                  <p>
                    Esta ação substitui o banco atual pelos dados desse arquivo. Uma cópia de segurança será criada antes da troca.
                  </p>
                </div>
                <StatusTag tone="is-warm">Confirmação</StatusTag>
              </article>
            </div>
            <div className="amp-terminal-inline-actions mt-5">
              <button
                type="button"
                onClick={() => setRestoreFile(null)}
                disabled={restoring}
                className="amp-terminal-inline-btn"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarRestore}
                disabled={restoring}
                className="amp-terminal-inline-btn"
              >
                {restoring ? "Restaurando..." : "Confirmar restauração"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
