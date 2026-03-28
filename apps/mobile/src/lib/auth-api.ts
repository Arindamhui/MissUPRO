import { Platform } from "react-native";

export type MobileAuthSession = {
  token: string;
  sessionId: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    platformRole: "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY" | "AGENCY" | "ADMIN" | null;
    authProvider: "EMAIL" | "GOOGLE" | "FACEBOOK" | "PHONE_OTP" | "WHATSAPP_OTP" | "CUSTOM_OTP" | "UNKNOWN";
  };
};

export type MobileSessionState = {
  status: "user" | "model" | "agency_model" | "needs_onboarding" | "access_denied" | "agency_pending_approval";
  reason?: "invalid_agency" | "agency_not_approved" | "agency_not_found" | "already_in_agency";
  panel: "user" | "model" | "agency_model";
  role: "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY" | "AGENCY" | "ADMIN" | null;
  userId: string;
  email: string;
  sessionId: string | null;
  agencyId?: string;
  agencyName?: string;
  agencyCode?: string;
};

function resolveApiBaseUrl() {
  const fallback = Platform.OS === "android"
    ? "http://10.0.2.2:4000"
    : "http://localhost:4000";

  const configured = process.env.EXPO_PUBLIC_API_URL ?? fallback;
  const base = configured.endsWith("/trpc") ? configured.slice(0, -5) : configured;

  if (Platform.OS !== "android") {
    return base;
  }

  return base
    .replace("://localhost", "://10.0.2.2")
    .replace("://127.0.0.1", "://10.0.2.2");
}

async function parseError(response: Response) {
  const text = await response.text();
  return text || `${response.status} ${response.statusText}`;
}

async function sendJson<T>(path: string, init: RequestInit) {
  const url = `${resolveApiBaseUrl()}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Authentication request timed out. Check that the API server is running and reachable from the mobile app.");
    }

    throw new Error(`Authentication request failed. Check that the API server is running at ${resolveApiBaseUrl()}.`);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response.json() as Promise<T>;
}

export function signUpWithEmail(input: { displayName: string; email: string; password: string; referralCode?: string }) {
  return sendJson<MobileAuthSession>("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function signInWithEmail(input: { email: string; password: string }) {
  return sendJson<MobileAuthSession>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function signInWithGoogle(input: { idToken: string; displayName?: string; referralCode?: string }) {
  return sendJson<MobileAuthSession>("/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function loginAsAgencyModel(token: string, agencyId: string) {
  return sendJson<MobileSessionState>("/auth/agency-model-login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ agencyId }),
  });
}

export function logoutRequest(token: string) {
  return sendJson<{ success: boolean }>("/auth/logout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

export function refreshAccessToken(refreshToken: string) {
  return sendJson<MobileAuthSession>("/auth/refresh", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
}