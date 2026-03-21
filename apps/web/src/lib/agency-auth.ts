import type { CompleteAgencySignupInput } from "@/lib/auth-api";

export function buildPendingAgencySignupInput(user: {
  displayName?: string | null;
  email: string;
}): CompleteAgencySignupInput {
  const displayName = user.displayName?.trim();
  const emailName = user.email.split("@")[0]?.replace(/[._-]+/g, " ").trim();
  const contactName = displayName && displayName.length > 0
    ? displayName
    : emailName && emailName.length > 0
      ? emailName
      : "Agency Owner";
  const agencyName = /agency/i.test(contactName) ? contactName : `${contactName} Agency`;

  return {
    agencyName,
    contactName,
    contactEmail: user.email,
    country: "ZZ",
  };
}

function shouldRetryAgencyAuthError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes("invalid bearer token") || message.includes("session is no longer active");
}

export async function retryAgencyAuthRequest<T>(operation: () => Promise<T>, retries = 1, delayMs = 250): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0 || !shouldRetryAgencyAuthError(error)) {
      throw error;
    }

    await new Promise((resolve) => window.setTimeout(resolve, delayMs));
    return retryAgencyAuthRequest(operation, retries - 1, delayMs);
  }
}