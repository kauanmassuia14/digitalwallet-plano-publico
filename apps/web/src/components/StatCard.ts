export interface StatCardData {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

export function StatCard(data: StatCardData): string {
  return `
    <div class="stat-card ${data.accent ? "stat-card--accent" : ""}">
      <span class="stat-card__label">${data.label}</span>
      <span class="stat-card__value">${data.value}</span>
      ${data.sub ? `<span class="stat-card__sub">${data.sub}</span>` : ""}
    </div>
  `;
}

export function StatCards(cards: StatCardData[]): string {
  return `<div class="stat-cards">${cards.map(StatCard).join("")}</div>`;
}
