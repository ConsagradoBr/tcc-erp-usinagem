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

function ModalContainer({ children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[rgba(19,18,16,0.52)] p-3 backdrop-blur-md sm:items-center sm:p-5">
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
      <div className="cm-surface cm-modal-shell rounded-[34px] shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="cm-modal-grid xl:grid-cols-[minmax(0,1.2fr)_17rem]">
          <div className="cm-modal-main">
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

          <aside className="cm-modal-side rounded-b-[34px] border-t border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.96)] text-white xl:rounded-r-[34px] xl:rounded-bl-none xl:border-l xl:border-t-0">
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

  const totalEmFluxo = ordens.filter((ordem) => ordem.status !== "concluido").length;
  const totalRevisao = ordens.filter((ordem) => ordem.status === "revisao").length;

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
    <div className="min-h-full bg-transparent p-3 sm:p-4 lg:p-5">
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

      <div className="screen-grid screen-grid-os">
        <section className="surface-panel full-span">
          <div className="section-head">
            <div>
              <p className="eyebrow">Operação</p>
              <h3>Quadro de ordem de serviço mais manuseável</h3>
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
                </button>
              ))}
            </div>
          </div>

          <div className="terminal-ribbon">
            <article className="terminal-metric">
              <span>Lead time médio</span>
              <strong>{`${Math.max(totalEmFluxo, 1).toString().padStart(2, "0")}d 12h`}</strong>
            </article>
            <article className="terminal-metric">
              <span>Células ativas</span>
              <strong>{String(totalEmFluxo).padStart(2, "0")}</strong>
            </article>
            <article className="terminal-metric">
              <span>Bloqueios</span>
              <strong>{String(totalRevisao).padStart(2, "0")}</strong>
            </article>
          </div>

          <div className="toolbar-row">
            <div className="search-box">
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar OS, cliente ou serviço..."
                className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
              />
            </div>
            <div className="pill-row">
              <button type="button" onClick={() => abrirCriar("solicitado")} className="pill is-solid">
                Nova OS
              </button>
              <button type="button" onClick={carregar} className="pill">
                Atualizar
              </button>
            </div>
          </div>

          {carregando ? (
            <div className="flex items-center justify-center px-6 py-20">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/8 border-t-[var(--accent)]" />
            </div>
          ) : (
            <div className="kanban-grid">
              {colunas.map((coluna) => (
                <article
                  key={coluna.id}
                  className={`lane ${colunaDragOver === coluna.id ? "ring-2 ring-[rgba(32,229,203,0.24)]" : ""}`}
                  onDragOver={(e) => onDragOver(e, coluna.id)}
                  onDrop={() => onDrop(coluna.id)}
                  onDragLeave={() => setColunaDragOver(null)}
                >
                  <header>
                    <div>
                      <p className="eyebrow">{coluna.titulo}</p>
                      <p className="muted mt-2 text-sm">{coluna.note}</p>
                    </div>
                    <strong>{String(coluna.cards.length).padStart(2, "0")}</strong>
                  </header>

                  <div className="space-y-3">
                    {coluna.cards.length === 0 ? (
                      <div className="lane-card">
                        <strong>Nenhuma OS nesta etapa</strong>
                        <p className="muted mt-2">Use a criação rápida para iniciar uma nova frente operacional.</p>
                        <div className="pill-row mt-4">
                          <button type="button" onClick={() => abrirCriar(coluna.id)} className="pill">
                            Adicionar OS
                          </button>
                        </div>
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
                            className={`lane-card ${card.id === cardFocoId ? "border-[rgba(32,229,203,0.32)]" : ""}`}
                          >
                            <button type="button" onClick={() => setCardFocoId(card.id)} className="w-full text-left">
                              <strong>{card.os}</strong>
                              <p className="muted mt-2">{card.cliente}</p>
                              <p className="muted mt-2">{card.servico}</p>
                              <p className="muted mt-2">{card.descricao || "Sem descrição operacional"}</p>
                            </button>
                            <div className="pill-row mt-4">
                              <ToneBadge tone={prioridade.tone}>{prioridade.label}</ToneBadge>
                              {origem && <span className="status-tag is-cool">{`ORC ${origem}`}</span>}
                            </div>
                            <div className="pill-row mt-4">
                              <button type="button" onClick={() => abrirVer(card)} className="pill">
                                Ver
                              </button>
                              <button type="button" onClick={() => abrirEditar(card)} className="pill">
                                Editar
                              </button>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="surface-panel full-span">
          <div className="section-head">
            <div>
              <p className="eyebrow">Ordem em foco</p>
              <h3>{cardFoco ? cardFoco.os : "Selecione uma OS no quadro"}</h3>
            </div>
            {cardFoco && (
              <ToneBadge tone={PRIORIDADE[cardFoco.prioridade]?.tone || "default"}>
                {PRIORIDADE[cardFoco.prioridade]?.label || cardFoco.prioridade}
              </ToneBadge>
            )}
          </div>

          <div className="screen-grid screen-grid-flow">
            <section className="surface-panel">
              {cardFoco ? (
                <>
                  <div className="terminal-ribbon">
                    <article className="terminal-metric">
                      <span>Status</span>
                      <strong>
                        {COLUNAS_CONFIG.find((coluna) => coluna.id === cardFoco.status)?.titulo || cardFoco.status}
                      </strong>
                    </article>
                    <article className="terminal-metric">
                      <span>Prazo</span>
                      <strong>{cardFoco.prazo || "Sem prazo"}</strong>
                    </article>
                    <article className="terminal-metric">
                      <span>Responsável</span>
                      <strong>{cardFoco.responsavel || "Não definido"}</strong>
                    </article>
                  </div>
                  <div className="action-list">
                    <div className="action-row">
                      <div>
                        <strong>{cardFoco.servico}</strong>
                        <p>{cardFoco.descricao || "Sem contexto adicional registrado."}</p>
                      </div>
                      <span className="status-tag is-cool">
                        {extrairMarcadorOrcamento(cardFoco.descricao)
                          ? `ORC ${extrairMarcadorOrcamento(cardFoco.descricao)}`
                          : "Manual"}
                      </span>
                    </div>
                  </div>
                  <div className="pill-row mt-4">
                    <button type="button" onClick={() => abrirVer(cardFoco)} className="pill">
                      Ver detalhes
                    </button>
                    <button type="button" onClick={() => abrirEditar(cardFoco)} className="pill is-solid">
                      Editar OS
                    </button>
                    <button type="button" onClick={() => excluir(cardFoco.id, cardFoco.os)} className="pill">
                      Excluir
                    </button>
                  </div>
                </>
              ) : (
                <div className="action-row">
                  <div>
                    <strong>Nenhuma OS selecionada</strong>
                    <p>Selecione uma ordem no quadro para abrir prioridade, origem e contexto operacional.</p>
                  </div>
                  <span className="status-tag">Idle</span>
                </div>
              )}
            </section>

            <aside className="inspector-panel">
              <p className="eyebrow">Fila de atenção</p>
              <h3>Ordens que pedem leitura</h3>
              <p className="muted">A fila crítica prioriza revisão, atraso e alta prioridade operacional.</p>
              <div className="action-list">
                {filaPrioritaria.length ? (
                  filaPrioritaria.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setCardFocoId(item.id)}
                      className="action-row w-full text-left"
                    >
                      <div>
                        <strong>{item.os}</strong>
                        <p>{item.servico}</p>
                      </div>
                      <span className="status-tag is-warm">
                        {PRIORIDADE[item.prioridade]?.label || item.prioridade}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="action-row">
                    <div>
                      <strong>Sem OS crítica</strong>
                      <p>Nenhuma ordem pede atenção imediata neste momento.</p>
                    </div>
                    <span className="status-tag is-cool">Estável</span>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </section>
      </div>

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
