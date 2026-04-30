import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../api";
import { getStoredUser, hasPermission } from "../auth";
import { IconQuotes } from "../assets/assets-map";

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

  const aprovadosCount = contagemFiltros.aprovado;
  const backlogComercial = contagemFiltros.todos;
  const conversao30d = backlogComercial
    ? Math.round((aprovadosCount / Math.max(backlogComercial, 1)) * 100)
    : 0;
  const ticketAlvo = backlogComercial
    ? (resumo?.valor_total ?? 0) / Math.max(backlogComercial, 1)
    : 0;
  const perdidosCount = orcamentosEnriquecidos.filter(
    (item) => item.status === "reprovado" || item.status === "cancelado"
  ).length;

  return (
    <div className="min-h-full bg-transparent p-3 sm:p-4 lg:p-5">
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

      <div className="screen-grid screen-grid-flow">
        <section className="surface-panel">
          <div className="section-head">
            <div>
              <p className="eyebrow">Comercial</p>
              <h3>Orçamentos com ponte para operação</h3>
            </div>
            <span className="pill is-solid">Aprovados {aprovadosCount}</span>
          </div>

          <div className="terminal-ribbon">
            <article className="terminal-metric">
              <span>Backlog comercial</span>
              <strong>{String(backlogComercial).padStart(2, "0")}</strong>
            </article>
            <article className="terminal-metric">
              <span>Conversão 30d</span>
              <strong>{conversao30d}%</strong>
            </article>
            <article className="terminal-metric">
              <span>Ticket alvo</span>
              <strong>{fmt(ticketAlvo)}</strong>
            </article>
          </div>

          <div className="flow-strip">
            <div className="stage-card">
              <p className="eyebrow">Em análise</p>
              <strong>{String(stats.pendentes).padStart(2, "0")}</strong>
              <p className="muted">Volume aguardando resposta técnica</p>
            </div>
            <div className="stage-card is-accented">
              <p className="eyebrow">Aprovados</p>
              <strong>{String(aprovadosCount).padStart(2, "0")}</strong>
              <p className="muted">Prontos para OS e reflexo no financeiro</p>
            </div>
            <div className="stage-card">
              <p className="eyebrow">Perdidos</p>
              <strong>{String(perdidosCount).padStart(2, "0")}</strong>
              <p className="muted">Encerrar ciclo e registrar motivo</p>
            </div>
          </div>

          <div className="toolbar-row">
            <div className="search-box">
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar conta, documento, contato ou contexto fiscal"
                className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
            </div>

            <div className="pill-row">
              {QUICK_FILTERS.map((item) => {
                const ativo = filtroRapido === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFiltroRapido(item.id)}
                    className={`pill ${ativo ? "is-solid" : ""}`}
                  >
                    {item.label}
                    <span>{contagemFiltros[item.id]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="toolbar-row">
            <div className="pill-row">
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="pill"
                aria-label="Filtrar por status"
              >
                <option value="">Todos os status</option>
                {Object.entries(STATUS).map(([key, status]) => (
                  <option key={key} value={key}>
                    {status.label}
                  </option>
                ))}
              </select>
              <button type="button" onClick={carregar} className="pill">
                Atualizar
              </button>
              <button
                type="button"
                onClick={() => {
                  setItemEdit(null);
                  setModalForm(true);
                }}
                className="pill is-solid"
              >
                Novo orçamento
              </button>
            </div>
            {contextoErro && <span className="status-tag is-warm">Integração parcial</span>}
          </div>

          {erro && (
            <div className="action-list">
              <div className="action-row">
                <div>
                  <strong>Falha ao consolidar a carteira</strong>
                  <p>{erro}</p>
                </div>
                <span className="status-tag is-warm">Atenção</span>
              </div>
            </div>
          )}

          <div className="table-shell slim">
            <div className="table-head table-grid-flow">
              <span>Cliente</span>
              <span>Status</span>
              <span>Validade</span>
              <span>Valor</span>
              <span>Próxima ação</span>
            </div>

            {carregando ? (
              <div className="flex items-center justify-center px-6 py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/8 border-t-[var(--accent)]" />
              </div>
            ) : !dadosVisiveis.length ? (
              <EmptyState
                onNovo={() => {
                  setItemEdit(null);
                  setModalForm(true);
                }}
              />
            ) : (
              <div className="table-body">
                {dadosVisiveis.map((item) => (
                  <div
                    key={item.id}
                    className={`table-row table-grid-flow ${item.id === itemFocoId ? "is-selected" : ""}`}
                  >
                    <div>
                      <button type="button" onClick={() => setItemFocoId(item.id)} className="w-full text-left">
                        <strong className="text-[var(--text)]">{item.cliente_nome}</strong>
                        <p className="muted mt-2 text-sm">{item.titulo}</p>
                        {item.descricao && <p className="muted mt-2 text-sm">{item.descricao}</p>}
                      </button>
                    </div>
                    <div className="flex items-start">
                      <ToneBadge tone={item.statusTone}>{item.statusLabel}</ToneBadge>
                    </div>
                    <span>
                      {item.validade ? fmtD(item.validade) : "Sem validade"}
                      <br />
                      <small className="muted">
                        {item.diasValidade == null
                          ? "Sem prazo"
                          : item.diasValidade < 0
                          ? `${Math.abs(item.diasValidade)} dia(s) vencido(s)`
                          : `${item.diasValidade} dia(s) restantes`}
                      </small>
                    </span>
                    <span>{fmt(item.valor)}</span>
                    <div className="space-y-2">
                      <span>{item.nextAction}</span>
                      <div className="pill-row">
                        {transicoesPrincipais(item.status).slice(0, 1).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => alterarStatus(item, status)}
                            className="pill"
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
                          className="pill"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="inspector-panel">
          <p className="eyebrow">Conversão</p>
          <h3>{itemFoco ? itemFoco.cliente_nome : "Regra visual oficial"}</h3>
          <p className="muted">
            {itemFoco
              ? itemFoco.nextNote
              : "Orçamento aprovado precisa deixar clara a passagem natural para Ordem de Serviço e Financeiro."}
          </p>

          <div className="balance-stack">
            <div className="balance-card">
              <span>Valor</span>
              <strong>{itemFoco ? fmt(itemFoco.valor) : fmt(ticketAlvo)}</strong>
            </div>
            <div className="balance-card">
              <span>Validade</span>
              <strong>{itemFoco?.validade ? fmtD(itemFoco.validade) : "Sem prazo"}</strong>
            </div>
            <div className="balance-card">
              <span>OS vinculada</span>
              <strong>
                {itemFoco
                  ? canOS
                    ? itemFoco.osRelacionado?.os || itemFoco.osRelacionado?.numero || "Não"
                    : "Sem permissão"
                  : String(stats.integracaoPendente)}
              </strong>
            </div>
            <div className="balance-card">
              <span>Financeiro</span>
              <strong>
                {itemFoco
                  ? canFinanceiro
                    ? itemFoco.financeiroRelacionado
                      ? fmt(itemFoco.financeiroRelacionado.valor_total || itemFoco.financeiroRelacionado.valor)
                      : "Não"
                    : "Sem permissão"
                  : String(stats.integrados)}
              </strong>
            </div>
          </div>

          <div className="action-list">
            {carregandoContexto && !filaPrioritaria.length ? (
              <div className="action-row">
                <div>
                  <strong>Consolidando carteira comercial</strong>
                  <p>Buscando sinais de validade, integração e follow-up.</p>
                </div>
                <span className="status-tag">Sync</span>
              </div>
            ) : filaPrioritaria.length > 0 ? (
              filaPrioritaria.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setItemFocoId(item.id)}
                  className="action-row w-full text-left"
                >
                  <div>
                    <strong>{item.cliente_nome}</strong>
                    <p>{item.nextAction}</p>
                  </div>
                  <span
                    className={`status-tag ${
                      item.statusTone === "danger"
                        ? "is-warm"
                        : item.statusTone === "positive"
                        ? "is-cool"
                        : ""
                    }`}
                  >
                    {item.statusLabel}
                  </span>
                </button>
              ))
            ) : (
              <div className="action-row">
                <div>
                  <strong>Sem alertas críticos</strong>
                  <p>O fluxo comercial parece estável neste recorte.</p>
                </div>
                <span className="status-tag is-cool">Estável</span>
              </div>
            )}
          </div>

          {itemFoco && (
            <div className="pill-row mt-4">
              {transicoesPrincipais(itemFoco.status).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => alterarStatus(itemFoco, status)}
                  className="pill"
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
                className="pill is-solid"
              >
                Editar
              </button>
              <button type="button" onClick={() => setItemDel(itemFoco)} className="pill">
                Excluir
              </button>
            </div>
          )}
        </aside>
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
