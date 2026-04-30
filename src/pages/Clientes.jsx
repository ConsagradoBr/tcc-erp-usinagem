import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

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

  const mostrar = useCallback((msg, tipo = "sucesso") => {
    setNotif({ msg, tipo });
    window.clearTimeout(window.__ampClientesToast);
    window.__ampClientesToast = window.setTimeout(() => setNotif(null), 3200);
  }, []);

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

function StatTile({ icon, label, value, note, inverse = false }) {
  return (
    <article className={`amp-rel-tape-card ${inverse ? "is-strong" : ""}`}>
      <div className="amp-rel-tape-head">
        <div className={`amp-rel-tape-icon ${inverse ? "is-strong" : ""}`}>
          <img src={icon} alt="" className="w-5" />
        </div>
        <div className="min-w-0">
          <p className="amp-rel-kicker">{label}</p>
          <strong>{value}</strong>
        </div>
      </div>
      {note && <span>{note}</span>}
    </article>
  );
}

function ToneBadge({ tone = "default", children }) {
  const toneClass = toneClasses(tone);
  return (
    <span className={`amp-rel-badge ${toneClass}`}>
      <span className="amp-rel-badge-dot" />
      {children}
    </span>
  );
}

function ProgressBar({ value, tone = "accent" }) {
  const toneClass = toneClasses(tone);
  return (
    <div className="amp-rel-progress">
      <div className={`amp-rel-progress-fill ${toneClass}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function PriorityCard({ item, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className="amp-rel-queue-card"
    >
      <div className="amp-rel-queue-head">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold tracking-[-0.03em] text-[var(--amp-shell-ink)]">{item.nome}</p>
          <p className="mt-1 text-sm text-[var(--amp-shell-soft)]">{item.nextAction}</p>
        </div>
        <ToneBadge tone={item.statusTone}>{item.statusLabel}</ToneBadge>
      </div>
      <div className="amp-rel-queue-meta">
        <span>{item.documento || "Documento pendente"}</span>
        <span>{item.telefone || item.email || "Sem contato direto"}</span>
      </div>
    </button>
  );
}

function InfoItem({ label, value, subtle = false, title }) {
  return (
    <div className="amp-rel-info-item">
      <p>{label}</p>
      <strong className={subtle ? "is-subtle" : ""} title={title}>
        {value}
      </strong>
    </div>
  );
}

function FocusMetric({ label, value, note }) {
  return (
    <article className="amp-rel-focus-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {note && <p>{note}</p>}
    </article>
  );
}

function EmptyState({ filtroAtivo, onNovo, onImportar }) {
  return (
    <div className="amp-rel-empty">
      <div className="amp-rel-empty-icon">
        <img src={IconClients} alt="" className="w-7 opacity-70" />
      </div>
      <h3>
        {filtroAtivo ? "Nenhum cliente encontrado nesse recorte" : "Sua carteira ainda está vazia"}
      </h3>
      <p>
        {filtroAtivo
          ? "Ajuste a busca ou os filtros rápidos para voltar a enxergar oportunidades, pendências e clientes ativos."
          : "Cadastre manualmente ou use a importação por NF-e para montar uma base pronta para comercial, operação e financeiro."}
      </p>
      <div className="amp-rel-empty-actions">
        <button type="button" onClick={onNovo} className="amp-rel-primary-btn">
          Novo cliente
        </button>
        <button type="button" onClick={onImportar} className="amp-rel-secondary-btn">
          Importar NF-e
        </button>
      </div>
    </div>
  );
}

function SelectionBanner({ total, onExportar, onLimpar }) {
  return (
    <div className="amp-rel-selection">
      <p className="amp-rel-kicker">Seleção ativa</p>
      <strong>{fmtNumber(total)} conta(s) prontas para ação em lote</strong>
      <p>Exporte o recorte atual ou limpe a seleção para voltar à leitura completa da carteira.</p>
      <div className="amp-rel-selection-actions">
        <button type="button" onClick={onExportar} className="amp-rel-primary-btn">
          Exportar seleção
        </button>
        <button type="button" onClick={onLimpar} className="amp-rel-secondary-btn">
          Limpar seleção
        </button>
      </div>
    </div>
  );
}

function FeedItem({ title, note, when }) {
  return (
    <article className="amp-rel-feed-item">
      <div>
        <strong>{title}</strong>
        <p>{note}</p>
      </div>
      <span>{when}</span>
    </article>
  );
}

function PulseChip({ children }) {
  return <span className="amp-rel-pulse-chip">{children}</span>;
}

function RowMetric({ label, value, note, subtle = false, tone = "default" }) {
  return (
    <div className="amp-rel-row-metric">
      <span>{label}</span>
      <strong className={subtle ? "is-subtle" : ""}>{value}</strong>
      {note && <p className={`amp-rel-row-note ${toneClasses(tone)}`}>{note}</p>}
    </div>
  );
}

function LedgerRow({
  cliente,
  selected,
  onFocus,
  onToggleSelect,
  onEdit,
  onDelete,
  onShare,
  canOrcamentos,
  canOS,
  canFinanceiro,
}) {
  return (
    <article className={`amp-rel-ledger-row ${selected ? "is-selected" : ""}`}>
      <div className="amp-rel-ledger-check">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(cliente.id)}
          className="h-4 w-4 rounded border-[color:var(--amp-shell-line)] bg-transparent text-[var(--amp-shell-accent)] focus:ring-[rgba(0,212,170,0.2)]"
          aria-label={`Selecionar ${cliente.nome}`}
        />
      </div>

      <button type="button" onClick={() => onFocus(cliente.id)} className="amp-rel-ledger-main">
        <div className="amp-rel-ledger-title">
          <strong>{cliente.nome}</strong>
          <ToneBadge tone={cliente.statusTone}>{cliente.statusLabel}</ToneBadge>
        </div>
        <p>{cliente.nextAction}</p>
        <div className="amp-rel-ledger-meta">
          <span>{cliente.documento || "Documento pendente"}</span>
          <span>{cliente.telefone || cliente.email || "Sem contato direto"}</span>
          <span>Últ. mov.: {fmtDate(cliente.ultimaMovimentacao)}</span>
        </div>
      </button>

      <div className="amp-rel-ledger-block">
        <RowMetric
          label="Cadastro"
          value={`${cliente.completude}%`}
          note={
            cliente.cadastroCompleto
              ? "Pronto para integração"
              : `Falta: ${cliente.faltantes.join(", ") || "dados"}`
          }
          tone={cliente.cadastroCompleto ? "positive" : cliente.completude >= 50 ? "accent" : "warning"}
        />
        <ProgressBar
          value={cliente.completude}
          tone={cliente.cadastroCompleto ? "positive" : cliente.completude >= 50 ? "accent" : "warning"}
        />
      </div>

      <div className="amp-rel-ledger-block">
        <RowMetric
          label="Fluxo conectado"
          value={
            [
              canOrcamentos ? `${fmtNumber(cliente.orcamentos.total)} orç.` : null,
              canOS ? `${fmtNumber(cliente.ordens.emFluxo)} OS` : null,
              canFinanceiro ? `${fmtCurrency(cliente.financeiro.saldoAberto)} aberto` : null,
            ]
              .filter(Boolean)
              .join(" · ") || "Sem permissão"
          }
          note={
            canFinanceiro
              ? `${fmtNumber(cliente.financeiro.atrasados)} atraso(s) · ${fmtNumber(cliente.financeiro.receberPendente)} a receber`
              : canOS
                ? `${fmtNumber(cliente.ordens.concluidas)} concluídas`
                : canOrcamentos
                  ? `${fmtNumber(cliente.orcamentos.emDecisao)} em decisão`
                  : "Leitura restrita"
          }
          subtle={!canOrcamentos && !canOS && !canFinanceiro}
          tone={cliente.statusTone}
        />
        <div className="amp-rel-ledger-pulse">
          {canOrcamentos && <PulseChip>{fmtNumber(cliente.orcamentos.emDecisao)} em decisão</PulseChip>}
          {canOS && <PulseChip>{fmtNumber(cliente.ordens.emFluxo)} em fluxo</PulseChip>}
          {canFinanceiro && <PulseChip>{fmtNumber(cliente.financeiro.atrasados)} atraso</PulseChip>}
        </div>
      </div>

      <div className="amp-rel-ledger-actions">
        <button type="button" onClick={() => onFocus(cliente.id)} className="amp-rel-ghost-chip">
          Foco
        </button>
        <button type="button" onClick={() => onShare(cliente)} className="amp-rel-ghost-chip">
          Exportar
        </button>
        <button type="button" onClick={() => onEdit(cliente)} className="amp-rel-ghost-chip">
          Editar
        </button>
        <button type="button" onClick={() => onDelete(cliente)} className="amp-rel-ghost-chip is-danger">
          Excluir
        </button>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="amp-rel-loading">
      <div className="amp-rel-loader" />
      <span>Consolidando carteira operacional...</span>
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

  const panorama = useMemo(() => {
    const comerciais = clientesEnriquecidos.filter(
      (item) => item.statusLabel === "Comercial ativo" || item.statusLabel === "Aprovado sem OS"
    ).length;
    const cobertura = clientesEnriquecidos.length
      ? Math.round((stats.completos / clientesEnriquecidos.length) * 100)
      : 0;

    return {
      base: clientesEnriquecidos.length,
      cobertura,
      comerciais,
      criticos: stats.criticos,
      ativos: stats.ativos,
      emFluxo: stats.emFluxo,
    };
  }, [clientesEnriquecidos, stats]);

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

  const todosSelecionados =
    clientesVisiveis.length > 0 && clientesVisiveis.every((item) => selecionados.includes(item.id));

  const radarSecundario = useMemo(
    () => filaPrioritaria.filter((item) => item.id !== clienteFocoId).slice(0, 3),
    [clienteFocoId, filaPrioritaria]
  );

  const atividadeFoco = useMemo(() => {
    if (!clienteFoco) return [];

    const feed = [];

    feed.push({
      title: clienteFoco.documento ? "Cadastro fiscal validado" : "Documento ainda pendente",
      note: clienteFoco.documento
        ? "Documento principal disponível e pronto para sustentar o fluxo entre comercial, OS e caixa."
        : "Vale concluir o documento para evitar ruído no fluxo comercial e financeiro.",
      when: fmtDate(clienteFoco.created_at),
    });

    if (canOrcamentos) {
      feed.push({
        title:
          clienteFoco.orcamentos.aprovados > 0
            ? "Orçamento aprovado em carteira"
            : clienteFoco.orcamentos.emDecisao > 0
              ? "Proposta comercial em decisão"
              : "Sem proposta ativa",
        note:
          clienteFoco.orcamentos.aprovados > 0
            ? `${fmtNumber(clienteFoco.orcamentos.aprovados)} aprovação(ões) prontas para virar OS.`
            : clienteFoco.orcamentos.emDecisao > 0
              ? `${fmtNumber(clienteFoco.orcamentos.emDecisao)} proposta(s) ainda em negociação.`
              : "Abrir uma nova frente comercial pode destravar recorrência.",
        when: fmtDate(clienteFoco.orcamentos.ultimaData),
      });
    }

    if (canOS) {
      feed.push({
        title: clienteFoco.ordens.emFluxo > 0 ? "Operação em andamento" : "Sem OS em curso",
        note:
          clienteFoco.ordens.emFluxo > 0
            ? `${fmtNumber(clienteFoco.ordens.emFluxo)} ordem(ns) em fluxo e ${fmtNumber(clienteFoco.ordens.concluidas)} concluída(s).`
            : "Nenhuma OS ativa no momento para esta conta.",
        when: fmtDate(clienteFoco.ordens.ultimaData),
      });
    }

    if (canFinanceiro) {
      feed.push({
        title:
          clienteFoco.financeiro.atrasados > 0
            ? "Recebimento em atenção"
            : clienteFoco.financeiro.receberPendente > 0
              ? "Saldo em acompanhamento"
              : "Financeiro estabilizado",
        note:
          clienteFoco.financeiro.atrasados > 0
            ? `${fmtNumber(clienteFoco.financeiro.atrasados)} título(s) em atraso pedindo ação direta.`
            : clienteFoco.financeiro.receberPendente > 0
              ? `${fmtNumber(clienteFoco.financeiro.receberPendente)} lançamento(s) ainda abertos.`
              : "Sem pendências financeiras relevantes neste recorte.",
        when: fmtDate(clienteFoco.financeiro.ultimaData || clienteFoco.financeiro.ultimoVencimento),
      });
    }

    return feed.filter((item) => item.when !== "—" || item.note).slice(0, 4);
  }, [canFinanceiro, canOS, canOrcamentos, clienteFoco]);

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
    <div className="amp-rel-page">
      {notif && (
        <div className={`amp-rel-notice ${notif.tipo === "erro" ? "is-error" : "is-success"}`}>
          {notif.msg}
        </div>
      )}

      <input
        ref={inputFileRef}
        type="file"
        accept=".xml,.json"
        className="hidden"
        onChange={handleArquivoNFe}
      />

      <section className="amp-rel-terminal">
        <section className="amp-rel-command">
          <div className="amp-rel-command-head">
            <div className="amp-rel-command-copy">
              <p className="amp-rel-kicker">Relacionamento unificado</p>
              <h1>Terminal de clientes com leitura comercial, operacional e financeira</h1>
              <p>
                A carteira deixa de ser só cadastro. Agora ela mostra prontidão de fluxo, próxima ação,
                risco fiscal e sinal de caixa para cada conta em um único ledger operacional.
              </p>
            </div>

            <div className="amp-rel-command-actions">
              <button type="button" onClick={() => inputFileRef.current?.click()} className="amp-rel-secondary-btn">
                Importar NF-e
              </button>
              <button type="button" onClick={handleAtualizarTudo} className="amp-rel-secondary-btn">
                Atualizar carteira
              </button>
              <button type="button" onClick={abrirNovo} className="amp-rel-primary-btn">
                Novo cliente
              </button>
            </div>
          </div>

          <div className="amp-rel-command-tools">
            <div className="amp-rel-search-shell">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35m1.85-5.4a7.25 7.25 0 1 1-14.5 0 7.25 7.25 0 0 1 14.5 0Z" />
              </svg>
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por nome, documento, contato ou contexto operacional..."
                className="amp-rel-search-input"
              />
              {filtro && (
                <button type="button" onClick={() => setFiltro("")} className="amp-rel-clear-btn" aria-label="Limpar busca">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.9}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="amp-rel-command-meta">
              <span className="amp-rel-status-chip is-live">Desktop sync</span>
              <span className="amp-rel-status-chip">Fiscal rastreado</span>
              <span className="amp-rel-status-chip">{fmtDate(new Date().toISOString())}</span>
              {carregandoContexto && <span className="amp-rel-status-chip">Sincronizando contexto</span>}
              {contextoErro && <span className="amp-rel-status-chip is-danger">Parte do contexto não carregou</span>}
            </div>
          </div>

          <div className="amp-rel-filter-row">
            {QUICK_FILTERS.map((item) => {
              const ativo = filtroRapido === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFiltroRapido(item.id)}
                  className={`amp-rel-filter-chip ${ativo ? "is-active" : ""}`}
                >
                  {item.label}
                  <span>{fmtNumber(contagemFiltros[item.id])}</span>
                </button>
              );
            })}
          </div>

          <div className="amp-rel-kpi-tape">
            <StatTile
              icon={IconClients}
              label="Base ativa"
              value={fmtNumber(panorama.base)}
              note={`${fmtNumber(panorama.ativos)} com vínculo operacional`}
              inverse
            />
            <StatTile
              icon={IconQuotes}
              label="Cobertura de cadastro"
              value={`${panorama.cobertura}%`}
              note={`${fmtNumber(stats.completos)} cadastros completos`}
              inverse
            />
            <StatTile
              icon={IconServiceOrder}
              label="Radar comercial"
              value={fmtNumber(panorama.comerciais)}
              note={`${fmtNumber(panorama.emFluxo)} contas em movimento`}
              inverse
            />
            <StatTile
              icon={IconDollar}
              label="Pendências"
              value={fmtNumber(panorama.criticos)}
              note="Cadastro ou cobrança pedindo ação"
              inverse
            />
          </div>
        </section>

        <div className="amp-rel-grid">
          <section className="amp-rel-ledger">
            <div className="amp-rel-ledger-top">
              <div>
                <p className="amp-rel-kicker">Ledger principal</p>
                <h2>Base operacional de relacionamento</h2>
              </div>

              <div className="amp-rel-ledger-flags">
                <span className="amp-rel-status-chip is-live">{fmtNumber(clientesVisiveis.length)} visível(is)</span>
                <span className="amp-rel-status-chip">
                  {selecionados.length > 0 ? `${fmtNumber(selecionados.length)} selecionado(s)` : "Nenhuma seleção"}
                </span>
              </div>
            </div>

            <div className="amp-rel-ledger-head">
              <div className="amp-rel-ledger-check">
                <input
                  type="checkbox"
                  checked={todosSelecionados}
                  onChange={toggleTodos}
                  className="h-4 w-4 rounded border-[color:var(--amp-shell-line)] bg-transparent text-[var(--amp-shell-accent)] focus:ring-[rgba(0,212,170,0.2)]"
                  aria-label="Selecionar todas as contas visíveis"
                />
              </div>
              <span>Conta e próxima ação</span>
              <span>Cadastro</span>
              <span>Fluxo conectado</span>
              <span className="text-right">Ações</span>
            </div>

            {carregando ? (
              <LoadingState />
            ) : !clientesVisiveis.length ? (
              <EmptyState
                filtroAtivo={Boolean(filtro || filtroRapido !== "todos")}
                onNovo={abrirNovo}
                onImportar={() => inputFileRef.current?.click()}
              />
            ) : (
              <div className="amp-rel-ledger-body">
                {clientesVisiveis.map((cliente) => (
                  <LedgerRow
                    key={cliente.id}
                    cliente={cliente}
                    selected={selecionados.includes(cliente.id)}
                    onFocus={setClienteFocoId}
                    onToggleSelect={toggleSelecionado}
                    onEdit={abrirEdicao}
                    onDelete={setClienteDelete}
                    onShare={compartilhar}
                    canOrcamentos={canOrcamentos}
                    canOS={canOS}
                    canFinanceiro={canFinanceiro}
                  />
                ))}
              </div>
            )}

            <div className="amp-rel-ledger-footer">
              <p>
                {fmtNumber(clientesVisiveis.length)} conta(s) visível(is)
                {filtro && <span> para &quot;{filtro}&quot;</span>}
              </p>
              <p>{selecionados.length > 0 ? `${fmtNumber(selecionados.length)} selecionado(s)` : "Nenhum cliente selecionado"}</p>
            </div>
          </section>

          <aside className="amp-rel-focus">
            {clienteFoco ? (
              <>
                <div className="amp-rel-focus-card is-primary">
                  <p className="amp-rel-kicker">Registro em foco</p>
                  <h3>{clienteFoco.nome}</h3>
                  <p className="amp-rel-focus-copy">{clienteFoco.nextNote}</p>
                </div>

                <div className="amp-rel-focus-grid">
                  <FocusMetric label="Status" value={clienteFoco.statusLabel} note={`Últ. mov.: ${fmtDate(clienteFoco.ultimaMovimentacao)}`} />
                  <FocusMetric label="Completude" value={`${clienteFoco.completude}%`} note={clienteFoco.cadastroCompleto ? "Cadastro íntegro" : "Cadastro pedindo atenção"} />
                  <FocusMetric
                    label="Financeiro"
                    value={canFinanceiro ? fmtCurrency(clienteFoco.financeiro.saldoAberto) : "—"}
                    note={
                      canFinanceiro
                        ? `${fmtNumber(clienteFoco.financeiro.atrasados)} atraso(s) · ${fmtNumber(clienteFoco.financeiro.receberPendente)} a receber`
                        : "Sem permissão financeira"
                    }
                  />
                  <FocusMetric
                    label="Operação"
                    value={canOS ? fmtNumber(clienteFoco.ordens.emFluxo) : "—"}
                    note={canOS ? `${fmtNumber(clienteFoco.ordens.concluidas)} concluída(s)` : "Sem permissão operacional"}
                  />
                </div>

                <div className="amp-rel-next">
                  <p className="amp-rel-kicker">Próxima melhor ação</p>
                  <strong>{clienteFoco.nextAction}</strong>
                  <p>{clienteFoco.nextNote}</p>
                </div>

                <div className="amp-rel-focus-info">
                  <InfoItem label="Telefone" value={clienteFoco.telefone || "Pendente"} subtle={!clienteFoco.telefone} />
                  <InfoItem label="E-mail" value={clienteFoco.email || "Pendente"} subtle={!clienteFoco.email} title={clienteFoco.email || ""} />
                  <InfoItem label="Documento" value={clienteFoco.documento || "Pendente"} subtle={!clienteFoco.documento} />
                  <InfoItem label="Endereço" value={clienteFoco.endereco || "Pendente"} subtle={!clienteFoco.endereco} title={clienteFoco.endereco || ""} />
                </div>

                <div className="amp-rel-feed">
                  <div className="amp-rel-feed-head">
                    <p className="amp-rel-kicker">Leitura viva</p>
                    <span>Atualizado com os módulos ativos</span>
                  </div>
                  {atividadeFoco.map((item) => (
                    <FeedItem key={`${item.title}-${item.when}`} title={item.title} note={item.note} when={item.when} />
                  ))}
                </div>

                <div className="amp-rel-focus-actions">
                  <button type="button" onClick={() => abrirEdicao(clienteFoco)} className="amp-rel-primary-btn">
                    Editar cadastro
                  </button>
                  <button type="button" onClick={() => compartilhar(clienteFoco)} className="amp-rel-secondary-btn">
                    Exportar JSON
                  </button>
                  <button type="button" onClick={() => setClienteDelete(clienteFoco)} className="amp-rel-ghost-chip is-danger">
                    Excluir cliente
                  </button>
                </div>
              </>
            ) : (
              <div className="amp-rel-focus-empty">
                <p className="amp-rel-kicker">Cliente em foco</p>
                <h3>Selecione uma conta no ledger</h3>
                <p>Abra um cliente para ver completude, próxima ação e o vínculo com comercial, OS e financeiro.</p>
              </div>
            )}

            {radarSecundario.length > 0 && (
              <div className="amp-rel-radar">
                <div className="amp-rel-feed-head">
                  <p className="amp-rel-kicker">Radar prioritário</p>
                  <span>Quem pede movimento agora</span>
                </div>
                <div className="amp-rel-radar-list">
                  {radarSecundario.map((item) => (
                    <PriorityCard key={item.id} item={item} onSelect={setClienteFocoId} />
                  ))}
                </div>
              </div>
            )}

            {selecionados.length > 0 && (
              <SelectionBanner
                total={selecionados.length}
                onExportar={exportarSelecionados}
                onLimpar={() => setSelecionados([])}
              />
            )}
          </aside>
        </div>
      </section>

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
