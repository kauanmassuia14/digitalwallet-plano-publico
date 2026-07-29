import { listPackagings, type Packaging } from "../api/packaging.js";
import { DataTable, bindTableRowClicks } from "../components/DataTable.js";
import { StatusBadge } from "../components/StatusBadge.js";
import { showToast } from "../components/Toast.js";
import { fmtNumber, fmtDate } from "../utils/format.js";

export async function renderPackagingsPage(root: HTMLElement): Promise<void> {
  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Embalagens</h1>
      <p class="page-header__sub">Todas as embalagens do seu tenant</p>
    </div>

    <div style="display:flex;gap:var(--space-3);margin-bottom:var(--space-5);flex-wrap:wrap">
      <button class="btn btn--outline btn--sm filter-btn is-active" data-status="">Todas</button>
      <button class="btn btn--outline btn--sm filter-btn" data-status="MINTED">Cunhadas</button>
      <button class="btn btn--outline btn--sm filter-btn" data-status="IN_CIRCULATION">Em circulação</button>
      <button class="btn btn--outline btn--sm filter-btn" data-status="COLLECTED">Coletadas</button>
      <button class="btn btn--outline btn--sm filter-btn" data-status="RECYCLED">Recicladas</button>
    </div>

    <div class="loading-state" id="pkg-loading">
      <span class="loading-spinner"></span>
      <span>Carregando embalagens…</span>
    </div>
    <div id="pkg-content"></div>
  `;

  let allPackagings: Packaging[] = [];

  try {
    allPackagings = await listPackagings();
    renderTable(root, allPackagings);
  } catch {
    showToast("Erro ao carregar embalagens.", "error");
    return;
  }

  root.querySelectorAll<HTMLButtonElement>(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      root
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      const status = btn.dataset["status"] as Packaging["status"] | "";
      const filtered = status
        ? allPackagings.filter((p) => p.status === status)
        : allPackagings;
      renderTable(root, filtered);
    });
  });
}

function renderTable(root: HTMLElement, packagings: Packaging[]): void {
  root.querySelector<HTMLElement>("#pkg-loading")!.style.display = "none";
  const content = root.querySelector<HTMLElement>("#pkg-content")!;

  content.innerHTML = DataTable({
    title: `${fmtNumber(packagings.length)} embalagens`,
    emptyIcon: "⬡",
    emptyMessage: "Nenhuma embalagem encontrada com esse filtro.",
    columns: [
      { label: "Serial", key: "serial", mono: true },
      { label: "Material", key: "materialCode" },
      { label: "Status", key: (p) => StatusBadge(p.status) },
      { label: "Peso esp.", key: (p) => `${p.expectedWeightGrams}g` },
      {
        label: "Recompensa",
        key: (p) => `€${(p.rewardCents / 100).toFixed(2)}`,
        mono: true,
      },
      { label: "Criado em", key: (p) => fmtDate(p.createdAt) },
    ],
    rows: packagings,
    onRowClick: (pkg) => {
      window.location.hash = `#/packagings/${pkg.id}`;
    },
  });

  bindTableRowClicks(content, packagings, (pkg) => {
    window.location.hash = `#/packagings/${pkg.id}`;
  });
}
