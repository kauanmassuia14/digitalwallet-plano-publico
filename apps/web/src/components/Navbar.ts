import { getSession } from "../store/session.js";
import { logout } from "../api/auth.js";

export function renderNavbar(root: HTMLElement): void {
  const session = getSession();

  root.innerHTML = `
    <nav class="navbar">
      <div class="navbar__brand">
        <span class="navbar__brand-icon">DW</span>
        DigitalWallet
      </div>
      <div class="navbar__right">
        ${session ? `<span class="navbar__tenant-badge">${session.email}</span>` : ""}
        ${
          session
            ? `<button class="btn btn--ghost btn--sm" id="nav-logout-btn">Sair</button>`
            : ""
        }
      </div>
    </nav>
  `;

  if (session) {
    root
      .querySelector<HTMLButtonElement>("#nav-logout-btn")
      ?.addEventListener("click", logout);
  }
}
