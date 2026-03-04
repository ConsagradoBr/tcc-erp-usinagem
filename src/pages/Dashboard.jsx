import React from "react";
import {
  IconClients,
  IconServiceOrder,
  IconDollar,
  IconTrendingUp,
} from "../assets/assets-map";

// Import Recharts para os gráficos
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

// Dados de exemplo (depois vem do banco)
const revenueData = [
  { month: "Jan", receita: 18500 },
  { month: "Fev", receita: 22900 },
  { month: "Mar", receita: 28900 },
  { month: "Abr", receita: 31200 },
  { month: "Mai", receita: 27800 },
];

const osStatusData = [
  { name: "Em andamento", value: 32, color: "#3B82F6" },
  { name: "Concluídas", value: 87, color: "#10B981" },
  { name: "Atrasadas", value: 12, color: "#EF4444" },
];

export default function Dashboard() {
  return (
    <div className="p-8 bg-gray-50 dark:bg-gray-950 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-lg">
            Visão geral da usinagem • {new Intl.DateTimeFormat('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric' 
          }).format(new Date())}
        </p>
        </div>

        {/* Toggle Dark Mode (vamos implementar global depois) */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Modo escuro ativado automaticamente no Figma
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center">
              <img src={IconClients} className="w-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de Clientes</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">140</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/50 rounded-2xl flex items-center justify-center">
              <img src={IconServiceOrder} className="w-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">O.S. em andamento</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">32</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/50 rounded-2xl flex items-center justify-center">
              <img src={IconDollar} className="w-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Receita mensal</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">R$ 28.900</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/50 rounded-2xl flex items-center justify-center">
              <img src={IconTrendingUp} className="w-7" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Crescimento</p>
              <p className="text-3xl font-bold text-emerald-600">+18,4%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos estilo Power BI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Receita */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
            Receita dos últimos 5 meses
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="receita" fill="#3B82F6" radius={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Status das O.S. */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
            Status das Ordens de Serviço
          </h3>
          <ResponsiveContainer width="100%" height={320}>
            <PieChart>
              <Pie
                data={osStatusData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                dataKey="value"
              >
                {osStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-8 mt-4">
            {osStatusData.map((item) => (
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