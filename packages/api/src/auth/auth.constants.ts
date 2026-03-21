function normalizeEmails(values: string[]) {
  return values.map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export const ADMIN_EMAILS = ["admin@missupro.com", "huiarindam6@gmail.com"] as const;

export function getAdminEmails() {
  const configured = normalizeEmails((process.env.ADMIN_EMAILS ?? "").split(","));
  const legacySingle = normalizeEmails([process.env.ADMIN_EMAIL ?? ""]);

  return Array.from(new Set(normalizeEmails([...ADMIN_EMAILS, ...configured, ...legacySingle])));
}

export function isAllowedAdminEmail(email: string) {
  return getAdminEmails().includes(email.trim().toLowerCase());
}