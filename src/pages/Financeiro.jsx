import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import api from "../api";
import { IconDollar, IconQuotes } from "../assets/assets-map";

const STATUS_META = {
  pago: { label: "Pago", tone: "positive" },
  pendente: { label: "Pendente", tone: "warning" },
  atrasado: { label: "Atrasado", tone: "danger" },
};

const TIPO_META = {
  receber: {
    label: "A receber",
    tone: "positive",
    short: "Receber",
  },
  pagar: {
    label: "A pagar",
    tone: "danger",
    short: "Pagar",
  },
};

const QUICK_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "receber", label: "A receber" },
  { id: "pagar", label: "A pagar" },
  { id: "atrasado", label: "Atrasados" },
  { id: "parcelado", label: "Parcelados" },
  { id: "sem_vinculo", label: "Sem vínculo" },
];

const FORMAS = ["PIX", "Boleto", "Transferência", "Dinheiro", "Cartão", "Cheque"];
const PRAZOS = [1, 5, 7, 15, 30, 45, 60, 90];

const FORM_VAZIO = {
  tipo: "receber",
  cliente_id: "",
  descricao: "",
  nfe: "",
  prazo_dias: "",
  vencimento: "",
  valor: "",
  forma_pagamento: "",
  observacao: "",
};

const INPUT_BASE =
  "mt-2 w-full rounded-[18px] border border-[color:var(--cm-line)] bg-white/75 px-4 py-3 text-sm text-[var(--cm-text)] placeholder:text-[var(--cm-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition focus:border-[color:rgba(180,99,56,0.38)] focus:ring-2 focus:ring-[rgba(180,99,56,0.16)]";

const LABEL_BASE = "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cm-muted)]";

const fmt = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const fmtD = (iso) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

function useNotif() {
  const [notif, setNotif] = useState(null);
  const show = useCallback((msg, tipo = "sucesso") => {
    setNotif({ msg, tipo });
    window.clearTimeout(window.__finToastTimer);
    window.__finToastTimer = window.setTimeout(() => setNotif(null), 3200);
  }, []);
  return [notif, show];
}

function toneClasses(tone) {
  switch (tone) {
    case "danger":
      return {
        badge:
          "border-[rgba(187,103,80,0.22)] bg-[rgba(187,103,80,0.12)] text-[var(--cm-danger)]",
        dot: "bg-[var(--cm-danger)]",
      };
    case "warning":
      return {
        badge:
          "border-[rgba(173,122,62,0.22)] bg-[rgba(173,122,62,0.12)] text-[var(--cm-warning)]",
        dot: "bg-[var(--cm-warning)]",
      };
    case "positive":
      return {
        badge:
          "border-[rgba(63,141,114,0.22)] bg-[rgba(63,141,114,0.12)] text-[var(--cm-positive)]",
        dot: "bg-[var(--cm-positive)]",
      };
    case "accent":
      return {
        badge:
          "border-[rgba(180,99,56,0.22)] bg-[rgba(180,99,56,0.12)] text-[var(--cm-accent)]",
        dot: "bg-[var(--cm-accent)]",
      };
    default:
      return {
        badge: "border-[color:var(--cm-line)] bg-white/70 text-[var(--cm-text)]",
        dot: "bg-[var(--cm-text)]",
      };
  }
}

function ToneBadge({ tone = "default", children }) {
  const styles = toneClasses(tone);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {children}
    </span>
  );
}

function StatTile({ icon, label, value, note, inverse = false }) {
  return (
    <div
      className={`rounded-[24px] border p-4 ${
        inverse
          ? "border-white/10 bg-white/7 text-white"
          : "border-[color:var(--cm-line)] bg-white/38 text-[var(--cm-text)]"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-[16px] border ${
            inverse ? "border-white/10 bg-white/8" : "border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.04)]"
          }`}
        >
          <img src={icon} alt="" className={`w-6 ${inverse ? "brightness-[3.4]" : ""}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-xs uppercase tracking-[0.18em] ${inverse ? "text-white/55" : "text-[var(--cm-muted)]"}`}>{label}</p>
          <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</div>
          {note && <p className={`mt-2 text-sm ${inverse ? "text-white/68" : "text-[var(--cm-muted)]"}`}>{note}</p>}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/36 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">{value}</p>
    </div>
  );
}

function InfoItem({ label, value, subtle = false, title }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">{label}</p>
      <p
        className={`mt-1 text-sm ${subtle ? "text-[var(--cm-muted)]" : "font-medium text-[var(--cm-text)]"}`}
        title={title}
      >
        {value}
      </p>
    </div>
  );
}

function FocusMetric({ label, value, note }) {
  return (
    <div className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/38 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">{value}</p>
      {note && <p className="mt-2 text-sm text-[var(--cm-muted)]">{note}</p>}
    </div>
  );
}

function QueueItem({ item, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="w-full rounded-[24px] border border-[color:var(--cm-line)] bg-white/38 px-4 py-4 text-left transition hover:-translate-y-[1px] hover:bg-white/55"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{item.descricao}</p>
          <p className="mt-1 text-sm text-[var(--cm-muted)]">{item.cliente_nome || "Sem cliente vinculado"}</p>
        </div>
        <ToneBadge tone={item.statusTone}>{item.statusLabel}</ToneBadge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--cm-muted)]">
        <span>{TIPO_META[item.tipo]?.label || item.tipo}</span>
        <span>{fmt(item.valor_total)}</span>
        <span>{fmtD(item.vencimento)}</span>
      </div>
    </button>
  );
}

function ModalContainer({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(19,18,16,0.52)] p-4 backdrop-blur-md">
      {children}
    </div>
  );
}

function baseDescricaoParcelas(descricao = "") {
  return descricao.replace(/\s*\(\d+\/\d+\)$/, "").trim();
}

function extrairMarcadorOrcamento(texto = "") {
  const match = String(texto).match(/\[ORC:([^\]]+)\]/);
  return match?.[1] || "";
}

function diasParaVencimento(iso) {
  if (!iso) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(alvo.getTime())) return null;
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

function ModalBoleto({ clientes, onClose, onSalvo }) {
  const [etapa, setEtapa] = useState("upload");
  const [tipo, setTipo] = useState("pagar");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [form, setForm] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef(null);
  const idBase = "financeiro-boleto";

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = "";
    if (!arquivo) return;
    if (!arquivo.name.endsWith(".pdf")) {
      setErro("Apenas arquivos .pdf são aceitos.");
      return;
    }

    setCarregando(true);
    setErro("");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
        reader.readAsDataURL(arquivo);
      });

      const resp = await api.post("/financeiro/boleto", { pdf_base64: base64, tipo });
      const dados = resp.data;
      setForm({
        tipo,
        cliente_id: "",
        descricao: dados.descricao || "Boleto bancário",
        nfe: dados.nfe || "",
        prazo_dias: "",
        vencimento: dados.vencimento || "",
        valor: dados.valor || "",
        forma_pagamento: "Boleto",
        observacao: dados.beneficiario ? `Beneficiário: ${dados.beneficiario}` : "",
      });
      setEtapa("revisao");
    } catch (err) {
      setErro(err.response?.data?.erro || "Erro ao processar o boleto.");
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setSalvando(true);
    try {
      await api.post("/financeiro", {
        ...form,
        cliente_id: form.cliente_id || null,
        prazo_dias: form.prazo_dias || null,
      });
      onSalvo();
      onClose();
    } catch (err) {
      setErro(err.response?.data?.erro || "Erro ao salvar.");
      setSalvando(false);
    }
  };

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-3xl rounded-[34px] shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_18rem]">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cm-label">Importação de boleto</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Ler PDF e transformar em lançamento</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cm-muted)]">
                  O objetivo aqui é reduzir digitação manual: ler o boleto, revisar os dados e confirmar o vínculo com cliente e fluxo de caixa.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[color:var(--cm-line)] bg-white/72 p-3 text-[var(--cm-muted)] transition hover:text-[var(--cm-text)]"
                aria-label="Fechar importação de boleto"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {erro && (
              <div className="mt-5 rounded-[20px] border border-[rgba(187,103,80,0.18)] bg-[rgba(187,103,80,0.12)] px-4 py-3 text-sm text-[var(--cm-danger)]">
                {erro}
              </div>
            )}

            {etapa === "upload" && (
              <div className="mt-6 space-y-5">
                <div>
                  <p className={LABEL_BASE}>Destino do título</p>
                  <div className="mt-3 flex gap-3">
                    {[
                      ["pagar", "A pagar"],
                      ["receber", "A receber"],
                    ].map(([value, label]) => {
                      const ativo = tipo === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setTipo(value)}
                          className={`flex-1 rounded-[20px] border px-4 py-4 text-sm font-semibold transition ${
                            ativo
                              ? value === "receber"
                                ? "border-[rgba(63,141,114,0.2)] bg-[rgba(63,141,114,0.12)] text-[var(--cm-positive)]"
                                : "border-[rgba(187,103,80,0.2)] bg-[rgba(187,103,80,0.12)] text-[var(--cm-danger)]"
                              : "border-[color:var(--cm-line)] bg-white/72 text-[var(--cm-text)]"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={handleArquivo} />
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={carregando}
                  className="flex min-h-[14rem] w-full flex-col items-center justify-center rounded-[28px] border border-dashed border-[color:var(--cm-line)] bg-white/56 px-6 text-center transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {carregando ? (
                    <>
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/8 border-t-[var(--cm-accent)]" />
                      <p className="mt-4 text-sm font-semibold text-[var(--cm-text)]">Lendo boleto...</p>
                    </>
                  ) : (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[color:var(--cm-line)] bg-white/72">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-[var(--cm-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V3m0 0L7.5 7.5M12 3l4.5 4.5M21 15v2.25A2.25 2.25 0 0 1 18.75 19.5H5.25A2.25 2.25 0 0 1 3 17.25V15" />
                        </svg>
                      </div>
                      <p className="mt-4 text-base font-semibold tracking-[-0.03em] text-[var(--cm-text)]">Selecionar PDF do boleto</p>
                      <p className="mt-2 text-sm text-[var(--cm-muted)]">O sistema vai extrair valor, vencimento, descrição e beneficiário para revisão.</p>
                    </>
                  )}
                </button>
              </div>
            )}

            {etapa === "revisao" && form && (
              <form onSubmit={handleSalvar} className="mt-6 space-y-5">
                <div className="rounded-[20px] border border-[rgba(180,99,56,0.18)] bg-[rgba(180,99,56,0.12)] px-4 py-3 text-sm text-[var(--cm-accent)]">
                  Dados extraídos do boleto. Revise e confirme antes de salvar.
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${idBase}-cliente`} className={LABEL_BASE}>Cliente</label>
                    <select
                      id={`${idBase}-cliente`}
                      value={form.cliente_id}
                      onChange={(e) => set("cliente_id", e.target.value)}
                      className={INPUT_BASE}
                    >
                      <option value="">Sem vínculo</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`${idBase}-forma`} className={LABEL_BASE}>Forma de pagamento</label>
                    <select
                      id={`${idBase}-forma`}
                      value={form.forma_pagamento}
                      onChange={(e) => set("forma_pagamento", e.target.value)}
                      className={INPUT_BASE}
                    >
                      {FORMAS.map((forma) => (
                        <option key={forma} value={forma}>{forma}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={`${idBase}-descricao`} className={LABEL_BASE}>Descrição *</label>
                  <input
                    id={`${idBase}-descricao`}
                    value={form.descricao}
                    onChange={(e) => set("descricao", e.target.value)}
                    className={INPUT_BASE}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${idBase}-vencimento`} className={LABEL_BASE}>Vencimento *</label>
                    <input
                      id={`${idBase}-vencimento`}
                      type="date"
                      value={form.vencimento}
                      onChange={(e) => set("vencimento", e.target.value)}
                      className={INPUT_BASE}
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor={`${idBase}-valor`} className={LABEL_BASE}>Valor *</label>
                    <input
                      id={`${idBase}-valor`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.valor}
                      onChange={(e) => set("valor", e.target.value)}
                      className={INPUT_BASE}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${idBase}-nfe`} className={LABEL_BASE}>NF-e</label>
                    <input
                      id={`${idBase}-nfe`}
                      value={form.nfe}
                      onChange={(e) => set("nfe", e.target.value)}
                      className={INPUT_BASE}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${idBase}-observacao`} className={LABEL_BASE}>Observação</label>
                    <input
                      id={`${idBase}-observacao`}
                      value={form.observacao}
                      onChange={(e) => set("observacao", e.target.value)}
                      className={INPUT_BASE}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEtapa("upload")}
                    className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={salvando}
                    className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {salvando ? "Salvando..." : "Cadastrar lançamento"}
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="rounded-b-[34px] border-t border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.96)] p-6 text-white lg:rounded-r-[34px] lg:rounded-bl-none lg:border-l lg:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Leitura do fluxo</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToneBadge tone={tipo === "receber" ? "positive" : "danger"}>
                {TIPO_META[tipo].label}
              </ToneBadge>
            </div>
            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">O que essa rotina resolve</p>
              <div className="mt-3 space-y-3 text-sm text-white/72">
                <p>1. Extrai o mínimo viável do PDF para reduzir digitação.</p>
                <p>2. Permite vincular o título a um cliente já da carteira.</p>
                <p>3. Coloca o lançamento direto no fluxo de caixa para monitoramento.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ModalContainer>
  );
}

function ModalLancamento({ item, clientes, onClose, onSalvo }) {
  const editando = Boolean(item?.id);
  const [form, setForm] = useState(
    editando
      ? {
          tipo: item.tipo,
          cliente_id: String(item.cliente_id || ""),
          descricao: item.descricao,
          nfe: item.nfe || "",
          prazo_dias: item.prazo_dias || "",
          vencimento: item.vencimento,
          valor: item.valor,
          forma_pagamento: item.forma_pagamento || "",
          observacao: item.observacao || "",
        }
      : { ...FORM_VAZIO }
  );
  const [parcelas, setParcelas] = useState(1);
  const [salvando, setSalvando] = useState(false);
  const [notif, show] = useNotif();
  const idBase = editando ? `financeiro-edit-${item.id}` : "financeiro-create";

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handlePrazo = (dias) => {
    set("prazo_dias", dias);
    if (dias) {
      const date = new Date();
      date.setDate(date.getDate() + Number(dias));
      set("vencimento", date.toISOString().split("T")[0]);
    }
  };

  const previewParcelas = useMemo(() => {
    if (!form.vencimento || !form.valor || parcelas <= 1) return null;
    const valorParcela = Number(form.valor) / parcelas;
    const base = new Date(`${form.vencimento}T12:00:00`);
    const prazo = Number(form.prazo_dias) || 30;
    return Array.from({ length: parcelas }, (_, index) => {
      const date = new Date(base);
      date.setDate(date.getDate() + prazo * index);
      return {
        num: index + 1,
        venc: date.toLocaleDateString("pt-BR"),
        valor: valorParcela,
      };
    });
  }, [form.prazo_dias, form.valor, form.vencimento, parcelas]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.descricao.trim()) {
      show("Descrição obrigatória.", "erro");
      return;
    }
    if (!form.vencimento) {
      show("Vencimento obrigatório.", "erro");
      return;
    }
    if (!form.valor || Number(form.valor) <= 0) {
      show("Valor deve ser maior que zero.", "erro");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        ...form,
        cliente_id: form.cliente_id ? Number(form.cliente_id) : null,
        prazo_dias: form.prazo_dias || null,
      };

      if (editando) {
        await api.put(`/financeiro/${item.id}`, payload);
      } else {
        await api.post("/financeiro", { ...payload, parcelas });
      }
      onSalvo();
      onClose();
    } catch (err) {
      show(err.response?.data?.erro || "Erro ao salvar.", "erro");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-5xl rounded-[34px] shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.55fr)_20rem]">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cm-label">{editando ? "Editar lançamento" : "Novo lançamento"}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">
                  {editando ? "Ajustar título financeiro" : "Criar novo título com cadência definida"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cm-muted)]">
                  Use essa rotina para registrar entradas, saídas e parcelamentos com vínculo opcional ao cliente e ao restante do fluxo operacional.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[color:var(--cm-line)] bg-white/72 p-3 text-[var(--cm-muted)] transition hover:text-[var(--cm-text)]"
                aria-label="Fechar lançamento"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {notif && (
              <div
                className={`mt-5 rounded-[20px] px-4 py-3 text-sm ${
                  notif.tipo === "erro"
                    ? "border border-[rgba(187,103,80,0.18)] bg-[rgba(187,103,80,0.12)] text-[var(--cm-danger)]"
                    : "border border-[rgba(63,141,114,0.18)] bg-[rgba(63,141,114,0.12)] text-[var(--cm-positive)]"
                }`}
              >
                {notif.msg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <p className={LABEL_BASE}>Tipo</p>
                <div className="mt-3 flex gap-3">
                  {["receber", "pagar"].map((tipo) => {
                    const ativo = form.tipo === tipo;
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => set("tipo", tipo)}
                        className={`flex-1 rounded-[20px] border px-4 py-4 text-sm font-semibold transition ${
                          ativo
                            ? tipo === "receber"
                              ? "border-[rgba(63,141,114,0.2)] bg-[rgba(63,141,114,0.12)] text-[var(--cm-positive)]"
                              : "border-[rgba(187,103,80,0.2)] bg-[rgba(187,103,80,0.12)] text-[var(--cm-danger)]"
                            : "border-[color:var(--cm-line)] bg-white/72 text-[var(--cm-text)]"
                        }`}
                      >
                        {TIPO_META[tipo].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor={`${idBase}-cliente`} className={LABEL_BASE}>Cliente</label>
                <select
                  id={`${idBase}-cliente`}
                  value={form.cliente_id}
                  onChange={(e) => set("cliente_id", e.target.value)}
                  className={INPUT_BASE}
                >
                  <option value="">Sem vínculo</option>
                  {clientes.map((cliente) => (
                    <option key={cliente.id} value={String(cliente.id)}>{cliente.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor={`${idBase}-descricao`} className={LABEL_BASE}>Descrição *</label>
                <input
                  id={`${idBase}-descricao`}
                  value={form.descricao}
                  onChange={(e) => set("descricao", e.target.value)}
                  placeholder="Ex: Serviço de torneamento CNC - OS #42"
                  className={INPUT_BASE}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idBase}-nfe`} className={LABEL_BASE}>NF-e</label>
                  <input
                    id={`${idBase}-nfe`}
                    value={form.nfe}
                    onChange={(e) => set("nfe", e.target.value)}
                    className={INPUT_BASE}
                  />
                </div>
                <div>
                  <label htmlFor={`${idBase}-forma`} className={LABEL_BASE}>Forma de pagamento</label>
                  <select
                    id={`${idBase}-forma`}
                    value={form.forma_pagamento}
                    onChange={(e) => set("forma_pagamento", e.target.value)}
                    className={INPUT_BASE}
                  >
                    <option value="">Não definida</option>
                    {FORMAS.map((forma) => (
                      <option key={forma} value={forma}>{forma}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idBase}-prazo`} className={LABEL_BASE}>Prazo</label>
                  <select
                    id={`${idBase}-prazo`}
                    value={form.prazo_dias}
                    onChange={(e) => handlePrazo(e.target.value)}
                    className={INPUT_BASE}
                  >
                    <option value="">Escolher</option>
                    {PRAZOS.map((prazo) => (
                      <option key={prazo} value={prazo}>{prazo} dias</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${idBase}-vencimento`} className={LABEL_BASE}>1º vencimento *</label>
                  <input
                    id={`${idBase}-vencimento`}
                    type="date"
                    value={form.vencimento}
                    onChange={(e) => set("vencimento", e.target.value)}
                    className={INPUT_BASE}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idBase}-valor`} className={LABEL_BASE}>Valor total *</label>
                  <input
                    id={`${idBase}-valor`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.valor}
                    onChange={(e) => set("valor", e.target.value)}
                    className={INPUT_BASE}
                    required
                  />
                </div>
                {!editando && (
                  <div>
                    <label htmlFor={`${idBase}-parcelas`} className={LABEL_BASE}>Parcelas</label>
                    <select
                      id={`${idBase}-parcelas`}
                      value={parcelas}
                      onChange={(e) => setParcelas(Number(e.target.value))}
                      className={INPUT_BASE}
                    >
                      {Array.from({ length: 12 }, (_, index) => index + 1).map((numero) => (
                        <option key={numero} value={numero}>
                          {numero === 1 ? "À vista" : `${numero}x`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {previewParcelas && (
                <div className="rounded-[24px] border border-[rgba(180,99,56,0.18)] bg-[rgba(180,99,56,0.08)] p-4">
                  <p className="cm-label">Preview das parcelas</p>
                  <div className="mt-3 space-y-2">
                    {previewParcelas.map((parcela) => (
                      <div key={parcela.num} className="flex items-center justify-between text-sm text-[var(--cm-text)]">
                        <span>Parcela {parcela.num}/{parcelas}</span>
                        <span>{parcela.venc}</span>
                        <span className="font-semibold">{fmt(parcela.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor={`${idBase}-observacao`} className={LABEL_BASE}>Observação</label>
                <textarea
                  id={`${idBase}-observacao`}
                  value={form.observacao}
                  onChange={(e) => set("observacao", e.target.value)}
                  rows={3}
                  className={`${INPUT_BASE} resize-none`}
                />
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {salvando ? "Salvando..." : editando ? "Salvar alterações" : parcelas > 1 ? `Criar ${parcelas} parcelas` : "Criar lançamento"}
                </button>
              </div>
            </form>
          </div>

          <aside className="rounded-b-[34px] border-t border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.96)] p-6 text-white lg:rounded-r-[34px] lg:rounded-bl-none lg:border-l lg:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Prontidão do título</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToneBadge tone={form.tipo === "receber" ? "positive" : "danger"}>
                {TIPO_META[form.tipo].label}
              </ToneBadge>
              {!editando && parcelas > 1 && <ToneBadge tone="accent">{parcelas} parcelas</ToneBadge>}
            </div>

            <div className="mt-5 space-y-3 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <InfoItem label="Descrição" value={form.descricao || "A definir"} subtle={!form.descricao} />
              <InfoItem label="Valor" value={form.valor ? fmt(form.valor) : "A definir"} subtle={!form.valor} />
              <InfoItem label="Vencimento" value={form.vencimento ? fmtD(form.vencimento) : "A definir"} subtle={!form.vencimento} />
              <InfoItem label="Forma" value={form.forma_pagamento || "Não definida"} subtle={!form.forma_pagamento} />
            </div>
          </aside>
        </div>
      </div>
    </ModalContainer>
  );
}

function ModalPagar({ item, onClose, onSalvo }) {
  const [dataPag, setDataPag] = useState(new Date().toISOString().split("T")[0]);
  const [forma, setForma] = useState(item.forma_pagamento || "");
  const [salvando, setSalvando] = useState(false);
  const idBase = `financeiro-pagar-${item.id}`;

  const confirmar = async () => {
    setSalvando(true);
    try {
      await api.patch(`/financeiro/${item.id}/pagar`, {
        data_pagamento: dataPag,
        forma_pagamento: forma || null,
      });
      onSalvo();
      onClose();
    } catch {
      setSalvando(false);
    }
  };

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-lg rounded-[32px] p-6 shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div>
          <p className="cm-label">Registrar pagamento</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Baixar título no caixa</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">{item.descricao}</p>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor={`${idBase}-data`} className={LABEL_BASE}>Data do pagamento</label>
            <input
              id={`${idBase}-data`}
              type="date"
              value={dataPag}
              onChange={(e) => setDataPag(e.target.value)}
              className={INPUT_BASE}
            />
          </div>
          <div>
            <label htmlFor={`${idBase}-forma`} className={LABEL_BASE}>Forma de pagamento</label>
            <select
              id={`${idBase}-forma`}
              value={forma}
              onChange={(e) => setForma(e.target.value)}
              className={INPUT_BASE}
            >
              <option value="">Não informada</option>
              {FORMAS.map((formaPagamento) => (
                <option key={formaPagamento} value={formaPagamento}>{formaPagamento}</option>
              ))}
            </select>
          </div>

          <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--cm-muted)]">Valor</span>
              <span className="font-semibold text-[var(--cm-text)]">{fmt(item.valor)}</span>
            </div>
            {item.juros > 0 && (
              <div className="mt-2 flex items-center justify-between text-sm text-[var(--cm-danger)]">
                <span>Juros</span>
                <span>+ {fmt(item.juros)}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-[color:var(--cm-line)] pt-3 text-sm font-semibold text-[var(--cm-text)]">
              <span>Total</span>
              <span>{fmt(item.valor_total)}</span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirmar}
            disabled={salvando}
            className="rounded-full bg-[var(--cm-positive)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {salvando ? "Salvando..." : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}

function ModalConfirmar({ item, onClose, onConfirmar }) {
  const [excluindo, setExcluindo] = useState(false);
  const temGrupo = item.parcelas > 1;

  const handleExcluir = async (modo) => {
    setExcluindo(true);
    try {
      await onConfirmar(modo);
    } finally {
      setExcluindo(false);
    }
  };

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-lg rounded-[32px] p-6 shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div>
          <p className="cm-label">Excluir lançamento</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Remover título do financeiro?</h3>
          <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">{item.descricao}</p>
          {temGrupo && (
            <p className="mt-2 text-sm text-[var(--cm-accent)]">
              Este lançamento faz parte de um grupo com {item.parcelas} parcelas.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {temGrupo ? (
            <>
              <button
                type="button"
                onClick={() => handleExcluir("grupo")}
                disabled={excluindo}
                className="rounded-full bg-[var(--cm-danger)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {excluindo ? "Excluindo..." : `Excluir todas as ${item.parcelas} parcelas`}
              </button>
              <button
                type="button"
                onClick={() => handleExcluir("unico")}
                disabled={excluindo}
                className="rounded-full border border-[rgba(187,103,80,0.18)] bg-[rgba(187,103,80,0.1)] px-5 py-3 text-sm font-semibold text-[var(--cm-danger)] transition hover:bg-[rgba(187,103,80,0.14)]"
              >
                Excluir só a parcela {item.parcela_num}/{item.parcelas}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => handleExcluir("unico")}
              disabled={excluindo}
              className="rounded-full bg-[var(--cm-danger)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {excluindo ? "Excluindo..." : "Excluir lançamento"}
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
          >
            Cancelar
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}

export default function Financeiro() {
  const [dados, setDados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [selecionados, setSelecionados] = useState([]);
  const [notif, show] = useNotif();

  const [modalForm, setModalForm] = useState(false);
  const [itemEdit, setItemEdit] = useState(null);
  const [itemPagar, setItemPagar] = useState(null);
  const [itemDel, setItemDel] = useState(null);
  const [modalBoleto, setModalBoleto] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [itemFocoId, setItemFocoId] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const params = {};
      if (filtroTipo) params.tipo = filtroTipo;
      if (filtroStatus) params.status = filtroStatus;
      if (filtro) params.q = filtro;
      const [res, resClientes, resResumo] = await Promise.all([
        api.get("/financeiro", { params }),
        api.get("/clientes"),
        api.get("/financeiro/resumo"),
      ]);
      setDados(res.data);
      setClientes(resClientes.data);
      setResumo(resResumo.data);
    } catch {
      show("Erro ao carregar dados.", "erro");
    } finally {
      setCarregando(false);
    }
  }, [filtro, filtroStatus, filtroTipo, show]);

  useEffect(() => {
    const timer = setTimeout(() => carregar(), 280);
    return () => clearTimeout(timer);
  }, [carregar]);

  const registrosPais = useMemo(() => {
    return dados.filter((item) => !(item.parcelas > 1 && item.parcela_num > 1));
  }, [dados]);

  const dadosEnriquecidos = useMemo(() => {
    return registrosPais.map((item) => {
      const baseDescricao = baseDescricaoParcelas(item.descricao);
      const irmas =
        item.parcelas > 1
          ? dados
              .filter(
                (registro) =>
                  registro.id !== item.id &&
                  registro.parcelas === item.parcelas &&
                  baseDescricaoParcelas(registro.descricao) === baseDescricao
              )
              .sort((a, b) => a.parcela_num - b.parcela_num)
          : [];
      const dias = diasParaVencimento(item.vencimento);
      const marcadorOrcamento = extrairMarcadorOrcamento(item.descricao);
      const semVinculo = !item.cliente_id;
      const parcelado = item.parcelas > 1;

      let statusTone = STATUS_META[item.status]?.tone || "default";
      let statusLabel = STATUS_META[item.status]?.label || item.status;
      let nextAction = "Fluxo financeiro estável.";
      let prioridade = 0;

      if (item.status === "atrasado") {
        statusTone = "danger";
        statusLabel = item.tipo === "receber" ? "Cobrar urgente" : "Pagamento atrasado";
        nextAction =
          item.tipo === "receber"
            ? "Atuar na cobrança e renegociação."
            : "Regularizar pagamento e preservar o fornecedor.";
        prioridade = 6;
      } else if (item.status === "pendente" && dias != null && dias <= 3) {
        statusTone = "warning";
        statusLabel = "Vencendo agora";
        nextAction =
          item.tipo === "receber"
            ? "Confirmar recebimento antes do vencimento."
            : "Programar pagamento para evitar atraso.";
        prioridade = 4;
      } else if (semVinculo) {
        statusTone = "accent";
        statusLabel = "Sem vínculo";
        nextAction = "Vincular a um cliente para fechar o fluxo.";
        prioridade = 3;
      } else if (item.status === "pago") {
        statusTone = "positive";
        statusLabel = "Liquidado";
        nextAction = "Fluxo fechado com sucesso.";
        prioridade = 1;
      }

      return {
        ...item,
        irmas,
        dias,
        marcadorOrcamento,
        semVinculo,
        parcelado,
        statusTone,
        statusLabel,
        nextAction,
        prioridade,
      };
    });
  }, [dados, registrosPais]);

  const dadosVisiveis = useMemo(() => {
    return dadosEnriquecidos.filter((item) => {
      if (filtroRapido === "receber") return item.tipo === "receber";
      if (filtroRapido === "pagar") return item.tipo === "pagar";
      if (filtroRapido === "atrasado") return item.status === "atrasado";
      if (filtroRapido === "parcelado") return item.parcelado;
      if (filtroRapido === "sem_vinculo") return item.semVinculo;
      return true;
    });
  }, [dadosEnriquecidos, filtroRapido]);

  const totaisLista = useMemo(() => {
    const totalReceber = dados.reduce(
      (sum, item) => (item.tipo === "receber" && item.status !== "pago" ? sum + item.valor_total : sum),
      0
    );
    const totalPagar = dados.reduce(
      (sum, item) => (item.tipo === "pagar" && item.status !== "pago" ? sum + item.valor_total : sum),
      0
    );
    const totalJuros = dados.reduce((sum, item) => sum + item.juros, 0);
    return { totalReceber, totalPagar, totalJuros };
  }, [dados]);

  const filaPrioritaria = useMemo(() => {
    return [...dadosEnriquecidos]
      .sort((a, b) => {
        if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade;
        return Number(b.valor_total) - Number(a.valor_total);
      })
      .filter((item) => item.prioridade > 1)
      .slice(0, 4);
  }, [dadosEnriquecidos]);

  const contagemFiltros = useMemo(() => {
    return {
      todos: dadosEnriquecidos.length,
      receber: dadosEnriquecidos.filter((item) => item.tipo === "receber").length,
      pagar: dadosEnriquecidos.filter((item) => item.tipo === "pagar").length,
      atrasado: dadosEnriquecidos.filter((item) => item.status === "atrasado").length,
      parcelado: dadosEnriquecidos.filter((item) => item.parcelado).length,
      sem_vinculo: dadosEnriquecidos.filter((item) => item.semVinculo).length,
    };
  }, [dadosEnriquecidos]);

  useEffect(() => {
    const idsVisiveis = new Set(dadosVisiveis.map((item) => item.id));
    setSelecionados((prev) => prev.filter((id) => idsVisiveis.has(id)));
    if (!dadosVisiveis.length) {
      setItemFocoId(null);
      return;
    }
    if (!idsVisiveis.has(itemFocoId)) {
      setItemFocoId(dadosVisiveis[0].id);
    }
  }, [dadosVisiveis, itemFocoId]);

  const itemFoco = useMemo(
    () => dadosVisiveis.find((item) => item.id === itemFocoId) || null,
    [dadosVisiveis, itemFocoId]
  );

  const toggleSel = (id) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleTodos = () => {
    const ids = dadosVisiveis.map((item) => item.id);
    const todosSelecionados = ids.length > 0 && ids.every((id) => selecionados.includes(id));
    setSelecionados(todosSelecionados ? [] : ids);
  };

  const excluir = async (modo = "unico") => {
    try {
      await api.delete(`/financeiro/${itemDel.id}?modo=${modo}`);
      show(modo === "grupo" ? "Todas as parcelas excluídas." : "Lançamento excluído.");
      setItemDel(null);
      carregar();
    } catch {
      show("Erro ao excluir.", "erro");
    }
  };

  const exportarCSV = (item) => {
    const cab = "Tipo,Status,Cliente,Descrição,NF-e,Vencimento,Valor,Juros,Total,Forma Pagamento\n";
    const lin = `${item.tipo},${item.status},${item.cliente_nome || ""},${item.descricao},${item.nfe || ""},${item.vencimento},${item.valor},${item.juros},${item.valor_total},${item.forma_pagamento || ""}\n`;
    const blob = new Blob([cab + lin], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lancamento_${item.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show("CSV exportado!");
  };

  const exportarSelecionados = () => {
    const itens = dadosVisiveis.filter((item) => selecionados.includes(item.id));
    if (!itens.length) return;
    const cab = "Tipo,Status,Cliente,Descrição,NF-e,Vencimento,Valor,Juros,Total,Forma Pagamento\n";
    const linhas = itens
      .map(
        (item) =>
          `${item.tipo},${item.status},${item.cliente_nome || ""},${item.descricao},${item.nfe || ""},${item.vencimento},${item.valor},${item.juros},${item.valor_total},${item.forma_pagamento || ""}`
      )
      .join("\n");
    const blob = new Blob([cab + linhas], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financeiro_selecao_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    show("Seleção exportada!");
  };

  const abrirNovo = () => {
    setItemEdit(null);
    setModalForm(true);
  };

  const abrirEdicao = (item) => {
    setItemEdit(item);
    setModalForm(true);
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8">
      {notif && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-[20px] border px-5 py-3 text-sm font-semibold shadow-[0_18px_48px_rgba(22,18,14,0.2)] ${
            notif.tipo === "erro"
              ? "border-[rgba(187,103,80,0.2)] bg-[rgba(255,244,240,0.94)] text-[var(--cm-danger)]"
              : "border-[rgba(63,141,114,0.2)] bg-[rgba(246,255,251,0.95)] text-[var(--cm-positive)]"
          }`}
        >
          {notif.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="cm-surface-strong rounded-[32px] p-6 sm:p-7 xl:col-span-8">
          <p className="cm-label text-white/58">Ceramic Monolith · Financeiro</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Caixa, risco e parcelas sob a mesma leitura operacional
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72 sm:text-base">
            O financeiro fecha a cadeia do sistema. Agora ele mostra o que entra, o que sai, o que venceu, o que está parcelado e o que ainda precisa de vínculo com o fluxo comercial.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={IconDollar} label="A receber" value={fmt(totaisLista.totalReceber)} note="Considerando a listagem atual" inverse />
            <StatTile icon={IconDollar} label="A pagar" value={fmt(totaisLista.totalPagar)} note="Saídas ainda em aberto" inverse />
            <StatTile icon={IconQuotes} label="Juros em aberto" value={fmt(totaisLista.totalJuros)} note="Custo adicional visível" inverse />
            <StatTile icon={IconQuotes} label="Títulos em atraso" value={String(resumo?.atrasados ?? 0)} note="Resumo geral do financeiro" inverse />
          </div>
        </section>

        <section className="cm-surface rounded-[32px] p-6 xl:col-span-4">
          <p className="cm-label">Fila de ação</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Títulos que pedem movimento</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
            Priorização automática com base em atraso, vencimento próximo, vínculo ausente e peso financeiro.
          </p>

          <div className="mt-5 grid gap-3">
            {filaPrioritaria.length ? (
              filaPrioritaria.map((item) => <QueueItem key={item.id} item={item} onSelect={setItemFocoId} />)
            ) : (
              <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/38 px-4 py-6 text-sm leading-6 text-[var(--cm-muted)]">
                Nenhum título crítico neste recorte.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniMetric label="Recebido no mês" value={fmt(resumo?.recebido_mes)} />
            <MiniMetric label="Atrasados" value={String(resumo?.atrasados ?? 0)} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="cm-surface rounded-[32px] p-5 sm:p-6 xl:col-span-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="cm-label">Workspace financeiro</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Títulos e parcelas</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
                  Filtre por tipo, status e situação. Cada linha já traz o contexto de vencimento, juros, vínculo e origem quando houver.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={abrirNovo}
                  className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
                >
                  Novo lançamento
                </button>
                <button
                  type="button"
                  onClick={() => setModalBoleto(true)}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Importar boleto
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[24px] border border-[color:var(--cm-line)] bg-white/68 px-4 py-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-[var(--cm-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.4a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z" />
                </svg>
                <input
                  type="text"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  placeholder="Buscar por cliente, descrição ou NF-e..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cm-text)] outline-none placeholder:text-[var(--cm-muted)]"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-4 py-3 text-sm text-[var(--cm-text)] outline-none transition hover:bg-white"
                  aria-label="Filtrar por tipo"
                >
                  <option value="">Todos os tipos</option>
                  <option value="receber">A receber</option>
                  <option value="pagar">A pagar</option>
                </select>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-4 py-3 text-sm text-[var(--cm-text)] outline-none transition hover:bg-white"
                  aria-label="Filtrar por status"
                >
                  <option value="">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="atrasado">Atrasado</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_FILTERS.map((item) => {
                const ativo = filtroRapido === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFiltroRapido(item.id)}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition ${
                      ativo
                        ? "border-[rgba(180,99,56,0.22)] bg-[rgba(180,99,56,0.12)] text-[var(--cm-accent)]"
                        : "border-[color:var(--cm-line)] bg-white/66 text-[var(--cm-muted)] hover:text-[var(--cm-text)]"
                    }`}
                  >
                    {item.label}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${ativo ? "bg-white/72 text-[var(--cm-accent)]" : "bg-[rgba(37,42,49,0.06)] text-[var(--cm-muted)]"}`}>
                      {contagemFiltros[item.id]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-[color:var(--cm-line)] bg-white/34">
            <div className="hidden lg:grid lg:grid-cols-[auto_1fr_1fr_1fr_auto] lg:gap-4 lg:px-4 lg:py-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    dadosVisiveis.length > 0 &&
                    dadosVisiveis.every((item) => selecionados.includes(item.id))
                  }
                  onChange={toggleTodos}
                  className="h-4 w-4 rounded border-[color:var(--cm-line)] text-[var(--cm-accent)] focus:ring-[rgba(180,99,56,0.2)]"
                  aria-label="Selecionar todos os títulos visíveis"
                />
              </div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Título</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Vencimento e valor</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Contexto</p>
              <p className="text-right text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Ações</p>
            </div>

            {carregando ? (
              <div className="flex items-center justify-center px-6 py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/8 border-t-[var(--cm-accent)]" />
              </div>
            ) : !dadosVisiveis.length ? (
              <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Nenhum lançamento encontrado</h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--cm-muted)]">
                  Ajuste os filtros ou crie um novo título para voltar a enxergar o fluxo financeiro.
                </p>
              </div>
            ) : (
              <div>
                {dadosVisiveis.map((item, index) => {
                  const aberto = expandido === item.id;
                  const tipoTone = TIPO_META[item.tipo]?.tone || "default";
                  return (
                    <div key={item.id}>
                      <article
                        className={`grid gap-4 px-4 py-5 transition lg:grid-cols-[auto_1fr_1fr_1fr_auto] ${
                          index > 0 ? "border-t border-[color:var(--cm-line)]" : ""
                        } ${
                          item.id === itemFocoId ? "bg-[rgba(255,255,255,0.52)]" : "bg-transparent hover:bg-white/28"
                        }`}
                      >
                        <div className="flex items-start pt-1">
                          <input
                            type="checkbox"
                            checked={selecionados.includes(item.id)}
                            onChange={() => toggleSel(item.id)}
                            className="mt-1 h-4 w-4 rounded border-[color:var(--cm-line)] text-[var(--cm-accent)] focus:ring-[rgba(180,99,56,0.2)]"
                            aria-label={`Selecionar ${item.descricao}`}
                          />
                        </div>

                        <div className="min-w-0">
                          <button type="button" onClick={() => setItemFocoId(item.id)} className="w-full text-left">
                            <div className="flex flex-wrap items-center gap-2">
                              <ToneBadge tone={item.statusTone}>{item.statusLabel}</ToneBadge>
                              <ToneBadge tone={tipoTone}>{TIPO_META[item.tipo]?.short || item.tipo}</ToneBadge>
                              {item.parcelado && <ToneBadge tone="accent">{item.parcelas}x</ToneBadge>}
                            </div>
                            <p className="mt-3 text-base font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{item.descricao}</p>
                            <p className="mt-1 text-sm text-[var(--cm-muted)]">{item.cliente_nome || "Sem cliente vinculado"}</p>
                          </button>
                        </div>

                        <div className="space-y-2">
                          <InfoItem label="Vencimento" value={fmtD(item.vencimento)} />
                          <InfoItem label="Valor" value={fmt(item.valor)} />
                          <InfoItem label="Total" value={fmt(item.valor_total)} />
                        </div>

                        <div className="space-y-2">
                          <InfoItem
                            label="Situação"
                            value={
                              item.dias == null
                                ? "Sem prazo"
                                : item.dias < 0
                                ? `${Math.abs(item.dias)} dia(s) em atraso`
                                : `${item.dias} dia(s) para vencer`
                            }
                            subtle={item.dias == null}
                          />
                          <InfoItem label="Origem" value={item.marcadorOrcamento ? `Orçamento ${item.marcadorOrcamento}` : "Lançamento manual"} subtle={!item.marcadorOrcamento} />
                          <InfoItem label="NF-e" value={item.nfe || "Sem NF-e"} subtle={!item.nfe} />
                        </div>

                        <div className="flex flex-wrap items-start justify-end gap-2 lg:flex-col lg:items-end">
                          {item.status !== "pago" && (
                            <button
                              type="button"
                              onClick={() => setItemPagar(item)}
                              className="rounded-full border border-[rgba(63,141,114,0.18)] bg-[rgba(63,141,114,0.1)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-positive)] transition hover:bg-[rgba(63,141,114,0.14)]"
                            >
                              Marcar pago
                            </button>
                          )}
                          {item.parcelado && (
                            <button
                              type="button"
                              onClick={() => setExpandido(aberto ? null : item.id)}
                              className="rounded-full border border-[color:var(--cm-line)] bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                            >
                              {aberto ? "Ocultar parcelas" : "Ver parcelas"}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => exportarCSV(item)}
                            className="rounded-full border border-[color:var(--cm-line)] bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                          >
                            Exportar
                          </button>
                          <button
                            type="button"
                            onClick={() => abrirEdicao(item)}
                            className="rounded-full border border-[color:var(--cm-line)] bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemDel(item)}
                            className="rounded-full border border-[rgba(187,103,80,0.18)] bg-[rgba(187,103,80,0.1)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-danger)] transition hover:bg-[rgba(187,103,80,0.14)]"
                          >
                            Excluir
                          </button>
                        </div>
                      </article>

                      {item.parcelado && aberto && (
                        <div className="border-t border-[color:var(--cm-line)] bg-[rgba(180,99,56,0.06)] px-6 py-4">
                          <p className="cm-label">Parcelas</p>
                          <div className="mt-3 overflow-x-auto">
                            <table className="min-w-[720px] w-full text-sm">
                              <thead>
                                <tr className="border-b border-[color:var(--cm-line)] text-left text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">
                                  <th className="py-2 font-semibold">Parcela</th>
                                  <th className="py-2 font-semibold">Status</th>
                                  <th className="py-2 font-semibold">Vencimento</th>
                                  <th className="py-2 font-semibold">Valor</th>
                                  <th className="py-2 font-semibold">Total</th>
                                  <th className="py-2 font-semibold text-right">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[item, ...item.irmas]
                                  .sort((a, b) => a.parcela_num - b.parcela_num)
                                  .map((parcela) => (
                                    <tr key={parcela.id} className="border-b border-[rgba(37,42,49,0.06)]">
                                      <td className="py-3 text-[var(--cm-text)]">{parcela.parcela_num}/{parcela.parcelas}</td>
                                      <td className="py-3"><ToneBadge tone={STATUS_META[parcela.status]?.tone}>{STATUS_META[parcela.status]?.label}</ToneBadge></td>
                                      <td className="py-3 text-[var(--cm-muted)]">{fmtD(parcela.vencimento)}</td>
                                      <td className="py-3 text-[var(--cm-text)]">{fmt(parcela.valor)}</td>
                                      <td className="py-3 font-semibold text-[var(--cm-text)]">{fmt(parcela.valor_total)}</td>
                                      <td className="py-3 text-right">
                                        <div className="flex justify-end gap-2">
                                          {parcela.status !== "pago" && (
                                            <button
                                              type="button"
                                              onClick={() => setItemPagar(parcela)}
                                              className="rounded-full border border-[rgba(63,141,114,0.18)] bg-[rgba(63,141,114,0.1)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-positive)] transition hover:bg-[rgba(63,141,114,0.14)]"
                                            >
                                              Pagar
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => setItemDel(parcela)}
                                            className="rounded-full border border-[rgba(187,103,80,0.18)] bg-[rgba(187,103,80,0.1)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-danger)] transition hover:bg-[rgba(187,103,80,0.14)]"
                                          >
                                            Excluir
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--cm-muted)]">
            <p>{dadosVisiveis.length} registro(s) visível(is)</p>
            <div className="flex flex-wrap gap-3">
              {selecionados.length > 0 && (
                <button
                  type="button"
                  onClick={exportarSelecionados}
                  className="rounded-full border border-[rgba(180,99,56,0.22)] bg-[rgba(180,99,56,0.12)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-accent)] transition hover:bg-[rgba(180,99,56,0.16)]"
                >
                  Exportar seleção
                </button>
              )}
              <span>
                {selecionados.length > 0
                  ? `${selecionados.length} selecionado(s)`
                  : "Nenhum selecionado"}
              </span>
            </div>
          </div>
        </section>

        <section className="cm-surface rounded-[32px] p-5 sm:p-6 xl:col-span-4">
          <p className="cm-label">Título em foco</p>
          {itemFoco ? (
            <>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">{itemFoco.descricao}</h2>
                  <p className="mt-2 text-sm text-[var(--cm-muted)]">{itemFoco.cliente_nome || "Sem cliente vinculado"}</p>
                </div>
                <ToneBadge tone={itemFoco.statusTone}>{itemFoco.statusLabel}</ToneBadge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ToneBadge tone={TIPO_META[itemFoco.tipo]?.tone}>{TIPO_META[itemFoco.tipo]?.label}</ToneBadge>
                {itemFoco.parcelado && <ToneBadge tone="accent">{itemFoco.parcelas} parcelas</ToneBadge>}
                {itemFoco.marcadorOrcamento && <ToneBadge tone="accent">Origem {itemFoco.marcadorOrcamento}</ToneBadge>}
              </div>

              <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 p-4">
                <p className="cm-label">Próxima melhor ação</p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{itemFoco.nextAction}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
                  {itemFoco.status === "pago"
                    ? "Título encerrado e pronto para histórico."
                    : itemFoco.status === "atrasado"
                    ? "Vale agir agora para recuperar caixa ou evitar desgaste com fornecedor."
                    : itemFoco.semVinculo
                    ? "Vincular esse título ajuda a fechar o fluxo entre comercial, operação e caixa."
                    : "Mantenha o monitoramento até a liquidação."}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <FocusMetric label="Valor" value={fmt(itemFoco.valor)} note={`Total com juros: ${fmt(itemFoco.valor_total)}`} />
                <FocusMetric label="Vencimento" value={fmtD(itemFoco.vencimento)} note={itemFoco.dias == null ? "Sem prazo definido." : itemFoco.dias < 0 ? `${Math.abs(itemFoco.dias)} dia(s) de atraso` : `${itemFoco.dias} dia(s) para vencer`} />
                <FocusMetric label="Forma" value={itemFoco.forma_pagamento || "Não definida"} note={itemFoco.status === "pago" ? "Pagamento registrado." : "Pode ser preenchida na baixa."} />
                <FocusMetric label="NF-e" value={itemFoco.nfe || "Sem NF-e"} note={itemFoco.marcadorOrcamento ? `Origem comercial ${itemFoco.marcadorOrcamento}.` : "Sem marcador de orçamento."} />
              </div>

              <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoItem label="Cliente" value={itemFoco.cliente_nome || "Sem vínculo"} subtle={!itemFoco.cliente_nome} />
                  <InfoItem label="Observação" value={itemFoco.observacao || "Sem observação"} subtle={!itemFoco.observacao} title={itemFoco.observacao || ""} />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {itemFoco.status !== "pago" && (
                  <button
                    type="button"
                    onClick={() => setItemPagar(itemFoco)}
                    className="rounded-full bg-[var(--cm-positive)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
                  >
                    Marcar pago
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => abrirEdicao(itemFoco)}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Editar lançamento
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/40 px-4 py-6 text-sm leading-6 text-[var(--cm-muted)]">
              Selecione um título na listagem para abrir o inspector com vencimento, risco e origem.
            </div>
          )}
        </section>
      </div>

      {modalBoleto && (
        <ModalBoleto
          clientes={clientes}
          onClose={() => setModalBoleto(false)}
          onSalvo={() => {
            show("Boleto cadastrado!");
            carregar();
          }}
        />
      )}
      {modalForm && (
        <ModalLancamento
          item={itemEdit}
          clientes={clientes}
          onClose={() => {
            setModalForm(false);
            setItemEdit(null);
          }}
          onSalvo={() => {
            show(itemEdit ? "Lançamento atualizado!" : "Lançamento criado!");
            carregar();
          }}
        />
      )}
      {itemPagar && (
        <ModalPagar
          item={itemPagar}
          onClose={() => setItemPagar(null)}
          onSalvo={() => {
            show("Pagamento registrado!");
            carregar();
          }}
        />
      )}
      {itemDel && (
        <ModalConfirmar
          item={itemDel}
          onClose={() => setItemDel(null)}
          onConfirmar={excluir}
        />
      )}
    </div>
  );
}
