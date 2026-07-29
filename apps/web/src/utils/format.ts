/** Format a ISO date string to locale display. */
export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Format ISO date with time. */
export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format cents to currency string. */
export function fmtCents(cents: number, currency = "EUR"): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency,
  });
}

/** Format a ratio as percentage string. */
export function fmtPercent(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`;
}

/** Format a number with thousands separator. */
export function fmtNumber(n: number): string {
  return n.toLocaleString("pt-BR");
}

/** Format kg with 2 decimals. */
export function fmtKg(grams: number): string {
  return `${(grams / 1000).toFixed(2)} kg`;
}
