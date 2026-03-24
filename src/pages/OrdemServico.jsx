import { useState, useEffect, useRef } from "react";
import api from "../api";

// ─── Configuração das colunas (visual apenas) ─────────────────────────────────
const COLUNAS_CONFIG = [
  { id: "solicitado",   titulo: "Solicitado",   cor: "from-slate-500 to-slate-600",   icone: "📋" },
  { id: "em_andamento", titulo: "Em Andamento", cor: "from-blue-500 to-blue-600",     icone: "⚙️" },
  { id: "revisao",      titulo: "Em Revisão",   cor: "from-amber-500 to-orange-500",  icone: "🔍" },
  { id: "concluido",    titulo: "Concluído",    cor: "from-emerald-500 to-green-600", icone: "✅" },
];

const badgePrioridade = {
  alta:  { bg: "bg-red-50 border-red-200 text-red-600",             dot: "bg-red-500",     label: "Alta"  },
  media: { bg: "bg-amber-50 border-amber-200 text-amber-600",       dot: "bg-amber-400",   label: "Média" },
  baixa: { bg: "bg-emerald-50 border-emerald-200 text-emerald-600", dot: "bg-emerald-500", label: "Baixa" },
};

const mascaraData = (valor) => {
  const n = valor.replace(/\D/g, "").slice(0, 8);
  if (n.length <= 2) return n;
  if (n.length <= 4) return `${n.slice(0, 2)}/${n.slice(2)}`;
  return `${n.slice(0, 2)}/${n.slice(2, 4)}/${n.slice(4)}`;
};

const CARD_VAZIO = { os: "", cliente: "", servico: "", prioridade: "media", prazo: "", responsavel: "", descricao: "" };

export default function OrdemServico() {
  const [ordens,          setOrdens]          = useState([]);
  const [clientes,        setClientes]        = useState([]);
  const [carregando,      setCarregando]      = useState(true);
  const [filtro,          setFiltro]          = useState("");
  const [notificacao,     setNotificacao]     = useState(null);
  const [modalAberto,     setModalAberto]     = useState(false);
  const [modoModal,       setModoModal]       = useState("criar");
  const [cardAtual,       setCardAtual]       = useState(null);
  const [colunaDestino,   setColunaDestino]   = useState("solicitado");
  const [colunaDragOver,  setColunaDragOver]  = useState(null);
  const [clienteFiltrado, setClienteFiltrado] = useState("");
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [salvando,        setSalvando]        = useState(false);
  const dragCard = useRef(null);

  // ── Carregar dados ────────────────────────────────────────────────────────
  const carregar = async () => {
    setCarregando(true);
    try {
      const [resOS, resC] = await Promise.all([
        api.get("/ordens-servico"),
        api.get("/clientes"),
      ]);
      setOrdens(resOS.data);
      setClientes(resC.data.map(c => c.nome));
    } catch {
      notificar("Erro ao carregar ordens de serviço.", "erro");
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  // ── Notificações ──────────────────────────────────────────────────────────
  const notificar = (msg, tipo = "sucesso") => {
    setNotificacao({ msg, tipo });
    setTimeout(() => setNotificacao(null), 3000);
  };

  // ── Organiza ordens em colunas ────────────────────────────────────────────
  const colunas = COLUNAS_CONFIG.map(col => ({
    ...col,
    cards: ordens.filter(o => o.status === col.id),
  }));

  const colunasFiltradas = colunas.map(col => ({
    ...col,
    cards: col.cards.filter(c =>
      c.cliente.toLowerCase().includes(filtro.toLowerCase()) ||
      c.os.toLowerCase().includes(filtro.toLowerCase()) ||
      c.servico.toLowerCase().includes(filtro.toLowerCase())
    ),
  }));

  const totalOS = ordens.length;

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const onDragStart = (card, colunaId) => { dragCard.current = { card, colunaId }; };
  const onDragOver  = (e, colunaId)    => { e.preventDefault(); setColunaDragOver(colunaId); };
  const onDragLeave = ()               => setColunaDragOver(null);

  const onDrop = async (dest) => {
    setColunaDragOver(null);
    if (!dragCard.current) return;
    const { card, colunaId: origem } = dragCard.current;
    dragCard.current = null;
    if (origem === dest) return;

    // Atualiza na tela imediatamente (otimista)
    setOrdens(prev => prev.map(o => o.id === card.id ? { ...o, status: dest } : o));

    try {
      await api.patch(`/ordens-servico/${card.id}/status`, { status: dest });
      const tituloDestino = COLUNAS_CONFIG.find(c => c.id === dest)?.titulo;
      notificar(`"${card.os}" movido para "${tituloDestino}"`);
    } catch {
      // Reverte se falhar
      setOrdens(prev => prev.map(o => o.id === card.id ? { ...o, status: origem } : o));
      notificar("Erro ao mover OS.", "erro");
    }
  };

  // ── Modal ─────────────────────────────────────────────────────────────────
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
    setCardAtual({ ...card });
    setModalAberto(true);
  };

  const salvar = async () => {
    if (!cardAtual.cliente || !cardAtual.servico) {
      notificar("Preencha cliente e serviço!", "erro");
      return;
    }
    setSalvando(true);
    try {
      if (modoModal === "criar") {
        const res = await api.post("/ordens-servico", { ...cardAtual, status: colunaDestino });
        setOrdens(prev => [...prev, res.data]);
        notificar(`${res.data.os} criada com sucesso! 🎉`);
      } else {
        const res = await api.put(`/ordens-servico/${cardAtual.id}`, cardAtual);
        setOrdens(prev => prev.map(o => o.id === res.data.id ? res.data : o));
        notificar(`${res.data.os} atualizada!`);
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
      setOrdens(prev => prev.filter(o => o.id !== cardId));
      notificar(`${numeroOS} excluída!`);
    } catch {
      notificar("Erro ao excluir OS.", "erro");
    }
  };

  const clientesSugeridos = clientes.filter(c =>
    c.toLowerCase().includes(clienteFiltrado.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 min-w-0 min-h-screen p-3 sm:p-4 lg:p-6 overflow-x-hidden" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>

      {/* Notificação */}
      {notificacao && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-5 py-3 rounded-xl shadow-2xl text-white text-sm font-semibold ${notificacao.tipo === "erro" ? "bg-red-500" : "bg-emerald-500"}`}>
          <span>{notificacao.tipo === "erro" ? "⚠️" : "✅"}</span>
          {notificacao.msg}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-black tracking-widest text-gray-800 uppercase">Ordem de Serviço</h1>
        </div>
        <p className="text-xs text-gray-400 font-medium">{totalOS} ordem(ns) cadastrada(s)</p>
      </div>

      {/* Barra de controles */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm w-full sm:flex-1 sm:max-w-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Buscar OS, cliente ou serviço..." className="text-sm bg-transparent outline-none w-full text-gray-700 placeholder-gray-400" />
          {filtro && <button onClick={() => setFiltro("")} className="text-gray-300 hover:text-red-400 transition text-xs">✕</button>}
        </div>
        <button onClick={() => abrirCriar("solicitado")} className="flex w-full sm:w-auto items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md transition-all">
          <span className="text-lg leading-none">+</span> Nova OS
        </button>
        <button onClick={carregar} disabled={carregando} className="flex w-full sm:w-auto items-center justify-center gap-2 border border-gray-200 text-gray-500 hover:bg-gray-100 text-sm font-semibold px-3 py-2 rounded-xl transition">
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 ${carregando ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          Atualizar
        </button>
      </div>

      {/* Loading */}
      {carregando && (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Board Kanban */}
      {!carregando && (
        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-4 gap-5 items-start">
          {colunasFiltradas.map((coluna) => (
            <div key={coluna.id}
              onDragOver={(e) => onDragOver(e, coluna.id)}
              onDrop={() => onDrop(coluna.id)}
              onDragLeave={onDragLeave}
              className={`flex min-w-0 flex-col rounded-2xl transition-all duration-200 ${colunaDragOver === coluna.id ? "ring-2 ring-orange-400 ring-offset-2 scale-[1.01]" : ""}`}>

              {/* Cabeçalho da coluna */}
              <div className={`flex items-center justify-between px-4 py-3.5 rounded-t-2xl bg-gradient-to-r ${coluna.cor} shadow-md`}>
                <div className="flex items-center gap-2.5">
                  <span>{coluna.icone}</span>
                  <span className="text-white font-bold text-sm uppercase tracking-wide">{coluna.titulo}</span>
                  <span className="bg-white/25 text-white text-xs font-black px-2 py-0.5 rounded-full">{coluna.cards.length}</span>
                </div>
                <button onClick={() => abrirCriar(coluna.id)} className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {/* Cards */}
              <div
                className={`flex flex-col gap-3 p-3 rounded-b-2xl flex-1 transition-colors ${colunaDragOver === coluna.id ? "bg-orange-50/80" : "bg-white/70"}`}
                style={{ backdropFilter: "blur(4px)", border: "1px solid rgba(0,0,0,0.06)", borderTop: "none" }}>

                {coluna.cards.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-300 gap-2">
                    <span className="text-3xl">📭</span>
                    <span className="text-xs font-medium">Nenhuma OS aqui</span>
                    <button onClick={() => abrirCriar(coluna.id)} className="text-xs text-orange-400 hover:text-orange-600 underline transition mt-1">+ Adicionar</button>
                  </div>
                )}

                {coluna.cards.map((card) => {
                  const prio = badgePrioridade[card.prioridade] || badgePrioridade.media;
                  return (
                    <div key={card.id} draggable onDragStart={() => onDragStart(card, coluna.id)}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5 cursor-grab active:cursor-grabbing hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 transition-all group">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-xs font-black text-orange-500 tracking-wider bg-orange-50 px-2 py-0.5 rounded-lg border border-orange-100">{card.os}</span>
                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${prio.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`}></span>{prio.label}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-gray-800 leading-tight mb-1">{card.servico}</p>
                      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1"><span>🏢</span> {card.cliente}</p>
                      <div className="flex items-center justify-between text-xs text-gray-400 pb-3 border-b border-gray-50">
                        <span className="flex items-center gap-1"><span>📅</span> {card.prazo || "—"}</span>
                        <span className="flex items-center gap-1"><span>👤</span> {card.responsavel || "—"}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => abrirVer(card)} title="Ver" className="p-1.5 rounded-lg text-gray-400 hover:text-orange-500 hover:bg-orange-50 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        </button>
                        <button onClick={() => abrirEditar(card)} title="Editar" className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button onClick={() => excluir(card.id, card.os)} title="Excluir" className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {coluna.cards.length > 0 && (
                  <button onClick={() => abrirCriar(coluna.id)} className="flex items-center gap-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 text-xs font-semibold px-3 py-2.5 rounded-xl transition border border-dashed border-gray-200 hover:border-orange-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                    Adicionar OS
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {modalAberto && cardAtual && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{modoModal === "criar" ? "🆕" : modoModal === "editar" ? "✏️" : "🔎"}</span>
                <div>
                  <h2 className="text-white font-bold text-base leading-tight">
                    {modoModal === "criar"  && "Nova Ordem de Serviço"}
                    {modoModal === "editar" && `Editar ${cardAtual.os}`}
                    {modoModal === "ver"    && `Detalhes — ${cardAtual.os}`}
                  </h2>
                  {modoModal !== "ver" && (
                    <p className="text-orange-100 text-xs">
                      {modoModal === "criar" ? "Número gerado automaticamente" : cardAtual.os}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={() => setModalAberto(false)} className="text-white/70 hover:text-white hover:bg-white/20 rounded-lg p-1.5 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {modoModal === "ver" ? (
                <div className="space-y-3">
                  {[
                    ["🔢 Número da OS", cardAtual.os],
                    ["🏢 Cliente",      cardAtual.cliente],
                    ["🔧 Serviço",      cardAtual.servico],
                    ["👤 Responsável",  cardAtual.responsavel],
                    ["📅 Prazo",        cardAtual.prazo],
                    ["⚡ Prioridade",   badgePrioridade[cardAtual.prioridade]?.label],
                    ["📝 Descrição",    cardAtual.descricao],
                  ].map(([label, valor]) => (
                    <div key={label} className="bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">{label}</span>
                      <span className="text-sm font-semibold text-gray-700">{valor || "—"}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Prioridade</label>
                    <select value={cardAtual.prioridade} onChange={(e) => setCardAtual({ ...cardAtual, prioridade: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                      <option value="alta">🔴 Alta</option>
                      <option value="media">🟡 Média</option>
                      <option value="baixa">🟢 Baixa</option>
                    </select>
                  </div>

                  <div className="relative">
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">
                      Cliente * <span className="text-orange-400 normal-case font-normal">(selecione ou digite)</span>
                    </label>
                    <input
                      type="text"
                      value={clienteFiltrado}
                      onChange={(e) => { setClienteFiltrado(e.target.value); setCardAtual({ ...cardAtual, cliente: e.target.value }); setMostrarDropdown(true); }}
                      onFocus={() => setMostrarDropdown(true)}
                      onBlur={() => setTimeout(() => setMostrarDropdown(false), 150)}
                      placeholder="Digite ou selecione um cliente..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                    {mostrarDropdown && clientesSugeridos.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {clientesSugeridos.map((c) => (
                          <button key={c} type="button"
                            onMouseDown={() => { setClienteFiltrado(c); setCardAtual({ ...cardAtual, cliente: c }); setMostrarDropdown(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-600 flex items-center gap-2 transition">
                            <span>🏢</span> {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Serviço *</label>
                    <input type="text" value={cardAtual.servico} onChange={(e) => setCardAtual({ ...cardAtual, servico: e.target.value })} placeholder="Ex: Fresamento CNC, Torneamento..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Responsável</label>
                      <input type="text" value={cardAtual.responsavel || ""} onChange={(e) => setCardAtual({ ...cardAtual, responsavel: e.target.value })} placeholder="Nome do técnico" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Prazo (DD/MM/AAAA)</label>
                      <input type="text" value={cardAtual.prazo || ""} onChange={(e) => setCardAtual({ ...cardAtual, prazo: mascaraData(e.target.value) })} placeholder="DD/MM/AAAA" maxLength={10} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
                    </div>
                  </div>

                  {modoModal === "criar" && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Coluna inicial</label>
                      <select value={colunaDestino} onChange={(e) => setColunaDestino(e.target.value)} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white">
                        {COLUNAS_CONFIG.map((col) => (<option key={col.id} value={col.id}>{col.icone} {col.titulo}</option>))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1.5">Descrição</label>
                    <textarea value={cardAtual.descricao || ""} onChange={(e) => setCardAtual({ ...cardAtual, descricao: e.target.value })} rows={3} placeholder="Descreva o serviço a ser realizado..." className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none" />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
              <button onClick={() => setModalAberto(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-100 transition">
                {modoModal === "ver" ? "Fechar" : "Cancelar"}
              </button>
              {modoModal !== "ver" && (
                <button onClick={salvar} disabled={salvando} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 active:scale-95 text-white rounded-xl py-2.5 text-sm font-bold transition-all shadow-md shadow-orange-200">
                  {salvando ? "Salvando..." : modoModal === "criar" ? "✅ Criar OS" : "💾 Salvar"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}