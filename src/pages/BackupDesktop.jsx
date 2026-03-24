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
        texto: `${response.data.mensagem} Um backup de seguranca foi salvo antes da restauracao.`,
      });
      loadInfo();
    } catch (error) {
      setMessage({ tipo: "erro", texto: error.response?.data?.erro || "Nao foi possivel restaurar o backup." });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] bg-orange-500 shadow-lg shadow-orange-200">
                <svg viewBox="0 0 64 64" className="h-11 w-11" aria-hidden="true">
                  <path d="M32 10 18 24h9v14h10V24h9L32 10Z" fill="#111827" />
                  <path d="M16 40h32a6 6 0 0 1 6 6v2a6 6 0 0 1-6 6H16a6 6 0 0 1-6-6v-2a6 6 0 0 1 6-6Z" fill="#111827" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">Backup local</p>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mt-2">Seguranca dos dados do desktop</h1>
                <p className="text-slate-600 mt-3 max-w-2xl">
                  Gere uma copia do banco local SQLite do aplicativo desktop e restaure um backup anterior quando precisar.
                </p>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`rounded-2xl px-5 py-4 text-sm font-medium border ${message.tipo === "erro" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
            {message.texto}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Estado atual</h2>
              <p className="text-slate-500 mt-1">Informacoes do banco local usado pelo app desktop.</p>
            </div>

            {loading ? (
              <div className="h-36 rounded-2xl bg-slate-100 animate-pulse" />
            ) : !info?.suporta_backup_local ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800">
                {info?.mensagem || "Backup local indisponivel para este modo de banco."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                <InfoCard label="Modo" value="SQLite local" />
                <InfoCard label="Banco atual" value={info.caminho_banco} />
                <InfoCard label="Pasta de backups" value={info.pasta_backups} />
                <InfoCard label="Ultima atualizacao do banco" value={new Date(info.ultima_atualizacao).toLocaleString("pt-BR")} />
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Acoes</h2>
              <p className="text-slate-500 mt-1">Crie uma copia agora ou restaure um arquivo salvo.</p>
            </div>

            <button
              type="button"
              onClick={handleBackup}
              disabled={loading || !info?.suporta_backup_local || backuping || restoring}
              className="w-full rounded-2xl bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-4 transition"
            >
              {backuping ? "Gerando backup..." : "Gerar backup agora"}
            </button>

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
              disabled={loading || !info?.suporta_backup_local || backuping || restoring}
              className="w-full rounded-2xl border border-slate-300 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-slate-700 font-semibold px-5 py-4 transition"
            >
              {restoring ? "Restaurando backup..." : "Restaurar de arquivo"}
            </button>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 text-sm text-slate-600">
              A restauracao substitui o banco local atual. O sistema salva automaticamente uma copia de seguranca antes de aplicar o arquivo enviado.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="text-sm sm:text-base text-slate-800 mt-2 break-all">{value}</p>
    </div>
  );
}
