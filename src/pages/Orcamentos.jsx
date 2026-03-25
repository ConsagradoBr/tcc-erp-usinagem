import { useCallback, useEffect, useMemo, useState } from "react";

import api from "../api";
import { getStoredUser, hasPermission } from "../auth";
import {
  IconDollar,
  IconQuotes,
  IconServiceOrder,
} from "../assets/assets-map";

const STATUS = {
  rascunho: { label: "Rascunho", tone: "default" },
  enviado: { label: "Enviado", tone: "accent" },
  aprovado: { label: "Aprovado", tone: "positive" },
  reprovado: { label: "Reprovado", tone: "danger" },
  cancelado: { label: "Cancelado", tone: "warning" },
};

const QUICK_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "decisao", label: "Em decisão" },
  { id: "aprovado", label: "Aprovados" },
  { id: "vencendo", label: "Vencendo" },
  { id: "integracao", label: "Integração pendente" },
];

const FORM_VAZIO = {
  cliente_id: "",
  titulo: "",
  descricao: "",
  valor: "",
  validade: "",
  status: "rascunho",
  observacao: "",
};

const INPUT_BASE =
  "mt-2 w-full rounded-[18px] border border-[color:var(--cm-line)] bg-white/75 px-4 py-3 text-sm text-[var(--cm-text)] placeholder:text-[var(--cm-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition focus:border-[color:rgba(180,99,56,0.38)] focus:ring-2 focus:ring-[rgba(180,99,56,0.16)]";

const LABEL_BASE = "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cm-muted)]";

const fmt = (value) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });

const fmtD = (iso) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

function extrairMarcadorOrcamento(texto = "") {
  const match = String(texto).match(/\[ORC:([^\]]+)\]/);
  return match?.[1] || "";
}

function diffDias(iso) {
  if (!iso) return null;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(alvo.getTime())) return null;
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
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

function EmptyState({ onNovo }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[color:var(--cm-line)] bg-white/46">
        <img src={IconQuotes} alt="" className="w-7 opacity-70" />
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">
        Nenhum orçamento encontrado
      </h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--cm-muted)]">
        Crie uma proposta nova ou ajuste a busca para voltar a enxergar o fluxo comercial e as integrações automáticas.
      </p>
      <button
        type="button"
        onClick={onNovo}
        className="mt-6 rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
      >
        Novo orçamento
      </button>
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
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--cm-muted)]">{item.numero}</p>
          <p className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{item.cliente_nome}</p>
          <p className="mt-1 text-sm text-[var(--cm-muted)]">{item.nextAction}</p>
        </div>
        <ToneBadge tone={item.statusTone}>{item.statusLabel}</ToneBadge>
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

function ModalOrcamento({ item, clientes, onClose, onSalvo }) {
  const editando = Boolean(item?.id);
  const idBase = editando ? `orcamento-${item.id}` : "orcamento-novo";
  const [form, setForm] = useState(
    editando
      ? {
          cliente_id: String(item.cliente_id || ""),
          titulo: item.titulo || "",
          descricao: item.descricao || "",
          valor: item.valor || "",
          validade: item.validade || "",
          status: item.status || "rascunho",
          observacao: item.observacao || "",
        }
      : FORM_VAZIO
  );
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  const clienteSelecionado = clientes.find((cliente) => cliente.id === Number(form.cliente_id));
  const statusSelecionado = STATUS[form.status] || STATUS.rascunho;

  const set = (campo, valor) => setForm((prev) => ({ ...prev, [campo]: valor }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const payload = {
        ...form,
        cliente_id: Number(form.cliente_id),
        valor: Number(form.valor),
      };
      const res = editando
        ? await api.put(`/orcamentos/${item.id}`, payload)
        : await api.post("/orcamentos", payload);
      onSalvo({ acao: editando ? "atualizado" : "criado", data: res.data });
      onClose();
    } catch (err) {
      setErro(err.response?.data?.erro || "Erro ao salvar orçamento.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-5xl rounded-[34px] shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.6fr)_20rem]">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cm-label">{editando ? "Edição de proposta" : "Novo orçamento"}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">
                  {editando ? `Ajustar ${item.numero}` : "Criar proposta conectada ao fluxo"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cm-muted)]">
                  O orçamento agora já nasce pensado como ponte: cliente, aprovação, ordem de serviço e lançamento
                  financeiro no mesmo trilho.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[color:var(--cm-line)] bg-white/72 p-3 text-[var(--cm-muted)] transition hover:text-[var(--cm-text)]"
                aria-label="Fechar formulário de orçamento"
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

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idBase}-cliente`} className={LABEL_BASE}>Cliente *</label>
                  <select
                    id={`${idBase}-cliente`}
                    value={form.cliente_id}
                    onChange={(e) => set("cliente_id", e.target.value)}
                    className={INPUT_BASE}
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`${idBase}-status`} className={LABEL_BASE}>Status</label>
                  <select
                    id={`${idBase}-status`}
                    value={form.status}
                    onChange={(e) => set("status", e.target.value)}
                    className={INPUT_BASE}
                  >
                    {Object.entries(STATUS).map(([key, status]) => (
                      <option key={key} value={key}>{status.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor={`${idBase}-titulo`} className={LABEL_BASE}>Título *</label>
                <input
                  id={`${idBase}-titulo`}
                  value={form.titulo}
                  onChange={(e) => set("titulo", e.target.value)}
                  className={INPUT_BASE}
                  required
                  placeholder="Ex: Usinagem de lote piloto"
                />
              </div>

              <div>
                <label htmlFor={`${idBase}-descricao`} className={LABEL_BASE}>Escopo técnico</label>
                <textarea
                  id={`${idBase}-descricao`}
                  value={form.descricao}
                  onChange={(e) => set("descricao", e.target.value)}
                  rows={4}
                  className={`${INPUT_BASE} resize-none`}
                  placeholder="Escopo, material, prazo, setup, acabamento..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
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
                <div>
                  <label htmlFor={`${idBase}-validade`} className={LABEL_BASE}>Validade</label>
                  <input
                    id={`${idBase}-validade`}
                    type="date"
                    value={form.validade}
                    onChange={(e) => set("validade", e.target.value)}
                    className={INPUT_BASE}
                  />
                </div>
                <div>
                  <label htmlFor={`${idBase}-observacao`} className={LABEL_BASE}>Observação comercial</label>
                  <input
                    id={`${idBase}-observacao`}
                    value={form.observacao}
                    onChange={(e) => set("observacao", e.target.value)}
                    className={INPUT_BASE}
                    placeholder="Condição comercial"
                  />
                </div>
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
                  {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar orçamento"}
                </button>
              </div>
            </form>
          </div>

          <aside className="rounded-b-[34px] border-t border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.96)] p-6 text-white lg:rounded-r-[34px] lg:rounded-bl-none lg:border-l lg:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Leitura do fluxo</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToneBadge tone={statusSelecionado.tone}>{statusSelecionado.label}</ToneBadge>
              {form.status === "aprovado" && <ToneBadge tone="positive">OS + financeiro automáticos</ToneBadge>}
            </div>

            <div className="mt-5 space-y-3 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <InfoItem label="Cliente" value={clienteSelecionado?.nome || "Selecione um cliente"} subtle={!clienteSelecionado} />
              <InfoItem label="Título" value={form.titulo || "Defina o escopo"} subtle={!form.titulo} />
              <InfoItem label="Valor" value={form.valor ? fmt(form.valor) : "Defina o valor"} subtle={!form.valor} />
              <InfoItem label="Validade" value={form.validade ? fmtD(form.validade) : "Sem data definida"} subtle={!form.validade} />
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">O que acontece ao aprovar</p>
              <div className="mt-3 space-y-3 text-sm text-white/72">
                <p>1. O orçamento muda para aprovado e consolida a oportunidade.</p>
                <p>2. A OS correspondente é criada ou sincronizada automaticamente.</p>
                <p>3. O contas a receber nasce com o valor e validade da proposta.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ModalContainer>
  );
}

function ModalExcluir({ item, onClose, onConfirmar }) {
  const [loading, setLoading] = useState(false);

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-lg rounded-[32px] p-6 shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(187,103,80,0.12)] text-[var(--cm-danger)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5h12m-1.5 0v10.125A2.625 2.625 0 0113.875 20.25h-3.75A2.625 2.625 0 017.5 17.625V7.5m3-3h3a1.5 1.5 0 011.5 1.5v1.5h-6V6a1.5 1.5 0 011.5-1.5Z" />
            </svg>
          </div>
          <div>
            <p className="cm-label">Ação destrutiva</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Excluir esse orçamento?</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
              Você está removendo <strong className="text-[var(--cm-text)]">{item.numero}</strong>. Isso apaga a proposta da
              carteira comercial.
            </p>
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
            disabled={loading}
            onClick={async () => {
              setLoading(true);
              await onConfirmar();
              setLoading(false);
            }}
            className="rounded-full bg-[var(--cm-danger)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Excluindo..." : "Excluir orçamento"}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}

function transicoesPrincipais(statusAtual) {
  switch (statusAtual) {
    case "rascunho":
      return ["enviado", "aprovado"];
    case "enviado":
      return ["aprovado", "reprovado"];
    case "aprovado":
      return ["cancelado"];
    case "reprovado":
      return ["enviado"];
    case "cancelado":
      return ["rascunho"];
    default:
      return [];
  }
}

export default function Orcamentos() {
  const user = getStoredUser();
  const canOS = hasPermission(user, "ordens_servico");
  const canFinanceiro = hasPermission(user, "financeiro");

  const [dados, setDados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [ordens, setOrdens] = useState([]);
  const [lancamentos, setLancamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [carregandoContexto, setCarregandoContexto] = useState(false);
  const [contextoErro, setContextoErro] = useState(false);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [itemFocoId, setItemFocoId] = useState(null);
  const [modalForm, setModalForm] = useState(false);
  const [itemEdit, setItemEdit] = useState(null);
  const [itemDel, setItemDel] = useState(null);
  const [toast, setToast] = useState(null);

  const notificar = (msg, tipo = "sucesso") => {
    setToast({ msg, tipo });
    window.clearTimeout(window.__orcToastTimer);
    window.__orcToastTimer = window.setTimeout(() => setToast(null), 3200);
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setCarregandoContexto(true);
    setErro("");
    setContextoErro(false);
    try {
      const requests = [
        api.get("/orcamentos", { params: { q: filtro || undefined, status: filtroStatus || undefined } }),
        api.get("/clientes"),
        api.get("/orcamentos/resumo"),
      ];
      if (canOS) requests.push(api.get("/ordens-servico"));
      if (canFinanceiro) requests.push(api.get("/financeiro"));

      const results = await Promise.allSettled(requests);
      const [orcamentosRes, clientesRes, resumoRes, ordensRes, financeiroRes] = results;

      if (orcamentosRes.status !== "fulfilled" || clientesRes.status !== "fulfilled" || resumoRes.status !== "fulfilled") {
        throw new Error("Erro ao carregar orçamentos.");
      }

      setDados(orcamentosRes.value.data);
      setClientes(clientesRes.value.data);
      setResumo(resumoRes.value.data);

      if (canOS) {
        if (ordensRes?.status === "fulfilled") setOrdens(ordensRes.value.data);
        else {
          setOrdens([]);
          setContextoErro(true);
        }
      } else {
        setOrdens([]);
      }

      if (canFinanceiro) {
        const indexFinanceiro = canOS ? financeiroRes : ordensRes;
        if (indexFinanceiro?.status === "fulfilled") setLancamentos(indexFinanceiro.value.data);
        else {
          setLancamentos([]);
          setContextoErro(true);
        }
      } else {
        setLancamentos([]);
      }
    } catch (err) {
      setErro(err.message || "Erro ao carregar orçamentos.");
    } finally {
      setCarregando(false);
      setCarregandoContexto(false);
    }
  }, [canFinanceiro, canOS, filtro, filtroStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => carregar(), 240);
    return () => window.clearTimeout(timer);
  }, [carregar]);

  const osPorOrcamento = useMemo(() => {
    const mapa = new Map();
    ordens.forEach((ordem) => {
      const numero = extrairMarcadorOrcamento(ordem.descricao);
      if (!numero) return;
      mapa.set(numero, ordem);
    });
    return mapa;
  }, [ordens]);

  const financeiroPorOrcamento = useMemo(() => {
    const mapa = new Map();
    lancamentos.forEach((lancamento) => {
      const numero = extrairMarcadorOrcamento(lancamento.descricao);
      if (!numero) return;
      mapa.set(numero, lancamento);
    });
    return mapa;
  }, [lancamentos]);

  const orcamentosEnriquecidos = useMemo(() => {
    return dados.map((item) => {
      const diasValidade = diffDias(item.validade);
      const osRelacionado = osPorOrcamento.get(item.numero);
      const financeiroRelacionado = financeiroPorOrcamento.get(item.numero);
      const emDecisao = item.status === "rascunho" || item.status === "enviado";
      const vencendo = emDecisao && diasValidade != null && diasValidade >= 0 && diasValidade <= 7;
      const vencido = emDecisao && diasValidade != null && diasValidade < 0;
      const integracaoPendente =
        item.status === "aprovado" &&
        ((canOS && !osRelacionado) || (canFinanceiro && !financeiroRelacionado));
      const integrado =
        item.status === "aprovado" &&
        (!canOS || Boolean(osRelacionado)) &&
        (!canFinanceiro || Boolean(financeiroRelacionado));

      let statusTone = STATUS[item.status]?.tone || "default";
      let statusLabel = STATUS[item.status]?.label || item.status;
      let nextAction = "Orçamento sem alerta crítico.";
      let nextNote = "Mantenha o acompanhamento natural da carteira.";
      let prioridade = 0;

      if (integracaoPendente) {
        statusTone = "warning";
        statusLabel = "Integração pendente";
        nextAction = "Conferir conversão automática da aprovação";
        nextNote = "Esse orçamento aprovado ainda não apareceu completo nos módulos seguintes.";
        prioridade = 6;
      } else if (vencido) {
        statusTone = "danger";
        statusLabel = "Proposta vencida";
        nextAction = "Revalidar proposta com o cliente";
        nextNote = "A validade já passou e a oportunidade pode ter esfriado.";
        prioridade = 5;
      } else if (vencendo) {
        statusTone = "accent";
        statusLabel = "Validade crítica";
        nextAction = "Fazer follow-up antes do vencimento";
        nextNote = "A proposta está perto de vencer e ainda depende de decisão.";
        prioridade = 4;
      } else if (item.status === "enviado") {
        statusTone = "accent";
        statusLabel = "Aguardando retorno";
        nextAction = "Cobrar resposta comercial";
        nextNote = "A proposta já saiu e pede retorno para avançar ou encerrar.";
        prioridade = 3;
      } else if (item.status === "rascunho") {
        statusTone = "default";
        statusLabel = "Em preparação";
        nextAction = "Concluir e enviar proposta";
        nextNote = "O orçamento existe, mas ainda não foi colocado em circulação comercial.";
        prioridade = 2;
      } else if (integrado) {
        statusTone = "positive";
        statusLabel = "Integrado";
        nextAction = "Acompanhar OS e recebimento";
        nextNote = "A aprovação já refletiu nos módulos seguintes.";
        prioridade = 2;
      }

      return {
        ...item,
        diasValidade,
        emDecisao,
        vencendo,
        vencido,
        osRelacionado,
        financeiroRelacionado,
        integracaoPendente,
        integrado,
        statusTone,
        statusLabel,
        nextAction,
        nextNote,
        prioridade,
      };
    });
  }, [canFinanceiro, canOS, dados, financeiroPorOrcamento, osPorOrcamento]);

  const contagemFiltros = useMemo(() => {
    return {
      todos: orcamentosEnriquecidos.length,
      decisao: orcamentosEnriquecidos.filter((item) => item.emDecisao).length,
      aprovado: orcamentosEnriquecidos.filter((item) => item.status === "aprovado").length,
      vencendo: orcamentosEnriquecidos.filter((item) => item.vencendo || item.vencido).length,
      integracao: orcamentosEnriquecidos.filter((item) => item.integracaoPendente).length,
    };
  }, [orcamentosEnriquecidos]);

  const dadosVisiveis = useMemo(() => {
    return orcamentosEnriquecidos.filter((item) => {
      if (filtroRapido === "decisao") return item.emDecisao;
      if (filtroRapido === "aprovado") return item.status === "aprovado";
      if (filtroRapido === "vencendo") return item.vencendo || item.vencido;
      if (filtroRapido === "integracao") return item.integracaoPendente;
      return true;
    });
  }, [filtroRapido, orcamentosEnriquecidos]);

  const filaPrioritaria = useMemo(() => {
    return [...orcamentosEnriquecidos]
      .sort((a, b) => {
        if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade;
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      })
      .filter((item) => item.prioridade > 0)
      .slice(0, 4);
  }, [orcamentosEnriquecidos]);

  const stats = useMemo(() => {
    const pendentes = orcamentosEnriquecidos.filter((item) => item.emDecisao).length;
    const integrados = orcamentosEnriquecidos.filter((item) => item.integrado).length;
    const integracaoPendente = orcamentosEnriquecidos.filter((item) => item.integracaoPendente).length;
    return { pendentes, integrados, integracaoPendente };
  }, [orcamentosEnriquecidos]);

  useEffect(() => {
    const idsVisiveis = new Set(dadosVisiveis.map((item) => item.id));
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

  const alterarStatus = async (item, status) => {
    try {
      const { data } = await api.patch(`/orcamentos/${item.id}/status`, { status });
      const mensagens = [`Status de ${item.numero} atualizado para ${STATUS[status]?.label || status}.`];
      const osNumero = data?.ordem_servico?.numero || data?.ordem_servico?.os;
      if (data?.ordem_servico_criada && osNumero) mensagens.push(`${osNumero} criada automaticamente.`);
      const lancamentoId = data?.lancamento_financeiro?.id;
      if (data?.lancamento_financeiro_criado && lancamentoId) {
        mensagens.push(`Lançamento financeiro #${lancamentoId} criado.`);
      }
      setItemFocoId(item.id);
      notificar(mensagens.join(" "));
      carregar();
    } catch (err) {
      notificar(err.response?.data?.erro || "Erro ao atualizar status.", "erro");
    }
  };

  const excluir = async () => {
    try {
      await api.delete(`/orcamentos/${itemDel.id}`);
      setItemDel(null);
      notificar("Orçamento excluído.");
      carregar();
    } catch (err) {
      notificar(err.response?.data?.erro || "Erro ao excluir orçamento.", "erro");
    }
  };

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8">
      {toast && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-[20px] border px-5 py-3 text-sm font-semibold shadow-[0_18px_48px_rgba(22,18,14,0.2)] ${
            toast.tipo === "erro"
              ? "border-[rgba(187,103,80,0.2)] bg-[rgba(255,244,240,0.94)] text-[var(--cm-danger)]"
              : "border-[rgba(63,141,114,0.2)] bg-[rgba(246,255,251,0.95)] text-[var(--cm-positive)]"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="cm-surface-strong rounded-[32px] p-6 sm:p-7 xl:col-span-8">
          <p className="cm-label text-white/58">Ceramic Monolith · Orçamentos</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Comercial com trilho automático até produção e recebimento
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72 sm:text-base">
            Aqui a proposta deixa de ser documento isolado. A tela mostra decisão, validade, integração automática e o
            que falta para virar OS e caixa.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/72">
              Cliente → Orçamento → OS → Financeiro
            </span>
            {contextoErro && (
              <span className="rounded-full border border-white/10 bg-[rgba(187,103,80,0.16)] px-3 py-2 text-xs text-white/80">
                Parte das integrações não carregou
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={IconQuotes} label="Total" value={String(resumo?.total ?? 0)} note="Propostas na carteira" inverse />
            <StatTile icon={IconDollar} label="Valor em propostas" value={fmt(resumo?.valor_total)} note="Volume comercial aberto" inverse />
            <StatTile icon={IconDollar} label="Valor aprovado" value={fmt(resumo?.valor_aprovado)} note="Valor convertido" inverse />
            <StatTile icon={IconServiceOrder} label="Integração pendente" value={String(stats.integracaoPendente)} note="Aprovados pedindo conferência" inverse />
          </div>
        </section>

        <section className="cm-surface rounded-[32px] p-6 xl:col-span-4">
          <p className="cm-label">Fila de ação</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Propostas que pedem movimento</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
            Priorização automática baseada em validade, aprovação e presença nos módulos seguintes.
          </p>

          <div className="mt-5 grid gap-3">
            {carregandoContexto && !filaPrioritaria.length ? (
              <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/38 px-4 py-10 text-center text-sm text-[var(--cm-muted)]">
                Consolidando carteira comercial...
              </div>
            ) : filaPrioritaria.length > 0 ? (
              filaPrioritaria.map((item) => <QueueItem key={item.id} item={item} onSelect={setItemFocoId} />)
            ) : (
              <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/38 px-4 py-6 text-sm leading-6 text-[var(--cm-muted)]">
                Sem alertas críticos neste recorte. O fluxo comercial parece estável no momento.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniMetric label="Em decisão" value={String(stats.pendentes)} />
            <MiniMetric label="Integrados" value={String(stats.integrados)} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="cm-surface rounded-[32px] p-5 sm:p-6 xl:col-span-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="cm-label">Workspace comercial</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Carteira de propostas</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
                  Filtre por busca, status ou momento do fluxo. Cada linha já mostra o próximo passo recomendado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItemEdit(null);
                  setModalForm(true);
                }}
                className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
              >
                Novo orçamento
              </button>
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
                  placeholder="Buscar por número, cliente ou título..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cm-text)] outline-none placeholder:text-[var(--cm-muted)]"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-4 py-3 text-sm text-[var(--cm-text)] outline-none transition hover:bg-white"
                  aria-label="Filtrar por status"
                >
                  <option value="">Todos os status</option>
                  {Object.entries(STATUS).map(([key, status]) => (
                    <option key={key} value={key}>{status.label}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={carregar}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Atualizar
                </button>
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

          {erro && (
            <div className="mt-5 rounded-[20px] border border-[rgba(187,103,80,0.18)] bg-[rgba(187,103,80,0.12)] px-4 py-3 text-sm text-[var(--cm-danger)]">
              {erro}
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-[28px] border border-[color:var(--cm-line)] bg-white/34">
            <div className="hidden lg:grid lg:grid-cols-[minmax(0,2.1fr)_1fr_1.2fr_auto] lg:gap-4 lg:px-4 lg:py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Orçamento</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Valor e prazo</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Integração</p>
              <p className="text-right text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Ações</p>
            </div>

            {carregando ? (
              <div className="flex items-center justify-center px-6 py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/8 border-t-[var(--cm-accent)]" />
              </div>
            ) : !dadosVisiveis.length ? (
              <EmptyState onNovo={() => { setItemEdit(null); setModalForm(true); }} />
            ) : (
              <div>
                {dadosVisiveis.map((item, index) => (
                  <article
                    key={item.id}
                    className={`grid gap-4 px-4 py-5 transition lg:grid-cols-[minmax(0,2.1fr)_1fr_1.2fr_auto] ${
                      index > 0 ? "border-t border-[color:var(--cm-line)]" : ""
                    } ${
                      item.id === itemFocoId ? "bg-[rgba(255,255,255,0.52)]" : "bg-transparent hover:bg-white/28"
                    }`}
                  >
                    <div className="min-w-0">
                      <button type="button" onClick={() => setItemFocoId(item.id)} className="w-full text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm uppercase tracking-[0.18em] text-[var(--cm-accent)]">{item.numero}</span>
                          <ToneBadge tone={item.statusTone}>{item.statusLabel}</ToneBadge>
                        </div>
                        <p className="mt-3 truncate text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{item.cliente_nome}</p>
                        <p className="mt-1 text-sm text-[var(--cm-text)]">{item.titulo}</p>
                        {item.descricao && <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">{item.descricao}</p>}
                        <p className="mt-3 text-sm text-[var(--cm-muted)]">{item.nextAction}</p>
                      </button>
                    </div>

                    <div className="space-y-2">
                      <InfoItem label="Valor" value={fmt(item.valor)} />
                      <InfoItem
                        label="Validade"
                        value={item.validade ? fmtD(item.validade) : "Sem validade"}
                        subtle={!item.validade}
                      />
                      <InfoItem
                        label="Cadência"
                        value={
                          item.diasValidade == null
                            ? "Sem prazo definido"
                            : item.diasValidade < 0
                            ? `${Math.abs(item.diasValidade)} dia(s) vencido(s)`
                            : `${item.diasValidade} dia(s) restantes`
                        }
                        subtle={item.diasValidade == null}
                      />
                    </div>

                    <div className="space-y-2">
                      <InfoItem
                        label="OS"
                        value={
                          canOS
                            ? item.osRelacionado
                              ? `${item.osRelacionado.os || item.osRelacionado.numero} · ${item.osRelacionado.status}`
                              : "Sem OS vinculada"
                            : "Sem permissão"
                        }
                        subtle={!canOS || !item.osRelacionado}
                      />
                      <InfoItem
                        label="Financeiro"
                        value={
                          canFinanceiro
                            ? item.financeiroRelacionado
                              ? `${fmt(item.financeiroRelacionado.valor_total || item.financeiroRelacionado.valor)} · ${item.financeiroRelacionado.status}`
                              : "Sem lançamento vinculado"
                            : "Sem permissão"
                        }
                        subtle={!canFinanceiro || !item.financeiroRelacionado}
                      />
                    </div>

                    <div className="flex flex-wrap items-start justify-end gap-2 lg:flex-col lg:items-end">
                      {transicoesPrincipais(item.status).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => alterarStatus(item, status)}
                          className="rounded-full border border-[color:var(--cm-line)] bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                        >
                          {STATUS[status].label}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setItemEdit(item);
                          setModalForm(true);
                        }}
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
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="cm-surface rounded-[32px] p-5 sm:p-6 xl:col-span-4">
          <p className="cm-label">Orçamento em foco</p>
          {itemFoco ? (
            <>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--cm-accent)]">{itemFoco.numero}</p>
                  <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">{itemFoco.cliente_nome}</h2>
                  <p className="mt-2 text-sm text-[var(--cm-muted)]">{itemFoco.titulo}</p>
                </div>
                <ToneBadge tone={itemFoco.statusTone}>{itemFoco.statusLabel}</ToneBadge>
              </div>

              <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 p-4">
                <p className="cm-label">Próxima melhor ação</p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{itemFoco.nextAction}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">{itemFoco.nextNote}</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <FocusMetric label="Valor" value={fmt(itemFoco.valor)} note={`Status atual: ${STATUS[itemFoco.status]?.label || itemFoco.status}`} />
                <FocusMetric label="Validade" value={itemFoco.validade ? fmtD(itemFoco.validade) : "Sem validade"} note={itemFoco.diasValidade == null ? "Sem prazo configurado." : itemFoco.diasValidade < 0 ? `${Math.abs(itemFoco.diasValidade)} dia(s) após o vencimento` : `${itemFoco.diasValidade} dia(s) restantes`} />
                <FocusMetric label="OS vinculada" value={canOS ? (itemFoco.osRelacionado?.os || itemFoco.osRelacionado?.numero || "Não") : "—"} note={canOS ? (itemFoco.osRelacionado ? `Status: ${itemFoco.osRelacionado.status}` : "Ainda não apareceu em produção.") : "Sem permissão operacional"} />
                <FocusMetric label="Financeiro" value={canFinanceiro ? (itemFoco.financeiroRelacionado ? fmt(itemFoco.financeiroRelacionado.valor_total || itemFoco.financeiroRelacionado.valor) : "Não") : "—"} note={canFinanceiro ? (itemFoco.financeiroRelacionado ? `Status: ${itemFoco.financeiroRelacionado.status}` : "Ainda não apareceu no financeiro.") : "Sem permissão financeira"} />
              </div>

              {itemFoco.descricao && (
                <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 p-4">
                  <p className="cm-label">Descrição</p>
                  <p className="mt-3 text-sm leading-6 text-[var(--cm-muted)]">{itemFoco.descricao}</p>
                </div>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                {transicoesPrincipais(itemFoco.status).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => alterarStatus(itemFoco, status)}
                    className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                  >
                    {STATUS[status].label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setItemEdit(itemFoco);
                    setModalForm(true);
                  }}
                  className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
                >
                  Editar orçamento
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/40 px-4 py-6 text-sm leading-6 text-[var(--cm-muted)]">
              Selecione um orçamento para abrir o inspector com validade, integração e próxima ação.
            </div>
          )}
        </section>
      </div>

      {modalForm && (
        <ModalOrcamento
          item={itemEdit}
          clientes={clientes}
          onClose={() => {
            setModalForm(false);
            setItemEdit(null);
          }}
          onSalvo={({ acao, data }) => {
            const mensagens = [`Orçamento ${acao}.`];
            const osNumero = data?.ordem_servico?.numero || data?.ordem_servico?.os;
            if (data?.ordem_servico_criada && osNumero) mensagens.push(`${osNumero} criada automaticamente.`);
            const lancamentoId = data?.lancamento_financeiro?.id;
            if (data?.lancamento_financeiro_criado && lancamentoId) {
              mensagens.push(`Lançamento financeiro #${lancamentoId} criado.`);
            }
            if (data?.id) setItemFocoId(data.id);
            notificar(mensagens.join(" "));
            carregar();
          }}
        />
      )}

      {itemDel && <ModalExcluir item={itemDel} onClose={() => setItemDel(null)} onConfirmar={excluir} />}
    </div>
  );
}
