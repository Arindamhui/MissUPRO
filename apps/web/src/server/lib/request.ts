import { randomUUID } from "node:crypto";
import { getAuthCookieNames } from "@missu/auth";

export interface RequestContext {
  requestId: string;
  ipAddress: string;
  userAgent: string;
  deviceId: string;
  idempotencyKey: string | null;
}

function parseCookie(headerValue: string | null, key: string) {
  if (!headerValue) {
    return null;
  }

  for (const token of headerValue.split(";")) {
    const [cookieKey, ...cookieValue] = token.trim().split("=");
    if (cookieKey === key) {
      return decodeURIComponent(cookieValue.join("="));
    }
  }

  return null;
}

export function getRequestContext(request: Request): RequestContext {
  const cookieNames = getAuthCookieNames();

  return {
    requestId: request.headers.get("x-request-id") ?? randomUUID(),
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "127.0.0.1",
    userAgent: request.headers.get("user-agent") ?? "unknown",
    deviceId:
      request.headers.get("x-device-id") ??
      parseCookie(request.headers.get("cookie"), cookieNames.device) ??
      randomUUID(),
    idempotencyKey: request.headers.get("idempotency-key"),
  };
}