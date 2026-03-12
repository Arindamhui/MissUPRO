export interface Context {
  userId: string | null;
  isAdmin: boolean;
  ip: string;
  userAgent: string;
  sessionId: string | null;
}

export function createContext(opts: {
  userId: string | null;
  isAdmin: boolean;
  ip: string;
  userAgent: string;
  sessionId: string | null;
}): Context {
  return opts;
}
