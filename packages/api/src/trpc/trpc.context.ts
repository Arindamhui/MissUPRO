export interface Context {
  userId: string | null;
  authRole: "admin" | "agency" | null;
  platformRole: "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY" | "AGENCY" | "ADMIN" | null;
  isAdmin: boolean;
  ip: string;
  userAgent: string;
  sessionId: string | null;
}

export function createContext(opts: {
  userId: string | null;
  authRole: "admin" | "agency" | null;
  platformRole: "USER" | "MODEL_INDEPENDENT" | "MODEL_AGENCY" | "AGENCY" | "ADMIN" | null;
  isAdmin: boolean;
  ip: string;
  userAgent: string;
  sessionId: string | null;
}): Context {
  return opts;
}
