import { login } from "../api/auth.js";
import { showToast } from "../components/Toast.js";

export function renderLoginPage(root: HTMLElement): void {
  root.innerHTML = `
    <div class="login-page">
      <div class="login-page__visual">
        <div class="login-page__visual-logo">
          <span class="login-page__visual-logo-icon">DW</span>
          DigitalWallet
        </div>
        <div class="login-page__visual-tagline">
          <h2>Portal da Fábrica</h2>
          <p>
            Acompanhe seus lotes, embalagens em campo e
            recompensas geradas — tudo em tempo real.
          </p>
        </div>
      </div>

      <div class="login-page__form-area">
        <div class="login-card">
          <h1 class="login-card__title">Entrar</h1>
          <p class="login-card__subtitle">Acesse o painel da sua fábrica</p>

          <form id="login-form" novalidate>
            <div class="form-group">
              <label class="form-label" for="input-email">E-mail</label>
              <input
                class="form-input"
                type="email"
                id="input-email"
                name="email"
                placeholder="fabrica@empresa.com"
                autocomplete="email"
                required
              />
              <span class="form-error" id="email-error"></span>
            </div>

            <div class="form-group">
              <label class="form-label" for="input-tenant">ID do Tenant</label>
              <input
                class="form-input"
                type="text"
                id="input-tenant"
                name="tenantId"
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                value="11111111-1111-4111-8111-111111111111"
                autocomplete="off"
                required
              />
              <span class="form-error" id="tenant-error"></span>
            </div>

            <button class="btn btn--primary" type="submit" id="login-btn" style="width:100%;padding-block:0.75rem;margin-top:0.5rem;font-size:1rem;">
              Entrar no painel
            </button>
          </form>

          <p style="margin-top:1.5rem;font-size:0.8125rem;color:var(--color-text-muted);text-align:center;">
            Ambiente de desenvolvimento — autenticação real em W04
          </p>
        </div>
      </div>
    </div>
  `;

  const form = root.querySelector<HTMLFormElement>("#login-form")!;
  const emailInput = root.querySelector<HTMLInputElement>("#input-email")!;
  const tenantInput = root.querySelector<HTMLInputElement>("#input-tenant")!;
  const emailError = root.querySelector<HTMLElement>("#email-error")!;
  const tenantError = root.querySelector<HTMLElement>("#tenant-error")!;
  const btn = root.querySelector<HTMLButtonElement>("#login-btn")!;

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    emailError.textContent = "";
    tenantError.textContent = "";

    let valid = true;

    if (!emailInput.value || !emailInput.value.includes("@")) {
      emailError.textContent = "Informe um e-mail válido.";
      valid = false;
    }

    const tenantId = tenantInput.value.trim();
    const uuidRx =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tenantId || !uuidRx.test(tenantId)) {
      tenantError.textContent = "Informe um UUID de tenant válido.";
      valid = false;
    }

    if (!valid) return;

    btn.disabled = true;
    btn.textContent = "Entrando…";

    void (async (): Promise<void> => {
      try {
        await login({ email: emailInput.value, tenantId });
        window.location.hash = "#/dashboard";
      } catch {
        showToast(
          "Não foi possível autenticar. Verifique as credenciais.",
          "error",
        );
        btn.disabled = false;
        btn.textContent = "Entrar no painel";
      }
    })();
  });
}
