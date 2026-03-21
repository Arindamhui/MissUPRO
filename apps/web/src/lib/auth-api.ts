import type { WebAuthSession } from "@/lib/web-auth";

export type SessionIntent = "login" | "signup";

export type PortalSession = {
  status: "admin" | "agency" | "needs_agency_profile" | "access_denied" | "agency_pending_approval";
  reason?: "admin_signup_forbidden" | "unauthorized_role" | "agency_record_missing" | "service_unavailable" | "agency_pending_approval";
  role: "admin" | "agency" | null;
  platformRole: "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY" | "AGENCY" | "ADMIN" | null;
  userId: string;
  email: string;
  sessionId: string | null;
  agencyId?: string;
  agencyCode?: string;
};

export type CompleteAgencySignupInput = {
  agencyName: string;
  contactName: string;
  contactEmail: string;
  country: string;
};

export type EmailLoginInput = {
  email: string;
  password: string;
};

export type EmailSignupInput = EmailLoginInput & {
  displayName: string;
  referralCode?: string;
};

export type GoogleAuthInput = {
  idToken: string;
  displayName?: string;
  referralCode?: string;
};

function getApiBaseUrl() {
  if (typeof window !== "undefined") {
    return "/api";
  }
  const configured = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/trpc";
  return configured.endsWith("/trpc") ? configured.slice(0, -5) : configured;
}

async function parseJsonError(response: Response) {
  const text = await response.text();
  if (!text) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const parsed = JSON.parse(text) as { message?: string | string[]; error?: string | { message?: string; code?: string } };
    if (Array.isArray(parsed.message)) {
      return parsed.message.join(", ");
    }
    if (typeof parsed.message === "string" && parsed.message.trim().length > 0) {
      return parsed.message;
    }
    if (typeof parsed.error === "object" && parsed.error !== null && typeof parsed.error.message === "string") {
      return parsed.error.message;
    }
    if (typeof parsed.error === "string" && parsed.error.trim().length > 0) {
      return parsed.error;
    }
  } catch {
    // Fall through to raw text.
  }

  return text;
}

export async function signUpWithEmail(input: EmailSignupInput): Promise<WebAuthSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseJsonError(response));
  }

  return response.json() as Promise<WebAuthSession>;
}

export async function signInWithEmail(input: EmailLoginInput): Promise<WebAuthSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseJsonError(response));
  }

  return response.json() as Promise<WebAuthSession>;
}

export async function signInWithGoogle(input: GoogleAuthInput): Promise<WebAuthSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseJsonError(response));
  }

  return response.json() as Promise<WebAuthSession>;
}

export async function logoutRequest(token: string) {
  const response = await fetch(`${getApiBaseUrl()}/auth/logout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await parseJsonError(response));
  }

  return response.json() as Promise<{ success: boolean }>;
}

export async function fetchPortalSession(token: string, intent: SessionIntent): Promise<PortalSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/session?intent=${intent}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await parseJsonError(response));
  }

  return response.json() as Promise<PortalSession>;
}

export async function completeAgencySignupRequest(token: string, input: CompleteAgencySignupInput): Promise<PortalSession> {
  const response = await fetch(`${getApiBaseUrl()}/auth/agency-signup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await parseJsonError(response));
  }

  return response.json() as Promise<PortalSession>;
}