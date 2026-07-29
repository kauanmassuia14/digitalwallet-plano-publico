import { listImportJobs, type ImportJob } from "../api/lots.js";
import { DataTable, bindTableRowClicks } from "../components/DataTable.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { showToast } from "../components/Toast.js";
import { fmtDate, fmtNumber } from "../utils/format.js";

export async function renderLotsPage(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Lotes</h1>
      <p class="page-header__sub">Todos os lotes de embalagens importados</p>
    </div>
    <div class="loading-state" id="lots-loading">
      <span class="loading-spinner"></span>
      <span>Carregando lotes…</span>
    </div>
    <div id="lots-content"></div>
  `;

  try {
    const jobs = await listImportJobs();
    renderTable(root, jobs);
  } catch {
    showToast("Erro ao carregar lotes.", "error");
    root.querySelector<HTMLElement>("#lots-loading")!.innerHTML =
      `<p style="color:var(--color-text-muted)">Não foi possível carregar os lotes.</p>`;
  }
}

function renderTable(root: HTMLElement, jobs: ImportJob[]): void {
  root.querySelector<HTMLElement>("#lots-loading")!.style.display = "none";
  const content = root.querySelector<HTMLElement>("#lots-content")!;

  content.innerHTML = DataTable({
    title: `${fmtNumber(jobs.length)} lotes encontrados`,
    emptyIcon: "📦",
    emptyMessage:
      "Nenhum lote importado ainda. Faça o upload de um arquivo CSV.",
    columns: [
      { label: "Arquivo", key: (j) => j.originalFileName },
      { label: "Versão", key: "contractVersion", mono: true },
      { label: "Status", key: (j) => StatusBadge(j.status) },
      { label: "Aceitas", key: (j) => fmtNumber(j.acceptedRows), mono: true },
      { label: "Rejeitadas", key: (j) => String(j.rejectedRows), mono: true },
      { label: "Criado em", key: (j) => fmtDate(j.createdAt) },
    ],
    rows: jobs,
    onRowClick: (job) => {
      window.location.hash = `#/lots/${job.id}`;
    },
  });

  bindTableRowClicks(content, jobs, (job) => {
    window.location.hash = `#/lots/${job.id}`;
  });
}
