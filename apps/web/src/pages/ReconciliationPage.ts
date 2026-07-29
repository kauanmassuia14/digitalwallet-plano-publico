import {
  getReconciliation,
  type ReconciliationResult,
} from "../api/dashboard.js";
import { showToast } from "../components/Toast.js";
import { StatCards } from "../components/StatCard.js";
import { fmtCents, fmtDateTime } from "../utils/format.js";

export async function renderReconciliationPage(
  root: HTMLElement,
): Promise<void> {
  root.innerHTML = `
    <div class="page-header">
      <h1 class="page-header__title">Reconciliação Financeira</h1>
      <p class="page-header__sub">Auditoria do Ledger criptográfico e totais financeiros</p>
    </div>
    <div class="loading-state" id="recon-loading">
      <span class="loading-spinner"></span>
      <span>Carregando reconciliação…</span>
    </div>
    <div id="recon-content"></div>
  `;

  try {
    const data = await getReconciliation();
    renderData(root, data);
  } catch {
    showToast("Erro ao carregar reconciliação.", "error");
  }
}

function renderData(root: HTMLElement, d: ReconciliationResult): void {
  root.querySelector<HTMLElement>("#recon-loading")!.style.display = "none";
  const content = root.querySelector<HTMLElement>("#recon-content")!;
  const ft = d.financialTotals;
  const lv = d.ledgerValidation;

  content.innerHTML = `
    ${StatCards([
      {
        label: "Total ganho",
        value: fmtCents(ft.totalEarnedCents),
        sub: "recompensas emitidas",
      },
      {
        label: "Total liquidado",
        value: fmtCents(ft.totalCashedOutCents),
        sub: "cashouts confirmados",
      },
      {
        label: "Total revertido",
        value: fmtCents(ft.totalReversedCents),
        sub: "estornos",
      },
      {
        label: "Saldo atual",
        value: fmtCents(ft.totalCurrentBalanceCents),
        accent: true,
      },
      {
        label: "Discrepância",
        value: fmtCents(ft.discrepancyCents),
        sub: ft.isReconciled ? "✓ Conciliado" : "⚠ Divergência",
      },
    ])}

    <div class="table-wrapper section-gap">
      <div class="table-header">
        <span class="table-title">Ledger Criptográfico</span>
        <span style="font-size:0.8125rem;color:var(--color-text-muted)">
          Exportado em ${fmtDateTime(d.exportedAt)}
        </span>
      </div>
      <div style="padding:var(--space-5);display:flex;flex-direction:column;gap:var(--space-4)">
        <div style="display:flex;align-items:center;gap:var(--space-4)">
          <div style="
            width:56px;height:56px;border-radius:50%;
            background:${lv.isValid ? "var(--color-primary-50)" : "#fee2e2"};
            border:2px solid ${lv.isValid ? "var(--color-primary-300)" : "#fca5a5"};
            display:flex;align-items:center;justify-content:center;
            font-size:1.5rem;
          ">${lv.isValid ? "✓" : "✕"}</div>
          <div>
            <p style="font-weight:700;font-size:1rem;color:${lv.isValid ? "var(--color-primary-700)" : "var(--color-error)"}">
              ${lv.isValid ? "Cadeia de hashes íntegra" : "Falha na integridade"}
            </p>
            <p style="font-size:0.875rem;color:var(--color-text-muted)">
              ${lv.totalChainEntries} entradas verificadas no Ledger
            </p>
          </div>
        </div>
        ${lv.error ? `<p style="font-size:0.875rem;color:var(--color-error);padding:var(--space-3);background:#fee2e2;border-radius:var(--radius-sm)">${lv.error}</p>` : ""}
        <div style="display:flex;gap:var(--space-3);margin-top:var(--space-2)">
          <span class="badge ${ft.isReconciled ? "badge--green" : "badge--red"}">
            ${ft.isReconciled ? "Conciliado" : "Discrepância detectada"}
          </span>
          <span class="badge badge--blue">
            ${lv.totalChainEntries} entradas no Ledger
          </span>
        </div>
      </div>
    </div>
  `;
}
