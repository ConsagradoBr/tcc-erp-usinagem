import React, { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import api from "../api";
import { getStoredUser, hasPermission } from "../auth";
import {
  IconClients,
  IconDollar,
  IconQuotes,
  IconServiceOrder,
} from "../assets/assets-map";

const THEME = {
  accent: "#b46338",
  accentStrong: "#d07c45",
  graphite: "#252a31",
  graphiteSoft: "#40454c",
  line: "#d8d0c6",
  muted: "#706a62",
  positive: "#3f8d72",
  warning: "#ad7a3e",
  danger: "#bb6750",
};

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const OS_STATUS = {
  solicitado: {
    color: THEME.accent,
    label: "Solicitado",
    note: "Abrir frente e confirmar prioridade.",
  },
  em_andamento: {
    color: THEME.graphiteSoft,
    label: "Em andamento",
    note: "Acompanhar ritmo e gargalos do turno.",
  },
  revisao: {
    color: THEME.warning,
    label: "Em revisão",
    note: "Validar acabamento e medição final.",
  },
  concluido: {
    color: THEME.positive,
    label: "Concluído",
    note: "Pronto para expedição e financeiro.",
  },
};

function ultimosMeses(n = 6) {
  const hoje = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - i), 1);
    return {
      label: MESES[d.getMonth()],
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
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

const fmtNumber = (value) => (value == null ? "..." : Number(value).toLocaleString("pt-BR"));

const Pulse = ({ className = "" }) => (
  <span className={`inline-flex h-8 w-20 animate-pulse rounded-full bg-black/8 ${className}`} />
);

function TooltipReceita({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="cm-surface-soft rounded-[22px] px-4 py-3 text-sm">
      <p className="font-semibold text-[var(--cm-text)]">{label}</p>
      <p className="mt-1 text-[var(--cm-positive)]">Recebido: {fmtCurrency(payload[0]?.value)}</p>
      {payload[1]?.value > 0 && <p className="text-[var(--cm-danger)]">Pago: {fmtCurrency(payload[1]?.value)}</p>}
    </div>
  );
}

export default function Dashboard() {
  const user = getStoredUser();
  const [clientes, setClientes] = useState(null);
  const [resumo, setResumo] = useState(null);
  const [grafico, setGrafico] = useState(null);
  const [osData, setOsData] = useState(null);
  const [orcamentos, setOrcamentos] = useState(null);
  const [erro, setErro] = useState(false);

  const canClientes = hasPermission(user, "clientes");
  const canFinanceiro = hasPermission(user, "financeiro");
  const canOS = hasPermission(user, "ordens_servico");
  const canOrcamentos = hasPermission(user, "orcamentos");

  useEffect(() => {
    const requests = [];
    const meses = ultimosMeses(6);

    if (canClientes) {
      requests.push(
        api.get("/clientes").then((res) => {
          setClientes(res.data.length);
        })
      );
    }

    if (canFinanceiro) {
      requests.push(
        Promise.all([api.get("/financeiro/resumo"), api.get("/financeiro")]).then(([resResumo, resFinanceiro]) => {
          setResumo(resResumo.data);
          const dados = meses.map(({ label, key }) => {
            const recebido = resFinanceiro.data
              .filter((item) => item.tipo === "receber" && item.data_pagamento?.startsWith(key))
              .reduce((sum, item) => sum + item.valor, 0);
            const pago = resFinanceiro.data
              .filter((item) => item.tipo === "pagar" && item.data_pagamento?.startsWith(key))
              .reduce((sum, item) => sum + item.valor, 0);
            return {
              month: label,
              recebido: Math.round(recebido),
              pago: Math.round(pago),
            };
          });
          setGrafico(dados);
        })
      );
    }

    if (canOS) {
      requests.push(
        api.get("/ordens-servico/resumo").then((res) => {
          setOsData(
            Object.entries(OS_STATUS).map(([id, meta]) => ({
              id,
              name: meta.label,
              value: res.data[id] || 0,
              color: meta.color,
              note: meta.note,
            }))
          );
        })
      );
    }

    if (canOrcamentos) {
      requests.push(
        api.get("/orcamentos/resumo").then((res) => {
          setOrcamentos(res.data);
        })
      );
    }

    Promise.all(requests).catch(() => setErro(true));
  }, [canClientes, canFinanceiro, canOS, canOrcamentos]);

  const totalOrdens = useMemo(() => osData?.reduce((sum, item) => sum + item.value, 0) ?? null, [osData]);
  const ordensConcluidas = useMemo(() => osData?.find((item) => item.id === "concluido")?.value ?? 0, [osData]);
  const ordensEmFluxo = totalOrdens == null ? null : Math.max(totalOrdens - ordensConcluidas, 0);
  const throughput = totalOrdens ? Math.round((ordensConcluidas / totalOrdens) * 100) : 0;
  const crescimento = useMemo(() => {
    if (!grafico?.length) return null;
    const mesAtual = grafico[grafico.length - 1]?.recebido || 0;
    const anterior = grafico[grafico.length - 2]?.recebido || 0;
    if (!anterior) return null;
    return (((mesAtual - anterior) / anterior) * 100).toFixed(1);
  }, [grafico]);

  const heroStats = [
    canClientes && {
      label: "Clientes ativos",
      value: clientes == null ? <Pulse /> : fmtNumber(clientes),
      tone: "text-[var(--cm-text)]",
      icon: IconClients,
    },
    canOS && {
      label: "Ordens em fluxo",
      value: totalOrdens == null ? <Pulse /> : fmtNumber(ordensEmFluxo),
      tone: "text-white",
      icon: IconServiceOrder,
    },
    canFinanceiro && {
      label: "A receber",
      value: resumo == null ? <Pulse /> : fmtCurrency(resumo.a_receber),
      tone: "text-white",
      icon: IconDollar,
    },
    canOrcamentos && {
      label: "Valor aprovado",
      value: orcamentos == null ? <Pulse /> : fmtCurrency(orcamentos.valor_aprovado),
      tone: "text-white",
      icon: IconQuotes,
    },
  ].filter(Boolean);

  const actionItems = useMemo(() => {
    const items = [];

    if (canFinanceiro && resumo) {
      items.push(
        resumo.atrasados > 0
          ? {
              title: "Cobrança e renegociação",
              value: `${resumo.atrasados} título(s) em atraso`,
              note: "Priorize contatos e remova travas do fluxo financeiro.",
              tone: "danger",
            }
          : {
              title: "Fluxo financeiro estável",
              value: "Sem títulos vencidos",
              note: "Mantenha o ritmo de recebimento previsto para o mês.",
              tone: "positive",
            }
      );
    }

    if (canOrcamentos && orcamentos) {
      const emDecisao = (orcamentos.rascunho || 0) + (orcamentos.enviado || 0);
      items.push({
        title: "Orçamentos em decisão",
        value: `${emDecisao} oportunidade(s) abertas`,
        note:
          emDecisao > 0
            ? "Conecte follow-up comercial direto à geração de OS."
            : "Pipeline comercial sem pendências de decisão no momento.",
        tone: emDecisao > 0 ? "warning" : "positive",
      });
    }

    if (canOS && osData) {
      const solicitadas = osData.find((item) => item.id === "solicitado")?.value ?? 0;
      const revisao = osData.find((item) => item.id === "revisao")?.value ?? 0;
      const emAtencao = solicitadas + revisao;
      items.push({
        title: "Fila operacional",
        value: `${emAtencao} OS pedindo ação`,
        note:
          emAtencao > 0
            ? "Ataque revisão, setup e liberação para aumentar throughput."
            : "Fila de OS controlada e sem gargalo crítico visível.",
        tone: emAtencao > 0 ? "warning" : "positive",
      });
    }

    if (canClientes && clientes != null) {
      items.push({
        title: "Relacionamento ativo",
        value: `${fmtNumber(clientes)} cliente(s) na base`,
        note: "Use histórico e contexto para ligar comercial, operação e financeiro.",
        tone: "accent",
      });
    }

    return items.slice(0, 4);
  }, [canClientes, canFinanceiro, canOS, canOrcamentos, clientes, osData, orcamentos, resumo]);

  const flowSteps = [
    canClientes && {
      title: "Clientes",
      value: clientes == null ? <Pulse className="w-16" /> : fmtNumber(clientes),
      note: "Base ativa para relacionamento, histórico e priorização.",
    },
    canOrcamentos && {
      title: "Orçamentos",
      value:
        orcamentos == null ? (
          <Pulse className="w-16" />
        ) : (
          fmtNumber((orcamentos.rascunho || 0) + (orcamentos.enviado || 0) + (orcamentos.aprovado || 0))
        ),
      note: "Ponte entre oportunidade comercial e carga de produção.",
    },
    canOS && {
      title: "Ordens de serviço",
      value: totalOrdens == null ? <Pulse className="w-16" /> : fmtNumber(ordensEmFluxo),
      note: "Execução real com status, revisão e conclusão vinculadas.",
    },
    canFinanceiro && {
      title: "Financeiro",
      value: resumo == null ? <Pulse className="w-20" /> : fmtCurrency(resumo.a_receber),
      note: "Fechamento do fluxo em cobrança, caixa e saúde do recebimento.",
    },
  ].filter(Boolean);

  const resumoFinanceiro = canFinanceiro
    ? [
        { label: "Recebido no mês", value: resumo == null ? <Pulse /> : fmtCurrency(resumo.recebido_mes), tone: "positive" },
        { label: "A pagar", value: resumo == null ? <Pulse /> : fmtCurrency(resumo.a_pagar), tone: "default" },
        { label: "Títulos em atraso", value: resumo == null ? <Pulse /> : fmtNumber(resumo.atrasados), tone: resumo?.atrasados > 0 ? "danger" : "positive" },
      ]
    : [];

  return (
    <div className="min-h-screen bg-transparent p-4 sm:p-6 lg:p-8">
      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="cm-surface-strong rounded-[32px] p-6 sm:p-7 xl:col-span-6">
          <p className="cm-label text-white/60">Ceramic Monolith</p>
          <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Centro de comando operacional</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
            Uma leitura mais estrutural do sistema, conectando clientes, comercial, ordens de serviço e financeiro em uma
            mesma superfície de decisão.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs uppercase tracking-[0.18em] text-white/72">
              Cliente → Orçamento → OS → Financeiro
            </span>
            <span className="rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs text-white/72">
              {new Intl.DateTimeFormat("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              }).format(new Date())}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {heroStats.map((item) => (
              <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/6 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-white/8 bg-white/6">
                    <img src={item.icon} alt="" className="w-6 brightness-[3.6]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/50">{item.label}</p>
                    <div className={`mt-2 text-2xl font-bold tracking-[-0.04em] ${item.tone}`}>{item.value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {erro && (
            <div className="mt-5 rounded-[20px] border border-white/10 bg-[rgba(187,103,80,0.16)] px-4 py-3 text-sm text-white/80">
              Parte dos dados não foi carregada. Ainda assim, o painel segue mostrando o que já conseguiu consolidar.
            </div>
          )}
        </section>

        {canFinanceiro && (
          <section className="cm-surface rounded-[30px] p-5 sm:p-6 xl:col-span-4">
            <p className="cm-label">Receita x pagamento</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--cm-text)]">Ritmo dos últimos 6 meses</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
              Leitura financeira principal para saber se a operação está convertendo em caixa com consistência.
            </p>

            <div className="mt-5 h-[18rem] rounded-[26px] border border-[color:var(--cm-line)] bg-white/30 px-3 py-4">
              {grafico == null ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-9 w-9 animate-spin rounded-full border-4 border-black/8 border-t-[var(--cm-accent)]" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico} barGap={6}>
                    <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: THEME.muted, fontSize: 11 }}
                      tickFormatter={(value) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<TooltipReceita />} cursor={{ fill: "rgba(180,99,56,0.05)" }} />
                    <Bar dataKey="recebido" fill={THEME.positive} radius={[8, 8, 0, 0]} />
                    <Bar dataKey="pago" fill={THEME.accent} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {crescimento !== null && (
              <div className="mt-4 flex items-center justify-between rounded-[20px] border border-[color:var(--cm-line)] bg-white/36 px-4 py-3">
                <span className="text-sm text-[var(--cm-muted)]">Variação do mês atual</span>
                <span className={`text-sm font-semibold ${Number(crescimento) >= 0 ? "text-[var(--cm-positive)]" : "text-[var(--cm-danger)]"}`}>
                  {Number(crescimento) >= 0 ? "▲" : "▼"} {Math.abs(Number(crescimento)).toFixed(1)}%
                </span>
              </div>
            )}
          </section>
        )}

        {canOS && (
          <section className="cm-surface rounded-[30px] p-5 sm:p-6 xl:col-span-2">
            <p className="cm-label">Throughput</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--cm-text)]">Produção concluída</h2>
            <div className="mt-5 flex justify-center" style={{ "--ring-progress": throughput }}>
              <div className="cm-ring">
                <span className="cm-ring-value">{totalOrdens == null ? "..." : `${throughput}%`}</span>
              </div>
            </div>
            <p className="mt-4 text-center text-sm leading-6 text-[var(--cm-muted)]">
              {totalOrdens == null
                ? "Aguardando consolidação de ordens."
                : `${fmtNumber(ordensConcluidas)} concluída(s) de ${fmtNumber(totalOrdens)} ordem(ns) no ciclo atual.`}
            </p>
          </section>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="cm-surface rounded-[30px] p-5 sm:p-6 xl:col-span-4">
          <p className="cm-label">Próximas ações</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--cm-text)]">Acionamentos prioritários</h2>
          <div className="mt-5 grid gap-3">
            {actionItems.length === 0 ? (
              <div className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/34 px-4 py-4 text-sm text-[var(--cm-muted)]">
                Sem dados suficientes para priorizar ações ainda.
              </div>
            ) : (
              actionItems.map((item) => <ActionItem key={item.title} item={item} />)
            )}
          </div>
        </section>

        {canOS && (
          <section className="cm-surface rounded-[30px] p-5 sm:p-6 xl:col-span-5">
            <p className="cm-label">Estado da produção</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--cm-text)]">Matriz de status da OS</h2>
            <div className="mt-5 grid gap-3">
              {osData == null ? (
                <div className="flex h-56 items-center justify-center rounded-[24px] border border-[color:var(--cm-line)] bg-white/28">
                  <div className="h-9 w-9 animate-spin rounded-full border-4 border-black/8 border-t-[var(--cm-accent)]" />
                </div>
              ) : (
                osData.map((status) => <StatusRow key={status.id} item={status} total={totalOrdens || 0} />)
              )}
            </div>
          </section>
        )}

        {canFinanceiro && (
          <section className="cm-surface rounded-[30px] p-5 sm:p-6 xl:col-span-3">
            <p className="cm-label">Caixa e saúde</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--cm-text)]">Síntese financeira</h2>
            <div className="mt-5 grid gap-3">
              {resumoFinanceiro.map((item) => (
                <div key={item.label} className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/34 px-4 py-4">
                  <p className="text-sm text-[var(--cm-muted)]">{item.label}</p>
                  <div
                    className={`mt-2 text-2xl font-bold tracking-[-0.04em] ${
                      item.tone === "positive"
                        ? "text-[var(--cm-positive)]"
                        : item.tone === "danger"
                          ? "text-[var(--cm-danger)]"
                          : "text-[var(--cm-text)]"
                    }`}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="cm-surface rounded-[30px] p-5 sm:p-6 xl:col-span-7">
          <p className="cm-label">Fluxo principal</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--cm-text)]">Cadeia operacional conectada</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--cm-muted)]">
            O painel passa a tratar os módulos como uma sequência viva: relacionamento, decisão comercial, execução e caixa.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-4">
            {flowSteps.map((step, index) => (
              <FlowStep key={step.title} step={step} highlight={index === flowSteps.length - 1} />
            ))}
          </div>
        </section>

        {canOrcamentos && (
          <section className="cm-surface rounded-[30px] p-5 sm:p-6 xl:col-span-5">
            <p className="cm-label">Panorama comercial</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[var(--cm-text)]">Conversão e decisão</h2>
            {orcamentos == null ? (
              <div className="mt-5 flex h-64 items-center justify-center rounded-[24px] border border-[color:var(--cm-line)] bg-white/28">
                <div className="h-9 w-9 animate-spin rounded-full border-4 border-black/8 border-t-[var(--cm-accent)]" />
              </div>
            ) : (
              <>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  {[
                    ["Rascunho", orcamentos.rascunho],
                    ["Enviado", orcamentos.enviado],
                    ["Aprovado", orcamentos.aprovado],
                    ["Reprovado", orcamentos.reprovado],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/34 px-4 py-4">
                      <p className="text-sm text-[var(--cm-muted)]">{label}</p>
                      <p className="mt-2 text-2xl font-bold tracking-[-0.04em] text-[var(--cm-text)]">{fmtNumber(value)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-[22px] border border-[color:var(--cm-line)] bg-[rgba(180,99,56,0.08)] px-4 py-4">
                  <p className="text-sm text-[var(--cm-muted)]">Valor aprovado no ciclo</p>
                  <p className="mt-2 text-3xl font-bold tracking-[-0.04em] text-[var(--cm-text)]">
                    {fmtCurrency(orcamentos.valor_aprovado)}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--cm-muted)]">
                    Tudo o que for aprovado precisa empurrar naturalmente para ordem de serviço e previsão financeira.
                  </p>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ActionItem({ item }) {
  const toneClasses =
    item.tone === "danger"
      ? "bg-[rgba(187,103,80,0.1)] text-[var(--cm-danger)]"
      : item.tone === "warning"
        ? "bg-[rgba(173,122,62,0.1)] text-[var(--cm-warning)]"
        : item.tone === "positive"
          ? "bg-[rgba(63,141,114,0.1)] text-[var(--cm-positive)]"
          : "bg-[var(--cm-accent-soft)] text-[var(--cm-accent)]";

  return (
    <div className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/34 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-[var(--cm-text)]">{item.title}</p>
          <p className="mt-1 text-sm text-[var(--cm-muted)]">{item.note}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${toneClasses}`}>{item.value}</span>
      </div>
    </div>
  );
}

function StatusRow({ item, total }) {
  const width = total > 0 ? `${Math.max((item.value / total) * 100, item.value ? 10 : 0)}%` : "0%";
  return (
    <div className="rounded-[22px] border border-[color:var(--cm-line)] bg-white/34 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-[var(--cm-text)]">{item.name}</p>
          <p className="mt-1 text-sm text-[var(--cm-muted)]">{item.note}</p>
        </div>
        <span className="text-2xl font-bold tracking-[-0.04em] text-[var(--cm-text)]">{fmtNumber(item.value)}</span>
      </div>
      <div className="mt-3 h-2 rounded-full bg-black/6">
        <div className="h-2 rounded-full" style={{ width, backgroundColor: item.color }} />
      </div>
    </div>
  );
}

function FlowStep({ step, highlight }) {
  return (
    <div className={`rounded-[24px] px-4 py-4 ${highlight ? "cm-surface-strong" : "border border-[color:var(--cm-line)] bg-white/34"}`}>
      <p className={`text-xs uppercase tracking-[0.18em] ${highlight ? "text-white/58" : "text-[var(--cm-soft)]"}`}>{step.title}</p>
      <div className={`mt-3 text-3xl font-bold tracking-[-0.04em] ${highlight ? "text-white" : "text-[var(--cm-text)]"}`}>{step.value}</div>
      <p className={`mt-2 text-sm leading-6 ${highlight ? "text-white/72" : "text-[var(--cm-muted)]"}`}>{step.note}</p>
    </div>
  );
}
