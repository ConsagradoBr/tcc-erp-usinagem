import React, { useState, useEffect } from "react";
import api from "../api";
import {
  IconClients,
  IconServiceOrder,
  IconDollar,
  IconTrendingUp,
} from "../assets/assets-map";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  v == null ? "..." :
  Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// Gera os últimos N meses no formato { label: "Mar", key: "2026-03" }
function ultimosMeses(n = 6) {
  const hoje = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - i), 1);
    return { label: MESES[d.getMonth()], key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}` };
  });
}

// ─── Skeleton de loading ──────────────────────────────────────────────────────
const Pulse = () => <span className="inline-block w-20 h-8 bg-gray-200 animate-pulse rounded-lg" />;

// ─── Tooltip customizado do gráfico ──────────────────────────────────────────
const TooltipReceita = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 shadow-lg rounded-xl px-4 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-emerald-600">Recebido: {fmt(payload[0]?.value)}</p>
      {payload[1]?.value > 0 && <p className="text-red-500">Pago: {fmt(payload[1]?.value)}</p>}
    </div>
  );
};

// ─── Status OS (ainda mockado até módulo OS estar pronto) ─────────────────────
const osStatusData = [
  { name: "Em andamento", value: 32, color: "#3B82F6" },
  { name: "Concluídas",   value: 87, color: "#10B981" },
  { name: "Atrasadas",    value: 12, color: "#EF4444" },
];

// ================================================================
export default function Dashboard() {
  const [clientes,  setClientes]  = useState(null);
  const [resumo,    setResumo]    = useState(null);
  const [grafico,   setGrafico]   = useState(null);
  const [erro,      setErro]      = useState(false);

  useEffect(() => {
    const meses = ultimosMeses(6);

    Promise.all([
      api.get("/clientes"),
      api.get("/financeiro/resumo"),
      api.get("/financeiro"),
    ])
      .then(([resC, resR, resF]) => {
        // Clientes
        setClientes(resC.data.length);

        // Resumo financeiro
        setResumo(resR.data);

        // Montar dados do gráfico: receitas e pagamentos por mês
        const lancamentos = resF.data;
        const dados = meses.map(({ label, key }) => {
          const recebido = lancamentos
            .filter(l => l.tipo === "receber" && l.data_pagamento?.startsWith(key))
            .reduce((s, l) => s + l.valor, 0);
          const pago = lancamentos
            .filter(l => l.tipo === "pagar" && l.data_pagamento?.startsWith(key))
            .reduce((s, l) => s + l.valor, 0);
          return { month: label, recebido: Math.round(recebido), pago: Math.round(pago) };
        });
        setGrafico(dados);
      })
      .catch(() => setErro(true));
  }, []);

  // Crescimento: compara recebido_mes com média dos últimos meses
  const crescimento = (() => {
    if (!grafico) return null;
    const mesAtual = grafico[grafico.length - 1]?.recebido || 0;
    const anterior = grafico[grafico.length - 2]?.recebido || 0;
    if (!anterior) return null;
    const pct = ((mesAtual - anterior) / anterior) * 100;
    return pct.toFixed(1);
  })();

  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">

      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-lg">
            Visão geral da usinagem •{" "}
            {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}
          </p>
        </div>
        {erro && (
          <span className="text-sm text-red-400 bg-red-50 px-3 py-1 rounded-lg">
            ⚠ Erro ao carregar dados
          </span>
        )}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

        {/* Clientes */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center">
              <img src={IconClients} className="w-7" alt="" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Clientes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {clientes === null ? <Pulse /> : clientes}
              </p>
            </div>
          </div>
        </div>

        {/* A Receber */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center">
              <img src={IconDollar} className="w-7" alt="" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">A Receber</p>
              <p className="text-3xl font-bold text-emerald-600">
                {resumo === null ? <Pulse /> : fmt(resumo.a_receber)}
              </p>
            </div>
          </div>
          {resumo?.atrasados > 0 && (
            <p className="mt-3 text-xs text-red-500 font-medium">
              ⚠ {resumo.atrasados} lançamento{resumo.atrasados > 1 ? "s" : ""} em atraso
            </p>
          )}
        </div>

        {/* A Pagar */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center">
              <img src={IconServiceOrder} className="w-7" alt="" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">A Pagar</p>
              <p className="text-3xl font-bold text-red-500">
                {resumo === null ? <Pulse /> : fmt(resumo.a_pagar)}
              </p>
            </div>
          </div>
        </div>

        {/* Recebido no mês / Crescimento */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center">
              <img src={IconTrendingUp} className="w-7" alt="" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recebido no mês</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {resumo === null ? <Pulse /> : fmt(resumo.recebido_mes)}
              </p>
            </div>
          </div>
          {crescimento !== null && (
            <p className={`mt-3 text-xs font-semibold ${Number(crescimento) >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {Number(crescimento) >= 0 ? "▲" : "▼"} {Math.abs(crescimento)}% vs mês anterior
            </p>
          )}
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfico de Receita x Pagamentos */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Receitas x Pagamentos
          </h3>
          <p className="text-sm text-gray-400 mb-6">Últimos 6 meses — valores pagos/recebidos</p>

          {grafico === null ? (
            <div className="h-80 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : grafico.every(d => d.recebido === 0 && d.pago === 0) ? (
            <div className="h-80 flex flex-col items-center justify-center gap-2 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
              <p className="text-sm">Nenhum pagamento registrado ainda</p>
              <p className="text-xs text-gray-300">Os dados aparecerão quando lançamentos forem marcados como pagos</p>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={grafico} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
                  <Tooltip content={<TooltipReceita />} />
                  <Bar dataKey="recebido" name="Recebido" fill="#10B981" radius={[6,6,0,0]} />
                  <Bar dataKey="pago"     name="Pago"     fill="#EF4444" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-4 justify-center">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"/><span className="text-xs text-gray-500">Recebido</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"/><span className="text-xs text-gray-500">Pago</span></div>
              </div>
            </>
          )}
        </div>

        {/* Gráfico OS — ainda mockado */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
            Status das Ordens de Serviço
          </h3>
          <p className="text-sm text-gray-400 mb-6">Módulo de OS em desenvolvimento</p>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={osStatusData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} dataKey="value">
                {osStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-8 mt-4">
            {osStatusData.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}