import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import api from "../api";
import { getStoredUser, hasPermission } from "../auth";
import {
  IconClients,
  IconDollar,
  IconQuotes,
  IconServiceOrder,
} from "../assets/assets-map";

const FORM_VAZIO = { nome: "", documento: "", telefone: "", email: "", endereco: "" };

const CONTEXTO_VAZIO = Object.freeze({
  orcamentos: null,
  financeiro: null,
  ordens: null,
});

const EMPTY_ORCAMENTOS = Object.freeze({
  total: 0,
  emDecisao: 0,
  aprovados: 0,
  valor: 0,
  ultimoNumero: "",
  ultimoStatus: "",
  ultimaData: null,
});

const EMPTY_FINANCEIRO = Object.freeze({
  total: 0,
  receberPendente: 0,
  atrasados: 0,
  saldoAberto: 0,
  ultimoVencimento: null,
  ultimaData: null,
});

const EMPTY_OS = Object.freeze({
  total: 0,
  emFluxo: 0,
  concluidas: 0,
  prioridadeAlta: 0,
  ultimoNumero: "",
  ultimoStatus: "",
  ultimaData: null,
});

const QUICK_FILTERS = [
  { id: "todos", label: "Todos" },
  { id: "cadastro", label: "Cadastro pendente" },
  { id: "comercial", label: "Comercial" },
  { id: "operacao", label: "Operação" },
  { id: "financeiro", label: "Financeiro" },
];

const INPUT_BASE =
  "mt-2 w-full rounded-[18px] border border-[color:var(--cm-line)] bg-white/75 px-4 py-3 text-sm text-[var(--cm-text)] placeholder:text-[var(--cm-muted)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] outline-none transition focus:border-[color:rgba(180,99,56,0.38)] focus:ring-2 focus:ring-[rgba(180,99,56,0.16)]";

const LABEL_BASE = "text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--cm-muted)]";

function mascaraDocumento(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function mascaraTelefone(valor) {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    return d
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function formatarDocumento(doc) {
  return doc ? mascaraDocumento(doc.replace(/\D/g, "")) : "";
}

function formatarTelefone(tel) {
  return tel ? mascaraTelefone(tel.replace(/\D/g, "")) : "";
}

function parsearXmlNFe(xmlString) {
  const doc = new DOMParser().parseFromString(xmlString, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("XML inválido ou corrompido.");

  const txt = (parent, tag) =>
    parent?.getElementsByTagNameNS("*", tag)[0]?.textContent?.trim() || "";

  const emit = doc.getElementsByTagNameNS("*", "emit")[0];
  const dest = doc.getElementsByTagNameNS("*", "dest")[0];
  if (!emit && !dest) throw new Error("Emitente/Destinatário não encontrados no XML.");

  const extrair = (node, rotulo) => {
    if (!node) return null;
    const e =
      node.getElementsByTagNameNS("*", "enderEmit")[0] ||
      node.getElementsByTagNameNS("*", "enderDest")[0];
    const partes = [txt(e, "xLgr"), txt(e, "nro"), txt(e, "xBairro"), txt(e, "xMun"), txt(e, "UF")].filter(Boolean);
    const cep = txt(e, "CEP");
    return {
      _rotulo: rotulo,
      nome: txt(node, "xNome"),
      documento: formatarDocumento(txt(node, "CNPJ") || txt(node, "CPF")),
      telefone: formatarTelefone(txt(e, "fone")),
      email: txt(node, "email"),
      endereco: cep ? `${partes.join(", ")} - CEP: ${cep}` : partes.join(", "),
    };
  };

  return { emitente: extrair(emit, "Emitente"), destinatario: extrair(dest, "Destinatário") };
}

function parsearJsonNFe(obj) {
  const inf = obj?.NFe?.infNFe || obj?.nfeProc?.NFe?.infNFe || obj;

  const extrair = (node, rotulo) => {
    if (!node) return null;
    const e = node.enderEmit || node.enderDest || {};
    const partes = [e.xLgr, e.nro, e.xBairro, e.xMun, e.UF].filter(Boolean);
    return {
      _rotulo: rotulo,
      nome: node.xNome || node.xFant || "",
      documento: formatarDocumento(String(node.CNPJ || node.CPF || "")),
      telefone: formatarTelefone(String(e.fone || "")),
      email: node.email || "",
      endereco: e.CEP ? `${partes.join(", ")} - CEP: ${e.CEP}` : partes.join(", "),
    };
  };

  return { emitente: extrair(inf?.emit, "Emitente"), destinatario: extrair(inf?.dest, "Destinatário") };
}

function useNotificacao() {
  const [notif, setNotif] = useState(null);

  const mostrar = (msg, tipo = "sucesso") => {
    setNotif({ msg, tipo });
    window.clearTimeout(window.__ampClientesToast);
    window.__ampClientesToast = window.setTimeout(() => setNotif(null), 3200);
  };

  return [notif, mostrar];
}

function normalizarNomeCliente(valor = "") {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function numeroSeguro(valor) {
  return Number(valor || 0);
}

function fmtCurrency(valor) {
  return numeroSeguro(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

function fmtNumber(valor) {
  return numeroSeguro(valor).toLocaleString("pt-BR");
}

function fmtDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("pt-BR");
}

function escolherUltimaData(...datas) {
  return datas
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] || null;
}

function calcularCompletude(cliente) {
  const checks = [
    { label: "Documento", ok: Boolean(cliente.documento) },
    { label: "Telefone", ok: Boolean(cliente.telefone) },
    { label: "E-mail", ok: Boolean(cliente.email) },
    { label: "Endereço", ok: Boolean(cliente.endereco) },
  ];
  const ok = checks.filter((item) => item.ok).length;
  return {
    score: Math.round((ok / checks.length) * 100),
    faltantes: checks.filter((item) => !item.ok).map((item) => item.label),
    completo: ok === checks.length,
  };
}

function toneClasses(tone) {
  switch (tone) {
    case "danger":
      return {
        badge:
          "border-[rgba(187,103,80,0.22)] bg-[rgba(187,103,80,0.12)] text-[var(--cm-danger)]",
        text: "text-[var(--cm-danger)]",
        dot: "bg-[var(--cm-danger)]",
      };
    case "warning":
      return {
        badge:
          "border-[rgba(173,122,62,0.22)] bg-[rgba(173,122,62,0.12)] text-[var(--cm-warning)]",
        text: "text-[var(--cm-warning)]",
        dot: "bg-[var(--cm-warning)]",
      };
    case "positive":
      return {
        badge:
          "border-[rgba(63,141,114,0.22)] bg-[rgba(63,141,114,0.12)] text-[var(--cm-positive)]",
        text: "text-[var(--cm-positive)]",
        dot: "bg-[var(--cm-positive)]",
      };
    case "accent":
      return {
        badge:
          "border-[rgba(180,99,56,0.22)] bg-[rgba(180,99,56,0.12)] text-[var(--cm-accent)]",
        text: "text-[var(--cm-accent)]",
        dot: "bg-[var(--cm-accent)]",
      };
    default:
      return {
        badge: "border-[color:var(--cm-line)] bg-white/70 text-[var(--cm-text)]",
        text: "text-[var(--cm-text)]",
        dot: "bg-[var(--cm-text)]",
      };
  }
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

function ToneBadge({ tone = "default", children }) {
  const styles = toneClasses(tone);
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {children}
    </span>
  );
}

function ProgressBar({ value, tone = "accent" }) {
  const styles = toneClasses(tone);
  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(37,42,49,0.08)]">
      <div className={`h-full rounded-full ${styles.dot}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function PriorityCard({ item, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="w-full rounded-[24px] border border-[color:var(--cm-line)] bg-white/38 px-4 py-4 text-left transition hover:-translate-y-[1px] hover:bg-white/55"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{item.nome}</p>
          <p className="mt-1 text-sm text-[var(--cm-muted)]">{item.nextAction}</p>
        </div>
        <ToneBadge tone={item.statusTone}>{item.statusLabel}</ToneBadge>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--cm-muted)]">
        <span>{item.documento || "Documento pendente"}</span>
        <span>{item.telefone || item.email || "Sem contato direto"}</span>
      </div>
    </button>
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

function EmptyState({ filtroAtivo, onNovo, onImportar }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-[18px] border border-[color:var(--cm-line)] bg-white/46">
        <img src={IconClients} alt="" className="w-7 opacity-70" />
      </div>
      <h3 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">
        {filtroAtivo ? "Nenhum cliente encontrado nesse recorte" : "Sua carteira ainda está vazia"}
      </h3>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[var(--cm-muted)]">
        {filtroAtivo
          ? "Ajuste a busca ou os filtros rápidos para voltar a enxergar oportunidades, pendências e clientes ativos."
          : "Cadastre manualmente ou use a importação por NF-e para montar uma base pronta para comercial, operação e financeiro."}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={onNovo}
          className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
        >
          Novo cliente
        </button>
        <button
          type="button"
          onClick={onImportar}
          className="rounded-full border border-[color:var(--cm-line)] bg-white/75 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
        >
          Importar NF-e
        </button>
      </div>
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

function ModalSelecaoNFe({ dados, onSelecionar, onClose }) {
  const CardOpcao = ({ parte }) => {
    if (!parte) return null;
    return (
      <button
        type="button"
        onClick={() => onSelecionar(parte)}
        className="w-full rounded-[24px] border border-[color:var(--cm-line)] bg-white/70 p-4 text-left transition hover:-translate-y-[1px] hover:bg-white"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToneBadge tone="accent">{parte._rotulo}</ToneBadge>
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--cm-muted)]">Selecionar</span>
        </div>
        <p className="mt-4 text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{parte.nome || "—"}</p>
        <div className="mt-3 grid gap-2 text-sm text-[var(--cm-muted)]">
          <span>{parte.documento || "Documento não identificado"}</span>
          <span>{parte.telefone || parte.email || "Sem contato extraído"}</span>
          <span>{parte.endereco || "Endereço não disponível"}</span>
        </div>
      </button>
    );
  };

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-2xl rounded-[32px] p-6 shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="cm-label">Importação NF-e</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Quem entra na carteira?</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--cm-muted)]">
              Escolha quem será cadastrado como cliente a partir do arquivo lido. O restante do fluxo continua igual:
              duplicata, edição e confirmação.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--cm-line)] bg-white/72 p-3 text-[var(--cm-muted)] transition hover:text-[var(--cm-text)]"
            aria-label="Fechar seleção de NF-e"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <CardOpcao parte={dados.emitente} />
          <CardOpcao parte={dados.destinatario} />
        </div>
      </div>
    </ModalContainer>
  );
}

function ModalDuplicata({ existente, novo, onSubstituir, onCadastrarMesmo, onCancelar }) {
  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-xl rounded-[32px] p-6 shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(187,103,80,0.12)] text-[var(--cm-danger)]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Zm8.25-4.5a8.25 8.25 0 11-16.5 0 8.25 8.25 0 0116.5 0Z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="cm-label">Duplicidade detectada</p>
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Esse documento já existe na base</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
              Você pode atualizar o cadastro existente com os dados da NF-e ou forçar um novo registro mesmo assim.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/52 p-4">
            <p className="cm-label">Cadastro existente</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{existente.nome}</p>
            <div className="mt-3 space-y-2 text-sm text-[var(--cm-muted)]">
              <p>{existente.documento || "Sem documento"}</p>
              <p>{existente.telefone || existente.email || "Sem contato direto"}</p>
              <p>{existente.endereco || "Sem endereço"}</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/52 p-4">
            <p className="cm-label">Dados importados</p>
            <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{novo.nome}</p>
            <div className="mt-3 space-y-2 text-sm text-[var(--cm-muted)]">
              <p>{novo.documento || "Sem documento"}</p>
              <p>{novo.telefone || novo.email || "Sem contato direto"}</p>
              <p>{novo.endereco || "Sem endereço"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onSubstituir}
            className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
          >
            Atualizar cadastro existente
          </button>
          <button
            type="button"
            onClick={onCadastrarMesmo}
            className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
          >
            Cadastrar mesmo assim
          </button>
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-full px-5 py-3 text-sm font-semibold text-[var(--cm-muted)] transition hover:text-[var(--cm-text)]"
          >
            Cancelar
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}

function ModalCliente({ cliente, isImportado, onClose, onSalvo }) {
  const [form, setForm] = useState(cliente ? { ...cliente } : { ...FORM_VAZIO });
  const [salvando, setSalvando] = useState(false);
  const [notif, mostrar] = useNotificacao();
  const idBase = cliente?.id ? `cliente-${cliente.id}` : "cliente-novo";
  const completude = calcularCompletude(form);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim()) {
      mostrar("Nome é obrigatório.", "erro");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        ...form,
        documento: form.documento?.trim() || "",
        telefone: form.telefone?.trim() || "",
        email: form.email?.trim() || "",
        endereco: form.endereco?.trim() || "",
      };
      const res = cliente?.id
        ? await api.put(`/clientes/${cliente.id}`, payload)
        : await api.post("/clientes", payload);
      onSalvo({ acao: cliente?.id ? "atualizado" : "criado", cliente: res.data });
      onClose();
    } catch (err) {
      mostrar(err.response?.data?.erro || "Erro ao salvar.", "erro");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <ModalContainer>
      <div className="cm-surface w-full max-w-4xl rounded-[34px] shadow-[0_24px_80px_rgba(22,18,14,0.28)]">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1.5fr)_20rem]">
          <div className="p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="cm-label">{cliente?.id ? "Edição guiada" : "Novo cliente"}</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">
                  {cliente?.id ? "Refinar cadastro da carteira" : "Abrir nova frente de relacionamento"}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--cm-muted)]">
                  O cadastro agora nasce com foco operacional: contato, documento, endereço e prontidão para comercial,
                  produção e financeiro.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-[color:var(--cm-line)] bg-white/72 p-3 text-[var(--cm-muted)] transition hover:text-[var(--cm-text)]"
                aria-label="Fechar formulário de cliente"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isImportado && (
              <div className="mt-5 rounded-[20px] border border-[rgba(180,99,56,0.18)] bg-[rgba(180,99,56,0.12)] px-4 py-3 text-sm text-[var(--cm-accent)]">
                Dados importados da NF-e. Revise os campos e confirme para consolidar o cliente na carteira.
              </div>
            )}

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
                <label htmlFor={`${idBase}-nome`} className={LABEL_BASE}>
                  Nome <span className="text-[var(--cm-danger)]">*</span>
                </label>
                <input
                  id={`${idBase}-nome`}
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  placeholder="Nome completo ou razão social"
                  className={INPUT_BASE}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idBase}-documento`} className={LABEL_BASE}>CPF / CNPJ</label>
                  <input
                    id={`${idBase}-documento`}
                    value={form.documento || ""}
                    onChange={(e) => set("documento", mascaraDocumento(e.target.value))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className={INPUT_BASE}
                  />
                </div>
                <div>
                  <label htmlFor={`${idBase}-telefone`} className={LABEL_BASE}>Telefone</label>
                  <input
                    id={`${idBase}-telefone`}
                    value={form.telefone || ""}
                    onChange={(e) => set("telefone", mascaraTelefone(e.target.value))}
                    placeholder="(19) 99999-9999"
                    inputMode="numeric"
                    className={INPUT_BASE}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor={`${idBase}-email`} className={LABEL_BASE}>E-mail</label>
                  <input
                    id={`${idBase}-email`}
                    type="email"
                    value={form.email || ""}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="contato@empresa.com"
                    className={INPUT_BASE}
                  />
                </div>
                <div>
                  <label htmlFor={`${idBase}-endereco`} className={LABEL_BASE}>Endereço</label>
                  <input
                    id={`${idBase}-endereco`}
                    value={form.endereco || ""}
                    onChange={(e) => set("endereco", e.target.value)}
                    placeholder="Rua, número, bairro, cidade"
                    className={INPUT_BASE}
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
                  {salvando ? "Salvando..." : cliente?.id ? "Salvar alterações" : "Cadastrar cliente"}
                </button>
              </div>
            </form>
          </div>

          <aside className="rounded-b-[34px] border-t border-[color:var(--cm-line)] bg-[rgba(37,42,49,0.96)] p-6 text-white lg:rounded-r-[34px] lg:rounded-bl-none lg:border-l lg:border-t-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Prontidão do cadastro</p>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-4xl font-semibold tracking-[-0.05em]">{completude.score}%</p>
                <p className="mt-2 text-sm text-white/68">
                  {completude.completo ? "Cadastro pronto para o fluxo completo." : "Ainda há pontos para destravar."}
                </p>
              </div>
              <ToneBadge tone={completude.completo ? "positive" : "warning"}>
                {completude.completo ? "Completo" : "Em evolução"}
              </ToneBadge>
            </div>

            <div className="mt-5 space-y-3 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <InfoItem label="Nome" value={form.nome || "Aguardando preenchimento"} subtle={!form.nome} />
              <InfoItem label="Documento" value={form.documento || "Pendente"} subtle={!form.documento} />
              <InfoItem label="Contato" value={form.telefone || form.email || "Sem canal definido"} subtle={!form.telefone && !form.email} />
              <InfoItem label="Endereço" value={form.endereco || "Pendente"} subtle={!form.endereco} title={form.endereco || ""} />
            </div>

            {!completude.completo && (
              <div className="mt-5 rounded-[24px] border border-white/10 bg-white/6 p-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-white/52">Campos que faltam</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {completude.faltantes.map((item) => (
                    <span key={item} className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs uppercase tracking-[0.14em] text-white/72">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </ModalContainer>
  );
}

function ModalConfirmacao({ cliente, onClose, onConfirmar }) {
  const [excluindo, setExcluindo] = useState(false);

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
            <h3 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Excluir esse cliente da carteira?</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
              Você está removendo <strong className="text-[var(--cm-text)]">{cliente.nome}</strong>. Use isso apenas quando tiver certeza de que o cadastro não deve permanecer no histórico.
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
            disabled={excluindo}
            onClick={async () => {
              setExcluindo(true);
              await onConfirmar();
              setExcluindo(false);
            }}
            className="rounded-full bg-[var(--cm-danger)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {excluindo ? "Excluindo..." : "Excluir cliente"}
          </button>
        </div>
      </div>
    </ModalContainer>
  );
}

export default function Clientes() {
  const user = getStoredUser();
  const canOrcamentos = hasPermission(user, "orcamentos");
  const canFinanceiro = hasPermission(user, "financeiro");
  const canOS = hasPermission(user, "ordens_servico");

  const [clientes, setClientes] = useState([]);
  const [filtro, setFiltro] = useState("");
  const [filtroRapido, setFiltroRapido] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [carregandoContexto, setCarregandoContexto] = useState(false);
  const [contextoErro, setContextoErro] = useState(false);
  const [contexto, setContexto] = useState(CONTEXTO_VAZIO);
  const [selecionados, setSelecionados] = useState([]);
  const [clienteFocoId, setClienteFocoId] = useState(null);
  const [notif, mostrar] = useNotificacao();

  const [modalForm, setModalForm] = useState(false);
  const [clienteEdit, setClienteEdit] = useState(null);
  const [isImportado, setIsImportado] = useState(false);
  const [clienteDelete, setClienteDelete] = useState(null);
  const [dadosNFe, setDadosNFe] = useState(null);
  const [modalDuplicata, setModalDuplicata] = useState(null);
  const [pendente, setPendente] = useState(null);

  const inputFileRef = useRef(null);

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
  }, [filtro, mostrar]);

  const carregarContexto = useCallback(async () => {
    const requests = [];

    if (canOrcamentos) requests.push(["orcamentos", api.get("/orcamentos")]);
    if (canFinanceiro) requests.push(["financeiro", api.get("/financeiro")]);
    if (canOS) requests.push(["ordens", api.get("/ordens-servico")]);

    if (!requests.length) {
      setContexto(CONTEXTO_VAZIO);
      setContextoErro(false);
      return;
    }

    setCarregandoContexto(true);
    const next = {
      orcamentos: canOrcamentos ? [] : null,
      financeiro: canFinanceiro ? [] : null,
      ordens: canOS ? [] : null,
    };

    try {
      const resultado = await Promise.allSettled(requests.map(([, promise]) => promise));
      let houveErro = false;
      resultado.forEach((item, index) => {
        const key = requests[index][0];
        if (item.status === "fulfilled") next[key] = item.value.data;
        else houveErro = true;
      });
      setContexto(next);
      setContextoErro(houveErro);
    } catch {
      setContexto(next);
      setContextoErro(true);
    } finally {
      setCarregandoContexto(false);
    }
  }, [canFinanceiro, canOS, canOrcamentos]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      carregarClientes();
    }, 260);
    return () => window.clearTimeout(timer);
  }, [carregarClientes]);

  useEffect(() => {
    carregarContexto();
  }, [carregarContexto]);

  const orcamentosPorCliente = useMemo(() => {
    const mapa = new Map();
    if (!Array.isArray(contexto.orcamentos)) return mapa;

    contexto.orcamentos.forEach((item) => {
      const atual = mapa.get(item.cliente_id) || { ...EMPTY_ORCAMENTOS };
      atual.total += 1;
      atual.valor += numeroSeguro(item.valor);
      if (item.status === "rascunho" || item.status === "enviado") atual.emDecisao += 1;
      if (item.status === "aprovado") atual.aprovados += 1;
      atual.ultimoNumero = item.numero || atual.ultimoNumero;
      atual.ultimoStatus = item.status || atual.ultimoStatus;
      atual.ultimaData = escolherUltimaData(atual.ultimaData, item.created_at);
      mapa.set(item.cliente_id, atual);
    });

    return mapa;
  }, [contexto.orcamentos]);

  const financeiroPorCliente = useMemo(() => {
    const mapa = new Map();
    if (!Array.isArray(contexto.financeiro)) return mapa;

    contexto.financeiro.forEach((item) => {
      if (!item.cliente_id) return;
      const atual = mapa.get(item.cliente_id) || { ...EMPTY_FINANCEIRO };
      atual.total += 1;
      if (item.tipo === "receber" && item.status !== "pago") atual.receberPendente += 1;
      if (item.status === "atrasado") atual.atrasados += 1;
      if (item.status !== "pago") atual.saldoAberto += numeroSeguro(item.valor_total || item.valor);
      atual.ultimoVencimento = escolherUltimaData(atual.ultimoVencimento, item.vencimento);
      atual.ultimaData = escolherUltimaData(atual.ultimaData, item.created_at, item.vencimento);
      mapa.set(item.cliente_id, atual);
    });

    return mapa;
  }, [contexto.financeiro]);

  const ordensPorCliente = useMemo(() => {
    const mapa = new Map();
    if (!Array.isArray(contexto.ordens)) return mapa;

    contexto.ordens.forEach((item) => {
      const key = normalizarNomeCliente(item.cliente);
      if (!key) return;
      const atual = mapa.get(key) || { ...EMPTY_OS };
      atual.total += 1;
      if (item.status !== "concluido") atual.emFluxo += 1;
      if (item.status === "concluido") atual.concluidas += 1;
      if (item.prioridade === "alta") atual.prioridadeAlta += 1;
      atual.ultimoNumero = item.os || item.numero || atual.ultimoNumero;
      atual.ultimoStatus = item.status || atual.ultimoStatus;
      atual.ultimaData = escolherUltimaData(atual.ultimaData, item.created_at);
      mapa.set(key, atual);
    });

    return mapa;
  }, [contexto.ordens]);

  const clientesEnriquecidos = useMemo(() => {
    return clientes.map((cliente) => {
      const cadastro = calcularCompletude(cliente);
      const orcamentos = orcamentosPorCliente.get(cliente.id) || EMPTY_ORCAMENTOS;
      const financeiro = financeiroPorCliente.get(cliente.id) || EMPTY_FINANCEIRO;
      const ordens = ordensPorCliente.get(normalizarNomeCliente(cliente.nome)) || EMPTY_OS;

      const semContato = !cliente.telefone && !cliente.email;
      const cadastroCritico = !cliente.documento || semContato;
      const aprovadosSemOS = canOrcamentos && canOS && orcamentos.aprovados > 0 && ordens.total === 0;
      const emDecisao = canOrcamentos && orcamentos.emDecisao > 0;
      const emOperacao = canOS && ordens.emFluxo > 0;
      const financeiroCritico = canFinanceiro && financeiro.atrasados > 0;
      const financeiroAberto = canFinanceiro && financeiro.receberPendente > 0;
      const carteiraAtiva = orcamentos.total > 0 || ordens.total > 0 || financeiro.total > 0;

      let statusTone = "positive";
      let statusLabel = "Estável";
      let nextAction = "Relacionamento estável e pronto para crescer";
      let nextNote = "Use esse cadastro como base para novas oportunidades ou reforço de recorrência.";
      let prioridade = 0;

      if (cadastroCritico) {
        statusTone = "warning";
        statusLabel = "Cadastro pendente";
        nextAction = !cliente.documento ? "Concluir documento fiscal" : "Definir canal de contato principal";
        nextNote = "Sem documento e contato confiáveis, o fluxo com orçamento, OS e cobrança fica travado.";
        prioridade = 5;
      } else if (financeiroCritico) {
        statusTone = "danger";
        statusLabel = "Cobrança crítica";
        nextAction = "Atuar em títulos vencidos";
        nextNote = "Há lançamentos em atraso ligados a esse cliente. Vale priorizar contato e renegociação.";
        prioridade = 6;
      } else if (aprovadosSemOS) {
        statusTone = "accent";
        statusLabel = "Aprovado sem OS";
        nextAction = "Converter aprovação em ordem de serviço";
        nextNote = "O comercial já aprovou valor, mas a execução ainda não entrou oficialmente em produção.";
        prioridade = 4;
      } else if (emDecisao) {
        statusTone = "accent";
        statusLabel = "Comercial ativo";
        nextAction = "Retomar orçamento em aberto";
        nextNote = "Há proposta em decisão. Esse é o momento de follow-up e fechamento.";
        prioridade = 3;
      } else if (emOperacao) {
        statusTone = "warning";
        statusLabel = "Em produção";
        nextAction = "Acompanhar ordens em fluxo";
        nextNote = "O cliente já está em execução. Mantenha prazo, qualidade e alinhamento do serviço.";
        prioridade = 3;
      } else if (financeiroAberto) {
        statusTone = "accent";
        statusLabel = "Recebimento aberto";
        nextAction = "Monitorar recebimento previsto";
        nextNote = "Existe valor em aberto vinculado ao cliente. Uma boa visibilidade reduz surpresas no caixa.";
        prioridade = 2;
      } else if (!carteiraAtiva) {
        statusTone = "default";
        statusLabel = "Sem atividade";
        nextAction = "Abrir primeira oportunidade comercial";
        nextNote = "Cadastro pronto, mas ainda sem vínculo operacional. Bom alvo para prospecção ou retomada.";
        prioridade = 2;
      }

      const ultimaMovimentacao = escolherUltimaData(
        cliente.created_at,
        orcamentos.ultimaData,
        financeiro.ultimaData,
        ordens.ultimaData
      );

      return {
        ...cliente,
        completude: cadastro.score,
        faltantes: cadastro.faltantes,
        cadastroCompleto: cadastro.completo,
        orcamentos,
        financeiro,
        ordens,
        aprovadosSemOS,
        carteiraAtiva,
        statusTone,
        statusLabel,
        nextAction,
        nextNote,
        prioridade,
        ultimaMovimentacao,
      };
    });
  }, [canFinanceiro, canOS, canOrcamentos, clientes, financeiroPorCliente, ordensPorCliente, orcamentosPorCliente]);

  const contagemFiltros = useMemo(() => {
    return {
      todos: clientesEnriquecidos.length,
      cadastro: clientesEnriquecidos.filter((item) => item.statusLabel === "Cadastro pendente").length,
      comercial: clientesEnriquecidos.filter((item) => item.statusLabel === "Comercial ativo" || item.statusLabel === "Aprovado sem OS").length,
      operacao: clientesEnriquecidos.filter((item) => item.statusLabel === "Em produção").length,
      financeiro: clientesEnriquecidos.filter((item) => item.statusLabel === "Cobrança crítica" || item.statusLabel === "Recebimento aberto").length,
    };
  }, [clientesEnriquecidos]);

  const clientesVisiveis = useMemo(() => {
    return clientesEnriquecidos.filter((item) => {
      if (filtroRapido === "cadastro") return item.statusLabel === "Cadastro pendente";
      if (filtroRapido === "comercial") return item.statusLabel === "Comercial ativo" || item.statusLabel === "Aprovado sem OS";
      if (filtroRapido === "operacao") return item.statusLabel === "Em produção";
      if (filtroRapido === "financeiro") return item.statusLabel === "Cobrança crítica" || item.statusLabel === "Recebimento aberto";
      return true;
    });
  }, [clientesEnriquecidos, filtroRapido]);

  const filaPrioritaria = useMemo(() => {
    return [...clientesEnriquecidos]
      .sort((a, b) => {
        if (b.prioridade !== a.prioridade) return b.prioridade - a.prioridade;
        return a.nome.localeCompare(b.nome, "pt-BR");
      })
      .filter((item) => item.prioridade > 0)
      .slice(0, 4);
  }, [clientesEnriquecidos]);

  const stats = useMemo(() => {
    const completos = clientesEnriquecidos.filter((item) => item.cadastroCompleto).length;
    const ativos = clientesEnriquecidos.filter((item) => item.carteiraAtiva).length;
    const criticos = clientesEnriquecidos.filter((item) => item.statusLabel === "Cadastro pendente" || item.statusLabel === "Cobrança crítica").length;
    const emFluxo = clientesEnriquecidos.filter((item) => item.statusLabel === "Em produção" || item.statusLabel === "Comercial ativo" || item.statusLabel === "Aprovado sem OS").length;

    return { completos, ativos, criticos, emFluxo };
  }, [clientesEnriquecidos]);

  useEffect(() => {
    const idsVisiveis = new Set(clientesVisiveis.map((item) => item.id));
    setSelecionados((prev) => prev.filter((id) => idsVisiveis.has(id)));

    if (!clientesVisiveis.length) {
      setClienteFocoId(null);
      return;
    }

    if (!idsVisiveis.has(clienteFocoId)) {
      setClienteFocoId(clientesVisiveis[0].id);
    }
  }, [clienteFocoId, clientesVisiveis]);

  const clienteFoco = useMemo(
    () => clientesVisiveis.find((item) => item.id === clienteFocoId) || null,
    [clienteFocoId, clientesVisiveis]
  );

  const selecionadosDetalhados = useMemo(
    () => clientesEnriquecidos.filter((item) => selecionados.includes(item.id)),
    [clientesEnriquecidos, selecionados]
  );

  const toggleSelecionado = (id) => {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const toggleTodos = () => {
    const ids = clientesVisiveis.map((item) => item.id);
    const todosSelecionados = ids.length > 0 && ids.every((id) => selecionados.includes(id));
    setSelecionados(todosSelecionados ? [] : ids);
  };

  const compartilhar = (cliente) => {
    const dados = {
      nome: cliente.nome,
      documento: cliente.documento,
      telefone: cliente.telefone,
      email: cliente.email,
      endereco: cliente.endereco,
      cadastrado_em: cliente.created_at,
      proxima_acao: cliente.nextAction,
      completude: cliente.completude,
      orcamentos: cliente.orcamentos,
      ordens_servico: cliente.ordens,
      financeiro: cliente.financeiro,
    };
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cliente_${cliente.nome.replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrar("Cliente exportado com sucesso!");
  };

  const exportarSelecionados = () => {
    if (!selecionadosDetalhados.length) return;
    const dados = selecionadosDetalhados.map((cliente) => ({
      nome: cliente.nome,
      documento: cliente.documento,
      telefone: cliente.telefone,
      email: cliente.email,
      endereco: cliente.endereco,
      completude: cliente.completude,
      status: cliente.statusLabel,
      proxima_acao: cliente.nextAction,
    }));
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carteira_clientes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrar("Seleção exportada com sucesso!");
  };

  const handleArquivoNFe = (e) => {
    const arquivo = e.target.files?.[0];
    if (inputFileRef.current) inputFileRef.current.value = "";
    if (!arquivo) return;

    const ext = arquivo.name.split(".").pop()?.toLowerCase();
    if (!["xml", "json"].includes(ext)) {
      mostrar("Use arquivos .xml ou .json.", "erro");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dados =
          ext === "xml"
            ? parsearXmlNFe(ev.target.result)
            : parsearJsonNFe(JSON.parse(ev.target.result));
        if (!dados.emitente && !dados.destinatario) {
          mostrar("Não foi possível extrair dados da NF-e.", "erro");
          return;
        }
        setDadosNFe(dados);
      } catch (err) {
        mostrar(`Erro ao ler arquivo: ${err.message}`, "erro");
      }
    };
    reader.readAsText(arquivo, "UTF-8");
  };

  const handleSelecionarParte = (parte) => {
    const dadosCliente = { ...parte };
    delete dadosCliente._rotulo;
    setDadosNFe(null);

    if (dadosCliente.documento) {
      const docLimpo = dadosCliente.documento.replace(/\D/g, "");
      const duplicado = clientes.find(
        (item) => item.documento && item.documento.replace(/\D/g, "") === docLimpo
      );
      if (duplicado) {
        setClienteFocoId(duplicado.id);
        setPendente(dadosCliente);
        setModalDuplicata({ existente: duplicado, novo: dadosCliente });
        return;
      }
    }

    setClienteEdit(dadosCliente);
    setIsImportado(true);
    setModalForm(true);
  };

  const handleSubstituir = async () => {
    try {
      await api.put(`/clientes/${modalDuplicata.existente.id}`, pendente);
      mostrar("Cadastro atualizado com dados da NF-e!");
      setClienteFocoId(modalDuplicata.existente.id);
      await carregarClientes();
    } catch {
      mostrar("Erro ao atualizar cadastro existente.", "erro");
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

  const handleExcluir = async () => {
    try {
      await api.delete(`/clientes/${clienteDelete.id}`);
      mostrar("Cliente excluído.");
      setClienteDelete(null);
      await carregarClientes();
    } catch {
      mostrar("Erro ao excluir cliente.", "erro");
    }
  };

  const handleAtualizarTudo = async () => {
    await Promise.all([carregarClientes(), carregarContexto()]);
    mostrar("Carteira atualizada.");
  };

  const abrirNovo = () => {
    setClienteEdit(null);
    setIsImportado(false);
    setModalForm(true);
  };

  const abrirEdicao = (cliente) => {
    setClienteEdit(cliente);
    setIsImportado(false);
    setModalForm(true);
  };

  const fecharModal = () => {
    setModalForm(false);
    setClienteEdit(null);
    setIsImportado(false);
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
          <p className="cm-label text-white/58">Ceramic Monolith · Clientes</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Carteira com contexto real de relacionamento, operação e caixa
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/72 sm:text-base">
            A tela de clientes deixa de ser só cadastro. Agora ela prioriza onde agir, mostra o elo com comercial,
            ordens de serviço e financeiro, e acelera o próximo movimento certo em cada conta.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/72">
              Cadastro → Comercial → OS → Financeiro
            </span>
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/72">
              {fmtDate(new Date().toISOString())}
            </span>
            {contextoErro && (
              <span className="rounded-full border border-white/10 bg-[rgba(187,103,80,0.16)] px-3 py-2 text-xs text-white/80">
                Parte do contexto não carregou
              </span>
            )}
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={IconClients} label="Clientes" value={fmtNumber(clientesEnriquecidos.length)} note="Base ativa carregada" inverse />
            <StatTile icon={IconQuotes} label="Carteira integrada" value={fmtNumber(stats.ativos)} note="Com vínculo em algum módulo" inverse />
            <StatTile icon={IconServiceOrder} label="Em movimento" value={fmtNumber(stats.emFluxo)} note="Comercial ou produção em andamento" inverse />
            <StatTile icon={IconDollar} label="Ponto de atenção" value={fmtNumber(stats.criticos)} note="Cadastro ou cobrança pedindo ação" inverse />
          </div>
        </section>

        <section className="cm-surface rounded-[32px] p-6 xl:col-span-4">
          <p className="cm-label">Fila de ação</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Quem pede movimento agora</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
            Priorização automática combinando completude de cadastro, proposta em aberto, OS em fluxo e sinais financeiros.
          </p>

          <div className="mt-5 grid gap-3">
            {carregandoContexto && !filaPrioritaria.length ? (
              <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/38 px-4 py-10 text-center text-sm text-[var(--cm-muted)]">
                Consolidando contexto da carteira...
              </div>
            ) : filaPrioritaria.length > 0 ? (
              filaPrioritaria.map((item) => (
                <PriorityCard key={item.id} item={item} onSelect={setClienteFocoId} />
              ))
            ) : (
              <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/38 px-4 py-6 text-sm leading-6 text-[var(--cm-muted)]">
                A carteira está estável neste recorte. Use a busca, os filtros rápidos ou crie um novo cliente para
                continuar o fluxo.
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniMetric label="Cadastros completos" value={fmtNumber(stats.completos)} />
            <MiniMetric label="Clientes ativos" value={fmtNumber(stats.ativos)} />
          </div>
        </section>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="cm-surface rounded-[32px] p-5 sm:p-6 xl:col-span-8">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="cm-label">Carteira operacional</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">Clientes e prontidão de fluxo</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
                  Selecione um cliente para focar no detalhe, use filtros rápidos para triagem e preserve todo o fluxo de
                  importação, edição, exclusão e exportação.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <input
                  ref={inputFileRef}
                  type="file"
                  accept=".xml,.json"
                  className="hidden"
                  onChange={handleArquivoNFe}
                />
                <button
                  type="button"
                  onClick={() => inputFileRef.current?.click()}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Importar NF-e
                </button>
                <button
                  type="button"
                  onClick={abrirNovo}
                  className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
                >
                  Novo cliente
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
                  placeholder="Buscar por nome, documento ou e-mail..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-[var(--cm-text)] outline-none placeholder:text-[var(--cm-muted)]"
                />
                {filtro && (
                  <button
                    type="button"
                    onClick={() => setFiltro("")}
                    className="rounded-full p-1 text-[var(--cm-muted)] transition hover:text-[var(--cm-text)]"
                    aria-label="Limpar busca"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAtualizarTudo}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Atualizar carteira
                </button>
                {selecionados.length > 0 && (
                  <button
                    type="button"
                    onClick={exportarSelecionados}
                    className="rounded-full border border-[rgba(180,99,56,0.22)] bg-[rgba(180,99,56,0.12)] px-5 py-3 text-sm font-semibold text-[var(--cm-accent)] transition hover:bg-[rgba(180,99,56,0.16)]"
                  >
                    Exportar seleção
                  </button>
                )}
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
                      {fmtNumber(contagemFiltros[item.id])}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-[28px] border border-[color:var(--cm-line)] bg-white/34">
            <div className="hidden lg:grid lg:grid-cols-[auto_minmax(0,2.2fr)_1.15fr_1.2fr_1fr_auto] lg:gap-4 lg:px-4 lg:py-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    clientesVisiveis.length > 0 &&
                    clientesVisiveis.every((item) => selecionados.includes(item.id))
                  }
                  onChange={toggleTodos}
                  className="h-4 w-4 rounded border-[color:var(--cm-line)] text-[var(--cm-accent)] focus:ring-[rgba(180,99,56,0.2)]"
                  aria-label="Selecionar todos os clientes visíveis"
                />
              </div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Cliente e próxima ação</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Cadastro</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Fluxo conectado</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Contato</p>
              <p className="text-right text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Ações</p>
            </div>

            {carregando ? (
              <div className="flex items-center justify-center px-6 py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-black/8 border-t-[var(--cm-accent)]" />
              </div>
            ) : !clientesVisiveis.length ? (
              <EmptyState filtroAtivo={Boolean(filtro || filtroRapido !== "todos")} onNovo={abrirNovo} onImportar={() => inputFileRef.current?.click()} />
            ) : (
              <div>
                {clientesVisiveis.map((cliente, index) => (
                  <article
                    key={cliente.id}
                    className={`grid gap-4 px-4 py-5 transition lg:grid-cols-[auto_minmax(0,2.2fr)_1.15fr_1.2fr_1fr_auto] ${
                      index > 0 ? "border-t border-[color:var(--cm-line)]" : ""
                    } ${
                      cliente.id === clienteFocoId ? "bg-[rgba(255,255,255,0.52)]" : "bg-transparent hover:bg-white/28"
                    }`}
                  >
                    <div className="flex items-start pt-1">
                      <input
                        type="checkbox"
                        checked={selecionados.includes(cliente.id)}
                        onChange={() => toggleSelecionado(cliente.id)}
                        className="mt-1 h-4 w-4 rounded border-[color:var(--cm-line)] text-[var(--cm-accent)] focus:ring-[rgba(180,99,56,0.2)]"
                        aria-label={`Selecionar ${cliente.nome}`}
                      />
                    </div>

                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setClienteFocoId(cliente.id)}
                        className="w-full text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">
                            {cliente.nome}
                          </span>
                          <ToneBadge tone={cliente.statusTone}>{cliente.statusLabel}</ToneBadge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-[var(--cm-muted)]">
                          <span>{cliente.documento || "Documento pendente"}</span>
                          <span>Últ. mov.: {fmtDate(cliente.ultimaMovimentacao)}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[var(--cm-muted)]">{cliente.nextAction}</p>
                      </button>
                    </div>

                    <div>
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Completude</p>
                      <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">
                        {cliente.completude}%
                      </p>
                      <ProgressBar
                        value={cliente.completude}
                        tone={cliente.cadastroCompleto ? "positive" : cliente.completude >= 50 ? "accent" : "warning"}
                      />
                      <p className="mt-3 text-sm text-[var(--cm-muted)]">
                        {cliente.faltantes.length
                          ? `Falta: ${cliente.faltantes.join(", ")}`
                          : "Cadastro pronto para integrações."}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <InfoItem
                        label="Orçamentos"
                        value={
                          canOrcamentos
                            ? `${fmtNumber(cliente.orcamentos.total)} total · ${fmtNumber(cliente.orcamentos.emDecisao)} em decisão`
                            : "Sem permissão"
                        }
                        subtle={!canOrcamentos}
                      />
                      <InfoItem
                        label="Ordens"
                        value={
                          canOS
                            ? `${fmtNumber(cliente.ordens.emFluxo)} em fluxo · ${fmtNumber(cliente.ordens.concluidas)} concluídas`
                            : "Sem permissão"
                        }
                        subtle={!canOS}
                      />
                      <InfoItem
                        label="Financeiro"
                        value={
                          canFinanceiro
                            ? `${fmtNumber(cliente.financeiro.atrasados)} atraso(s) · ${fmtCurrency(cliente.financeiro.saldoAberto)} aberto`
                            : "Sem permissão"
                        }
                        subtle={!canFinanceiro}
                      />
                    </div>

                    <div className="space-y-2">
                      <InfoItem label="Telefone" value={cliente.telefone || "Pendente"} subtle={!cliente.telefone} />
                      <InfoItem label="E-mail" value={cliente.email || "Pendente"} subtle={!cliente.email} title={cliente.email || ""} />
                      <InfoItem label="Endereço" value={cliente.endereco || "Pendente"} subtle={!cliente.endereco} title={cliente.endereco || ""} />
                    </div>

                    <div className="flex flex-wrap items-start justify-end gap-2 lg:flex-col lg:items-end">
                      <button
                        type="button"
                        onClick={() => setClienteFocoId(cliente.id)}
                        className="rounded-full border border-[color:var(--cm-line)] bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                      >
                        Foco
                      </button>
                      <button
                        type="button"
                        onClick={() => compartilhar(cliente)}
                        className="rounded-full border border-[color:var(--cm-line)] bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                      >
                        Exportar
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirEdicao(cliente)}
                        className="rounded-full border border-[color:var(--cm-line)] bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--cm-text)] transition hover:bg-white"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setClienteDelete(cliente)}
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--cm-muted)]">
            <p>
              {fmtNumber(clientesVisiveis.length)} cliente(s) visível(is)
              {filtro && <span> para &quot;{filtro}&quot;</span>}
            </p>
            <p>
              {selecionados.length > 0
                ? `${fmtNumber(selecionados.length)} selecionado(s)`
                : "Nenhum cliente selecionado"}
            </p>
          </div>
        </section>

        <section className="cm-surface rounded-[32px] p-5 sm:p-6 xl:col-span-4">
          <p className="cm-label">Cliente em foco</p>
          {clienteFoco ? (
            <>
              <div className="mt-3 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="truncate text-2xl font-semibold tracking-[-0.04em] text-[var(--cm-text)]">{clienteFoco.nome}</h2>
                  <p className="mt-2 text-sm text-[var(--cm-muted)]">Última movimentação em {fmtDate(clienteFoco.ultimaMovimentacao)}</p>
                </div>
                <div className="rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 px-4 py-3 text-right">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--cm-muted)]">Completude</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[var(--cm-text)]">{clienteFoco.completude}%</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <ToneBadge tone={clienteFoco.statusTone}>{clienteFoco.statusLabel}</ToneBadge>
                {clienteFoco.carteiraAtiva ? <ToneBadge tone="positive">Carteira ativa</ToneBadge> : <ToneBadge tone="default">Sem vínculo</ToneBadge>}
                {clienteFoco.aprovadosSemOS && <ToneBadge tone="accent">Aprovado sem OS</ToneBadge>}
              </div>

              <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 p-4">
                <p className="cm-label">Próxima melhor ação</p>
                <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">{clienteFoco.nextAction}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">{clienteFoco.nextNote}</p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <FocusMetric
                  label="Orçamentos"
                  value={canOrcamentos ? fmtNumber(clienteFoco.orcamentos.total) : "—"}
                  note={
                    canOrcamentos
                      ? `${fmtNumber(clienteFoco.orcamentos.emDecisao)} em decisão · ${fmtCurrency(clienteFoco.orcamentos.valor)} no total`
                      : "Sem permissão comercial"
                  }
                />
                <FocusMetric
                  label="Ordens de serviço"
                  value={canOS ? fmtNumber(clienteFoco.ordens.total) : "—"}
                  note={
                    canOS
                      ? `${fmtNumber(clienteFoco.ordens.emFluxo)} em fluxo · ${fmtNumber(clienteFoco.ordens.concluidas)} concluídas`
                      : "Sem permissão operacional"
                  }
                />
                <FocusMetric
                  label="Financeiro"
                  value={canFinanceiro ? fmtCurrency(clienteFoco.financeiro.saldoAberto) : "—"}
                  note={
                    canFinanceiro
                      ? `${fmtNumber(clienteFoco.financeiro.atrasados)} em atraso · ${fmtNumber(clienteFoco.financeiro.receberPendente)} a receber`
                      : "Sem permissão financeira"
                  }
                />
                <FocusMetric
                  label="Cadastro"
                  value={clienteFoco.documento ? "Documento ok" : "Documento pendente"}
                  note={clienteFoco.telefone || clienteFoco.email || "Sem canal de contato definido"}
                />
              </div>

              <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/42 p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <InfoItem label="Telefone" value={clienteFoco.telefone || "Pendente"} subtle={!clienteFoco.telefone} />
                  <InfoItem label="E-mail" value={clienteFoco.email || "Pendente"} subtle={!clienteFoco.email} title={clienteFoco.email || ""} />
                  <InfoItem label="Documento" value={clienteFoco.documento || "Pendente"} subtle={!clienteFoco.documento} />
                  <InfoItem label="Endereço" value={clienteFoco.endereco || "Pendente"} subtle={!clienteFoco.endereco} title={clienteFoco.endereco || ""} />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => abrirEdicao(clienteFoco)}
                  className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
                >
                  Editar cadastro
                </button>
                <button
                  type="button"
                  onClick={() => compartilhar(clienteFoco)}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Exportar JSON
                </button>
                <button
                  type="button"
                  onClick={() => setClienteDelete(clienteFoco)}
                  className="rounded-full border border-[rgba(187,103,80,0.18)] bg-[rgba(187,103,80,0.1)] px-5 py-3 text-sm font-semibold text-[var(--cm-danger)] transition hover:bg-[rgba(187,103,80,0.14)]"
                >
                  Excluir cliente
                </button>
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-[24px] border border-[color:var(--cm-line)] bg-white/40 px-4 py-6 text-sm leading-6 text-[var(--cm-muted)]">
              Selecione um cliente na lista para abrir o painel de foco com próxima ação, completude e vínculos com o resto do sistema.
            </div>
          )}

          {selecionados.length > 0 && (
            <div className="mt-6 rounded-[24px] border border-[rgba(180,99,56,0.18)] bg-[rgba(180,99,56,0.08)] p-4">
              <p className="cm-label">Seleção ativa</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--cm-text)]">
                {fmtNumber(selecionados.length)} cliente(s) prontos para ação em lote
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
                Exporte a seleção atual ou limpe o recorte para voltar à carteira completa.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={exportarSelecionados}
                  className="rounded-full bg-[var(--cm-text)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-92"
                >
                  Exportar seleção
                </button>
                <button
                  type="button"
                  onClick={() => setSelecionados([])}
                  className="rounded-full border border-[color:var(--cm-line)] bg-white/74 px-5 py-3 text-sm font-semibold text-[var(--cm-text)] transition hover:bg-white"
                >
                  Limpar seleção
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {dadosNFe && (
        <ModalSelecaoNFe
          dados={dadosNFe}
          onSelecionar={handleSelecionarParte}
          onClose={() => setDadosNFe(null)}
        />
      )}

      {modalDuplicata && (
        <ModalDuplicata
          existente={modalDuplicata.existente}
          novo={modalDuplicata.novo}
          onSubstituir={handleSubstituir}
          onCadastrarMesmo={handleCadastrarMesmo}
          onCancelar={() => {
            setModalDuplicata(null);
            setPendente(null);
          }}
        />
      )}

      {modalForm && (
        <ModalCliente
          cliente={clienteEdit}
          isImportado={isImportado}
          onClose={fecharModal}
          onSalvo={({ acao, cliente }) => {
            mostrar(`Cliente ${acao} com sucesso!`);
            if (cliente?.id) setClienteFocoId(cliente.id);
            carregarClientes();
          }}
        />
      )}

      {clienteDelete && (
        <ModalConfirmacao
          cliente={clienteDelete}
          onClose={() => setClienteDelete(null)}
          onConfirmar={handleExcluir}
        />
      )}
    </div>
  );
}
