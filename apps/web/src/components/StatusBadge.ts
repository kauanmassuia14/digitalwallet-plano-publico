type BadgeVariant = "green" | "yellow" | "blue" | "orange" | "gray" | "red";

const STATUS_MAP: Record<string, BadgeVariant> = {
  // Import Job
  PENDING: "gray",
  VALIDATING: "blue",
  READY: "yellow",
  COMMITTED: "green",
  REJECTED: "red",
  // Packaging
  MINTED: "blue",
  IN_CIRCULATION: "yellow",
  COLLECTED: "orange",
  RECYCLED: "green",
  // Batch
  DRAFT: "gray",
  VALIDATED: "yellow",
  IMPORTED: "green",
  FAILED: "red",
};

const LABEL_MAP: Record<string, string> = {
  PENDING: "Pendente",
  VALIDATING: "Validando",
  READY: "Pronto",
  COMMITTED: "Importado",
  REJECTED: "Rejeitado",
  MINTED: "Cunhado",
  IN_CIRCULATION: "Em circulação",
  COLLECTED: "Coletado",
  RECYCLED: "Reciclado",
  DRAFT: "Rascunho",
  VALIDATED: "Validado",
  IMPORTED: "Importado",
  FAILED: "Falhou",
};

export function StatusBadge(status: string): string {
  const variant = STATUS_MAP[status] ?? "gray";
  const label = LABEL_MAP[status] ?? status;
  return `<span class="badge badge--${variant}">${label}</span>`;
}
