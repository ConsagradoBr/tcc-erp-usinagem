import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import api from "../api";
import { getStoredUser, hasPermission } from "../auth";
import { useTheme } from "../components/ThemeProvider";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const COLORS = {
  accent: "#00d4aa",
  blue: "#00aaff",
  warn: "#ffa940",
  danger: "#ff4d6d",
  purple: "#a78bfa",
};

const OS_STATUS = {
  solicitado: { label: "Solicitado", short: "Entrada", note: "Triagem e definicao do pedido.", tone: "warn" },
  em_andamento: { label: "Em andamento", short: "Usinagem", note: "Execucao ativa na operacao.", tone: "pos" },
  revisao: { label: "Em revisao", short: "Fechamento", note: "Conferencia tecnica e acabamento.", tone: "purple" },
  concluido: { label: "Concluido", short: "Concluido", note: "Pronto para expedir e receber.", tone: "accent" },
};

function ultimosMeses(n = 6) {
  const hoje = new Date();
  return Array.from({ length: n }, (_, index) => {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - index), 1);
    return {
      label: MESES[data.getMonth()],
      key: `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`,
    };
  });
}

const fmtCurrency = (value) =>
  value == null
    ? "..."
    : Number(value).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      });

const fmtCurrencyCompact = (value) => {
  if (value == null) return "...";
  const number = Number(value);
  if (Math.abs(number) >= 1000000) return `R$ ${(number / 1000000).toFixed(1).replace(".", ",")} mi`;
  if (Math.abs(number) >= 1000) return `R$ ${(number / 1000).toFixed(0)} mil`;
  return fmtCurrency(number);
};

const fmtNumber = (value) => (value == null ? "..." : Number(value).toLocaleString("pt-BR"));

const fmtShortDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
};

const fmtLongDate = (value) =>
  new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(value);

const baseDescricao = (texto) => (texto || "").replace(/\s*\(\d+\/\d+\)$/, "").trim();

const sortNewest = (a, b) => {
  const left = new Date(a?.created_at || a?.vencimento || 0).getTime();
  const right = new Date(b?.created_at || b?.vencimento || 0).getTime();
  return right - left;
};

function daysUntil(dateValue) {
  if (!dateValue) return Number.POSITIVE_INFINITY;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}

function getShiftLabel(now) {
  const hour = now.getHours();
  if (hour < 12) return "Turno 1";
  if (hour < 18) return "Turno 2";
  return "Turno 3";
}

function getToneClass(tone) {
  if (tone === "pos") return "is-pos";
  if (tone === "warn") return "is-warn";
  if (tone === "danger") return "is-neg";
  if (tone === "purple") return "is-purple";
  return "";
}

function LoadingPulse({ className = "" }) {
  return <span className={`amp-terminal-pulse ${className}`} />;
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="amp-terminal-tooltip">
      <p>{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="amp-terminal-tooltip-row">
          <span style={{ color: item.color || item.fill }}>{item.name || item.dataKey}</span>
          <strong>{typeof item.value === "number" ? fmtCurrency(item.value) : item.value}</strong>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const user = getStoredUser();
  const { isDark } = useTheme();
  const [clientes, setClientes] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [grafico, setGrafico] = useState(null);
  const [osResumo, setOsResumo] = useState(null);
  const [ordens, setOrdens] = useState(null);
  const [orcamentosResumo, setOrcamentosResumo] = useState(null);
  const [orcamentos, setOrcamentos] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [erro, setErro] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const canClientes = hasPermission(user, "clientes");
  const canFinanceiro = hasPermission(user, "financeiro");
  const canOS = hasPermission(user, "ordens_servico");
  const canOrcamentos = hasPermission(user, "orcamentos");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const requests = [];
    const meses = ultimosMeses(6);

    if (canClientes) {
      requests.push(api.get("/clientes").then((response) => setClientes(response.data.length)));
    }

    if (canFinanceiro) {
      requests.push(
        Promise.all([api.get("/financeiro/resumo"), api.get("/financeiro")]).then(([resResumo, resFinanceiro]) => {
          const lista = resFinanceiro.data || [];
          setResumo(resResumo.data);
          setFinanceiro(lista);
          setGrafico(
            meses.map(({ label, key }) => {
              const recebido = lista
                .filter((item) => item.tipo === "receber" && item.data_pagamento?.startsWith(key))
                .reduce((sum, item) => sum + Number(item.valor || 0), 0);
              const pago = lista
                .filter((item) => item.tipo === "pagar" && item.data_pagamento?.startsWith(key))
                .reduce((sum, item) => sum + Number(item.valor || 0), 0);

              return {
                month: label,
                recebido: Math.round(recebido),
                pago: Math.round(pago),
              };
            })
          );
        })
      );
    }

    if (canOS) {
      requests.push(
        Promise.all([api.get("/ordens-servico/resumo"), api.get("/ordens-servico")]).then(([resResumo, resOrdens]) => {
          setOrdens(resOrdens.data || []);
          setOsResumo(
            Object.entries(OS_STATUS).map(([id, meta]) => ({
              id,
              label: meta.label,
              short: meta.short,
              note: meta.note,
              tone: meta.tone,
              value: resResumo.data[id] || 0,
            }))
          );
        })
      );
    }

    if (canOrcamentos) {
      requests.push(
        Promise.all([api.get("/orcamentos/resumo"), api.get("/orcamentos")]).then(([resResumo, resList]) => {
          setOrcamentosResumo(resResumo.data);
          setOrcamentos(resList.data || []);
        })
      );
    }

    Promise.all(requests).catch(() => setErro(true));
  }, [canClientes, canFinanceiro, canOS, canOrcamentos]);

  const chartPalette = useMemo(
    () => ({
      grid: isDark ? "rgba(0, 212, 170, 0.10)" : "rgba(0, 120, 255, 0.08)",
      tick: isDark ? "#7f94b2" : "#617691",
    }),
    [isDark]
  );

  const totalOrdens = useMemo(() => osResumo?.reduce((sum, item) => sum + item.value, 0) ?? null, [osResumo]);
  const ordensConcluidas = useMemo(() => osResumo?.find((item) => item.id === "concluido")?.value ?? 0, [osResumo]);
  const ordensEmFluxo = totalOrdens == null ? null : Math.max(totalOrdens - ordensConcluidas, 0);
  const throughput = totalOrdens ? Math.round((ordensConcluidas / totalOrdens) * 100) : 0;
  const openQuotes = orcamentosResumo ? (orcamentosResumo.rascunho || 0) + (orcamentosResumo.enviado || 0) : null;
  const approvedValue = orcamentosResumo?.valor_aprovado_ativo ?? orcamentosResumo?.valor_aprovado ?? null;
  const ticketPorOs = totalOrdens ? Math.round((approvedValue || 0) / totalOrdens) : null;

  const kpis = [
    canClientes && {
      label: "Clientes ativos",
      value: clientes == null ? <LoadingPulse className="w-20" /> : fmtNumber(clientes),
      delta: clientes == null ? "Base sincronizando" : "Carteira viva na operacao",
      tone: "accent",
    },
    canFinanceiro && {
      label: "Recebido MTD",
      value: resumo == null ? <LoadingPulse className="w-24" /> : fmtCurrency(resumo.recebido_mes),
      delta: resumo == null ? "Lendo caixa" : `${fmtNumber(resumo.atrasados || 0)} atraso(s) sensivel(is)`,
      tone: "pos",
    },
    canOrcamentos && {
      label: "Aprovado ativo",
      value: orcamentosResumo == null ? <LoadingPulse className="w-24" /> : fmtCurrency(approvedValue),
      delta: orcamentosResumo == null ? "Lendo pipeline" : `${fmtNumber(openQuotes || 0)} proposta(s) em decisao`,
      tone: "warn",
    },
    (canOS || canOrcamentos) && {
      label: "Ticket por OS",
      value:
        canOS && canOrcamentos && ticketPorOs != null
          ? fmtCurrency(ticketPorOs)
          : totalOrdens == null
            ? <LoadingPulse className="w-20" />
            : `${throughput}%`,
      delta:
        canOS && canOrcamentos && ticketPorOs != null
          ? `${fmtNumber(totalOrdens)} ordem(ns) no ciclo`
          : totalOrdens == null
            ? "Lendo producao"
            : `${fmtNumber(ordensConcluidas)} concluida(s)`,
      tone: "purple",
    },
  ].filter(Boolean);

  const tickerItems = useMemo(() => {
    const items = [];

    if (canOS && totalOrdens != null) {
      items.push({
        label: "Backlog",
        value: `${fmtNumber(ordensEmFluxo)} OS`,
        tone: ordensEmFluxo > 0 ? "warn" : "pos",
      });
    }

    if (canOrcamentos && openQuotes != null) {
      items.push({
        label: "Comercial aberto",
        value: `${fmtNumber(openQuotes)} proposta(s)`,
        tone: openQuotes > 0 ? "accent" : "pos",
      });
    }

    if (canFinanceiro && resumo) {
      items.push({ label: "A receber", value: fmtCurrencyCompact(resumo.a_receber), tone: "pos" });
      items.push({ label: "A pagar", value: fmtCurrencyCompact(resumo.a_pagar), tone: "danger" });
    }

    if (canClientes && clientes != null) {
      items.push({ label: "Base ativa", value: `${fmtNumber(clientes)} conta(s)`, tone: "accent" });
    }

    return items.slice(0, 5);
  }, [canClientes, canFinanceiro, canOS, canOrcamentos, clientes, openQuotes, ordensEmFluxo, resumo, totalOrdens]);

  const cashBreakdown = useMemo(() => {
    if (!resumo) return [];
    const saldo = Number(resumo.a_receber || 0) - Number(resumo.a_pagar || 0);
    return [
      { label: "Entradas previstas", value: Number(resumo.a_receber || 0), tone: "pos" },
      { label: "Saidas compromissadas", value: Number(resumo.a_pagar || 0), tone: "danger" },
      { label: "Saldo projetado", value: saldo, tone: saldo >= 0 ? "accent" : "danger" },
    ];
  }, [resumo]);

  const donutData = useMemo(
    () =>
      resumo
        ? [
            { name: "A receber", value: Number(resumo.a_receber || 0), color: COLORS.accent },
            { name: "A pagar", value: Number(resumo.a_pagar || 0), color: COLORS.danger },
          ]
        : [],
    [resumo]
  );

  const sensitiveReceivables = useMemo(() => {
    if (!financeiro?.length) return [];
    return [...financeiro]
      .filter((item) => item.tipo === "receber" && item.status !== "pago")
      .map((item) => {
        const dueIn = daysUntil(item.vencimento);
        return {
          ...item,
          dueIn,
          tone: dueIn < 0 || item.status === "atrasado" ? "danger" : dueIn <= 5 ? "warn" : "pos",
        };
      })
      .sort((a, b) => a.dueIn - b.dueIn)
      .slice(0, 5);
  }, [financeiro]);

  const pipelineRows = useMemo(() => {
    if (!orcamentosResumo) return [];
    const rows = [
      { label: "Rascunho", value: orcamentosResumo.rascunho || 0, tone: "blue" },
      { label: "Enviado", value: orcamentosResumo.enviado || 0, tone: "warn" },
      { label: "Aprovado", value: orcamentosResumo.aprovado || 0, tone: "pos" },
    ];
    const maxValue = Math.max(...rows.map((row) => row.value), 1);
    return rows.map((row) => ({ ...row, width: `${Math.max((row.value / maxValue) * 100, row.value ? 18 : 0)}%` }));
  }, [orcamentosResumo]);

  const orderLanes = useMemo(() => {
    if (!ordens?.length) {
      return [
        { title: "Entrada", tone: "warn", items: [] },
        { title: "Usinagem", tone: "pos", items: [] },
        { title: "Fechamento", tone: "purple", items: [] },
      ];
    }

    return [
      { title: "Entrada", tone: "warn", items: ordens.filter((item) => item.status === "solicitado").sort(sortNewest).slice(0, 4) },
      {
        title: "Usinagem",
        tone: "pos",
        items: ordens.filter((item) => item.status === "em_andamento").sort(sortNewest).slice(0, 4),
      },
      { title: "Fechamento", tone: "purple", items: ordens.filter((item) => item.status === "revisao").sort(sortNewest).slice(0, 4) },
    ];
  }, [ordens]);

  const productionLoad = useMemo(() => {
    if (!osResumo?.length) return [];
    return osResumo
      .filter((item) => item.id !== "concluido")
      .map((item) => ({
        etapa: item.short,
        carga: item.value,
        alvo: Math.max(item.value + (item.id === "em_andamento" ? 2 : 1), item.id === "em_andamento" ? 6 : 4),
      }));
  }, [osResumo]);

  const revenueByClient = useMemo(() => {
    if (!financeiro?.length) return [];
    const grouped = new Map();

    financeiro
      .filter((item) => item.tipo === "receber")
      .forEach((item) => {
        const key = item.cliente_nome || baseDescricao(item.descricao) || "Sem cliente";
        grouped.set(key, (grouped.get(key) || 0) + Number(item.valor_total || item.valor || 0));
      });

    const values = [...grouped.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4);
    const maxValue = Math.max(...values.map((item) => item.value), 1);
    return values.map((item) => ({ ...item, width: `${(item.value / maxValue) * 100}%` }));
  }, [financeiro]);

  const overdueOrders = useMemo(() => {
    if (!ordens?.length) return 0;
    return ordens.filter((item) => item.status !== "concluido" && daysUntil(item.prazo) < 0).length;
  }, [ordens]);

  const quoteRadar = useMemo(() => {
    if (!orcamentos?.length) return [];
    return [...orcamentos]
      .filter((item) => item.status !== "cancelado")
      .sort(sortNewest)
      .slice(0, 4)
      .map((item) => ({
        ...item,
        tone: item.status === "aprovado" ? "pos" : item.status === "enviado" ? "warn" : "accent",
      }));
  }, [orcamentos]);

  const alertRail = useMemo(() => {
    const items = [];

    if (resumo) {
      items.push({
        title: resumo.atrasados > 0 ? "Cobrancas vencidas pedem acao" : "Caixa sem titulos vencidos",
        detail: resumo.atrasados > 0 ? `${fmtNumber(resumo.atrasados)} atraso(s) na mesa financeira` : "Financeiro abriu sem urgencia critica",
        tone: resumo.atrasados > 0 ? "danger" : "pos",
      });
    }

    if (ordensEmFluxo != null) {
      items.push({
        title: ordensEmFluxo > 0 ? "Fila de producao segue viva" : "Sem backlog relevante em OS",
        detail: `${fmtNumber(ordensEmFluxo || 0)} ordem(ns) fora da etapa concluida`,
        tone: ordensEmFluxo > 0 ? "warn" : "pos",
      });
    }

    if (openQuotes != null) {
      items.push({
        title: openQuotes > 0 ? "Pipeline comercial ainda aberto" : "Comercial sem gargalo no ciclo",
        detail: `${fmtNumber(openQuotes || 0)} proposta(s) ainda em decisao`,
        tone: openQuotes > 0 ? "accent" : "pos",
      });
    }

    return items.slice(0, 3);
  }, [openQuotes, ordensEmFluxo, resumo]);

  const timeLabel = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(now);

  return (
    <div className="amp-terminal-view">
      <section className="amp-terminal-intro">
        <div className="amp-terminal-intro-copy">
          <p className="amp-terminal-kicker">AMP trader board</p>
          <h2>Centro analitico industrial</h2>
          <p>Mesa única de decisão para comercial, OS e caixa.</p>
        </div>

        <div className="amp-terminal-intro-meta">
          <div className="amp-terminal-live-chip">
            <span className="amp-terminal-live-dot" />
            Operacao em curso
          </div>
          <div className="amp-terminal-meta-widget">
            <span>Campinas / SP</span>
            <strong>{timeLabel}</strong>
            <small>{fmtLongDate(now)}</small>
          </div>
          <div className="amp-terminal-meta-widget">
            <span>Contexto do turno</span>
            <strong>{getShiftLabel(now)}</strong>
            <small>Cliente → Orcamento → OS → Financeiro</small>
          </div>
        </div>
      </section>

      <section className="amp-terminal-ticker" aria-label="Resumo operacional">
        {tickerItems.length === 0 ? (
          <div className="amp-terminal-ticker-item">
            <span className="amp-terminal-ticker-label">Status</span>
            <span className="amp-terminal-ticker-value">Carregando base operacional...</span>
          </div>
        ) : (
          tickerItems.map((item) => (
            <div key={item.label} className="amp-terminal-ticker-item">
              <span className="amp-terminal-ticker-label">{item.label}</span>
              <span className={`amp-terminal-ticker-value ${getToneClass(item.tone)}`}>{item.value}</span>
            </div>
          ))
        )}
      </section>

      <section className="amp-terminal-kpis">
        {kpis.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>

      <section className="amp-terminal-grid">
        <div className="amp-terminal-column">
          {canFinanceiro && (
            <>
              <TerminalPanel title="Faturamento mensal" footer={`Total vendas: ${fmtCurrencyCompact(grafico?.reduce((sum, item) => sum + item.recebido, 0) || 0)}`}>
                <div className="amp-terminal-chart-shell">
                  {grafico == null ? (
                    <div className="amp-terminal-chart-loading">
                      <div className="amp-shell-loader" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={grafico} margin={{ left: -12, right: 8, top: 6, bottom: 0 }}>
                        <XAxis dataKey="month" tick={{ fill: chartPalette.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chartPalette.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.02)" }} />
                        <Bar dataKey="recebido" name="Recebido" radius={[5, 5, 0, 0]}>
                          {grafico.map((entry, index) => (
                            <Cell
                              key={`${entry.month}-${index}`}
                              fill={index === grafico.length - 1 ? COLORS.accent : COLORS.blue}
                              fillOpacity={index === grafico.length - 1 ? 0.9 : 0.62}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </TerminalPanel>

              <TerminalPanel title="Fluxo de caixa">
                {resumo == null ? (
                  <div className="amp-terminal-empty">Lendo estrutura de caixa...</div>
                ) : (
                  <>
                    <div className="amp-terminal-fluxo-value">{fmtCurrencyCompact((resumo.a_receber || 0) - (resumo.a_pagar || 0))}</div>
                    <div className="amp-terminal-donut-wrap">
                      <div className="amp-terminal-donut-shell">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Tooltip content={<ChartTooltip />} />
                            <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={30} outerRadius={43} stroke="none">
                              {donutData.map((item) => (
                                <Cell key={item.name} fill={item.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="amp-terminal-breakdown">
                        {cashBreakdown.map((item) => (
                          <div key={item.label} className="amp-terminal-break-row">
                            <span>{item.label}</span>
                            <strong className={getToneClass(item.tone)}>{fmtCurrencyCompact(item.value)}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </TerminalPanel>

              <TerminalPanel title="Recebimentos sensiveis" grow>
                {sensitiveReceivables.length === 0 ? (
                  <div className="amp-terminal-empty">Sem titulos sensiveis na abertura.</div>
                ) : (
                  <table className="amp-terminal-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Valor</th>
                        <th>Venc.</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensitiveReceivables.map((item) => (
                        <tr key={item.id}>
                          <td>{item.cliente_nome || baseDescricao(item.descricao) || "Sem cliente"}</td>
                          <td className={`is-mono ${getToneClass(item.tone)}`}>{fmtCurrency(item.valor_total || item.valor)}</td>
                          <td className={getToneClass(item.tone)}>{fmtShortDate(item.vencimento)}</td>
                          <td>
                            <span className={`amp-terminal-badge ${getToneClass(item.tone)}`}>
                              {item.dueIn < 0 || item.status === "atrasado" ? "Atrasado" : item.dueIn <= 5 ? "Vence" : "Ok"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </TerminalPanel>
            </>
          )}
        </div>

        <div className="amp-terminal-column">
          {canOrcamentos && (
            <TerminalPanel title="Pipeline comercial">
              {pipelineRows.length === 0 ? (
                <div className="amp-terminal-empty">Sem atividade comercial no ciclo.</div>
              ) : (
                <div className="amp-terminal-pipeline">
                  {pipelineRows.map((item) => (
                    <div key={item.label} className="amp-terminal-pipe-row">
                      <span className="amp-terminal-pipe-label">{item.label}</span>
                      <div className="amp-terminal-pipe-track">
                        <div className={`amp-terminal-pipe-fill ${getToneClass(item.tone)}`} style={{ width: item.width }} />
                      </div>
                      <span className="amp-terminal-pipe-number">{fmtNumber(item.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </TerminalPanel>
          )}

          {canOS && (
            <>
              <TerminalPanel title="Fila de OS">
                <div className="amp-terminal-board">
                  {orderLanes.map((lane) => (
                    <div key={lane.title} className="amp-terminal-board-col">
                      <div className="amp-terminal-board-head">{lane.title}</div>
                      {lane.items.length === 0 ? (
                        <div className="amp-terminal-board-empty">Sem ordem nesta etapa</div>
                      ) : (
                        lane.items.map((item) => (
                          <div key={item.id} className={`amp-terminal-order ${getToneClass(lane.tone)}`}>
                            <strong>{item.numero || "OS"}</strong>
                            <span>{item.servico || item.cliente}</span>
                            <small>{item.cliente}</small>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </TerminalPanel>

              <TerminalPanel title="Carga x capacidade de producao" grow>
                {productionLoad.length === 0 ? (
                  <div className="amp-terminal-empty">Sem leitura de producao para montar carga.</div>
                ) : (
                  <div className="amp-terminal-chart-shell amp-terminal-chart-grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productionLoad} margin={{ left: -16, right: 6, top: 8, bottom: 0 }}>
                        <CartesianGrid stroke={chartPalette.grid} vertical={false} />
                        <XAxis dataKey="etapa" tick={{ fill: chartPalette.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: chartPalette.tick, fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTooltip />} />
                        <Bar dataKey="carga" name="Carga" fill={COLORS.accent} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="alvo" name="Capacidade" fill={COLORS.blue} fillOpacity={0.42} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </TerminalPanel>
            </>
          )}

          {canFinanceiro && (
            <TerminalPanel title="Receita por cliente" footer={`Valor total: ${fmtCurrencyCompact(revenueByClient.reduce((sum, item) => sum + item.value, 0))}`}>
              {revenueByClient.length === 0 ? (
                <div className="amp-terminal-empty">Sem carteira financeira suficiente para ranking.</div>
              ) : (
                <div className="amp-terminal-revenue-list">
                  {revenueByClient.map((item) => (
                    <div key={item.name} className="amp-terminal-revenue-row">
                      <span className="amp-terminal-revenue-label">{item.name}</span>
                      <div className="amp-terminal-revenue-track">
                        <div className="amp-terminal-revenue-fill" style={{ width: item.width }} />
                      </div>
                      <span className="amp-terminal-revenue-value">{fmtCurrencyCompact(item.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </TerminalPanel>
          )}
        </div>

        <div className="amp-terminal-column">
          {canOS && (
            <TerminalPanel title="Ordens em atraso - mes">
              <div className="amp-terminal-overdue">
                <div className="amp-terminal-overdue-big">{fmtNumber(overdueOrders)}</div>
                <div>
                  <div className="amp-terminal-overdue-info">ordens fora do prazo</div>
                  <div className="amp-terminal-overdue-sub">
                    Ciclo: <span>{`${MESES[now.getMonth()].toUpperCase()}/${String(now.getFullYear()).slice(-2)}`}</span>
                  </div>
                </div>
              </div>
            </TerminalPanel>
          )}

          {canOS && (
            <TerminalPanel title="Throughput operacional">
              <div className="amp-terminal-gauge-wrap">
                <div className="amp-terminal-ring" style={{ "--amp-terminal-ring": `${throughput}%` }}>
                  <span>{totalOrdens == null ? "..." : `${throughput}%`}</span>
                </div>
                <p className="amp-terminal-gauge-note">
                  {totalOrdens == null ? "Aguardando consolidacao de OS." : `${fmtNumber(ordensConcluidas)} concluida(s) de ${fmtNumber(totalOrdens)} ordem(ns).`}
                </p>
              </div>
            </TerminalPanel>
          )}

          {canOrcamentos && (
            <TerminalPanel title="Radar comercial">
              {quoteRadar.length === 0 ? (
                <div className="amp-terminal-empty">Sem orcamentos recentes nesta mesa.</div>
              ) : (
                <div className="amp-terminal-feed">
                  {quoteRadar.map((item) => (
                    <div key={item.id} className={`amp-terminal-feed-row ${getToneClass(item.tone)}`}>
                      <div>
                        <strong>{item.titulo || "Orcamento"}</strong>
                        <span>{item.cliente_nome || "Cliente"} • {item.status}</span>
                      </div>
                      <em>{fmtCurrency(item.valor)}</em>
                    </div>
                  ))}
                </div>
              )}
            </TerminalPanel>
          )}

          <TerminalPanel title="Mesa de alertas" grow>
            {alertRail.length === 0 ? (
              <div className="amp-terminal-empty">Sem alertas relevantes no momento.</div>
            ) : (
              <div className="amp-terminal-alert-list">
                {alertRail.map((item) => (
                  <div key={item.title} className={`amp-terminal-alert ${getToneClass(item.tone)}`}>
                    <strong>{item.title}</strong>
                    <span>{item.detail}</span>
                  </div>
                ))}
              </div>
            )}
            {erro && (
              <div className="amp-terminal-error">
                Parte da base nao carregou por completo; o painel segue usando o que ja foi consolidado.
              </div>
            )}
          </TerminalPanel>
        </div>
      </section>
    </div>
  );
}

function KpiCard({ item }) {
  return (
    <article className="amp-terminal-kpi">
      <div className="amp-terminal-kpi-label">{item.label}</div>
      <div className="amp-terminal-kpi-value">{item.value}</div>
      <div className={`amp-terminal-kpi-delta ${getToneClass(item.tone)}`}>{item.delta}</div>
    </article>
  );
}

function TerminalPanel({ title, footer, grow = false, children }) {
  return (
    <section className={`amp-terminal-panel ${grow ? "is-grow" : ""}`}>
      <div className="amp-terminal-panel-title">{title}</div>
      <div className={`amp-terminal-panel-body ${grow ? "is-grow" : ""}`}>{children}</div>
      {footer ? <div className="amp-terminal-panel-foot">{footer}</div> : null}
    </section>
  );
}
