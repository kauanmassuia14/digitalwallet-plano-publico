import Chart from "chart.js/auto";
import {
  getKpis,
  getChartData,
  type KpiResult,
  type ChartDataResult,
} from "../api/dashboard.js";
import { StatCards } from "../components/StatCard.js";
import { showToast } from "../components/Toast.js";
import { fmtNumber, fmtPercent, fmtKg, fmtCents } from "../utils/format.js";

export async function renderDashboardPage(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Dashboard</h1>
      <p class="page-header__sub">Visão geral do desempenho dos seus lotes</p>
    </div>
    <div class="loading-state" id="dash-loading">
      <span class="loading-spinner"></span>
      <span>Carregando métricas…</span>
    </div>
    <div id="dash-content" style="display:none"></div>
  `;

  try {
    const [kpis, chartData] = await Promise.all([getKpis(), getChartData()]);
    renderKpis(root, kpis);
    renderCharts(root, chartData);
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar métricas. A API está rodando?", "error");
    renderFallback(root);
  }
}

function renderKpis(root: HTMLElement, k: KpiResult): void {
  const loading = root.querySelector<HTMLElement>("#dash-loading")!;
  const content = root.querySelector<HTMLElement>("#dash-content")!;
  loading.style.display = "none";
  content.style.display = "";

  content.innerHTML = `
    ${StatCards([
      {
        label: "Embalagens emitidas",
        value: fmtNumber(k.mintedCount),
        sub: "total cunhado",
      },
      {
        label: "Coletadas",
        value: fmtNumber(k.collectedCount),
        accent: true,
        sub: "retornadas ao sistema",
      },
      {
        label: "Recicladas",
        value: fmtNumber(k.recycledCount),
        sub: "confirmadas em cooperativa",
      },
      {
        label: "Taxa de retorno",
        value: fmtPercent(k.returnRate),
        accent: true,
        sub: "meta: 70%",
      },
      {
        label: "CO₂ economizado",
        value: fmtKg(k.co2SavedKg * 1000),
        sub: "estimativa calculada",
      },
      {
        label: "Recompensas geradas",
        value: fmtCents(k.totalEarnedCents),
        sub: "total pago a usuários",
      },
      {
        label: "Cashouts realizados",
        value: fmtCents(k.totalCashedOutCents),
        sub: "liquidados",
      },
      {
        label: "Usuários ativos",
        value: fmtNumber(k.activeUsersCount),
        sub: "que resgataram",
      },
    ])}

    <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:var(--space-5);margin-bottom:var(--space-6)">
      <h2 style="font-size:1rem;font-weight:700;margin-bottom:var(--space-2)">Taxa de Resgate</h2>
      <div style="display:flex;align-items:center;gap:var(--space-4)">
        <div style="flex:1;height:12px;background:var(--color-border);border-radius:var(--radius-full);overflow:hidden">
          <div style="height:100%;width:${(k.redemptionRate * 100).toFixed(1)}%;background:var(--color-primary-500);border-radius:var(--radius-full);transition:width 0.8s ease"></div>
        </div>
        <span style="font-family:var(--font-mono);font-weight:600;color:var(--color-primary-700)">${fmtPercent(k.redemptionRate)}</span>
      </div>
      <p style="font-size:0.8125rem;color:var(--color-text-muted);margin-top:var(--space-2)">
        Percentual de embalagens coletadas cujos usuários resgataram as recompensas
      </p>
    </div>

    <!-- BI Charts Grid -->
    <div class="dashboard-charts-grid">
      <div class="chart-card">
        <h2 class="chart-card__title">Ciclo de Vida das Embalagens (Últimos 30 Dias)</h2>
        <div class="chart-card__canvas-container">
          <canvas id="lifecycle-chart"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h2 class="chart-card__title">Distribuição de Materiais</h2>
        <div class="chart-card__canvas-container">
          <canvas id="materials-chart"></canvas>
        </div>
      </div>
    </div>
    <div class="dashboard-charts-grid dashboard-charts-grid--full">
      <div class="chart-card">
        <h2 class="chart-card__title">Evolução Financeira (Recompensas vs Cashouts)</h2>
        <div class="chart-card__canvas-container">
          <canvas id="financials-chart"></canvas>
        </div>
      </div>
    </div>
  `;
}

function renderCharts(root: HTMLElement, data: ChartDataResult): void {
  const formatDateLabel = (dateStr: string) => {
    try {
      const [, month, day] = dateStr.split("-");
      const months = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];
      return `${day} ${months[parseInt(month!, 10) - 1]}`;
    } catch {
      return dateStr;
    }
  };

  const dates = data.timeline.map((t) => formatDateLabel(t.date));

  // Chart 1: Lifecycle (Line Area)
  const ctxLifecycle =
    root.querySelector<HTMLCanvasElement>("#lifecycle-chart");
  if (ctxLifecycle) {
    new Chart(ctxLifecycle, {
      type: "line",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Emitidas (Minted)",
            data: data.timeline.map((t) => t.minted),
            borderColor: "#0284c7",
            backgroundColor: "rgba(2, 132, 199, 0.05)",
            fill: true,
            tension: 0.35,
          },
          {
            label: "Coletadas (Collected)",
            data: data.timeline.map((t) => t.collected),
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.05)",
            fill: true,
            tension: 0.35,
          },
          {
            label: "Recicladas (Recycled)",
            data: data.timeline.map((t) => t.recycled),
            borderColor: "#8b5cf6",
            backgroundColor: "rgba(139, 92, 246, 0.05)",
            fill: true,
            tension: 0.35,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { boxWidth: 12, font: { family: "Inter" } },
          },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: "#f1f5f9" } },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // Chart 2: Materials (Doughnut)
  const ctxMaterials =
    root.querySelector<HTMLCanvasElement>("#materials-chart");
  if (ctxMaterials) {
    const materialColors: Record<string, string> = {
      PET: "#10b981",
      GLASS: "#06b6d4",
      ALUMINUM: "#64748b",
      PAPER: "#f59e0b",
    };

    const labels = data.materialDistribution.map((m) => m.materialCode);
    const counts = data.materialDistribution.map((m) => m.count);
    const backgroundColors = labels.map(
      (l) => materialColors[l.toUpperCase()] || "#cbd5e1",
    );

    new Chart(ctxMaterials, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: counts,
            backgroundColor: backgroundColors,
            borderWidth: 2,
            borderColor: "var(--color-surface)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "right",
            labels: { boxWidth: 12, font: { family: "Inter" } },
          },
        },
      },
    });
  }

  // Chart 3: Financials (Grouped Bar)
  const ctxFinancials =
    root.querySelector<HTMLCanvasElement>("#financials-chart");
  if (ctxFinancials) {
    new Chart(ctxFinancials, {
      type: "bar",
      data: {
        labels: dates,
        datasets: [
          {
            label: "Recompensas Geradas",
            data: data.timeline.map((t) => t.earned / 100),
            backgroundColor: "#10b981",
            borderRadius: 4,
          },
          {
            label: "Cashouts Liquidados",
            data: data.timeline.map((t) => t.cashedOut / 100),
            backgroundColor: "#ef4444",
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: { boxWidth: 12, font: { family: "Inter" } },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const val = ctx.parsed.y ?? 0;
                return `${ctx.dataset.label}: ${fmtCents(Math.round(val * 100))}`;
              },
            },
          },
        },
        scales: {
          y: {
            grid: { color: "#f1f5f9" },
            ticks: {
              callback: (val) => fmtCents(Math.round(Number(val) * 100)),
            },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }
}

function renderFallback(root: HTMLElement): void {
  const loading = root.querySelector<HTMLElement>("#dash-loading")!;
  loading.innerHTML = `
    <div style="text-align:center">
      <p style="font-size:1.5rem;margin-bottom:0.5rem">📡</p>
      <p style="color:var(--color-text-muted)">API offline — inicie com <code>pnpm dev:api</code></p>
    </div>
  `;
}
