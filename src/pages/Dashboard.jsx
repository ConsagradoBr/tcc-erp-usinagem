/**
 * Dashboard.jsx — AMP Usinagem Industrial
 * ─────────────────────────────────────────────────────────────
 * SEM header próprio — o header já existe no Header.jsx/ProtectedLayout
 * Este componente aplica apenas o TEMA e o CONTEÚDO do dashboard.
 *
 * DADOS: substitua os TODO pelas suas variáveis reais.
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

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
function KpiCard({ label, value, sub, subOrange, accent }) {
  return (
    <div className="amp-card rounded-xl px-5 py-4 flex flex-col gap-1"
      style={{ borderLeft: `3px solid ${accent}` }}>
      <p className="amp-label">{label}</p>
      <p className="amp-kpi-val">{value ?? "—"}</p>
      <p className={`text-xs ${subOrange ? "amp-orange" : "amp-muted"}`}>{sub}</p>
    </div>
  );
}

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

/* ══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate();

  /* tema — lê do localStorage (sincroniza com o toggle do Header) */
  const [dark, setDark] = useState(
    () => localStorage.getItem("amp-theme") === "dark"
  );
  useEffect(() => {
    /* escuta mudanças feitas pelo Header.jsx no mesmo localStorage */
    const onStorage = () =>
      setDark(localStorage.getItem("amp-theme") === "dark");
    window.addEventListener("storage", onStorage);

    document.documentElement.classList.toggle("dark", dark);
    return () => window.removeEventListener("storage", onStorage);
  }, [dark]);

  const now = useClock();  

  /* ════════════════════════════════════════════════════════════
     DADOS — substitua cada linha pelos seus hooks/variáveis reais
  ════════════════════════════════════════════════════════════ */
  const clientes         = 0;   // TODO
  const recebidoMTD      = 0;   // TODO
  const atrasosSensiveis = 0;   // TODO
  const aprovadoAtivo    = 0;   // TODO
  const propostasDecisao = 0;   // TODO
  const ticketOS         = 0;   // TODO
  const osConcluidas     = 0;   // TODO
  const osTotais         = 0;   // TODO
  const osAtraso         = 0;   // TODO
  const osEntrada        = [];  // TODO
  const osUsinagem       = [];  // TODO
  const osFechamento     = [];  // TODO
  const faturamento      = [];  // TODO: [{ mes:"Jan", valor:1500 }, ...]
  const capacidade       = [];  // TODO: [{ etapa:"Entrada", carga:4, capacidade:6 }, ...]
  const pipeline         = { rascunho:0, enviado:0, aprovado:0 }; // TODO
  const fluxoCaixa       = { total:0, entradas:0, saidas:0, saldo:0 }; // TODO
  const alertas          = [];  // TODO: [{ titulo:"...", descricao:"..." }, ...]
  const receitaClientes  = [];  // TODO: [{ nome:"Cliente X", receita:5000 }, ...]
  const backlog          = 0;   // TODO
  const comercialAberto  = 0;   // TODO
  const turno            = "3"; // TODO
  /* ════════════════════════════════════════════════════════════ */

  const throughput = osTotais > 0 ? Math.round((osConcluidas / osTotais) * 100) : 0;
  const fmt  = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  const dateStr = now.toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" }).toUpperCase();
  const timeStr = now.toLocaleTimeString("pt-BR");

  return (
    <>
      {/* ══ VARIÁVEIS CSS DE TEMA ═══════════════════════════════ */}
      <style>{`
        /* LIGHT */
        :root {
          --amp-bg:       #fff5ed;
          --amp-card:     #ffffff;
          --amp-border:   #fde8d4;
          --amp-text:     #1a1205;
          --amp-muted:    #8a7060;
          --amp-sub:      #c4a882;
          --amp-orange:   #f97316;
          --amp-green:    #16a34a;
          --amp-red:      #dc2626;
          --amp-bar:      #fde8d4;
          --amp-shadow:   0 1px 6px rgba(249,115,22,.10);
          --amp-grid:     #fde8d4;
        }
        /* DARK */
        .dark {
          --amp-bg:       #0f0f14;
          --amp-card:     #181820;
          --amp-border:   #262638;
          --amp-text:     #f0f0f5;
          --amp-muted:    #6b7280;
          --amp-sub:      #4b5563;
          --amp-orange:   #fb923c;
          --amp-green:    #4ade80;
          --amp-red:      #f87171;
          --amp-bar:      #262638;
          --amp-shadow:   0 1px 8px rgba(0,0,0,.50);
          --amp-grid:     #262638;
        }

        .amp-bg        { background: var(--amp-bg); }
        .amp-card      { background: var(--amp-card); border: 1px solid var(--amp-border); box-shadow: var(--amp-shadow); }
        .amp-text      { color: var(--amp-text); }
        .amp-muted     { color: var(--amp-muted); }
        .amp-sub       { color: var(--amp-sub); }
        .amp-orange    { color: var(--amp-orange); }
        .amp-green     { color: var(--amp-green); }
        .amp-red       { color: var(--amp-red); }
        .amp-cell-bg   { background: var(--amp-bar); border-radius: 8px; }
        .amp-divider   { height: 1px; background: var(--amp-border); }
        .amp-pipe-track{ height:5px; border-radius:3px; flex:1; background:var(--amp-bar); }
        .amp-pipe-fill { height:5px; border-radius:3px; background:var(--amp-orange); }
        .amp-label     { font-size:9px; font-weight:700; letter-spacing:2.5px;
                         text-transform:uppercase; color:var(--amp-muted); }
        .amp-kpi-val   { font-size:24px; font-weight:800; color:var(--amp-text); line-height:1.1; }
        .amp-tooltip   { background:var(--amp-card); border:1px solid var(--amp-border);
                         border-radius:8px; padding:8px 12px; color:var(--amp-text);
                         box-shadow:var(--amp-shadow); }
        ::-webkit-scrollbar       { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:var(--amp-orange); border-radius:2px; }
        ::-webkit-scrollbar-track { background:transparent; }
      `}</style>

      {/* ══ CONTEÚDO (sem header — já existe no ProtectedLayout) ══ */}
      <div className="flex flex-col h-full overflow-hidden amp-bg">
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">

          {/* ── Sub-header analítico ── */}
          <div className="amp-card rounded-2xl px-6 py-4">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="amp-label mb-1">AMP Trader Board</p>
                <h2 className="text-2xl font-extrabold amp-text">Centro analítico industrial</h2>
                <p className="text-sm amp-muted mt-1">
                  Mesa única de decisão para comercial, OS e caixa.
                </p>
              </div>
              <div className="flex items-center gap-8 flex-wrap">
                <div className="text-right">
                  <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold amp-muted uppercase tracking-wider">
                    Operação em curso
                  </span>
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
                { k: "Backlog",          v: `${backlog} OS` },
                { k: "Comercial Aberto", v: `${comercialAberto} proposta(s)` },
                { k: "A Receber",        v: fmt(fluxoCaixa.entradas), color: "var(--amp-green)"  },
                { k: "A Pagar",          v: fmt(fluxoCaixa.saidas),   color: "var(--amp-red)"    },
                { k: "Base Ativa",       v: `${clientes} conta(s)` },
              ].map((s) => (
                <span key={s.k} className="flex items-center gap-1.5 text-[10px] font-bold amp-muted tracking-wider uppercase">
                  {s.k}
                  <span style={{ color: s.color ?? "var(--amp-orange)", fontWeight: 800 }}>{s.v}</span>
                </span>
              ))}
            </div>
          </div>

          {/* ── KPIs + Navegação Rápida ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <button
              onClick={() => navigate("/app/clientes")}
              className="amp-card rounded-xl px-5 py-4 flex flex-col gap-1 hover:scale-105 transition-transform cursor-pointer border-l-4"
              style={{ borderLeftColor: "#14b8a6" }}
            >
              <p className="amp-label">Clientes Ativos</p>
              <p className="amp-kpi-val">{clientes}</p>
              <p className="text-xs amp-muted hover:amp-orange">Ir para Clientes →</p>
            </button>
            <button
              onClick={() => navigate("/app/financeiro")}
              className="amp-card rounded-xl px-5 py-4 flex flex-col gap-1 hover:scale-105 transition-transform cursor-pointer border-l-4"
              style={{ borderLeftColor: "#f97316" }}
            >
              <p className="amp-label">Recebido MTD</p>
              <p className="amp-kpi-val">{fmt(recebidoMTD)}</p>
              <p className="text-xs amp-orange">{atrasosSensiveis} atraso(s) →</p>
            </button>
            <button
              onClick={() => navigate("/app/orcamentos")}
              className="amp-card rounded-xl px-5 py-4 flex flex-col gap-1 hover:scale-105 transition-transform cursor-pointer border-l-4"
              style={{ borderLeftColor: "#3b82f6" }}
            >
              <p className="amp-label">Aprovado Ativo</p>
              <p className="amp-kpi-val">{fmt(aprovadoAtivo)}</p>
              <p className="text-xs amp-orange">{propostasDecisao} em decisão →</p>
            </button>
            <button
              onClick={() => navigate("/app/ordemservico")}
              className="amp-card rounded-xl px-5 py-4 flex flex-col gap-1 hover:scale-105 transition-transform cursor-pointer border-l-4"
              style={{ borderLeftColor: "#22c55e" }}
            >
              <p className="amp-label">Ticket por OS</p>
              <p className="amp-kpi-val">{`${ticketOS}%`}</p>
              <p className="text-xs amp-orange">{osConcluidas} concluída(s) →</p>
            </button>
          </div>

          {/* ── Linha 2: Faturamento · Pipeline+Fila · Ordens+Throughput ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Faturamento + Pipeline */}
            <div className="amp-card rounded-xl p-5 flex flex-col gap-4">
              <div>
                <p className="amp-label mb-4">● Faturamento Mensal</p>
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
                <p className="text-xs amp-muted mt-2">Total vendas: {fmt(recebidoMTD)}</p>
              </div>

              <div className="amp-divider" />

              <div>
                <p className="amp-label mb-3">● Pipeline Comercial</p>
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
            </div>

            {/* Fila de OS + Carga × Capacidade */}
            <div className="amp-card rounded-xl p-5 flex flex-col gap-4">
              <div>
                <p className="amp-label mb-3">● Fila de OS</p>
                <div className="grid grid-cols-3 gap-2">
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
                    <Bar dataKey="carga"      fill="#60a5fa" radius={[3,3,0,0]} name="Carga" />
                    <Bar dataKey="capacidade" fill="var(--amp-orange)" radius={[3,3,0,0]} name="Capacidade" opacity={0.65} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Ordens em atraso + Throughput */}
            <div className="flex flex-col gap-3">
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
                <p className="amp-label mb-3">● Throughput Operacional</p>
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
            </div>
          </div>

          {/* ── Linha 3: Fluxo · Recebimentos+Radar · Receita ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

            {/* Fluxo de caixa */}
            <div className="amp-card rounded-xl p-5">
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
            </div>

            {/* Recebimentos sensíveis + Radar */}
            <div className="flex flex-col gap-3">
              <div className="amp-card rounded-xl p-5 flex-1">
                <p className="amp-label mb-3">● Recebimentos Sensíveis</p>
                <p className="text-xs amp-muted italic text-center mt-4">
                  {atrasosSensiveis > 0
                    ? `${atrasosSensiveis} título(s) em atenção`
                    : "Sem títulos sensíveis na abertura."}
                </p>
              </div>
              <div className="amp-card rounded-xl p-5 flex-1">
                <p className="amp-label mb-3">● Radar Comercial</p>
                <p className="text-xs amp-muted italic text-center mt-4">
                  {comercialAberto > 0
                    ? `${comercialAberto} proposta(s) em aberto`
                    : "Sem orçamentos recentes nesta mesa."}
                </p>
              </div>
            </div>

            {/* Receita por cliente */}
            <div className="amp-card rounded-xl p-5">
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
            </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <button
                onClick={() => navigate("/app/clientes")}
                className="amp-cell-bg p-3 rounded-lg text-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xs font-bold amp-text">Clientes</p>
                <p className="text-[10px] amp-muted mt-1">Carteira e fornecedores</p>
              </button>
              <button
                onClick={() => navigate("/app/orcamentos")}
                className="amp-cell-bg p-3 rounded-lg text-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xs font-bold amp-text">Orçamentos</p>
                <p className="text-[10px] amp-muted mt-1">Propostas comerciais</p>
              </button>
              <button
                onClick={() => navigate("/app/ordemservico")}
                className="amp-cell-bg p-3 rounded-lg text-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xs font-bold amp-text">Ordens de Serviço</p>
                <p className="text-[10px] amp-muted mt-1">OS em produção</p>
              </button>
              <button
                onClick={() => navigate("/app/financeiro")}
                className="amp-cell-bg p-3 rounded-lg text-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xs font-bold amp-text">Financeiro</p>
                <p className="text-[10px] amp-muted mt-1">Fluxo de caixa</p>
              </button>
              <button
                onClick={() => navigate("/app/usuarios")}
                className="amp-cell-bg p-3 rounded-lg text-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xs font-bold amp-text">Usuários</p>
                <p className="text-[10px] amp-muted mt-1">Equipe e permissões</p>
              </button>
              <button
                onClick={() => navigate("/app/backup")}
                className="amp-cell-bg p-3 rounded-lg text-center hover:scale-105 transition-transform cursor-pointer"
              >
                <p className="text-xs font-bold amp-text">Backup</p>
                <p className="text-[10px] amp-muted mt-1">Dados e segurança</p>
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}