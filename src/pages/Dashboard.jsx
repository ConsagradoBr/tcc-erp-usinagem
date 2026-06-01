import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

import { parseISODate } from "../api";
import { getStoredUser, hasPermission } from "../auth";
import OfflineDataNotice from "../components/OfflineDataNotice";
import { useOfflineDashboard } from "../hooks/useOfflineDashboard";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const STATUS_ABERTOS_OS = new Set(["solicitado", "em_andamento", "revisao"]);

function ultimosMeses(total = 6) {
  const hoje = new Date();
  return Array.from({ length: total }, (_, index) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (total - 1 - index), 1);
    return {
      mes: MESES[data.getMonth()],
      chave: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`,
    };
  });
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function isAtrasada(ordem) {
  if (!ordem?.prazo || ordem.status === "concluido") return false;
  const prazo = parseISODate(ordem.prazo);
  if (!prazo) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return prazo < hoje;
}

function DashboardCard({ canAccess, onClick, borderColor, label, value, detail }) {
  if (!canAccess) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="amp-card rounded-xl px-5 py-4 flex flex-col gap-1 hover:scale-105 transition-transform cursor-pointer border-l-4 min-w-0"
      style={{ borderLeftColor: borderColor }}
    >
      <p className="amp-label truncate">{label}</p>
      <p className="amp-kpi-val truncate">{value}</p>
      <p className="text-xs amp-orange truncate">{detail}</p>
    </button>
  );
}

function QuickLink({ canAccess, onClick, title, subtitle }) {
  if (!canAccess) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="amp-cell-bg p-3 rounded-lg text-center hover:scale-105 transition-transform cursor-pointer"
    >
      <p className="text-xs font-bold amp-text">{title}</p>
      <p className="text-[10px] amp-muted mt-1">{subtitle}</p>
    </button>
  );
}

/* ── relógio ao vivo ── */
function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/* ── KPI card ── */
/* ── Tooltip Recharts ── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="amp-tooltip">
      <p className="font-bold text-xs mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="text-xs">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

/* 
   COMPONENTE PRINCIPAL
*/
export default function Dashboard() {

  const now = useClock();  
  const navigate = useNavigate();
  const user = useMemo(() => getStoredUser(), []);
  const canClientes = hasPermission(user, "clientes");
  const canFinanceiro = hasPermission(user, "financeiro");
  const canOS = hasPermission(user, "ordens_servico");
  const canOrcamentos = hasPermission(user, "orcamentos");
  const {
    offlineInfo,
    updateOfflineInfo,
    getClientes,
    getFinanceiro,
    getFinanceiroResumo,
    getOrcamentosResumo,
    getOrdensServico,
  } = useOfflineDashboard(user);
  const [dados, setDados] = useState({
    clientes: [],
    financeiro: [],
    financeiroResumo: null,
    orcamentosResumo: null,
    ordens: [],
  });
  const [erroCarga, setErroCarga] = useState(false);

  useEffect(() => {
    let ativo = true;
    const requests = [];

    if (canClientes) requests.push(["clientes", getClientes()]);
    if (canFinanceiro) {
      requests.push(["financeiro", getFinanceiro()]);
      requests.push(["financeiroResumo", getFinanceiroResumo()]);
    }
    if (canOrcamentos) {
      requests.push(["orcamentosResumo", getOrcamentosResumo()]);
    }
    if (canOS) requests.push(["ordens", getOrdensServico()]);

    Promise.allSettled(requests.map(([, request]) => request)).then((results) => {
      if (!ativo) return;
      setErroCarga(results.some((result) => result.status === "rejected"));
      updateOfflineInfo(results);
      setDados((prev) => {
        const next = { ...prev };
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            next[requests[index][0]] = result.value.data;
          }
        });
        return next;
      });
    });

    return () => {
      ativo = false;
    };
  }, [
    canClientes,
    canFinanceiro,
    canOS,
    canOrcamentos,
    getClientes,
    getFinanceiro,
    getFinanceiroResumo,
    getOrcamentosResumo,
    getOrdensServico,
    updateOfflineInfo,
  ]);

  const metricas = useMemo(() => {
    const listaClientes = Array.isArray(dados.clientes) ? dados.clientes : [];
    const financeiro = Array.isArray(dados.financeiro) ? dados.financeiro : [];
    const ordens = Array.isArray(dados.ordens) ? dados.ordens : [];
    const financeiroResumo = dados.financeiroResumo || {};
    const orcamentosResumo = dados.orcamentosResumo || {};

    const meses = ultimosMeses();
    const faturamento = meses.map(({ mes, chave }) => ({
      mes,
      valor: Math.round(
        financeiro
          .filter((item) => item.tipo === "receber" && item.data_pagamento?.startsWith(chave))
          .reduce((sum, item) => sum + toNumber(item.valor), 0)
      ),
    }));

    const receitasPorCliente = new Map();
    financeiro
      .filter((item) => item.tipo === "receber")
      .forEach((item) => {
        const nome = item.cliente_nome || "Sem cliente";
        receitasPorCliente.set(nome, (receitasPorCliente.get(nome) || 0) + toNumber(item.valor_total || item.valor));
      });

    const osEntrada = ordens.filter((ordem) => ordem.status === "solicitado");
    const osUsinagem = ordens.filter((ordem) => ordem.status === "em_andamento");
    const osFechamento = ordens.filter((ordem) => ordem.status === "revisao");
    const osConcluidas = ordens.filter((ordem) => ordem.status === "concluido").length;
    const osAtraso = ordens.filter(isAtrasada).length;
    const backlog = ordens.filter((ordem) => STATUS_ABERTOS_OS.has(ordem.status)).length;
    const aprovadoAtivo = toNumber(
      orcamentosResumo.valor_aprovado_ativo ?? orcamentosResumo.valor_aprovado
    );
    const comercialAberto = toNumber(orcamentosResumo.rascunho) + toNumber(orcamentosResumo.enviado);
    const mesAtual = new Date().toISOString().slice(0, 7);
    const recebidoMesLista = financeiro
      .filter((item) => item.tipo === "receber" && item.data_pagamento?.startsWith(mesAtual))
      .reduce((sum, item) => sum + toNumber(item.valor), 0);
    const entradasLista = financeiro
      .filter((item) => item.tipo === "receber" && item.status !== "pago")
      .reduce((sum, item) => sum + toNumber(item.valor_total || item.valor), 0);
    const saidasLista = financeiro
      .filter((item) => item.tipo === "pagar" && item.status !== "pago")
      .reduce((sum, item) => sum + toNumber(item.valor_total || item.valor), 0);
    const atrasadosFinanceiro = Number.isFinite(Number(financeiroResumo.atrasados))
      ? toNumber(financeiroResumo.atrasados)
      : financeiro.filter((item) => item.status === "atrasado").length;
    const recebidoMTD = Number.isFinite(Number(financeiroResumo.recebido_mes))
      ? toNumber(financeiroResumo.recebido_mes)
      : recebidoMesLista;
    const entradas = Number.isFinite(Number(financeiroResumo.a_receber))
      ? toNumber(financeiroResumo.a_receber)
      : entradasLista;
    const saidas = Number.isFinite(Number(financeiroResumo.a_pagar))
      ? toNumber(financeiroResumo.a_pagar)
      : saidasLista;

    const alertas = [];
    if (erroCarga) {
      alertas.push({
        titulo: "Carga parcial do dashboard",
        descricao: "Algum módulo não respondeu ou está sem permissão.",
      });
    }
    if (atrasadosFinanceiro > 0) {
      alertas.push({
        titulo: "Recebimentos em atraso",
        descricao: `${atrasadosFinanceiro} título(s) precisam de atenção.`,
      });
    }
    if (osAtraso > 0) {
      alertas.push({
        titulo: "Ordens fora do prazo",
        descricao: `${osAtraso} OS em atraso operacional.`,
      });
    }
    if (comercialAberto > 0) {
      alertas.push({
        titulo: "Pipeline aberto",
        descricao: `${comercialAberto} proposta(s) aguardando decisão.`,
      });
    }

    return {
      clientes: listaClientes.length,
      recebidoMTD,
      atrasosSensiveis: atrasadosFinanceiro,
      aprovadoAtivo,
      propostasDecisao: comercialAberto,
      ticketOS: ordens.length > 0 ? aprovadoAtivo / ordens.length : 0,
      osConcluidas,
      osTotais: ordens.length,
      osAtraso,
      osEntrada,
      osUsinagem,
      osFechamento,
      faturamento,
      capacidade: [
        { etapa: "Entrada", carga: osEntrada.length, capacidade: Math.max(6, osEntrada.length) },
        { etapa: "Usinagem", carga: osUsinagem.length, capacidade: Math.max(6, osUsinagem.length) },
        { etapa: "Fechamento", carga: osFechamento.length, capacidade: Math.max(6, osFechamento.length) },
      ],
      pipeline: {
        rascunho: toNumber(orcamentosResumo.rascunho),
        enviado: toNumber(orcamentosResumo.enviado),
        aprovado: toNumber(orcamentosResumo.aprovado),
      },
      fluxoCaixa: {
        total: entradas - saidas,
        entradas,
        saidas,
        saldo: entradas - saidas,
      },
      alertas: alertas.slice(0, 5),
      receitaClientes: [...receitasPorCliente.entries()]
        .map(([nome, receita]) => ({ nome, receita: Math.round(receita) }))
        .sort((a, b) => b.receita - a.receita)
        .slice(0, 5),
      backlog,
      comercialAberto,
    };
  }, [dados, erroCarga]);

  const {
    clientes,
    recebidoMTD,
    atrasosSensiveis,
    aprovadoAtivo,
    propostasDecisao,
    ticketOS,
    osConcluidas,
    osTotais,
    osAtraso,
    osEntrada,
    osUsinagem,
    osFechamento,
    faturamento,
    capacidade,
    pipeline,
    fluxoCaixa,
    alertas,
    receitaClientes,
    backlog,
    comercialAberto,
  } = metricas;


  const throughput = osTotais > 0 ? Math.round((osConcluidas / osTotais) * 100) : 0;
  const fmt  = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const dateStr = now.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" }).toUpperCase();
  const timeStr = now.toLocaleTimeString("pt-BR");

  return (
    <div className="flex flex-col h-full overflow-hidden amp-bg px-3 py-2" style={{ borderRadius: "12px" }}>
      {/* ══ CONTEÚDO (sem header — já existe no ProtectedLayout) ══ */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          <OfflineDataNotice info={offlineInfo} />

          {/* ── Sub-header analítico ── */}
          <div className="amp-card rounded-2xl px-6 py-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="amp-label mb-1">Painel AMP</p>
                <h2 className="text-2xl font-extrabold amp-text">Centro analítico industrial</h2>
              </div>
              <div className="flex items-center gap-8 flex-wrap">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                </div>
                  <p className="text-2xl font-extrabold amp-orange font-mono">{timeStr}</p>
                  <p className="text-[9px] amp-muted">{dateStr}</p>
                </div>
              </div>
            </div>

            {/* status bar */}
            <div className="flex flex-wrap gap-5 mt-4 pt-4"
              style={{ borderTop: "1px solid var(--amp-border)" }}>
              {[
                canOS ? { k: "Backlog", v: `${backlog} OS` } : null,
                canOrcamentos ? { k: "Comercial aberto", v: `${comercialAberto} proposta(s)` } : null,
                canFinanceiro ? { k: "A receber", v: fmt(fluxoCaixa.entradas), color: "var(--amp-green)" } : null,
                canFinanceiro ? { k: "A pagar", v: fmt(fluxoCaixa.saidas), color: "var(--amp-red)" } : null,
                canClientes ? { k: "Base ativa", v: `${clientes} conta(s)` } : null,
              ].filter(Boolean).map((s) => (
                <span key={s.k} className="flex items-center gap-1.5 text-[10px] font-bold amp-muted tracking-wider uppercase">
                  {s.k}
                  <span style={{ color: s.color ?? "var(--amp-orange)", fontWeight: 800 }}>{s.v}</span>
                </span>
              ))}
            </div>
          </div>

          {/* ── KPIs + Navegação Rápida ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <DashboardCard
              canAccess={canClientes}
              onClick={() => navigate("/app/clientes")}
              borderColor="var(--amp-green)"
              label="Clientes ativos"
              value={clientes}
              detail="Ir para Clientes"
            />
            <DashboardCard
              canAccess={canFinanceiro}
              onClick={() => navigate("/app/financeiro")}
              borderColor="var(--amp-orange)"
              label="Recebido no mês"
              value={fmt(recebidoMTD)}
              detail={`${atrasosSensiveis} atraso(s)`}
            />
            <DashboardCard
              canAccess={canOrcamentos}
              onClick={() => navigate("/app/orcamentos")}
              borderColor="var(--amp-orange)"
              label="Aprovado ativo"
              value={fmt(aprovadoAtivo)}
              detail={`${propostasDecisao} em decisão`}
            />
            <DashboardCard
              canAccess={canOS}
              onClick={() => navigate("/app/ordens-servico")}
              borderColor="var(--amp-green)"
              label="Ticket por OS"
              value={fmt(ticketOS)}
              detail={`${osConcluidas} concluída(s)`}
            />
          </div>

          {/* ── Linha 2: Faturamento · Pipeline+Fila · Ordens+Throughput ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Faturamento + Pipeline */}
            {(canFinanceiro || canOrcamentos) && (
              <div className="amp-card rounded-xl p-5 flex flex-col gap-4 overflow-hidden">
                {canFinanceiro && (
                  <div>
                    <p className="amp-label mb-4">● Faturamento mensal</p>
                    <ResponsiveContainer width="100%" height={110}>
                      <LineChart data={faturamento} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                        <CartesianGrid stroke="var(--amp-grid)" strokeDasharray="3 3" />
                        <XAxis dataKey="mes" tick={{ fontSize:9, fill:"var(--amp-muted)" }} />
                        <YAxis              tick={{ fontSize:9, fill:"var(--amp-muted)" }} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="valor" stroke="var(--amp-orange)"
                          strokeWidth={2} dot={{ r:3, fill:"var(--amp-orange)" }}
                          activeDot={{ r:5 }} name="R$" />
                      </LineChart>
                    </ResponsiveContainer>
                    <p className="text-xs amp-muted mt-2">Recebido no mês: {fmt(recebidoMTD)}</p>
                  </div>
                )}

                {canFinanceiro && canOrcamentos && <div className="amp-divider" />}

                {canOrcamentos && (
                  <div>
                    <p className="amp-label mb-3">● Pipeline comercial</p>
                    {[
                      { l:"Rascunho", v:pipeline.rascunho },
                      { l:"Enviado",  v:pipeline.enviado  },
                      { l:"Aprovado", v:pipeline.aprovado },
                    ].map((p) => {
                      const w = Math.min(100, Math.round((p.v / Math.max(comercialAberto,1)) * 100));
                      return (
                        <div key={p.l} className="flex items-center gap-3 mb-2 text-xs">
                          <span className="amp-muted w-16">{p.l}</span>
                          <div className="amp-pipe-track">
                            <div className="amp-pipe-fill" style={{ width:`${w}%` }} />
                          </div>
                          <span className="amp-muted w-5 text-right">{p.v}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Fila de OS + Carga × Capacidade */}
            {canOS && <div className="amp-card rounded-xl p-5 flex flex-col gap-4 overflow-hidden">
              <div>
                <p className="amp-label mb-3">● Fila de OS</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { l:"Entrada",    n:osEntrada.length    },
                    { l:"Usinagem",   n:osUsinagem.length   },
                    { l:"Fechamento", n:osFechamento.length },
                  ].map((f) => (
                    <div key={f.l} className="amp-cell-bg p-2 text-center">
                      <p className="amp-label mb-1">{f.l}</p>
                      <p className="text-xs amp-muted">
                        {f.n > 0 ? `${f.n} ordem(ns)` : "Sem ordem nesta etapa"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="amp-divider" />

              <div>
                <p className="amp-label mb-3">● Carga × Capacidade de Produção</p>
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={capacidade} margin={{ top:4, right:4, left:-28, bottom:0 }}>
                    <CartesianGrid stroke="var(--amp-grid)" strokeDasharray="3 3" />
                    <XAxis dataKey="etapa" tick={{ fontSize:9, fill:"var(--amp-muted)" }} />
                    <YAxis              tick={{ fontSize:9, fill:"var(--amp-muted)" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="carga"      fill="var(--amp-green)" radius={[3,3,0,0]} name="Carga" />
                    <Bar dataKey="capacidade" fill="var(--amp-orange)" radius={[3,3,0,0]} name="Capacidade" opacity={0.65} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>}

            {/* Ordens em atraso + Throughput */}
            {canOS && <div className="flex flex-col gap-3">
              <div className="amp-card rounded-xl p-5 flex-1">
                <p className="amp-label mb-3">● Ordens em Atraso — Mês</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-4xl font-extrabold amp-red">{osAtraso}</span>
                  <div>
                    <p className="text-sm font-semibold amp-text">ordens fora do prazo</p>
                    <p className="text-xs amp-orange">
                      Ciclo: {now.toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}).toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="amp-card rounded-xl p-5 flex-1 flex flex-col items-center justify-center">
                <p className="amp-label mb-3">● Produtividade Operacional</p>
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="15" fill="none" stroke="var(--amp-bar)" strokeWidth="3" />
                    <circle cx="20" cy="20" r="15" fill="none"
                      stroke="var(--amp-orange)" strokeWidth="3"
                      strokeDasharray={`${(throughput/100)*94} 94`}
                      strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-base font-extrabold amp-text">
                    {throughput}%
                  </span>
                </div>
                <p className="text-xs amp-muted mt-2 text-center">
                  {osConcluidas} concluída(s) de {osTotais} ordem(ns).
                </p>
              </div>
            </div>}
          </div>

          {/* ── Linha 3: Fluxo · Recebimentos+Radar · Receita ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">

            {/* Fluxo de caixa */}
            {canFinanceiro && <div className="amp-card rounded-xl p-5">
              <p className="amp-label mb-3">● Fluxo de Caixa</p>
              <p className="text-3xl font-extrabold amp-text mb-4">{fmt(fluxoCaixa.total)}</p>
              {[
                { l:"Entradas previstas",    v:fmt(fluxoCaixa.entradas), c:"var(--amp-green)"  },
                { l:"Saídas compromissadas", v:fmt(fluxoCaixa.saidas),   c:"var(--amp-red)"    },
                { l:"Saldo projetado",       v:fmt(fluxoCaixa.saldo),    c:"var(--amp-orange)" },
              ].map((r) => (
                <div key={r.l} className="flex justify-between items-center py-2.5"
                  style={{ borderBottom:"1px solid var(--amp-border)" }}>
                  <span className="text-sm amp-muted">{r.l}</span>
                  <span className="text-sm font-bold" style={{ color:r.c }}>{r.v}</span>
                </div>
              ))}
            </div>}

            {/* Recebimentos sensíveis + Radar */}
            {(canFinanceiro || canOrcamentos) && <div className="flex flex-col gap-3">
              {canFinanceiro && <div className="amp-card rounded-xl p-5 flex-1">
                <p className="amp-label mb-3">● Recebimentos Sensíveis</p>
                <p className="text-xs amp-muted italic text-center mt-4">
                  {atrasosSensiveis > 0
                    ? `${atrasosSensiveis} título(s) em atenção`
                    : "Sem títulos sensíveis na abertura."}
                </p>
              </div>}
              {canOrcamentos && <div className="amp-card rounded-xl p-5 flex-1">
                <p className="amp-label mb-3">● Radar Comercial</p>
                <p className="text-xs amp-muted italic text-center mt-4">
                  {comercialAberto > 0
                    ? `${comercialAberto} proposta(s) em aberto`
                    : "Sem orçamentos recentes nesta mesa."}
                </p>
              </div>}
            </div>}

            {/* Receita por cliente */}
            {canFinanceiro && <div className="amp-card rounded-xl p-5">
              <p className="amp-label mb-4">● Receita por Cliente</p>
              {receitaClientes.length > 0 ? (
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={receitaClientes} layout="vertical"
                    margin={{ top:0, right:8, left:0, bottom:0 }}>
                    <XAxis type="number" tick={{ fontSize:9, fill:"var(--amp-muted)" }} />
                    <YAxis type="category" dataKey="nome"
                      tick={{ fontSize:9, fill:"var(--amp-muted)" }} width={80} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="receita" fill="var(--amp-orange)"
                      radius={[0,3,3,0]} name="R$" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-xs amp-muted italic text-center mt-4">
                  Sem carteira financeira suficiente para ranking.
                </p>
              )}
              <p className="text-xs amp-muted text-right mt-3">Valor total: {fmt(recebidoMTD)}</p>
            </div>}
          </div>

          {/* ── Mesa de Alertas ── */}
          <div className="amp-card rounded-xl p-5">
            <p className="amp-label mb-4">● Mesa de Alertas</p>
            {alertas.length > 0 ? (
              alertas.map((a, i) => (
                <div key={i} className="flex items-start justify-between gap-4 py-2.5 text-sm"
                  style={{ borderBottom: i < alertas.length-1 ? "1px solid var(--amp-border)" : "none" }}>
                  <span className="font-semibold amp-text">{a.titulo}</span>
                  <span className="text-xs amp-muted text-right shrink-0">{a.descricao}</span>
                </div>
              ))
            ) : (
              <p className="text-xs amp-muted italic text-center py-2">Nenhum alerta ativo.</p>
            )}
          </div>

          {/* ── Navegação Rápida ── */}
          <div className="amp-card rounded-xl p-5">
            <p className="amp-label mb-4">● Navegação Rápida</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              <QuickLink
                canAccess={canClientes}
                onClick={() => navigate("/app/clientes")}
                title="Clientes"
                subtitle="Carteira e fornecedores"
              />
              <QuickLink
                canAccess={canOrcamentos}
                onClick={() => navigate("/app/orcamentos")}
                title="Orçamentos"
                subtitle="Propostas comerciais"
              />
              <QuickLink
                canAccess={canOS}
                onClick={() => navigate("/app/ordens-servico")}
                title="Ordens de Serviço"
                subtitle="OS em produção"
              />
              <QuickLink
                canAccess={canFinanceiro}
                onClick={() => navigate("/app/financeiro")}
                title="Financeiro"
                subtitle="Fluxo de caixa"
              />
              <QuickLink
                canAccess={hasPermission(user, "usuarios")}
                onClick={() => navigate("/app/usuarios")}
                title="Usuários"
                subtitle="Equipe e permissões"
              />
              <QuickLink
                canAccess={hasPermission(user, "backup")}
                onClick={() => navigate("/app/backup")}
                title="Backup"
                subtitle="Dados e segurança"
              />
            </div>
          </div>

      </div>
    </div>
  );
}
