export interface Column<T> {
  label: string;
  key: keyof T | ((row: T) => string);
  mono?: boolean;
}

export interface DataTableOptions<T> {
  title: string;
  columns: Column<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyIcon?: string;
  actions?: string; // raw HTML for action buttons
}

export function DataTable<T extends object>(opts: DataTableOptions<T>): string {
  const head = opts.columns.map((c) => `<th>${c.label}</th>`).join("");

  const body =
    opts.rows.length === 0
      ? `<tr><td colspan="${opts.columns.length}">
           <div class="table-empty">
             <div class="table-empty__icon">${opts.emptyIcon ?? "📭"}</div>
             <p>${opts.emptyMessage ?? "Nenhum registro encontrado."}</p>
           </div>
         </td></tr>`
      : opts.rows
          .map((row, i) => {
            const cells = opts.columns
              .map((col) => {
                const val =
                  typeof col.key === "function"
                    ? col.key(row)
                    : String(row[col.key] ?? "—");
                return `<td class="${col.mono ? "mono" : ""}">${val}</td>`;
              })
              .join("");
            return `<tr class="${opts.onRowClick ? "clickable" : ""}" data-row-index="${i}">${cells}</tr>`;
          })
          .join("");

  return `
    <div class="table-wrapper">
      <div class="table-header">
        <span class="table-title">${opts.title}</span>
        ${opts.actions ?? ""}
      </div>
      <table class="data-table" role="grid">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

/** Bind row click events after mounting the table HTML. */
export function bindTableRowClicks<T extends object>(
  wrapper: HTMLElement,
  rows: T[],
  onRowClick: (row: T) => void,
): void {
  wrapper
    .querySelectorAll<HTMLTableRowElement>("tbody tr.clickable")
    .forEach((tr) => {
      tr.addEventListener("click", () => {
        const idx = Number(tr.dataset["rowIndex"] ?? -1);
        const row = rows[idx];
        if (row !== undefined) onRowClick(row);
      });
    });
}
