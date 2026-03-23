import type { AppRole } from "@missu/types";

export type AgencyStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
export type PlatformAccessRole = "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY" | "AGENCY" | "ADMIN";

type GoogleIdentityResolutionInput = {
  googleUserId: string | null;
  emailUserId: string | null;
  emailUserGoogleSub: string | null;
  googleSub: string | null;
};

export function normalizeAuthEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getGoogleSubject(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  const value = (metadata as Record<string, unknown>).googleSub;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function mergeGoogleAuthMetadata(metadata: unknown, googleSub: string | null) {
  const next = metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? { ...(metadata as Record<string, unknown>) }
    : {};

  if (googleSub) {
    next.googleSub = googleSub;
  }

  return next;
}

export function resolveGoogleIdentityResolution(input: GoogleIdentityResolutionInput) {
  if (input.googleUserId && input.emailUserId && input.googleUserId !== input.emailUserId) {
    return "conflict" as const;
  }

  if (input.googleUserId) {
    return "by-google-sub" as const;
  }

  if (input.emailUserId) {
    if (input.emailUserGoogleSub && input.googleSub && input.emailUserGoogleSub !== input.googleSub) {
      return "subject-mismatch" as const;
    }

    return "by-email" as const;
  }

  return "create" as const;
}

export function normalizeAgencyStatus(status: string | null | undefined): AgencyStatus {
  if (status === "PENDING" || status === "APPROVED" || status === "REJECTED") {
    return status;
  }

  return "NONE";
}

export function resolveSessionAccessState(input: {
  role: string;
  platformRole?: string | null;
  authRole?: string | null;
  agencyId?: string | null;
  agencyStatus?: string | null;
}) {
  const agencyStatus = normalizeAgencyStatus(input.agencyStatus);
  const isAdmin = input.platformRole === "ADMIN" || input.authRole === "admin" || input.role === "ADMIN";
  const isAgency = Boolean(input.agencyId) || input.platformRole === "AGENCY" || input.authRole === "agency";
  const isHost = input.role === "HOST" || input.role === "MODEL" || input.platformRole === "MODEL_AGENCY" || input.platformRole === "MODEL_INDEPENDENT";

  const role: AppRole = isAdmin
    ? "ADMIN"
    : isAgency
      ? "AGENCY"
      : isHost
        ? "HOST"
        : "USER";

  const platformRole: PlatformAccessRole = isAdmin
    ? "ADMIN"
    : isAgency
      ? "AGENCY"
      : input.platformRole === "MODEL_AGENCY" || input.platformRole === "MODEL_INDEPENDENT"
        ? input.platformRole
        : "USER";

  return {
    role,
    platformRole,
    agencyStatus,
  };
}