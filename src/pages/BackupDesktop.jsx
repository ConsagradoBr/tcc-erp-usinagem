import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  const [message, setMessage] = useState(null);
  const inputRef = useRef(null);

  const loadInfo = async () => {
    setLoading(true);
    try {
      const response = await api.get("/sistema/backup-info");
      setInfo(response.data);
    } catch (error) {
      setMessage({ tipo: "erro", texto: error.response?.data?.erro || "Nao foi possivel carregar os dados do backup." });
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
      setMessage({ tipo: "erro", texto: error.response?.data?.erro || "Nao foi possivel gerar o backup." });
    } finally {
      setBackuping(false);
    }
  };

  const handleRestoreFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setRestoring(true);
    setMessage(null);
    try {
      const arquivo_base64 = await bytesToBase64(file);
      const response = await api.post("/sistema/restaurar", {
        nome_arquivo: file.name,
        arquivo_base64,
      });
      setMessage({
        tipo: "sucesso",
        texto: `${response.data.mensagem} Uma copia de seguranca foi salva antes da restauracao.`,
      });
      loadInfo();
    } catch (error) {
      setMessage({ tipo: "erro", texto: error.response?.data?.erro || "Nao foi possivel restaurar o backup." });
    } finally {
      setRestoring(false);
    }
  };

  const backupDisabled = loading || !info?.suporta_backup_local || backuping || restoring;

  return (
    <div className="screen-grid screen-grid-admin">
      <section className="surface-panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Confiabilidade</p>
            <h3>Backup e restauracao com leitura simples</h3>
          </div>
          <StatusTag tone="is-cool">
            {info?.suporta_backup_local ? "Saudavel" : "Restrito"}
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
            <p>Carregando informacoes do backup...</p>
          </div>
        ) : (
          <div className="action-list">
            <article className="action-row">
              <div>
                <strong>Backup local automatico</strong>
                <p>
                  {info?.ultima_atualizacao
                    ? `Ultima geracao em ${new Date(info.ultima_atualizacao).toLocaleString("pt-BR")}.`
                    : "Sem geracao recente registrada."}
                </p>
              </div>
              <StatusTag tone="is-cool">Saudavel</StatusTag>
            </article>

            <article className="action-row">
              <div>
                <strong>Exportar copia manual</strong>
                <p>Fluxo para preservar dados fora do runtime local.</p>
              </div>
              <div className="amp-terminal-inline-actions">
                <StatusTag>Acao</StatusTag>
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
                <strong>Restauracao guiada</strong>
                <p>Painel tecnico com foco em seguranca e rastreio.</p>
              </div>
              <div className="amp-terminal-inline-actions">
                <StatusTag>Tecnico</StatusTag>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".sqlite3,.db,.bak"
                  className="hidden"
                  onChange={handleRestoreFile}
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
        <h3>Confianca operacional</h3>
        <p className="muted">
          A tela de backup precisa comunicar que o desktop nativo nao e um modo simplificado, e sim
          um canal de uso confiavel.
        </p>

        <div className="balance-stack">
          <div className="balance-card">
            <span>Modo</span>
            <strong>{info?.suporta_backup_local ? "SQLite local" : "Indisponivel"}</strong>
          </div>
          <div className="balance-card">
            <span>Banco atual</span>
            <strong>{info?.caminho_banco || "Nao identificado"}</strong>
          </div>
          <div className="balance-card">
            <span>Pasta de backups</span>
            <strong>{info?.pasta_backups || "Nao identificado"}</strong>
          </div>
        </div>
      </aside>
    </div>
  );
}
