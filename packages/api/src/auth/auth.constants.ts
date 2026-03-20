function normalizeEmails(values: string[]) {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export const ADMIN_EMAILS = ["admin@yourapp.com", "owner@yourapp.com"] as const;

export function getAdminEmails() {
  const configured = normalizeEmails((process.env.ADMIN_EMAILS ?? "").split(","));
  const legacySingle = normalizeEmails([process.env.ADMIN_EMAIL ?? ""]);
  const resolved = configured.length > 0 ? configured : legacySingle;

  if (resolved.length > 0) {
    return Array.from(new Set(resolved));
  }

  return normalizeEmails([...ADMIN_EMAILS]);
}

export function isAllowedAdminEmail(email: string) {
  return getAdminEmails().includes(email.trim().toLowerCase());
}