import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import api from "../api";

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
      return "is-danger";
    case "warning":
      return "is-warning";
    case "positive":
      return "is-positive";
    case "accent":
      return "is-accent";
    default:
      return "is-default";
  }
}

function ToneBadge({ tone = "default", children }) {
  const toneClass = toneClasses(tone);
  return (
    <span className={`amp-fin-badge ${toneClass}`}>
      <span className="amp-fin-badge-dot" />
      {children}
    </span>
  );
}

function InfoItem({ label, value, subtle = false, title }) {
  return (
    <div className="amp-fin-info-item">
      <p>{label}</p>
      <strong className={subtle ? "is-subtle" : ""} title={title}>
        {value}
      </strong>
    </div>
  );
}

function SelectionBanner({ count, total, onExport, onClear }) {
  return (
    <section className="amp-fin-selection">
      <div>
        <p className="amp-terminal-kicker">Seleção ativa</p>
        <h3>{count} título(s) no lote</h3>
        <p>{total} preparados para exportação e conferência financeira.</p>
      </div>
      <div className="amp-fin-selection-actions">
        <button type="button" onClick={onExport} className="amp-rel-primary-btn">
          Exportar seleção
        </button>
        <button type="button" onClick={onClear} className="amp-rel-secondary-btn">
          Limpar seleção
        </button>
      </div>
    </section>
  );
}

function LoadingState() {
  return (
    <div className="amp-rel-loading">
      <div className="amp-rel-loader" />
    </div>
  );
}

function EmptyState({ onCreate }) {
  return (
    <div className="amp-rel-empty">
      <div className="amp-rel-empty-icon">$</div>
      <h3>Nenhum lançamento encontrado</h3>
      <p>Ajuste os filtros ou cadastre um novo título para reacender a leitura do caixa.</p>
      <div className="amp-rel-empty-actions">
        <button type="button" onClick={onCreate} className="amp-rel-primary-btn">
          Novo lançamento
        </button>
      </div>
    </div>
  );
}

function ModalContainer({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(19,18,16,0.52)] p-3 backdrop-blur-md sm:items-center sm:p-5">
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

function groupKey(item) {
  if (!(item.parcelas > 1)) return `single-${item.id}`;
  return [
    "parcelado",
    item.tipo,
    item.cliente_id || "sem-cliente",
    item.parcelas,
    item.nfe || "sem-nfe",
    baseDescricaoParcelas(item.descricao),
  ].join("|");
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
      <div className="cm-surface cm-modal-shell rounded-[34px] shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="cm-modal-grid xl:grid-cols-[minmax(0,1.35fr)_17rem]">
          <div className="cm-modal-main">
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

          <aside className="cm-modal-side rounded-b-[34px] border-t border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.96)] text-white xl:rounded-r-[34px] xl:rounded-bl-none xl:border-l xl:border-t-0">
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
  const valorInicial =
    editando && item?.parcelas > 1
      ? [item, ...(item.irmas || [])].reduce((sum, parcela) => sum + Number(parcela.valor || 0), 0)
      : item?.valor ?? "";
  const [form, setForm] = useState(
    editando
      ? {
          tipo: item.tipo,
          cliente_id: String(item.cliente_id || ""),
          descricao: item.parcelas > 1 ? baseDescricaoParcelas(item.descricao) : item.descricao,
          nfe: item.nfe || "",
          prazo_dias: item.prazo_dias || "",
          vencimento: item.vencimento,
          valor: valorInicial,
          forma_pagamento: item.forma_pagamento || "",
          observacao: item.observacao || "",
        }
      : { ...FORM_VAZIO }
  );
  const [parcelas, setParcelas] = useState(editando ? Number(item.parcelas || 1) : 1);
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
        parcelas,
      };

      if (editando) {
        await api.put(`/financeiro/${item.id}`, payload);
      } else {
        await api.post("/financeiro", payload);
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
      <div className="cm-surface cm-modal-shell rounded-[34px] shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="cm-modal-grid xl:grid-cols-[minmax(0,1.22fr)_17rem]">
          <div className="cm-modal-main">
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

          <aside className="cm-modal-side rounded-b-[34px] border-t border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.96)] text-white xl:rounded-r-[34px] xl:rounded-bl-none xl:border-l xl:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Prontidão do título</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToneBadge tone={form.tipo === "receber" ? "positive" : "danger"}>
                {TIPO_META[form.tipo].label}
              </ToneBadge>
              {parcelas > 1 && <ToneBadge tone="accent">{parcelas} parcelas</ToneBadge>}
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

  const dadosEnriquecidos = useMemo(() => {
    const grupos = new Map();
    dados.forEach((item) => {
      const key = groupKey(item);
      const bucket = grupos.get(key) || [];
      bucket.push(item);
      grupos.set(key, bucket);
    });

    return [...grupos.values()].map((grupo) => {
      const ordenado = [...grupo].sort((a, b) => {
        if ((a.parcela_num || 1) !== (b.parcela_num || 1)) {
          return (a.parcela_num || 1) - (b.parcela_num || 1);
        }
        return new Date(a.vencimento).getTime() - new Date(b.vencimento).getTime();
      });

      const item =
        ordenado.find((registro) => registro.status !== "pago") ||
        ordenado[0];
      const irmas = ordenado.filter((registro) => registro.id !== item.id);
      const dias = diasParaVencimento(item.vencimento);
      const marcadorOrcamento = extrairMarcadorOrcamento(item.descricao);
      const semVinculo = !item.cliente_id;
      const parcelado = ordenado.length > 1;

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
  }, [dados]);

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

  const saldoProjetado = totaisLista.totalReceber - totaisLista.totalPagar;

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

  const recebimentosSensiveis = useMemo(
    () =>
      dadosEnriquecidos
        .filter(
          (item) =>
            item.tipo === "receber" &&
            item.status !== "pago" &&
            (item.status === "atrasado" || (item.dias != null && item.dias <= 5))
        )
        .sort((a, b) => {
          if ((a.dias ?? 9999) !== (b.dias ?? 9999)) return (a.dias ?? 9999) - (b.dias ?? 9999);
          return Number(b.valor_total) - Number(a.valor_total);
        })
        .slice(0, 4),
    [dadosEnriquecidos]
  );

  const titulosSelecionados = useMemo(
    () => dadosVisiveis.filter((item) => selecionados.includes(item.id)),
    [dadosVisiveis, selecionados]
  );

  const totalSelecionado = useMemo(
    () => titulosSelecionados.reduce((sum, item) => sum + Number(item.valor_total || 0), 0),
    [titulosSelecionados]
  );

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
    <div className="amp-fin-page">
      {notif && <div className={`amp-rel-notice ${notif.tipo === "erro" ? "is-error" : "is-success"}`}>{notif.msg}</div>}

      <div className="screen-grid screen-grid-fin">
        <section className="surface-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Financeiro</p>
              <h3>Títulos e parcelas com espinha dorsal em tabela</h3>
            </div>
            <div className="pill-row">
              <button type="button" onClick={() => setFiltroRapido("receber")} className={`pill ${filtroRapido === "receber" ? "is-solid" : ""}`}>
                A receber
              </button>
              <button type="button" onClick={() => setFiltroRapido("pagar")} className={`pill ${filtroRapido === "pagar" ? "is-solid" : ""}`}>
                A pagar
              </button>
              <button type="button" onClick={() => setFiltroRapido("parcelado")} className={`pill ${filtroRapido === "parcelado" ? "is-solid" : ""}`}>
                Parcelados
              </button>
            </div>
          </div>

          <div className="terminal-ribbon">
            <article className="terminal-metric">
              <span>D+7 recebimento</span>
              <strong>{fmt(totaisLista.totalReceber)}</strong>
            </article>
            <article className="terminal-metric">
              <span>D+7 pagamento</span>
              <strong>{fmt(totaisLista.totalPagar)}</strong>
            </article>
            <article className="terminal-metric">
              <span>Inadimplência</span>
              <strong>{`${(((resumo?.atrasados ?? 0) / Math.max(dadosVisiveis.length, 1)) * 100).toFixed(1)}%`}</strong>
            </article>
          </div>

          <div className="overview-strip finance-overview">
            <article className="overview-chip">
              <p className="eyebrow">Recebido no mês</p>
              <strong>{fmt(resumo?.recebido_mes)}</strong>
              <span className="muted">Fluxo saudável</span>
            </article>
            <article className="overview-chip">
              <p className="eyebrow">A receber</p>
              <strong>{fmt(totaisLista.totalReceber)}</strong>
              <span className="muted">Janela de 7 dias</span>
            </article>
            <article className="overview-chip">
              <p className="eyebrow">Atrasado</p>
              <strong className="is-warm-text">{fmt(resumo?.valor_atrasado ?? 0)}</strong>
              <span className="muted">Precisa ação</span>
            </article>
          </div>

          <div className="toolbar-row">
            <div className="search-box">
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar cliente, descrição ou NF-e"
                className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
            </div>
            <div className="pill-row">
              {QUICK_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltroRapido(item.id)}
                  className={`pill ${filtroRapido === item.id ? "is-solid" : ""}`}
                >
                  {item.label}
                  <span>{contagemFiltros[item.id]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="toolbar-row">
            <div className="pill-row">
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className="pill" aria-label="Filtrar por tipo">
                <option value="">Todos os tipos</option>
                <option value="receber">A receber</option>
                <option value="pagar">A pagar</option>
              </select>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="pill" aria-label="Filtrar por status">
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="atrasado">Atrasado</option>
                <option value="pago">Pago</option>
              </select>
            </div>
            <div className="pill-row">
              <button type="button" onClick={() => setModalBoleto(true)} className="pill">
                Importar boleto
              </button>
              <button type="button" onClick={abrirNovo} className="pill is-solid">
                Novo lançamento
              </button>
            </div>
          </div>

          {selecionados.length > 0 && (
            <SelectionBanner
              count={selecionados.length}
              total={fmt(totalSelecionado)}
              onExport={exportarSelecionados}
              onClear={() => setSelecionados([])}
            />
          )}

          <div className="table-shell">
            <div className="table-head table-grid-fin">
              <span>Título</span>
              <span>Vencimento</span>
              <span>Valor</span>
              <span>Contexto</span>
              <span>Status</span>
            </div>

            {carregando ? (
              <LoadingState />
            ) : !dadosVisiveis.length ? (
              <EmptyState onCreate={abrirNovo} />
            ) : (
              <div className="table-body">
                {dadosVisiveis.map((item) => {
                  const aberto = expandido === item.id;
                  const tipoTone = TIPO_META[item.tipo]?.tone || "default";
                  return (
                    <div key={item.id}>
                      <div className={`table-row table-grid-fin ${item.id === itemFocoId ? "is-selected" : ""}`}>
                        <div>
                          <label className="mr-3 inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={selecionados.includes(item.id)}
                              onChange={() => toggleSel(item.id)}
                              aria-label={`Selecionar ${item.descricao}`}
                            />
                          </label>
                          <button type="button" onClick={() => setItemFocoId(item.id)} className="inline text-left">
                            <strong className="text-[var(--text)]">{item.descricao}</strong>
                            <p className="muted mt-2 text-sm">{item.cliente_nome || "Sem cliente vinculado"}</p>
                          </button>
                        </div>
                        <span>{fmtD(item.vencimento)}</span>
                        <span>{fmt(item.valor_total)}</span>
                        <span>
                          {item.marcadorOrcamento ? `ORC ${item.marcadorOrcamento}` : "Manual"}
                          <br />
                          <small className="muted">{item.forma_pagamento || "Forma aberta"}</small>
                        </span>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <ToneBadge tone={item.statusTone}>{item.statusLabel}</ToneBadge>
                            <ToneBadge tone={tipoTone}>{TIPO_META[item.tipo]?.short || item.tipo}</ToneBadge>
                            {item.parcelado && <span className="status-tag is-cool">{`${item.parcelas}x`}</span>}
                          </div>
                          <div className="pill-row">
                            {item.status !== "pago" && (
                              <button type="button" onClick={() => setItemPagar(item)} className="pill">
                                Marcar pago
                              </button>
                            )}
                            {item.parcelado && (
                              <button type="button" onClick={() => setExpandido(aberto ? null : item.id)} className="pill">
                                {aberto ? "Ocultar" : "Parcelas"}
                              </button>
                            )}
                            <button type="button" onClick={() => abrirEdicao(item)} className="pill">
                              Editar
                            </button>
                          </div>
                        </div>
                      </div>

                      {item.parcelado && aberto && (
                        <div className="amp-fin-expansion">
                          <p className="amp-terminal-kicker">Parcelas vinculadas</p>
                          <div className="amp-fin-expansion-table">
                            <table className="amp-fin-subtable">
                              <thead>
                                <tr>
                                  <th>Parcela</th>
                                  <th>Status</th>
                                  <th>Vencimento</th>
                                  <th>Valor</th>
                                  <th>Total</th>
                                  <th className="is-right">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[item, ...item.irmas]
                                  .sort((a, b) => a.parcela_num - b.parcela_num)
                                  .map((parcela) => (
                                    <tr key={parcela.id}>
                                      <td>{parcela.parcela_num}/{parcela.parcelas}</td>
                                      <td><ToneBadge tone={STATUS_META[parcela.status]?.tone}>{STATUS_META[parcela.status]?.label}</ToneBadge></td>
                                      <td>{fmtD(parcela.vencimento)}</td>
                                      <td>{fmt(parcela.valor)}</td>
                                      <td>{fmt(parcela.valor_total)}</td>
                                      <td className="is-right">
                                        <div className="amp-fin-subtable-actions">
                                          {parcela.status !== "pago" && (
                                            <button type="button" onClick={() => setItemPagar(parcela)} className="amp-fin-action-btn is-positive">
                                              Pagar
                                            </button>
                                          )}
                                          <button type="button" onClick={() => setItemDel(parcela)} className="amp-fin-action-btn is-danger">
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
        </section>

        <aside className="inspector-panel finance-side">
          <p className="eyebrow">Receita x pagamento</p>
          <h3>Leitura limpa do caixa</h3>

          <div className="balance-stack">
            <div className="balance-card">
              <span>Receita recorrente</span>
              <strong>{fmt(resumo?.receita_recorrente ?? 0)}</strong>
            </div>
            <div className="balance-card">
              <span>Parcelas abertas</span>
              <strong>{String(contagemFiltros.parcelado)}</strong>
            </div>
            <div className="balance-card">
              <span>Sem vínculo</span>
              <strong>{String(contagemFiltros.sem_vinculo)}</strong>
            </div>
            <div className="balance-card">
              <span>Saldo projetado</span>
              <strong>{fmt(saldoProjetado)}</strong>
            </div>
          </div>

          <p className="muted inspector-summary">
            O lado direito não compete com a tabela. Ele orienta leitura, risco e prioridade financeira.
          </p>

          <div className="action-list">
            {recebimentosSensiveis.slice(0, 2).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setItemFocoId(item.id)}
                className="action-row w-full text-left"
              >
                <div>
                  <strong>{item.cliente_nome || "Sem cliente"}</strong>
                  <p>{item.descricao}</p>
                </div>
                <span className={`status-tag ${item.status === "atrasado" ? "is-warm" : ""}`}>
                  {item.status === "atrasado" ? `${Math.abs(item.dias ?? 0)}d atraso` : `${item.dias ?? 0}d`}
                </span>
              </button>
            ))}

            {itemFoco && (
              <div className="action-row">
                <div>
                  <strong>{itemFoco.nextAction}</strong>
                  <p>
                    {itemFoco.cliente_nome || "Sem vínculo"} · {fmt(itemFoco.valor_total)}
                  </p>
                </div>
                <span
                  className={`status-tag ${
                    itemFoco.statusTone === "danger"
                      ? "is-warm"
                      : itemFoco.statusTone === "positive"
                      ? "is-cool"
                      : ""
                  }`}
                >
                  {itemFoco.statusLabel}
                </span>
              </div>
            )}

            {filaPrioritaria.slice(0, 2).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setItemFocoId(item.id)}
                className="action-row w-full text-left"
              >
                <div>
                  <strong>{item.descricao}</strong>
                  <p>{item.nextAction}</p>
                </div>
                <span className="status-tag is-cool">{TIPO_META[item.tipo]?.short || item.tipo}</span>
              </button>
            ))}
          </div>
        </aside>
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
