interface NavItem {
  label: string;
  hash: string;
  icon: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", hash: "#/dashboard", icon: "◈" },
  { label: "Lotes", hash: "#/lots", icon: "⊞" },
  { label: "Embalagens", hash: "#/packagings", icon: "⬡" },
  { label: "Reconciliação", hash: "#/reconciliation", icon: "⊟" },
];

export function renderSidebar(root: HTMLElement): void {
  const current = window.location.hash || "#/dashboard";

  root.innerHTML = `
    <aside class="sidebar" role="navigation" aria-label="Menu principal">
      <span class="sidebar__label">Menu</span>
      ${NAV_ITEMS.map(
        (item) => `
        <button
          class="sidebar__item ${current === item.hash ? "is-active" : ""}"
          data-hash="${item.hash}"
          aria-current="${current === item.hash ? "page" : "false"}"
        >
          <span class="sidebar__icon" aria-hidden="true">${item.icon}</span>
          ${item.label}
        </button>
      `,
      ).join("")}
    </aside>
  `;

  root.querySelectorAll<HTMLButtonElement>(".sidebar__item").forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.hash = btn.dataset["hash"] ?? "#/dashboard";
    });
  });
}
