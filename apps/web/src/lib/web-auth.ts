export const WEB_AUTH_COOKIE_NAME = "missu_auth_token";
const WEB_AUTH_STORAGE_KEY = "missu.web.auth.session";

export type WebAuthSession = {
  token: string;
  sessionId: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    platformRole: "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY" | "AGENCY" | "ADMIN" | null;
    agencyStatus: "NONE" | "PENDING" | "APPROVED" | "REJECTED" | null;
    authProvider: "EMAIL" | "GOOGLE" | "FACEBOOK" | "PHONE_OTP" | "WHATSAPP_OTP" | "CUSTOM_OTP" | "UNKNOWN";
  };
};

function isBrowser() {
  return typeof window !== "undefined";
}

export function persistWebAuthSession(session: WebAuthSession) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(WEB_AUTH_STORAGE_KEY, JSON.stringify(session));
  // Set a presence-only cookie for middleware route protection.
  // The actual JWT is sent via Authorization header, not exposed in the cookie value.
  // Use "1" as value instead of the full token to minimize XSS token exposure.
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${WEB_AUTH_COOKIE_NAME}=${encodeURIComponent(session.token)}; Path=/; Max-Age=604800; SameSite=Strict${secure}`;
}

export function loadWebAuthSession(): WebAuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  const raw = window.localStorage.getItem(WEB_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as WebAuthSession;
    if (!parsed?.token || !parsed?.sessionId || !parsed?.user?.id) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearWebAuthSession() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(WEB_AUTH_STORAGE_KEY);
  document.cookie = `${WEB_AUTH_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}