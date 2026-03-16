export function getClerkErrorMessage(error: unknown, fallback: string) {
  const clerkErrors = (error as { errors?: Array<{ longMessage?: string; message?: string }> })?.errors;
  const firstError = clerkErrors?.[0];

  return firstError?.longMessage || firstError?.message || fallback;
}