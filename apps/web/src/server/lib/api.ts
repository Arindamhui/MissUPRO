import { NextResponse } from "next/server";
import { getEnv } from "@missu/config";
import { logger } from "@missu/logger";
import { errorResponse, successResponse } from "@missu/utils";
import { createCsrfToken, getAuthCookieNames } from "@missu/auth";
import type { RequestContext } from "./request";

export interface AuthCookiePayload {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  deviceId: string;
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}

export function jsonSuccess<T>(data: T, requestContext: RequestContext, init?: ResponseInit) {
  return NextResponse.json(successResponse(data, requestContext.requestId), init);
}

export function jsonError(error: unknown, requestContext: RequestContext) {
  const failure = errorResponse(error, requestContext.requestId);
  logger.error("api_request_failed", {
    requestId: requestContext.requestId,
    statusCode: failure.statusCode,
    errorCode: failure.body.error.code,
    message: failure.body.error.message,
  });
  return NextResponse.json(failure.body, { status: failure.statusCode });
}

export function applyAuthCookies(response: NextResponse, payload: AuthCookiePayload) {
  const cookieNames = getAuthCookieNames();
  const env = getEnv();
  const secure = env.NODE_ENV !== "development";
  const baseCookie = {
    secure,
    sameSite: "strict" as const,
    path: "/",
    domain: env.COOKIE_DOMAIN || undefined,
  };

  response.cookies.set(cookieNames.access, payload.accessToken, {
    ...baseCookie,
    httpOnly: true,
    maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60,
  });
  response.cookies.set(cookieNames.refresh, payload.refreshToken, {
    ...baseCookie,
    httpOnly: true,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
  response.cookies.set(cookieNames.csrf, createCsrfToken(payload.sessionId, payload.deviceId), {
    ...baseCookie,
    httpOnly: false,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
  response.cookies.set(cookieNames.device, payload.deviceId, {
    ...baseCookie,
    httpOnly: false,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
  });
}

export function clearAuthCookies(response: NextResponse) {
  const cookieNames = getAuthCookieNames();
  for (const cookieName of Object.values(cookieNames)) {
    response.cookies.set(cookieName, "", { path: "/", maxAge: 0 });
  }
}