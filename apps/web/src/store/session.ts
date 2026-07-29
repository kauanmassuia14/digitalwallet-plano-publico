/** Minimal session state stored in localStorage (Factory portal only). */

export interface Session {
  userId: string;
  tenantId: string;
  tenantName: string;
  email: string;
}

const KEY = "dw_session";

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

export function isAuthenticated(): boolean {
  return getSession() !== null;
}
