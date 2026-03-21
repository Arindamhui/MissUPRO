import { createHmac } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getEnv } from "@missu/config";
import type { AccessTokenClaims, RefreshTokenClaims, SessionActor } from "@missu/types";
import { AuthenticationError } from "@missu/utils";

const ACCESS_COOKIE_NAME = "missu_access_token";
const REFRESH_COOKIE_NAME = "missu_refresh_token";
const CSRF_COOKIE_NAME = "missu_csrf_token";
const DEVICE_COOKIE_NAME = "missu_device_id";

const textEncoder = new TextEncoder();

function accessSecret() {
  return textEncoder.encode(getEnv().JWT_SECRET);
}

function refreshSecret() {
  return textEncoder.encode(getEnv().JWT_REFRESH_SECRET);
}

export function getAuthCookieNames() {
  return {
    access: ACCESS_COOKIE_NAME,
    refresh: REFRESH_COOKIE_NAME,
    csrf: CSRF_COOKIE_NAME,
    device: DEVICE_COOKIE_NAME,
  };
}

export async function signAccessToken(actor: SessionActor, deviceId: string) {
  const env = getEnv();

  return new SignJWT({
    role: actor.role,
    email: actor.email,
    publicId: actor.publicId ?? undefined,
    agencyId: actor.agencyId ?? undefined,
    sid: actor.sessionId,
    deviceId,
    type: "access",
  } satisfies Omit<AccessTokenClaims, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setSubject(actor.userId)
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MINUTES}m`)
    .sign(accessSecret());
}

export async function signRefreshToken(params: { userId: string; sessionId: string; deviceId: string }) {
  const env = getEnv();

  return new SignJWT({
    sid: params.sessionId,
    deviceId: params.deviceId,
    type: "refresh",
  } satisfies Omit<RefreshTokenClaims, "sub">)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setSubject(params.userId)
    .setExpirationTime(`${env.REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(refreshSecret());
}

async function verifyJwt<TPayload extends JWTPayload>(token: string, secret: Uint8Array) {
  const env = getEnv();
  const result = await jwtVerify<TPayload>(token, secret, {
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  });

  return result.payload;
}

export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  try {
    const payload = await verifyJwt<JWTPayload>(token, accessSecret());

    if (payload.type !== "access" || !payload.sub || !payload.sid || !payload.role || !payload.email || !payload.deviceId) {
      throw new AuthenticationError("Invalid access token");
    }

    return payload as AccessTokenClaims;
  } catch (error) {
    throw new AuthenticationError("Invalid or expired access token", error);
  }
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenClaims> {
  try {
    const payload = await verifyJwt<JWTPayload>(token, refreshSecret());

    if (payload.type !== "refresh" || !payload.sub || !payload.sid || !payload.deviceId) {
      throw new AuthenticationError("Invalid refresh token");
    }

    return payload as RefreshTokenClaims;
  } catch (error) {
    throw new AuthenticationError("Invalid or expired refresh token", error);
  }
}

export function createCsrfToken(sessionId: string, deviceId: string) {
  const digest = createHmac("sha256", getEnv().JWT_SECRET)
    .update(`${sessionId}:${deviceId}`)
    .digest("hex");

  return `${sessionId}.${digest}`;
}

export function validateCsrfToken(sessionId: string, deviceId: string, token: string | null | undefined) {
  if (!token) {
    return false;
  }

  return createCsrfToken(sessionId, deviceId) === token;
}

export function hashToken(value: string) {
  return createHmac("sha256", getEnv().JWT_REFRESH_SECRET).update(value).digest("hex");
}