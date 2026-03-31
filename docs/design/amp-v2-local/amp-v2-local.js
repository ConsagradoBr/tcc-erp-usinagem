const body = document.body;
const title = document.getElementById("workspace-title");
const kicker = document.getElementById("workspace-kicker");
const note = document.getElementById("workspace-note");
const screens = Array.from(document.querySelectorAll(".screen"));
const navLinks = Array.from(document.querySelectorAll("[data-screen-target]"));
const themeButtons = Array.from(document.querySelectorAll("[data-theme-target]"));

const traderRefs = {
  calMonth: document.getElementById("trader-cal-month"),
  calDay: document.getElementById("trader-cal-day"),
  calWeekday: document.getElementById("trader-cal-weekday"),
  clockCanvas: document.getElementById("trader-clock-canvas"),
  clockTime: document.getElementById("trader-clock-time"),
  kpiFat: document.getElementById("trader-kpi-fat"),
  kpiProd: document.getElementById("trader-kpi-prod"),
  kpiTicket: document.getElementById("trader-kpi-ticket"),
  totalVendas: document.getElementById("trader-total-vendas"),
  fluxoVal: document.getElementById("trader-fluxo-val"),
  fatChart: document.getElementById("trader-fat-chart"),
  tempoChart: document.getElementById("trader-tempo-chart"),
  donutCanvas: document.getElementById("trader-donut-canvas"),
  gaugeCanvas: document.getElementById("trader-gauge-canvas"),
};

const screenMeta = {
  dashboard: {
    title: "Dashboard",
    kicker: "AMP industrial suite",
    note: "Terminal analitico AMP com leitura trader, foco industrial e decisao rapida sobre comercial, producao, estoque e caixa.",
  },
  relacionamento: {
    title: "Clientes e Fornecedores",
    kicker: "Relacionamento unificado",
    note: "Terminal de relacionamento para leitura de conta, contexto fiscal, fluxo conectado e proxima acao comercial ou operacional.",
  },
  orcamentos: {
    title: "Orcamentos",
    kicker: "Fluxo comercial",
    note: "Leitura comercial enxuta, com aprovacao clara e ponte natural para OS e financeiro.",
  },
  os: {
    title: "Ordem de Servico",
    kicker: "Producao e andamento",
    note: "Quadro operacional com prioridade, etapa e manuseio visual mais simples.",
  },
  financeiro: {
    title: "Financeiro",
    kicker: "Titulos, parcelas e caixa",
    note: "Tabela como espinha dorsal, com leitura lateral de risco e orientacao de caixa.",
  },
  usuarios: {
    title: "Usuarios",
    kicker: "Governanca interna",
    note: "Controle de acesso interno, sem cadastro publico e com papeis bem definidos.",
  },
  backup: {
    title: "Backup",
    kicker: "Confiabilidade operacional",
    note: "Camada tecnica enxuta para reforcar seguranca de dados e distribuicao desktop.",
  },
  login: {
    title: "Login",
    kicker: "Acesso controlado",
    note: "Entrada institucional limpa, alinhada com o TCC e com a realidade do produto.",
  },
};

const traderPalette = {
  accent: "#00d4aa",
  accent2: "#00aaff",
  warn: "#ffa940",
  danger: "#ff4d6d",
  purple: "#a78bfa",
  text: "#e8f2ff",
  textSoft: "#94aac8",
  textMuted: "#4a6080",
  surface: "#060a12",
  grid: "rgba(26, 37, 64, 0.55)",
};

const traderMetrics = {
  faturamento: 782450,
  produtividade: 91,
  ticket: 18640,
  totalVendas: 1832000,
  fluxo: 468700,
};

const traderState = {
  initialized: false,
  timers: {
    clock: null,
  },
  charts: {
    faturamento: null,
    tempo: null,
  },
};

function setTheme(theme) {
  body.dataset.theme = theme;

  themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeTarget === theme);
  });
}

function setScreen(screenName) {
  body.dataset.screen = screenName;

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.dataset.screenTarget === screenName);
  });

  screens.forEach((screen) => {
    screen.classList.toggle("is-visible", screen.dataset.screenName === screenName);
  });

  const meta = screenMeta[screenName];
  if (meta) {
    title.textContent = meta.title;
    kicker.textContent = meta.kicker;
    note.textContent = meta.note;
  }

  if (screenName === "dashboard") {
    initTraderDashboard();
    queueMicrotask(resizeTraderCharts);
  }
}

function formatCurrency(value) {
  return `R$ ${Math.round(value).toLocaleString("pt-BR")}`;
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function updateTraderCalendar(now = new Date()) {
  const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
  const weekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SAB"];

  if (traderRefs.calMonth) traderRefs.calMonth.textContent = months[now.getMonth()];
  if (traderRefs.calDay) traderRefs.calDay.textContent = String(now.getDate()).padStart(2, "0");
  if (traderRefs.calWeekday) traderRefs.calWeekday.textContent = weekdays[now.getDay()];
}

function drawTraderClock() {
  const canvas = traderRefs.clockCanvas;
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const now = new Date();
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(cx, cy) - 4;

  if (traderRefs.clockTime) {
    traderRefs.clockTime.textContent = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(now);
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fillStyle = traderPalette.surface;
  context.fill();
  context.strokeStyle = traderPalette.accent;
  context.lineWidth = 1.5;
  context.stroke();

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2 - Math.PI / 2;
    context.beginPath();
    context.moveTo(cx + Math.cos(angle) * (radius - 3), cy + Math.sin(angle) * (radius - 3));
    context.lineTo(cx + Math.cos(angle) * (radius - 8), cy + Math.sin(angle) * (radius - 8));
    context.strokeStyle = "rgba(0, 212, 170, 0.35)";
    context.lineWidth = 1;
    context.stroke();
  }

  const hourAngle = (((now.getHours() % 12) + now.getMinutes() / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  const minuteAngle = ((now.getMinutes() + now.getSeconds() / 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const secondAngle = (now.getSeconds() / 60) * Math.PI * 2 - Math.PI / 2;

  drawTraderHand(context, cx, cy, hourAngle, 14, 2.1, traderPalette.text);
  drawTraderHand(context, cx, cy, minuteAngle, 18.5, 1.6, traderPalette.textSoft);
  drawTraderHand(context, cx, cy, secondAngle, 21, 1.1, traderPalette.danger);

  context.beginPath();
  context.arc(cx, cy, 2.7, 0, Math.PI * 2);
  context.fillStyle = traderPalette.accent;
  context.fill();
}

function drawTraderHand(context, cx, cy, angle, length, width, color) {
  context.beginPath();
  context.moveTo(cx, cy);
  context.lineTo(cx + Math.cos(angle) * length, cy + Math.sin(angle) * length);
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = "round";
  context.stroke();
}

function animateTraderCount(element, target, formatter, duration = 1300) {
  if (!element || element.dataset.animated === "true") return;

  const totalSteps = 60;
  const increment = target / totalSteps;
  let current = 0;

  element.dataset.animated = "true";

  const timer = window.setInterval(() => {
    current = Math.min(current + increment, target);
    element.textContent = formatter(current);

    if (current >= target) {
      window.clearInterval(timer);
      element.textContent = formatter(target);
    }
  }, duration / totalSteps);
}

function drawTraderDonut() {
  const canvas = traderRefs.donutCanvas;
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const outerRadius = Math.min(cx, cy) - 10;
  const innerRadius = outerRadius - 14;
  const slices = [
    { value: 68, color: traderPalette.accent },
    { value: 32, color: traderPalette.danger },
  ];

  context.clearRect(0, 0, canvas.width, canvas.height);

  let angle = -Math.PI / 2;
  slices.forEach((slice) => {
    const span = (slice.value / 100) * Math.PI * 2;
    context.beginPath();
    context.moveTo(cx, cy);
    context.arc(cx, cy, outerRadius, angle, angle + span);
    context.closePath();
    context.fillStyle = slice.color;
    context.fill();
    angle += span;
  });

  context.beginPath();
  context.arc(cx, cy, innerRadius, 0, Math.PI * 2);
  context.fillStyle = "#0c1221";
  context.fill();

  context.fillStyle = traderPalette.textSoft;
  context.font = "11px 'Share Tech Mono', monospace";
  context.textAlign = "center";
  context.fillText("CAIXA", cx, cy - 4);
  context.fillStyle = traderPalette.text;
  context.font = "bold 13px 'Share Tech Mono', monospace";
  context.fillText("68/32", cx, cy + 14);
}

function drawTraderGauge() {
  const canvas = traderRefs.gaugeCanvas;
  if (!canvas) return;

  const context = canvas.getContext("2d");
  if (!context) return;

  const cx = canvas.width / 2;
  const cy = canvas.height - 6;
  const radius = Math.min(canvas.width / 2, canvas.height) - 18;
  const percent = 0.74;

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.beginPath();
  context.arc(cx, cy, radius, Math.PI, Math.PI * 2);
  context.strokeStyle = "#1a2540";
  context.lineWidth = 13;
  context.stroke();

  const gradient = context.createLinearGradient(cx - radius, cy, cx + radius, cy);
  gradient.addColorStop(0, traderPalette.danger);
  gradient.addColorStop(0.5, traderPalette.warn);
  gradient.addColorStop(1, traderPalette.accent);

  context.beginPath();
  context.arc(cx, cy, radius, Math.PI, Math.PI + percent * Math.PI);
  context.strokeStyle = gradient;
  context.lineWidth = 13;
  context.lineCap = "round";
  context.stroke();

  const needleAngle = Math.PI + percent * Math.PI;
  context.beginPath();
  context.moveTo(cx, cy);
  context.lineTo(cx + Math.cos(needleAngle) * (radius - 16), cy + Math.sin(needleAngle) * (radius - 16));
  context.strokeStyle = traderPalette.text;
  context.lineWidth = 1.5;
  context.lineCap = "round";
  context.stroke();

  context.beginPath();
  context.arc(cx, cy, 4.5, 0, Math.PI * 2);
  context.fillStyle = traderPalette.accent;
  context.fill();

  context.fillStyle = traderPalette.accent;
  context.font = "bold 15px 'Share Tech Mono', monospace";
  context.textAlign = "center";
  context.fillText("74%", cx, cy - 26);

  context.fillStyle = traderPalette.textMuted;
  context.font = "8px Rajdhani, sans-serif";
  context.fillText("MIN", cx - radius + 12, cy + 5);
  context.fillText("MAX", cx + radius - 12, cy + 5);
}

function buildCommonChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#0c1221",
        borderColor: "rgba(0, 212, 170, 0.24)",
        borderWidth: 1,
        titleColor: traderPalette.text,
        bodyColor: traderPalette.textSoft,
        displayColors: false,
      },
    },
  };
}

function initTraderCharts() {
  if (typeof window.Chart === "undefined") return;

  if (traderRefs.fatChart) {
    const existingFatChart = window.Chart.getChart(traderRefs.fatChart);
    if (existingFatChart) existingFatChart.destroy();

    traderState.charts.faturamento = new window.Chart(traderRefs.fatChart, {
      type: "bar",
      data: {
        labels: ["Set", "Out", "Nov", "Dez", "Jan", "Fev", "Mar"],
        datasets: [
          {
            data: [420, 510, 468, 622, 705, 688, 782],
            backgroundColor(context) {
              return context.dataIndex === 6 ? "rgba(0, 212, 170, 0.82)" : "rgba(0, 71, 171, 0.55)";
            },
            borderColor(context) {
              return context.dataIndex === 6 ? traderPalette.accent : "#0047ab";
            },
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        ...buildCommonChartOptions(),
        plugins: {
          ...buildCommonChartOptions().plugins,
          tooltip: {
            ...buildCommonChartOptions().plugins.tooltip,
            callbacks: {
              label(item) {
                return `R$ ${item.raw.toLocaleString("pt-BR")} mil`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: traderPalette.textMuted,
              font: { family: "Share Tech Mono", size: 9 },
            },
            grid: { display: false },
            border: { display: false },
          },
          y: {
            ticks: {
              color: traderPalette.textMuted,
              font: { family: "Share Tech Mono", size: 9 },
              callback(value) {
                return `${value}k`;
              },
            },
            grid: { display: false },
            border: { display: false },
          },
        },
      },
    });
  }

  if (traderRefs.tempoChart) {
    const existingTempoChart = window.Chart.getChart(traderRefs.tempoChart);
    if (existingTempoChart) existingTempoChart.destroy();

    traderState.charts.tempo = new window.Chart(traderRefs.tempoChart, {
      type: "line",
      data: {
        labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"],
        datasets: [
          {
            label: "Carga",
            data: [72, 84, 66, 88, 79, 58, 46],
            borderColor: traderPalette.accent,
            backgroundColor: "rgba(0, 212, 170, 0.08)",
            borderWidth: 2,
            pointBackgroundColor: traderPalette.accent,
            pointRadius: 3.5,
            fill: true,
            tension: 0.38,
          },
          {
            label: "Capacidade",
            data: [80, 80, 80, 80, 80, 80, 80],
            borderColor: "rgba(255, 77, 109, 0.45)",
            borderWidth: 1,
            borderDash: [5, 4],
            pointRadius: 0,
            fill: false,
            tension: 0,
          },
        ],
      },
      options: {
        ...buildCommonChartOptions(),
        plugins: {
          ...buildCommonChartOptions().plugins,
          tooltip: {
            ...buildCommonChartOptions().plugins.tooltip,
            callbacks: {
              label(item) {
                return item.datasetIndex === 0 ? `Carga: ${item.raw}%` : "Capacidade: 80%";
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: traderPalette.textMuted,
              font: { family: "Share Tech Mono", size: 9 },
            },
            grid: { color: traderPalette.grid },
            border: { display: false },
          },
          y: {
            ticks: {
              color: traderPalette.textMuted,
              font: { family: "Share Tech Mono", size: 9 },
              callback(value) {
                return `${value}%`;
              },
            },
            grid: { color: traderPalette.grid },
            border: { display: false },
          },
        },
      },
    });
  }
}

function resizeTraderCharts() {
  Object.values(traderState.charts).forEach((chart) => {
    if (chart && typeof chart.resize === "function") {
      chart.resize();
    }
  });
}

function initTraderDashboard() {
  if (!traderRefs.fatChart) return;

  updateTraderCalendar();
  drawTraderClock();
  drawTraderDonut();
  drawTraderGauge();
  initTraderCharts();

  animateTraderCount(traderRefs.kpiFat, traderMetrics.faturamento, formatCurrency);
  animateTraderCount(traderRefs.kpiProd, traderMetrics.produtividade, formatPercent);
  animateTraderCount(traderRefs.kpiTicket, traderMetrics.ticket, formatCurrency);
  animateTraderCount(traderRefs.totalVendas, traderMetrics.totalVendas, formatCurrency);
  animateTraderCount(traderRefs.fluxoVal, traderMetrics.fluxo, formatCurrency);

  if (!traderState.initialized) {
    traderState.timers.clock = window.setInterval(() => {
      updateTraderCalendar();
      drawTraderClock();
    }, 1000);

    window.addEventListener("resize", () => {
      drawTraderDonut();
      drawTraderGauge();
      resizeTraderCharts();
    });

    traderState.initialized = true;
  }
}

navLinks.forEach((link) => {
  link.addEventListener("click", () => setScreen(link.dataset.screenTarget));
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.themeTarget));
});

setTheme(body.dataset.theme || "light");
setScreen(body.dataset.screen || "dashboard");
