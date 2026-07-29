import { isAuthenticated } from "./store/session.js";
import { renderLoginPage } from "./pages/LoginPage.js";
import { renderDashboardPage } from "./pages/DashboardPage.js";
import { renderLotsPage } from "./pages/LotsPage.js";
import { renderLotDetailPage } from "./pages/LotDetailPage.js";
import { renderPackagingsPage } from "./pages/PackagingsPage.js";
import { renderReconciliationPage } from "./pages/ReconciliationPage.js";
import { renderNavbar } from "./components/Navbar.js";
import { renderSidebar } from "./components/Sidebar.js";

/** Mounts the authenticated app shell (navbar + sidebar + main). */
function mountShell(app: HTMLElement): {
  navbarRoot: HTMLElement;
  sidebarRoot: HTMLElement;
  mainRoot: HTMLElement;
} {
  app.innerHTML = `
    <div class="app-shell">
      <div class="app-shell__navbar" id="navbar-root"></div>
      <div class="app-shell__sidebar" id="sidebar-root"></div>
      <main class="app-shell__main" id="main-root"></main>
    </div>
  `;

  return {
    navbarRoot: app.querySelector<HTMLElement>("#navbar-root")!,
    sidebarRoot: app.querySelector<HTMLElement>("#sidebar-root")!,
    mainRoot: app.querySelector<HTMLElement>("#main-root")!,
  };
}

export function startRouter(): void {
  const app = document.getElementById("app")!;

  async function navigate(): Promise<void> {
    const hash = window.location.hash || "#/dashboard";
    const authed = isAuthenticated();

    if (!authed && hash !== "#/login") {
      window.location.hash = "#/login";
      return;
    }

    if (!authed) {
      app.innerHTML = "";
      renderLoginPage(app);
      return;
    }

    const { navbarRoot, sidebarRoot, mainRoot } = mountShell(app);
    renderNavbar(navbarRoot);
    renderSidebar(sidebarRoot);

    // Scroll main to top on navigation
    mainRoot.scrollTop = 0;

    if (hash === "#/dashboard") {
      await renderDashboardPage(mainRoot);
    } else if (hash === "#/lots") {
      await renderLotsPage(mainRoot);
    } else if (hash.startsWith("#/lots/")) {
      const jobId = hash.replace("#/lots/", "");
      await renderLotDetailPage(mainRoot, jobId);
    } else if (hash === "#/packagings") {
      await renderPackagingsPage(mainRoot);
    } else if (hash === "#/reconciliation") {
      await renderReconciliationPage(mainRoot);
    } else {
      mainRoot.innerHTML = `
        <div style="text-align:center;padding:var(--space-16)">
          <p style="font-size:3rem">404</p>
          <p style="color:var(--color-text-muted)">Página não encontrada.</p>
          <a href="#/dashboard" class="btn btn--primary" style="margin-top:var(--space-4)">Ir ao Dashboard</a>
        </div>
      `;
    }
  }

  window.addEventListener("hashchange", () => void navigate());
  void navigate();
}
