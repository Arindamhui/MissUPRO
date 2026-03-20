export type SessionIntent = "login" | "signup";

export type PortalSession = {
  status: "admin" | "agency" | "needs_agency_profile" | "access_denied" | "agency_pending_approval";
  reason?: "admin_signup_forbidden" | "unauthorized_role" | "agency_record_missing" | "service_unavailable" | "agency_pending_approval";
  role: "admin" | "agency" | null;
  platformRole: "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY" | "AGENCY" | "ADMIN" | null;
  userId: string;
  clerkUserId: string;
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

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/trpc";
  return configured.endsWith("/trpc") ? configured.slice(0, -5) : configured;
}

async function parseJsonError(response: Response) {
  const text = await response.text();
  return text || `${response.status} ${response.statusText}`;
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