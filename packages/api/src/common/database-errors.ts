export function isDatabaseConnectionRefusedError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    code?: string;
    cause?: unknown;
    errors?: unknown[];
    sourceError?: unknown;
  };

  if (candidate.code === "ECONNREFUSED") {
    return true;
  }

  if (Array.isArray(candidate.errors) && candidate.errors.some(isDatabaseConnectionRefusedError)) {
    return true;
  }

  if (candidate.cause && isDatabaseConnectionRefusedError(candidate.cause)) {
    return true;
  }

  if (candidate.sourceError && isDatabaseConnectionRefusedError(candidate.sourceError)) {
    return true;
  }

  return false;
}