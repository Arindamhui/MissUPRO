export function getAuthErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  const message = (error as { message?: string })?.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  return fallback;
}