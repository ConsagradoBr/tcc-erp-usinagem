import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import api from "../api";
import { getStoredUser, hasPermission } from "../auth";
import {
  IconClients,
  IconServiceOrder,
  IconDollar,
  IconTrendingUp,
  IconQuotes,
} from "../assets/assets-map";

const fmt = (v) =>
  v == null
    ? "..."
    : Number(v).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: 0,
      });

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const OS_CORES = {
  solicitado: { cor: "#F59E0B", label: "Solicitado" },
  em_andamento: { cor: "#3B82F6", label: "Em Andamento" },
  revisao: { cor: "#8B5CF6", label: "Em Revisão" },
  concluido: { cor: "#10B981", label: "Concluído" },
};

function ultimosMeses(n = 6) {
  const hoje = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (n - 1 - i), 1);
    return { label: MESES[d.getMonth()], key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` };
  });
}

const Pulse = () => <span className="inline-block w-20 h-8 bg-gray-200 animate-pulse rounded-lg" />;

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
              .filter((l) => l.tipo === "receber" && l.data_pagamento?.startsWith(key))
              .reduce((sum, item) => sum + item.valor, 0);
            const pago = resFinanceiro.data
              .filter((l) => l.tipo === "pagar" && l.data_pagamento?.startsWith(key))
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
            Object.entries(OS_CORES).map(([key, value]) => ({
              name: value.label,
              value: res.data[key] || 0,
              color: value.cor,
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

  const crescimento = useMemo(() => {
    if (!grafico?.length) return null;
    const mesAtual = grafico[grafico.length - 1]?.recebido || 0;
    const anterior = grafico[grafico.length - 2]?.recebido || 0;
    if (!anterior) return null;
    return (((mesAtual - anterior) / anterior) * 100).toFixed(1);
  }, [grafico]);

  const cards = [
    canClientes && {
      key: "clientes",
      title: "Total de Clientes",
      value: clientes === null ? <Pulse /> : clientes,
      icon: IconClients,
      iconWrap: "bg-blue-100",
      valueClass: "text-gray-900",
    },
    canFinanceiro && {
      key: "receber",
      title: "A Receber",
      value: resumo === null ? <Pulse /> : fmt(resumo.a_receber),
      icon: IconDollar,
      iconWrap: "bg-emerald-100",
      valueClass: "text-emerald-600",
      footer: resumo?.atrasados > 0 ? `${resumo.atrasados} lançamento(s) em atraso` : null,
      footerClass: "text-red-500",
    },
    canFinanceiro && {
      key: "pagar",
      title: "A Pagar",
      value: resumo === null ? <Pulse /> : fmt(resumo.a_pagar),
      icon: IconServiceOrder,
      iconWrap: "bg-amber-100",
      valueClass: "text-red-500",
    },
    canFinanceiro && {
      key: "recebido_mes",
      title: "Recebido no mês",
      value: resumo === null ? <Pulse /> : fmt(resumo.recebido_mes),
      icon: IconTrendingUp,
      iconWrap: "bg-purple-100",
      valueClass: "text-gray-900",
      footer: crescimento !== null ? `${Number(crescimento) >= 0 ? "▲" : "▼"} ${Math.abs(crescimento)}% vs mês anterior` : null,
      footerClass: Number(crescimento) >= 0 ? "text-emerald-600" : "text-red-500",
    },
    canOrcamentos && {
      key: "orcamentos",
      title: "Orçamentos Aprovados",
      value: orcamentos === null ? <Pulse /> : orcamentos.aprovado,
      icon: IconQuotes,
      iconWrap: "bg-orange-100",
      valueClass: "text-gray-900",
      footer: orcamentos ? `Valor aprovado: ${fmt(orcamentos.valor_aprovado)}` : null,
      footerClass: "text-orange-600",
    },
    canOS && {
      key: "os_total",
      title: "Ordens de Serviço",
      value: osData === null ? <Pulse /> : osData.reduce((sum, item) => sum + item.value, 0),
      icon: IconServiceOrder,
      iconWrap: "bg-sky-100",
      valueClass: "text-gray-900",
    },
  ].filter(Boolean);

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center mb-8 sm:mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-600 mt-1 text-lg">
            Visão geral da operação • {new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}
          </p>
        </div>
        {erro && (
          <span className="text-sm text-red-400 bg-red-50 px-3 py-1 rounded-lg">
            Erro ao carregar parte dos dados
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-10">
        {cards.map((card) => (
          <div key={card.key} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${card.iconWrap} rounded-2xl flex items-center justify-center`}>
                <img src={card.icon} className="w-7" alt="" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{card.title}</p>
                <p className={`text-3xl font-bold ${card.valueClass}`}>{card.value}</p>
              </div>
            </div>
            {card.footer && <p className={`mt-3 text-xs font-medium ${card.footerClass}`}>{card.footer}</p>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {canFinanceiro && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Receitas x Pagamentos</h3>
            <p className="text-sm text-gray-400 mb-6">Últimos 6 meses</p>

            {grafico === null ? (
              <div className="h-80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={grafico} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                    <Tooltip content={<TooltipReceita />} />
                    <Bar dataKey="recebido" name="Recebido" fill="#10B981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="pago" name="Pago" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex gap-6 mt-4 justify-center">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs text-gray-500">Recebido</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400" /><span className="text-xs text-gray-500">Pago</span></div>
                </div>
              </>
            )}
          </div>
        )}

        {canOS && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm border border-gray-100">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Status das Ordens de Serviço</h3>
            <p className="text-sm text-gray-400 mb-6">Distribuição atual por etapa</p>

            {osData === null ? (
              <div className="h-80 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={osData} cx="50%" cy="50%" innerRadius={80} outerRadius={120} dataKey="value" label={({ value }) => `${value}`}>
                      {osData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} OS`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {osData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-gray-600">{item.name}</span>
                      <span className="text-sm font-bold text-gray-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {canOrcamentos && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 lg:p-8 shadow-sm border border-gray-100 xl:col-span-2">
            <h3 className="text-xl font-semibold mb-2 text-gray-900">Panorama Comercial</h3>
            <p className="text-sm text-gray-400 mb-6">Resumo atual dos orçamentos</p>
            {orcamentos === null ? (
              <div className="h-40 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  ["Rascunho", orcamentos.rascunho],
                  ["Enviado", orcamentos.enviado],
                  ["Aprovado", orcamentos.aprovado],
                  ["Reprovado", orcamentos.reprovado],
                  ["Cancelado", orcamentos.cancelado],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5">
                    <p className="text-sm text-gray-500">{label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
