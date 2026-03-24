import { useCallback, useEffect, useState } from "react";
import api from "../api";

const STATUS = {
  rascunho: { label: "Rascunho", badge: "bg-slate-100 text-slate-700" },
  enviado: { label: "Enviado", badge: "bg-blue-100 text-blue-700" },
  aprovado: { label: "Aprovado", badge: "bg-emerald-100 text-emerald-700" },
  reprovado: { label: "Reprovado", badge: "bg-red-100 text-red-700" },
  cancelado: { label: "Cancelado", badge: "bg-zinc-200 text-zinc-700" },
};

const FORM_VAZIO = {
  cliente_id: "",
  titulo: "",
  descricao: "",
  valor: "",
  validade: "",
  status: "rascunho",
  observacao: "",
};

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtD = (iso) => iso ? new Date(iso + "T12:00:00").toLocaleDateString("pt-BR") : "-";

function ModalOrcamento({ item, clientes, onClose, onSalvo }) {
  const editando = Boolean(item?.id);
  const [form, setForm] = useState(editando ? {
    cliente_id: String(item.cliente_id || ""),
    titulo: item.titulo || "",
    descricao: item.descricao || "",
    valor: item.valor || "",
    validade: item.validade || "",
    status: item.status || "rascunho",
    observacao: item.observacao || "",
  } : FORM_VAZIO);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

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
      if (editando) {
        await api.put(`/orcamentos/${item.id}`, payload);
      } else {
        await api.post("/orcamentos", payload);
      }
      onSalvo();
      onClose();
    } catch (err) {
      setErro(err.response?.data?.erro || "Erro ao salvar orçamento.");
    } finally {
      setSalvando(false);
    }
  };

  const inp = "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
  const lbl = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-bold text-gray-800">{editando ? `Editar ${item.numero}` : "Novo Orçamento"}</h2>
            <p className="text-xs text-gray-400 mt-1">Proposta comercial para cliente com controle de status</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">x</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{erro}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Cliente *</label>
              <select value={form.cliente_id} onChange={(e) => set("cliente_id", e.target.value)} className={inp} required>
                <option value="">Selecione um cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inp}>
                {Object.entries(STATUS).map(([key, status]) => (
                  <option key={key} value={key}>{status.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={lbl}>Título *</label>
            <input value={form.titulo} onChange={(e) => set("titulo", e.target.value)} className={inp} required placeholder="Ex: Usinagem de lote piloto" />
          </div>

          <div>
            <label className={lbl}>Descrição</label>
            <textarea value={form.descricao} onChange={(e) => set("descricao", e.target.value)} rows={4} className={inp + " resize-none"} placeholder="Escopo, materiais, prazo, condições..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Valor *</label>
              <input type="number" min="0.01" step="0.01" value={form.valor} onChange={(e) => set("valor", e.target.value)} className={inp} required />
            </div>
            <div>
              <label className={lbl}>Validade</label>
              <input type="date" value={form.validade} onChange={(e) => set("validade", e.target.value)} className={inp} />
            </div>
            <div>
              <label className={lbl}>Observação</label>
              <input value={form.observacao} onChange={(e) => set("observacao", e.target.value)} className={inp} placeholder="Condição comercial" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-100 transition">Cancelar</button>
            <button type="submit" disabled={salvando} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg py-2.5 text-sm font-bold transition">
              {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Criar orçamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ModalExcluir({ item, onClose, onConfirmar }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h3 className="text-lg font-bold text-gray-800">Excluir orçamento?</h3>
        <p className="text-sm text-gray-500 mt-2">Esta ação remove <strong>{item.numero}</strong> permanentemente.</p>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2.5 text-sm font-semibold hover:bg-gray-100 transition">Cancelar</button>
          <button
            onClick={async () => {
              setLoading(true);
              await onConfirmar();
              setLoading(false);
            }}
            disabled={loading}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg py-2.5 text-sm font-bold transition"
          >
            {loading ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Orcamentos() {
  const [dados, setDados] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [resumo, setResumo] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [modalForm, setModalForm] = useState(false);
  const [itemEdit, setItemEdit] = useState(null);
  const [itemDel, setItemDel] = useState(null);
  const [toast, setToast] = useState(null);

  const notificar = (msg, tipo = "sucesso") => {
    setToast({ msg, tipo });
    window.clearTimeout(window.__orcToastTimer);
    window.__orcToastTimer = window.setTimeout(() => setToast(null), 3000);
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro("");
    try {
      const [resOrc, resClientes, resResumo] = await Promise.all([
        api.get("/orcamentos", { params: { q: filtro || undefined, status: filtroStatus || undefined } }),
        api.get("/clientes"),
        api.get("/orcamentos/resumo"),
      ]);
      setDados(resOrc.data);
      setClientes(resClientes.data);
      setResumo(resResumo.data);
    } catch (err) {
      setErro(err.response?.data?.erro || "Erro ao carregar orçamentos.");
    } finally {
      setCarregando(false);
    }
  }, [filtro, filtroStatus]);

  useEffect(() => {
    const timer = setTimeout(() => carregar(), 250);
    return () => clearTimeout(timer);
  }, [carregar]);

  const alterarStatus = async (item, status) => {
    try {
      const { data } = await api.patch(`/orcamentos/${item.id}/status`, { status });
      const mensagens = [`Status de ${item.numero} atualizado.`];
      const osNumero = data?.ordem_servico?.numero || data?.ordem_servico?.os;
      if (data?.ordem_servico_criada && osNumero) {
        mensagens.push(`${osNumero} criada automaticamente.`);
      }
      const lancamentoId = data?.lancamento_financeiro?.id;
      if (data?.lancamento_financeiro_criado && lancamentoId) {
        mensagens.push(`Lançamento financeiro #${lancamentoId} criado em Contas a Receber.`);
      }
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
    <div className="flex-1 bg-gray-50 min-h-screen p-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-semibold ${toast.tipo === "erro" ? "bg-red-500" : "bg-emerald-500"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-center gap-2 mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h9A2.25 2.25 0 0118.75 6v12A2.25 2.25 0 0116.5 20.25h-9A2.25 2.25 0 015.25 18V6A2.25 2.25 0 017.5 3.75zm2.25 4.5h4.5m-6 3h7.5m-7.5 3h5.25" />
        </svg>
        <h1 className="text-xl font-bold tracking-widest text-gray-700 uppercase">Orçamentos</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{resumo?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor em propostas</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{fmt(resumo?.valor_total)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor aprovado</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{fmt(resumo?.valor_aprovado)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Aguardando retorno</p>
          <p className="text-2xl font-bold text-amber-500 mt-1">{(resumo?.rascunho || 0) + (resumo?.enviado || 0)}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por número, cliente ou título..."
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([key, status]) => (
            <option key={key} value={key}>{status.label}</option>
          ))}
        </select>

        <button
          onClick={() => { setItemEdit(null); setModalForm(true); }}
          className="ml-auto flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded transition"
        >
          <span className="text-sm">+</span> Novo orçamento
        </button>
      </div>

      {erro && <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{erro}</div>}

      <div className="rounded-lg overflow-hidden shadow border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-orange-500 text-white text-xs uppercase tracking-wider">
              <th className="px-4 py-3 text-left">Número</th>
              <th className="px-4 py-3 text-left">Cliente / Título</th>
              <th className="px-4 py-3 text-center">Validade</th>
              <th className="px-4 py-3 text-center">Valor</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Carregando...</td></tr>
            ) : dados.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">Nenhum orçamento encontrado.</td></tr>
            ) : dados.map((item, idx) => (
              <tr key={item.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-orange-50 transition`}>
                <td className="px-4 py-3 font-bold text-orange-600">{item.numero}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-700">{item.cliente_nome}</p>
                  <p className="text-gray-500">{item.titulo}</p>
                  {item.descricao && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.descricao}</p>}
                </td>
                <td className="px-4 py-3 text-center text-gray-600">{fmtD(item.validade)}</td>
                <td className="px-4 py-3 text-center font-bold text-gray-800">{fmt(item.valor)}</td>
                <td className="px-4 py-3 text-center">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS[item.status]?.badge || "bg-gray-100 text-gray-700"}`}>
                    {STATUS[item.status]?.label || item.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {Object.keys(STATUS).filter((status) => status !== item.status).slice(0, 2).map((status) => (
                      <button
                        key={status}
                        onClick={() => alterarStatus(item, status)}
                        className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100"
                        title={`Mover para ${STATUS[status].label}`}
                      >
                        {STATUS[status].label}
                      </button>
                    ))}
                    <button onClick={() => { setItemEdit(item); setModalForm(true); }} className="text-gray-500 hover:text-blue-500 transition" title="Editar">Editar</button>
                    <button onClick={() => setItemDel(item)} className="text-gray-500 hover:text-red-500 transition" title="Excluir">Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-gray-400">{dados.length} orçamento(s) exibido(s)</div>

      {modalForm && (
        <ModalOrcamento
          item={itemEdit}
          clientes={clientes}
          onClose={() => { setModalForm(false); setItemEdit(null); }}
          onSalvo={() => { notificar(itemEdit ? "Orçamento atualizado." : "Orçamento criado."); carregar(); }}
        />
      )}
      {itemDel && <ModalExcluir item={itemDel} onClose={() => setItemDel(null)} onConfirmar={excluir} />}
    </div>
  );
}
