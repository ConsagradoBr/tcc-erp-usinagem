import { useState, useEffect, useCallback, useRef } from "react";
import api from "../api";

// ─── Máscaras ─────────────────────────────────────────────────────────────────
function mascaraDocumento(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11)
    return d.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}
function formatarDocumento(doc) { return doc ? mascaraDocumento(doc.replace(/\D/g, "")) : ""; }
function formatarTelefone(tel)  { return tel  ? mascaraTelefone(tel.replace(/\D/g, ""))  : ""; }

// ─── Parser XML NF-e ──────────────────────────────────────────────────────────
function parsearXmlNFe(xmlString) {
  const doc  = new DOMParser().parseFromString(xmlString, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("XML inválido ou corrompido.");
  const txt  = (parent, tag) => parent?.getElementsByTagNameNS("*", tag)[0]?.textContent?.trim() || "";
  const emit = doc.getElementsByTagNameNS("*", "emit")[0];
  const dest = doc.getElementsByTagNameNS("*", "dest")[0];
  if (!emit && !dest) throw new Error("Emitente/Destinatário não encontrados no XML.");

  const extrair = (node, rotulo) => {
    if (!node) return null;
    const e = node.getElementsByTagNameNS("*", "enderEmit")[0] || node.getElementsByTagNameNS("*", "enderDest")[0];
    const partes = [txt(e,"xLgr"), txt(e,"nro"), txt(e,"xBairro"), txt(e,"xMun"), txt(e,"UF")].filter(Boolean);
    const cep    = txt(e, "CEP");
    return {
      _rotulo:   rotulo,
      nome:      txt(node, "xNome"),
      documento: formatarDocumento(txt(node,"CNPJ") || txt(node,"CPF")),
      telefone:  formatarTelefone(txt(e, "fone")),
      email:     txt(node, "email"),
      endereco:  cep ? `${partes.join(", ")} - CEP: ${cep}` : partes.join(", "),
    };
  };
  return { emitente: extrair(emit, "Emitente"), destinatario: extrair(dest, "Destinatário") };
}

// ─── Parser JSON NF-e ─────────────────────────────────────────────────────────
function parsearJsonNFe(obj) {
  const inf = obj?.NFe?.infNFe || obj?.nfeProc?.NFe?.infNFe || obj;
  const extrair = (node, rotulo) => {
    if (!node) return null;
    const e = node.enderEmit || node.enderDest || {};
    const partes = [e.xLgr, e.nro, e.xBairro, e.xMun, e.UF].filter(Boolean);
    return {
      _rotulo:   rotulo,
      nome:      node.xNome || node.xFant || "",
      documento: formatarDocumento(String(node.CNPJ || node.CPF || "")),
      telefone:  formatarTelefone(String(e.fone || "")),
      email:     node.email || "",
      endereco:  e.CEP ? `${partes.join(", ")} - CEP: ${e.CEP}` : partes.join(", "),
    };
  };
  return { emitente: extrair(inf?.emit, "Emitente"), destinatario: extrair(inf?.dest, "Destinatário") };
}

// ─── Notificação ──────────────────────────────────────────────────────────────
function useNotificacao() {
  const [notif, setNotif] = useState(null);
  const mostrar = (msg, tipo = "sucesso") => {
    setNotif({ msg, tipo });
    setTimeout(() => setNotif(null), 3000);
  };
  return [notif, mostrar];
}

// ─── Formulário vazio ─────────────────────────────────────────────────────────
const FORM_VAZIO = { nome: "", documento: "", telefone: "", email: "", endereco: "" };

// ─── Modal Seleção Emitente/Destinatário ──────────────────────────────────────
function ModalSelecaoNFe({ dados, onSelecionar, onClose }) {
  const CardOpcao = ({ parte }) => {
    if (!parte) return null;
    return (
      <button
        onClick={() => onSelecionar(parte)}
        className="w-full text-left border-2 border-gray-200 hover:border-orange-400 hover:bg-orange-50 rounded-xl p-4 transition-all group"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500">{parte._rotulo}</span>
          <span className="text-xs text-gray-400 group-hover:text-orange-500 transition">Selecionar →</span>
        </div>
        <p className="font-semibold text-gray-800 text-sm">{parte.nome || "—"}</p>
        {parte.documento && <p className="text-xs text-gray-500 mt-0.5">{parte.documento}</p>}
        {parte.telefone  && <p className="text-xs text-gray-500">{parte.telefone}</p>}
        {parte.endereco  && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{parte.endereco}</p>}
      </button>
    );
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-700">Importar NF-e</h2>
            <p className="text-xs text-gray-500 mt-0.5">Quem deseja cadastrar como cliente?</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-3">
          <CardOpcao parte={dados.emitente} />
          <CardOpcao parte={dados.destinatario} />
        </div>
      </div>
    </div>
  );
}

// ─── Modal Duplicata ──────────────────────────────────────────────────────────
function ModalDuplicata({ existente, onSubstituir, onCadastrarMesmo, onCancelar }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Cliente já cadastrado</h3>
            <p className="text-xs text-gray-500">Documento já existe no sistema.</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 text-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cadastro existente</p>
          <p className="font-medium text-gray-800">{existente.nome}</p>
          <p className="text-gray-500 text-xs">{existente.documento}</p>
        </div>

        <p className="text-sm text-gray-600 mb-5">O que deseja fazer?</p>

        <div className="flex flex-col gap-2">
          <button onClick={onSubstituir}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2 text-sm font-semibold transition">
            Atualizar cadastro existente
          </button>
          <button onClick={onCadastrarMesmo}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
            Cadastrar mesmo assim
          </button>
          <button onClick={onCancelar}
            className="w-full text-gray-400 hover:text-gray-600 text-sm py-1 transition">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal Cadastro / Edição ──────────────────────────────────────────────────
function ModalCliente({ cliente, isImportado, onClose, onSalvo }) {
  const [form, setForm]         = useState(cliente ? { ...cliente } : { ...FORM_VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [notif, mostrar]        = useNotificacao();
  const idBase = cliente?.id ? `cliente-${cliente.id}` : "cliente-novo";

  const set = (f, v) => setForm((prev) => ({ ...prev, [f]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) { mostrar("Nome é obrigatório.", "erro"); return; }
    setSalvando(true);
    try {
      if (cliente?.id) {
        await api.put(`/clientes/${cliente.id}`, form);
      } else {
        await api.post("/clientes", form);
      }
      onSalvo(cliente?.id ? "atualizado" : "criado");
      onClose();
    } catch (err) {
      mostrar(err.response?.data?.erro || "Erro ao salvar.", "erro");
    } finally {
      setSalvando(false);
    }
  };

  const inp = "mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";
  const lbl = "text-xs font-semibold text-gray-500 uppercase tracking-wide";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            <h2 className="text-lg font-bold text-gray-700">
              {cliente?.id ? "Editar Cliente" : "Novo Cliente"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {isImportado && (
          <div className="mx-6 mt-4 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-xs text-orange-700 font-medium">
            ✓ Dados importados da NF-e — revise e confirme
          </div>
        )}

        {notif && (
          <div className={`mx-6 mt-3 px-3 py-2 rounded-lg text-xs font-semibold text-white ${notif.tipo === "erro" ? "bg-red-500" : "bg-green-500"}`}>
            {notif.msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-3">
          <div>
            <label htmlFor={`${idBase}-nome`} className={lbl}>
              Nome <span className="text-red-500">*</span>
            </label>
            <input
              id={`${idBase}-nome`}
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Nome completo ou razão social"
              required
              className={inp}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex-1">
              <label htmlFor={`${idBase}-documento`} className={lbl}>CPF / CNPJ</label>
              <input
                id={`${idBase}-documento`}
                value={form.documento || ""}
                onChange={(e) => set("documento", mascaraDocumento(e.target.value))}
                placeholder="000.000.000-00"
                inputMode="numeric"
                className={inp}
              />
            </div>
            <div className="flex-1">
              <label htmlFor={`${idBase}-telefone`} className={lbl}>Telefone</label>
              <input
                id={`${idBase}-telefone`}
                value={form.telefone || ""}
                onChange={(e) => set("telefone", mascaraTelefone(e.target.value))}
                placeholder="(19) 99999-9999"
                inputMode="numeric"
                className={inp}
              />
            </div>
          </div>
          <div>
            <label htmlFor={`${idBase}-email`} className={lbl}>E-mail</label>
            <input
              id={`${idBase}-email`}
              type="email"
              value={form.email || ""}
              onChange={(e) => set("email", e.target.value)}
              placeholder="contato@empresa.com"
              className={inp}
            />
          </div>
          <div>
            <label htmlFor={`${idBase}-endereco`} className={lbl}>Endereco</label>
            <input
              id={`${idBase}-endereco`}
              value={form.endereco || ""}
              onChange={(e) => set("endereco", e.target.value)}
              placeholder="Rua, numero, bairro, cidade"
              className={inp}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-100 transition">
              Cancelar
            </button>
            <button type="submit" disabled={salvando} className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white rounded-lg py-2 text-sm font-bold transition">
              {salvando ? "Salvando..." : cliente?.id ? "Salvar" : "Cadastrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Confirmação Exclusão ───────────────────────────────────────────────
function ModalConfirmacao({ cliente, onClose, onConfirmar }) {
  const [excluindo, setExcluindo] = useState(false);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
        </div>
        <h3 className="font-bold text-gray-800 mb-1">Excluir cliente?</h3>
        <p className="text-gray-500 text-sm mb-5">Tem certeza que deseja excluir <strong>{cliente.nome}</strong>?</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-semibold hover:bg-gray-100 transition">Cancelar</button>
          <button
            onClick={async () => { setExcluindo(true); await onConfirmar(); setExcluindo(false); }}
            disabled={excluindo}
            className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-lg py-2 text-sm font-bold transition"
          >
            {excluindo ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function Clientes() {
  const [clientes, setClientes]           = useState([]);
  const [filtro, setFiltro]               = useState("");
  const [carregando, setCarregando]       = useState(true);
  const [selecionados, setSelecionados]   = useState([]);
  const [notif, mostrar]                  = useNotificacao();

  // Modais
  const [modalForm, setModalForm]         = useState(false);
  const [clienteEdit, setClienteEdit]     = useState(null);
  const [isImportado, setIsImportado]     = useState(false);
  const [clienteDelete, setClienteDelete] = useState(null);
  const [dadosNFe, setDadosNFe]           = useState(null);
  const [modalDuplicata, setModalDuplicata] = useState(null); // { existente, novo }
  const [pendente, setPendente]           = useState(null);   // form aguardando decisão duplicata

  const inputFileRef = useRef(null);

  // ── Carregar ────────────────────────────────────────────────────────────────
  const carregarClientes = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await api.get("/clientes", { params: filtro ? { q: filtro } : {} });
      setClientes(res.data);
    } catch {
      mostrar("Erro ao carregar clientes.", "erro");
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    const t = setTimeout(() => carregarClientes(), 300);
    return () => clearTimeout(t);
  }, [carregarClientes]);

  // ── Seleção checkboxes ───────────────────────────────────────────────────────
  const toggleSelecionado = (id) =>
    setSelecionados((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  const toggleTodos = () =>
    setSelecionados(selecionados.length === clientes.length ? [] : clientes.map((c) => c.id));

  // ── Exportar / Compartilhar JSON do cliente ──────────────────────────────────
  const compartilhar = (c) => {
    const dados = {
      nome: c.nome, documento: c.documento, telefone: c.telefone,
      email: c.email, endereco: c.endereco, cadastrado_em: c.created_at,
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `cliente_${c.nome.replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrar("Arquivo exportado!");
  };

  // ── Importar NF-e ────────────────────────────────────────────────────────────
  const handleArquivoNFe = (e) => {
    const arquivo = e.target.files?.[0];
    inputFileRef.current.value = "";
    if (!arquivo) return;
    const ext = arquivo.name.split(".").pop().toLowerCase();
    if (!["xml", "json"].includes(ext)) { mostrar("Use arquivos .xml ou .json", "erro"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dados = ext === "xml"
          ? parsearXmlNFe(ev.target.result)
          : parsearJsonNFe(JSON.parse(ev.target.result));
        if (!dados.emitente && !dados.destinatario) { mostrar("Não foi possível extrair dados da NF-e.", "erro"); return; }
        setDadosNFe(dados);
      } catch (err) {
        mostrar(`Erro ao ler arquivo: ${err.message}`, "erro");
      }
    };
    reader.readAsText(arquivo, "UTF-8");
  };

  // Usuário escolheu emitente ou destinatário
  const handleSelecionarParte = (parte) => {
    const dadosCliente = { ...parte };
    delete dadosCliente._rotulo;
    setDadosNFe(null);

    // Verificar duplicata pelo documento (ignora se vazio)
    if (dadosCliente.documento) {
      const docLimpo = dadosCliente.documento.replace(/\D/g, "");
      const duplicado = clientes.find(
        (c) => c.documento && c.documento.replace(/\D/g, "") === docLimpo
      );
      if (duplicado) {
        setPendente(dadosCliente);
        setModalDuplicata({ existente: duplicado, novo: dadosCliente });
        return;
      }
    }

    // Sem duplicata → abre modal de cadastro pré-preenchido
    setClienteEdit(null);
    setIsImportado(true);
    setClienteEdit(dadosCliente);
    setModalForm(true);
  };

  // Decisão do modal de duplicata
  const handleSubstituir = async () => {
    // Atualiza o cadastro existente com os novos dados da NF-e
    try {
      await api.put(`/clientes/${modalDuplicata.existente.id}`, pendente);
      mostrar("Cadastro atualizado com dados da NF-e!");
      carregarClientes();
    } catch {
      mostrar("Erro ao atualizar.", "erro");
    }
    setModalDuplicata(null);
    setPendente(null);
  };

  const handleCadastrarMesmo = () => {
    setModalDuplicata(null);
    setClienteEdit(pendente);
    setIsImportado(true);
    setModalForm(true);
    setPendente(null);
  };

  // ── Excluir ──────────────────────────────────────────────────────────────────
  const handleExcluir = async () => {
    try {
      await api.delete(`/clientes/${clienteDelete.id}`);
      mostrar("Cliente excluído.");
      setClienteDelete(null);
      carregarClientes();
    } catch {
      mostrar("Erro ao excluir.", "erro");
    }
  };

  const abrirNovo   = ()  => { setClienteEdit(null); setIsImportado(false); setModalForm(true); };
  const abrirEdicao = (c) => { setClienteEdit(c);    setIsImportado(false); setModalForm(true); };
  const fecharModal = ()  => { setModalForm(false); setClienteEdit(null); setIsImportado(false); };

  return (
    <div className="flex-1 min-w-0 bg-gray-50 min-h-screen p-3 sm:p-4 lg:p-6">

      {/* Notificação */}
      {notif && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-semibold transition-all ${notif.tipo === "erro" ? "bg-red-500" : "bg-green-500"}`}>
          {notif.msg}
        </div>
      )}

      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-6 text-center sm:text-left">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/>
        </svg>
        <h1 className="text-xl font-bold tracking-widest text-gray-700 uppercase">Clientes</h1>
      </div>

      {/* Barra de ações */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1 text-sm font-semibold text-gray-600 uppercase tracking-wide">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"/></svg>
          Filter
        </div>

        <input
          type="text"
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Buscar por nome, CPF ou e-mail..."
          className="border border-gray-300 rounded px-3 py-1.5 text-sm w-full sm:w-72 md:w-60 focus:outline-none focus:ring-2 focus:ring-orange-400"
        />

        {/* Importar NF-e */}
        <input ref={inputFileRef} type="file" accept=".xml,.json" className="hidden" onChange={handleArquivoNFe} />
        <button
          onClick={() => inputFileRef.current?.click()}
          className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded transition"
          title="Importar NF-e (.xml ou .json)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Importar NF-e
        </button>

        {/* Novo cliente */}
        <button
          onClick={abrirNovo}
          className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white text-xs font-bold uppercase px-3 py-1.5 rounded transition"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
          Novo
        </button>
      </div>

      {/* Tabela */}
      <div className="rounded-lg overflow-x-auto shadow border border-gray-200 bg-white">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="bg-orange-500 text-white text-xs uppercase tracking-wider">
              <th className="px-3 py-3 text-left w-8">
                <input
                  type="checkbox"
                  checked={selecionados.length === clientes.length && clientes.length > 0}
                  onChange={toggleTodos}
                  className="accent-white cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left">Nome</th>
              <th className="px-4 py-3 text-center">CPF / CNPJ</th>
              <th className="px-4 py-3 text-center">Telefone</th>
              <th className="px-4 py-3 text-center">E-mail</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400 bg-white">Carregando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400 bg-white">
                {filtro ? `Nenhum resultado para "${filtro}"` : "Nenhum cliente cadastrado."}
              </td></tr>
            ) : (
              clientes.map((c, idx) => (
                <tr key={c.id} className={`border-t border-gray-100 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-orange-50 transition`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selecionados.includes(c.id)} onChange={() => toggleSelecionado(c.id)} className="accent-orange-500 cursor-pointer" />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-700">{c.nome}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.documento || "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.telefone  || "—"}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{c.email     || "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-3">
                      {/* Compartilhar */}
                      <button onClick={() => compartilhar(c)} title="Exportar JSON" className="text-gray-500 hover:text-orange-500 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/></svg>
                      </button>
                      {/* Editar */}
                      <button onClick={() => abrirEdicao(c)} title="Editar" className="text-gray-500 hover:text-blue-500 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      {/* Excluir */}
                      <button onClick={() => setClienteDelete(c)} title="Excluir" className="text-gray-500 hover:text-red-500 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="mt-3 text-xs text-gray-400">
        {clientes.length} cliente(s) exibido(s)
        {selecionados.length > 0 && (
          <span className="ml-3 text-orange-500 font-semibold">{selecionados.length} selecionado(s)</span>
        )}
      </div>

      {/* ── Modais ── */}
      {dadosNFe && (
        <ModalSelecaoNFe dados={dadosNFe} onSelecionar={handleSelecionarParte} onClose={() => setDadosNFe(null)} />
      )}
      {modalDuplicata && (
        <ModalDuplicata
          existente={modalDuplicata.existente}
          onSubstituir={handleSubstituir}
          onCadastrarMesmo={handleCadastrarMesmo}
          onCancelar={() => { setModalDuplicata(null); setPendente(null); }}
        />
      )}
      {modalForm && (
        <ModalCliente
          cliente={clienteEdit}
          isImportado={isImportado}
          onClose={fecharModal}
          onSalvo={(acao) => { mostrar(`Cliente ${acao} com sucesso!`); carregarClientes(); }}
        />
      )}
      {clienteDelete && (
        <ModalConfirmacao cliente={clienteDelete} onClose={() => setClienteDelete(null)} onConfirmar={handleExcluir} />
      )}
    </div>
  );
}
