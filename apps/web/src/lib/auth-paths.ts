export function buildAuthErrorHref(reason: string, role?: "admin" | "agency") {
  const params = new URLSearchParams({ reason });
  if (role) {
    params.set("role", role);
  }
  return `/auth/error?${params.toString()}`;
}