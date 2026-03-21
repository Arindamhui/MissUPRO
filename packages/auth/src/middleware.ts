import type { AccessTokenClaims } from "@missu/types";
import { AuthenticationError, AuthorizationError } from "@missu/utils";
import { getAuthCookieNames, validateCsrfToken, verifyAccessToken } from "./jwt.js";

function parseCookies(headerValue: string | null) {
  const cookies = new Map<string, string>();

  if (!headerValue) {
    return cookies;
  }

  for (const part of headerValue.split(";")) {
    const [rawKey, ...rawValue] = part.trim().split("=");

    if (!rawKey || rawValue.length === 0) {
      continue;
    }

    cookies.set(rawKey, decodeURIComponent(rawValue.join("=")));
  }

  return cookies;
}

export function getRequestCookies(request: Request) {
  return parseCookies(request.headers.get("cookie"));
}

export async function authenticateRequest(request: Request): Promise<AccessTokenClaims> {
  const cookies = getRequestCookies(request);
  const cookieNames = getAuthCookieNames();
  const authorization = request.headers.get("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const token = bearerToken ?? cookies.get(cookieNames.access);

  if (!token) {
    throw new AuthenticationError("Missing access token");
  }

  return verifyAccessToken(token);
}

export async function requireRole(request: Request, roles: Array<AccessTokenClaims["role"]>) {
  const actor = await authenticateRequest(request);

  if (!roles.includes(actor.role)) {
    throw new AuthorizationError("Insufficient role");
  }

  return actor;
}

export async function assertCsrf(request: Request, claims: AccessTokenClaims) {
  const cookies = getRequestCookies(request);
  const cookieNames = getAuthCookieNames();
  const cookieToken = cookies.get(cookieNames.csrf);
  const headerToken = request.headers.get("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new AuthorizationError("CSRF validation failed");
  }

  if (!validateCsrfToken(claims.sid, claims.deviceId, cookieToken)) {
    throw new AuthorizationError("CSRF validation failed");
  }
}