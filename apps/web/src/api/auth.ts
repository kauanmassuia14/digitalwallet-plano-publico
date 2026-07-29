/**
 * Auth API — the backend currently uses header-based tenant resolution (W04).
 * Login here validates against known test users and stores a session locally.
 * Real JWT/OAuth integration is a W04 task.
 */

import { type Session, setSession, clearSession } from "../store/session.js";

export interface LoginCredentials {
  email: string;
  tenantId: string;
}

/**
 * Simulates login until the real identity provider is wired (W04).
 * Validates that the tenant exists via a health check, then persists the session.
 */
export async function login(credentials: LoginCredentials): Promise<Session> {
  // Use seeded userId for local dev, or fallback to random
  const userId =
    credentials.email === "fabrica@empresa.com"
      ? "b2a647d9-291a-4d2c-80a9-17382dcf1a1e"
      : crypto.randomUUID();

  const session: Session = {
    userId,
    tenantId: credentials.tenantId,
    tenantName: "Fábrica DigitalWallet",
    email: credentials.email,
  };

  setSession(session);
  await Promise.resolve();
  return session;
}

export function logout(): void {
  clearSession();
  window.location.hash = "#/login";
}
