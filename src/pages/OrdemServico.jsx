import { useEffect, useMemo, useRef, useState } from "react";

import api from "../api";

const COLUNAS_CONFIG = [
  { id: "solicitado", titulo: "Solicitado", tone: "accent", note: "Entrada de demanda e definição de prioridade." },
  { id: "em_andamento", titulo: "Em andamento", tone: "default", note: "Execução ativa na operação." },
  { id: "revisao", titulo: "Em revisão", tone: "warning", note: "Conferência técnica e acabamento." },
  { id: "concluido", titulo: "Concluído", tone: "positive", note: "Pronto para expedição e fechamento." },
];

const PRIORIDADE = {
  alta: { label: "Alta", tone: "danger" },
  media: { label: "Média", tone: "warning" },
  baixa: { label: "Baixa", tone: "positive" },
};

const QUICK_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "atencao", label: "Pedem ação" },
  { id: "alta", label: "Alta prioridade" },
  { id: "andamento", label: "Em andamento" },
  { id: "concluido", label: "Concluído" },
];

const CARD_VAZIO = {
  os: "",
  cliente: "",
  servico: "",
  prioridade: "media",
  prazo: "",
  responsavel: "",
  descricao: "",
};

const INPUT_BASE =
  "mt-2 w-full rounded-[18px] border border-[color:var(--cm-line)] bg-white/75 px-4 py-3 text-sm text-[var(--cm-text)] placeholder:text-[var(--cm-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition focus:border-[color:rgba(180,99,56,0.38)] focus:ring-2 focus:ring-[rgba(180,99,56,0.16)]";

const LABEL_BASE = "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cm-muted)]";

function toneClasses(tone) {
  switch (tone) {
    case "danger":
      return {
        badge:
          "border-[rgba(187,103,80,0.22)] bg-[rgba(187,103,80,0.12)] text-[var(--cm-danger)]",
        dot: "bg-[var(--cm-danger)]",
        panel: "bg-[rgba(187,103,80,0.1)]",
      };
    case "warning":
      return {
        badge:
          "border-[rgba(173,122,62,0.22)] bg-[rgba(173,122,62,0.12)] text-[var(--cm-warning)]",
        dot: "bg-[var(--cm-warning)]",
        panel: "bg-[rgba(173,122,62,0.1)]",
      };
    case "positive":
      return {
        badge:
          "border-[rgba(63,141,114,0.22)] bg-[rgba(63,141,114,0.12)] text-[var(--cm-positive)]",
        dot: "bg-[var(--cm-positive)]",
        panel: "bg-[rgba(63,141,114,0.1)]",
      };
    case "accent":
      return {
        badge:
          "border-[rgba(180,99,56,0.22)] bg-[rgba(180,99,56,0.12)] text-[var(--cm-accent)]",
        dot: "bg-[var(--cm-accent)]",
        panel: "bg-[rgba(180,99,56,0.1)]",
      };
    default:
      return {
        badge: "border-[color:var(--cm-line)] bg-white/70 text-[var(--cm-text)]",
        dot: "bg-[var(--cm-text)]",
        panel: "bg-[rgba(37,42,49,0.04)]",
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

function StatTile({ label, value, note }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/7 p-4 text-white">
      <p className="text-xs uppercase tracking-[0.18em] text-white/55">{label}</p>
      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">{value}</div>
      <p className="mt-2 text-sm text-white/68">{note}</p>
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
          <p className="text-sm uppercase tracking-[0.18em] text-[var(--cm-accent)]">{item.os}</p>
          <p className="mt-2 truncate text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{item.servico}</p>
          <p className="mt-1 text-sm text-[var(--cm-muted)]">{item.cliente}</p>
        </div>
        <ToneBadge tone={PRIORIDADE[item.prioridade]?.tone || "default"}>
          {PRIORIDADE[item.prioridade]?.label || item.prioridade}
        </ToneBadge>
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

const mascaraData = (valor) => {
  const n = valor.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
};

function extrairMarcadorOrcamento(texto = "") {
  const match = String(texto).match(/\[ORC:([^\]]+)\]/);
  return match?.[1] || "";
}

function ModalOS({
  modoModal,
  cardAtual,
  colunaDestino,
  setColunaDestino,
  clienteFiltrado,
  setClienteFiltrado,
  mostrarDropdown,
  setMostrarDropdown,
  clientesSugeridos,
  setCardAtual,
  onClose,
  onSalvar,
  salvando,
}) {
  const fieldBase = "ordem-servico-modal";
  const prioridade = PRIORIDADE[cardAtual.prioridade] || PRIORIDADE.media;
  const origemOrcamento = extrairMarcadorOrcamento(cardAtual.descricao);

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-5xl rounded-[34px] shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.6fr)_20rem]">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cm-label">
                  {modoModal === "criar" && "Nova OS"}
                  {modoModal === "editar" && "Editar OS"}
                  {modoModal === "ver" && "Detalhes da OS"}
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">
                  {modoModal === "criar" && "Abrir nova frente operacional"}
                  {modoModal === "editar" && `Ajustar ${cardAtual.os}`}
                  {modoModal === "ver" && `${cardAtual.os} em visão ampliada`}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cm-muted)]">
                  O foco aqui é execução: cliente, serviço, prazo, responsável e o elo com a origem comercial quando existir.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[color:var(--cm-line)] bg-white/72 p-3 text-[var(--cm-muted)] transition hover:text-[var(--cm-text)]"
                aria-label="Fechar ordem de serviço"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {modoModal === "ver" ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/38 p-4">
                  <InfoItem label="Número" value={cardAtual.os} />
                  <InfoItem label="Cliente" value={cardAtual.cliente} />
                  <InfoItem label="Serviço" value={cardAtual.servico} />
                  <InfoItem label="Prioridade" value={prioridade.label} />
                </div>
                <div className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/38 p-4">
                  <InfoItem label="Prazo" value={cardAtual.prazo || "Sem prazo"} subtle={!cardAtual.prazo} />
                  <InfoItem label="Responsável" value={cardAtual.responsavel || "Não definido"} subtle={!cardAtual.responsavel} />
                  <InfoItem label="Origem" value={origemOrcamento ? `Orçamento ${origemOrcamento}` : "Manual"} subtle={!origemOrcamento} />
                </div>
                <div className="sm:col-span-2 rounded-[22px] border border-[color:var(--cm-line)] bg-white/38 p-4">
                  <InfoItem label="Descrição" value={cardAtual.descricao || "Sem descrição complementar"} subtle={!cardAtual.descricao} />
                </div>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${fieldBase}-prioridade`} className={LABEL_BASE}>Prioridade</label>
                    <select
                      id={`${fieldBase}-prioridade`}
                      value={cardAtual.prioridade}
                      onChange={(e) => setCardAtual({ ...cardAtual, prioridade: e.target.value })}
                      className={INPUT_BASE}
                    >
                      <option value="alta">Alta</option>
                      <option value="media">Média</option>
                      <option value="baixa">Baixa</option>
                    </select>
                  </div>

                  {modoModal === "criar" && (
                    <div>
                      <label htmlFor={`${fieldBase}-status`} className={LABEL_BASE}>Coluna inicial</label>
                      <select
                        id={`${fieldBase}-status`}
                        value={colunaDestino}
                        onChange={(e) => setColunaDestino(e.target.value)}
                        className={INPUT_BASE}
                      >
                        {COLUNAS_CONFIG.map((coluna) => (
                          <option key={coluna.id} value={coluna.id}>{coluna.titulo}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <label htmlFor={`${fieldBase}-cliente`} className={LABEL_BASE}>Cliente *</label>
                  <input
                    id={`${fieldBase}-cliente`}
                    type="text"
                    value={clienteFiltrado}
                    onChange={(e) => {
                      setClienteFiltrado(e.target.value);
                      setCardAtual({ ...cardAtual, cliente: e.target.value });
                      setMostrarDropdown(true);
                    }}
                    onFocus={() => setMostrarDropdown(true)}
                    onBlur={() => setTimeout(() => setMostrarDropdown(false), 150)}
                    placeholder="Digite ou selecione um cliente..."
                    className={INPUT_BASE}
                  />
                  {mostrarDropdown && clientesSugeridos.length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-44 w-full overflow-y-auto rounded-[20px] border border-[color:var(--cm-line)] bg-white shadow-lg">
                      {clientesSugeridos.map((cliente) => (
                        <button
                          key={cliente}
                          type="button"
                          onMouseDown={() => {
                            setClienteFiltrado(cliente);
                            setCardAtual({ ...cardAtual, cliente });
                            setMostrarDropdown(false);
                          }}
                          className="w-full px-4 py-3 text-left text-sm text-[var(--cm-text)] transition hover:bg-[rgba(180,99,56,0.08)]"
                        >
                          {cliente}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor={`${fieldBase}-servico`} className={LABEL_BASE}>Serviço *</label>
                  <input
                    id={`${fieldBase}-servico`}
                    type="text"
                    value={cardAtual.servico}
                    onChange={(e) => setCardAtual({ ...cardAtual, servico: e.target.value })}
                    placeholder="Ex: Fresamento CNC, torneamento..."
                    className={INPUT_BASE}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor={`${fieldBase}-responsavel`} className={LABEL_BASE}>Responsável</label>
                    <input
                      id={`${fieldBase}-responsavel`}
                      type="text"
                      value={cardAtual.responsavel || ""}
                      onChange={(e) => setCardAtual({ ...cardAtual, responsavel: e.target.value })}
                      placeholder="Nome do técnico"
                      className={INPUT_BASE}
                    />
                  </div>
                  <div>
                    <label htmlFor={`${fieldBase}-prazo`} className={LABEL_BASE}>Prazo</label>
                    <input
                      id={`${fieldBase}-prazo`}
                      type="text"
                      value={cardAtual.prazo || ""}
                      onChange={(e) => setCardAtual({ ...cardAtual, prazo: mascaraData(e.target.value) })}
                      placeholder="DD/MM/AAAA"
                      maxLength={10}
                      className={INPUT_BASE}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor={`${fieldBase}-descricao`} className={LABEL_BASE}>Descrição</label>
                  <textarea
                    id={`${fieldBase}-descricao`}
                    value={cardAtual.descricao || ""}
                    onChange={(e) => setCardAtual({ ...cardAtual, descricao: e.target.value })}
                    rows={4}
                    placeholder="Descreva o serviço, setup, acabamento e observações..."
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
                    type="button"
                    onClick={onSalvar}
                    disabled={salvando}
                    className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {salvando ? "Salvando..." : modoModal === "criar" ? "Criar OS" : "Salvar alterações"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-b-[34px] border-t border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.96)] p-6 text-white lg:rounded-r-[34px] lg:rounded-bl-none lg:border-l lg:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Leitura operacional</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ToneBadge tone={prioridade.tone}>{prioridade.label}</ToneBadge>
              {origemOrcamento && <ToneBadge tone="accent">Origem {origemOrcamento}</ToneBadge>}
            </div>

            <div className="mt-5 space-y-3 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <InfoItem label="Cliente" value={cardAtual.cliente || "A definir"} subtle={!cardAtual.cliente} />
              <InfoItem label="Serviço" value={cardAtual.servico || "A definir"} subtle={!cardAtual.servico} />
              <InfoItem label="Prazo" value={cardAtual.prazo || "Sem prazo"} subtle={!cardAtual.prazo} />
              <InfoItem label="Responsável" value={cardAtual.responsavel || "Não definido"} subtle={!cardAtual.responsavel} />
            </div>

            <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Como usar essa etapa</p>
              <div className="mt-3 space-y-3 text-sm text-white/72">
                <p>1. Solicite com contexto claro e prioridade bem definida.</p>
                <p>2. Arraste no kanban para mostrar ritmo real da execução.</p>
                <p>3. Use revisão e conclusão como checkpoints objetivos.</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ModalContainer>
  );
}

export default function OrdemServico() {
  const [ordens, setOrdens] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("");
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [notificacao, setNotificacao] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [modoModal, setModoModal] = useState("criar");
  const [cardAtual, setCardAtual] = useState(null);
  const [colunaDestino, setColunaDestino] = useState("solicitado");
  const [colunaDragOver, setColunaDragOver] = useState(null);
  const [clienteFiltrado, setClienteFiltrado] = useState("");
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [cardFocoId, setCardFocoId] = useState(null);
  const dragCard = useRef(null);

  const notificar = (msg, tipo = "sucesso") => {
    setNotificacao({ msg, tipo });
    window.clearTimeout(window.__osToastTimer);
    window.__osToastTimer = window.setTimeout(() => setNotificacao(null), 3200);
  };

  const carregar = async () => {
    setCarregando(true);
    try {
      const [resOS, resClientes] = await Promise.all([
        api.get("/ordens-servico"),
        api.get("/clientes"),
      ]);
      setOrdens(resOS.data);
      setClientes(resClientes.data.map((cliente) => cliente.nome));
    } catch {
      notificar("Erro ao carregar ordens de serviço.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const ordensFiltradas = useMemo(() => {
    return ordens.filter((ordem) => {
      const termo =
        ordem.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
        ordem.os.toLowerCase().includes(filtro.toLowerCase()) ||
        ordem.servico.toLowerCase().includes(filtro.toLowerCase());

      if (!termo) return false;
      if (filtroRapido === "alta") return ordem.prioridade === "alta";
      if (filtroRapido === "andamento") return ordem.status === "em_andamento";
      if (filtroRapido === "concluido") return ordem.status === "concluido";
      if (filtroRapido === "atencao") return ordem.status === "solicitado" || ordem.status === "revisao";
      return true;
    });
  }, [filtro, filtroRapido, ordens]);

  const colunas = useMemo(() => {
    return COLUNAS_CONFIG.map((coluna) => ({
      ...coluna,
      cards: ordensFiltradas
        .filter((ordem) => ordem.status === coluna.id)
        .sort((a, b) => {
          const scoreA = a.prioridade === "alta" ? 3 : a.prioridade === "media" ? 2 : 1;
          const scoreB = b.prioridade === "alta" ? 3 : b.prioridade === "media" ? 2 : 1;
          return scoreB - scoreA;
        }),
    }));
  }, [ordensFiltradas]);

  const totalOS = ordens.length;
  const totalEmFluxo = ordens.filter((ordem) => ordem.status !== "concluido").length;
  const totalRevisao = ordens.filter((ordem) => ordem.status === "revisao").length;
  const totalAlta = ordens.filter((ordem) => ordem.prioridade === "alta").length;

  const filaPrioritaria = useMemo(() => {
    return [...ordens]
      .filter((ordem) => ordem.status !== "concluido")
      .sort((a, b) => {
        const score = (item) => {
          if (item.prioridade === "alta") return 4;
          if (item.status === "revisao") return 3;
          if (item.status === "solicitado") return 2;
          return 1;
        };
        return score(b) - score(a);
      })
      .slice(0, 4);
  }, [ordens]);

  useEffect(() => {
    const idsVisiveis = new Set(ordensFiltradas.map((item) => item.id));
    if (!ordensFiltradas.length) {
      setCardFocoId(null);
      return;
    }
    if (!idsVisiveis.has(cardFocoId)) {
      setCardFocoId(ordensFiltradas[0].id);
    }
  }, [cardFocoId, ordensFiltradas]);

  const cardFoco = useMemo(
    () => ordensFiltradas.find((item) => item.id === cardFocoId) || null,
    [cardFocoId, ordensFiltradas]
  );

  const onDragStart = (card, colunaId) => {
    dragCard.current = { card, colunaId };
  };

  const onDragOver = (e, colunaId) => {
    e.preventDefault();
    setColunaDragOver(colunaId);
  };

  const onDrop = async (dest) => {
    setColunaDragOver(null);
    if (!dragCard.current) return;

    const { card, colunaId: origem } = dragCard.current;
    dragCard.current = null;
    if (origem === dest) return;

    setOrdens((prev) => prev.map((ordem) => (ordem.id === card.id ? { ...ordem, status: dest } : ordem)));

    try {
      await api.patch(`/ordens-servico/${card.id}/status`, { status: dest });
      const tituloDestino = COLUNAS_CONFIG.find((coluna) => coluna.id === dest)?.titulo;
      notificar(`${card.os} movida para ${tituloDestino}.`);
    } catch {
      setOrdens((prev) => prev.map((ordem) => (ordem.id === card.id ? { ...ordem, status: origem } : ordem)));
      notificar("Erro ao mover OS.", "erro");
    }
  };

  const abrirCriar = (colunaId) => {
    setModoModal("criar");
    setColunaDestino(colunaId);
    setClienteFiltrado("");
    setCardAtual({ ...CARD_VAZIO });
    setModalAberto(true);
  };

  const abrirEditar = (card) => {
    setModoModal("editar");
    setClienteFiltrado(card.cliente);
    setCardAtual({ ...card });
    setModalAberto(true);
  };

  const abrirVer = (card) => {
    setModoModal("ver");
    setClienteFiltrado(card.cliente);
    setCardAtual({ ...card });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!cardAtual.cliente || !cardAtual.servico) {
      notificar("Preencha cliente e serviço.", "erro");
      return;
    }
    setSalvando(true);
    try {
      if (modoModal === "criar") {
        const res = await api.post("/ordens-servico", { ...cardAtual, status: colunaDestino });
        setOrdens((prev) => [...prev, res.data]);
        setCardFocoId(res.data.id);
        notificar(`${res.data.os} criada com sucesso.`);
      } else {
        const res = await api.put(`/ordens-servico/${cardAtual.id}`, cardAtual);
        setOrdens((prev) => prev.map((ordem) => (ordem.id === res.data.id ? res.data : ordem)));
        setCardFocoId(res.data.id);
        notificar(`${res.data.os} atualizada.`);
      }
      setModalAberto(false);
    } catch {
      notificar("Erro ao salvar OS.", "erro");
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (cardId, numeroOS) => {
    if (!window.confirm("Deseja excluir esta Ordem de Serviço?")) return;
    try {
      await api.delete(`/ordens-servico/${cardId}`);
      setOrdens((prev) => prev.filter((ordem) => ordem.id !== cardId));
      notificar(`${numeroOS} excluída.`);
    } catch {
      notificar("Erro ao excluir OS.", "erro");
    }
  };

  const clientesSugeridos = clientes.filter((cliente) =>
    cliente.toLowerCase().includes(clienteFiltrado.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8">
      {notificacao && (
        <div
          className={`fixed right-5 top-5 z-50 rounded-[20px] border px-5 py-3 text-sm font-semibold shadow-[0_18px_48px_rgba(22,18,14,0.2)] ${
            notificacao.tipo === "erro"
              ? "border-[rgba(187,103,80,0.2)] bg-[rgba(255,244,240,0.94)] text-[var(--cm-danger)]"
              : "border-[rgba(63,141,114,0.2)] bg-[rgba(246,255,251,0.95)] text-[var(--cm-positive)]"
          }`}
        >
          {notificacao.msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="cm-surface-strong rounded-[32px] p-6 sm:p-7 xl:col-span-8">
          <p className="cm-label text-white/58">Ceramic Monolith · Ordem de Serviço</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Operação em kanban, com prioridade, origem e ritmo visíveis
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72 sm:text-base">
            A OS agora aparece como centro de execução. Você vê o que entrou, o que está em revisão, o que é urgente e o
            que já nasceu de orçamento aprovado.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Total de OS" value={String(totalOS)} note="Todas as ordens cadastradas" />
            <StatTile label="Em fluxo" value={String(totalEmFluxo)} note="Ainda em execução operacional" />
            <StatTile label="Em revisão" value={String(totalRevisao)} note="Pedindo conferência técnica" />
            <StatTile label="Alta prioridade" value={String(totalAlta)} note="Demandas que merecem atenção agora" />
          </div>
        </section>

        <section className="cm-surface rounded-[32px] p-6 xl:col-span-4">
          <p className="cm-label">OS em foco</p>
          {cardFoco ? (
            <>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm uppercase tracking-[0.18em] text-[var(--cm-accent)]">{cardFoco.os}</p>
                  <h2 className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">{cardFoco.servico}</h2>
                  <p className="mt-2 text-sm text-[var(--cm-muted)]">{cardFoco.cliente}</p>
                </div>
                <ToneBadge tone={PRIORIDADE[cardFoco.prioridade]?.tone || "default"}>
                  {PRIORIDADE[cardFoco.prioridade]?.label || cardFoco.prioridade}
                </ToneBadge>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <FocusMetric label="Status" value={COLUNAS_CONFIG.find((coluna) => coluna.id === cardFoco.status)?.titulo || cardFoco.status} note={COLUNAS_CONFIG.find((coluna) => coluna.id === cardFoco.status)?.note} />
                <FocusMetric label="Prazo" value={cardFoco.prazo || "Sem prazo"} note={cardFoco.responsavel || "Responsável não definido"} />
              </div>

              <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 p-4">
                <p className="cm-label">Origem e contexto</p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <InfoItem label="Origem" value={extrairMarcadorOrcamento(cardFoco.descricao) ? `Orçamento ${extrairMarcadorOrcamento(cardFoco.descricao)}` : "Cadastro manual"} subtle={!extrairMarcadorOrcamento(cardFoco.descricao)} />
                  <InfoItem label="Responsável" value={cardFoco.responsavel || "Não definido"} subtle={!cardFoco.responsavel} />
                </div>
                {cardFoco.descricao && <p className="mt-4 text-sm leading-6 text-[var(--cm-muted)]">{cardFoco.descricao}</p>}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => abrirVer(cardFoco)}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Ver detalhes
                </button>
                <button
                  type="button"
                  onClick={() => abrirEditar(cardFoco)}
                  className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
                >
                  Editar OS
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/40 px-4 py-6 text-sm leading-6 text-[var(--cm-muted)]">
              Selecione uma OS no board para abrir o inspector com prioridade, origem e contexto operacional.
            </div>
          )}

          <div className="mt-6">
            <p className="cm-label">Fila de atenção</p>
            <div className="mt-3 grid gap-3">
              {filaPrioritaria.length ? (
                filaPrioritaria.map((item) => <QueueItem key={item.id} item={item} onSelect={setCardFocoId} />)
              ) : (
                <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/40 px-4 py-6 text-sm leading-6 text-[var(--cm-muted)]">
                  Nenhuma OS crítica no momento.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <section className="mt-6 cm-surface rounded-[32px] p-5 sm:p-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="cm-label">Workspace operacional</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Kanban de ordens de serviço</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
                Arraste as OS entre colunas, use os filtros rápidos e mantenha o board como leitura viva da produção.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => abrirCriar("solicitado")}
                className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
              >
                Nova OS
              </button>
              <button
                type="button"
                onClick={carregar}
                className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
              >
                Atualizar
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
                placeholder="Buscar OS, cliente ou serviço..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cm-text)] outline-none placeholder:text-[var(--cm-muted)]"
              />
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
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {carregando ? (
          <div className="flex items-center justify-center px-6 py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/8 border-t-[var(--cm-accent)]" />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-5 2xl:grid-cols-4 xl:grid-cols-2">
            {colunas.map((coluna) => {
              const styles = toneClasses(coluna.tone);
              return (
                <div
                  key={coluna.id}
                  onDragOver={(e) => onDragOver(e, coluna.id)}
                  onDrop={() => onDrop(coluna.id)}
                  onDragLeave={() => setColunaDragOver(null)}
                  className={`flex min-w-0 flex-col rounded-[28px] border border-[color:var(--cm-line)] bg-white/28 transition ${
                    colunaDragOver === coluna.id ? "ring-2 ring-[rgba(180,99,56,0.28)] ring-offset-2" : ""
                  }`}
                >
                  <div className={`rounded-t-[28px] border-b border-[color:var(--cm-line)] px-4 py-4 ${styles.panel}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">{coluna.titulo}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">{coluna.note}</p>
                      </div>
                      <span className="rounded-full border border-[color:var(--cm-line)] bg-white/70 px-3 py-1 text-xs font-semibold text-[var(--cm-text)]">
                        {coluna.cards.length}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-3">
                    {coluna.cards.length === 0 ? (
                      <div className="flex min-h-[10rem] flex-col items-center justify-center rounded-[22px] border border-dashed border-[color:var(--cm-line)] bg-white/36 px-4 text-center">
                        <p className="text-sm text-[var(--cm-muted)]">Nenhuma OS nesta etapa.</p>
                        <button
                          type="button"
                          onClick={() => abrirCriar(coluna.id)}
                          className="mt-3 rounded-full border border-[color:var(--cm-line)] bg-white/74 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                        >
                          Adicionar OS
                        </button>
                      </div>
                    ) : (
                      coluna.cards.map((card) => {
                        const prioridade = PRIORIDADE[card.prioridade] || PRIORIDADE.media;
                        const origem = extrairMarcadorOrcamento(card.descricao);
                        return (
                          <article
                            key={card.id}
                            draggable
                            onDragStart={() => onDragStart(card, coluna.id)}
                            className={`rounded-[24px] border border-[color:var(--cm-line)] bg-white px-4 py-4 shadow-[0_8px_24px_rgba(22,18,14,0.06)] transition hover:-translate-y-[1px] hover:shadow-[0_14px_32px_rgba(22,18,14,0.1)] ${
                              card.id === cardFocoId ? "ring-2 ring-[rgba(180,99,56,0.24)]" : ""
                            }`}
                          >
                            <button type="button" onClick={() => setCardFocoId(card.id)} className="w-full text-left">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-sm uppercase tracking-[0.18em] text-[var(--cm-accent)]">{card.os}</span>
                                <ToneBadge tone={prioridade.tone}>{prioridade.label}</ToneBadge>
                              </div>
                              <p className="mt-3 text-base font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{card.servico}</p>
                              <p className="mt-1 text-sm text-[var(--cm-muted)]">{card.cliente}</p>
                              <div className="mt-3 grid gap-2 text-sm text-[var(--cm-muted)]">
                                <span>{card.prazo || "Sem prazo definido"}</span>
                                <span>{card.responsavel || "Responsável não definido"}</span>
                                <span>{origem ? `Origem: ${origem}` : "Origem manual"}</span>
                              </div>
                            </button>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => abrirVer(card)}
                                className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                              >
                                Ver
                              </button>
                              <button
                                type="button"
                                onClick={() => abrirEditar(card)}
                                className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={() => excluir(card.id, card.os)}
                                className="rounded-full border border-[rgba(187,103,80,0.18)] bg-[rgba(187,103,80,0.1)] px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-danger)] transition hover:bg-[rgba(187,103,80,0.14)]"
                              >
                                Excluir
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {modalAberto && cardAtual && (
        <ModalOS
          modoModal={modoModal}
          cardAtual={cardAtual}
          colunaDestino={colunaDestino}
          setColunaDestino={setColunaDestino}
          clienteFiltrado={clienteFiltrado}
          setClienteFiltrado={setClienteFiltrado}
          mostrarDropdown={mostrarDropdown}
          setMostrarDropdown={setMostrarDropdown}
          clientesSugeridos={clientesSugeridos}
          setCardAtual={setCardAtual}
          onClose={() => setModalAberto(false)}
          onSalvar={salvar}
          salvando={salvando}
        />
      )}
    </div>
  );
}
