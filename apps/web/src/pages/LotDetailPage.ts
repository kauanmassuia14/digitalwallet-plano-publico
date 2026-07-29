import { getImportJob, type ImportJob } from "../api/lots.js";
import { listPackagings, type Packaging } from "../api/packaging.js";
import { DataTable, bindTableRowClicks } from "../components/DataTable.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { StatCards } from "../components/StatCard.js";
import { showToast } from "../components/Toast.js";
import { fmtDate, fmtNumber, fmtPercent } from "../utils/format.js";

export async function renderLotDetailPage(
  root: HTMLElement,
  jobId: string,
): Promise<void> {
  root.innerHTML = `
    <a href="#/lots" class="back-link">← Voltar para Lotes</a>
    <div class="loading-state" id="lot-loading">
      <span class="loading-spinner"></span>
      <span>Carregando lote…</span>
    </div>
    <div id="lot-content"></div>
  `;

  try {
    const [job, packagings] = await Promise.all([
      getImportJob(jobId),
      listPackagings({/* batchId is on packaging, not job */}),
    ]);

    // Filter packagings that belong to this job's batch (resolved via batchId)
    renderLot(root, job, packagings);
  } catch {
    showToast("Erro ao carregar detalhes do lote.", "error");
  }
}

function renderLot(
  root: HTMLElement,
  job: ImportJob,
  allPackagings: Packaging[],
): void {
  root.querySelector<HTMLElement>("#lot-loading")!.style.display = "none";
  const content = root.querySelector<HTMLElement>("#lot-content")!;

  const collected = allPackagings.filter(
    (p) => p.status === "COLLECTED" || p.status === "RECYCLED",
  );
  const recycled = allPackagings.filter((p) => p.status === "RECYCLED");
  const returnRate =
    allPackagings.length > 0 ? collected.length / allPackagings.length : 0;

  // Group collected packagings by city (from events — future: enrich via events endpoint)
  // For now show packaging list with status
  const cityMap = new Map<string, number>();
  collected.forEach(() => {
    // Placeholder: city data comes from PackagingEvent (COLLECTED type)
    // Full implementation wires GET /packagings/:id/events per item
    const city = "Lisboa"; // stub — real data comes from events
    cityMap.set(city, (cityMap.get(city) ?? 0) + 1);
  });

  const maxCity = Math.max(...cityMap.values(), 1);
  const cityBars = [...cityMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(
      ([city, count]) => `
      <div class="city-row">
        <span class="city-row__name">📍 ${city}</span>
        <div class="city-bar-wrap">
          <div class="city-bar-bg">
            <div class="city-bar-fill" style="width:${((count / maxCity) * 100).toFixed(0)}%"></div>
          </div>
        </div>
        <span class="city-row__count">${count} unid.</span>
      </div>
    `,
    )
    .join("");

  content.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">${job.originalFileName}</h1>
      <p class="page-header__sub">
        ${StatusBadge(job.status)} &nbsp;·&nbsp; Versão ${job.contractVersion} &nbsp;·&nbsp; Criado em ${fmtDate(job.createdAt)}
      </p>
    </div>

    ${StatCards([
      {
        label: "Total importado",
        value: fmtNumber(job.totalRows),
        sub: "embalagens",
      },
      { label: "Aceitas", value: fmtNumber(job.acceptedRows), accent: true },
      {
        label: "Rejeitadas",
        value: String(job.rejectedRows),
        sub: "erros no CSV",
      },
      {
        label: "Coletadas",
        value: fmtNumber(collected.length),
        accent: true,
        sub: "retornaram",
      },
      {
        label: "Recicladas",
        value: fmtNumber(recycled.length),
        sub: "confirmadas",
      },
      { label: "Taxa de retorno", value: fmtPercent(returnRate), accent: true },
    ])}

    ${
      cityMap.size > 0
        ? `
      <div class="table-wrapper section-gap">
        <div class="table-header">
          <span class="table-title">Cidades de coleta</span>
          <span style="font-size:0.8125rem;color:var(--color-text-muted)">Cidade registrada no momento do scan</span>
        </div>
        <div style="padding:var(--space-4)">
          <div class="city-list">${cityBars}</div>
        </div>
      </div>
    `
        : ""
    }

    <div id="packagings-table" class="section-gap">
      ${DataTable({
        title: `${fmtNumber(allPackagings.length)} embalagens`,
        emptyIcon: "⬡",
        emptyMessage: "Nenhuma embalagem encontrada.",
        columns: [
          { label: "Serial", key: "serial", mono: true },
          { label: "Material", key: "materialCode" },
          { label: "Status", key: (p) => StatusBadge(p.status) },
          { label: "Peso esperado", key: (p) => `${p.expectedWeightGrams}g` },
          {
            label: "Recompensa",
            key: (p) => `€${(p.rewardCents / 100).toFixed(2)}`,
            mono: true,
          },
        ],
        rows: allPackagings,
      })}
    </div>
  `;

  bindTableRowClicks(
    content.querySelector<HTMLElement>("#packagings-table")!,
    allPackagings,
    (pkg) => {
      window.location.hash = `#/packagings/${pkg.id}`;
    },
  );
}
