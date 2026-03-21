import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "@missu/db";
import { getEnv } from "@missu/config";
import { signAccessToken, signRefreshToken, hashToken, verifyRefreshToken } from "@missu/auth";
import { setCache, userProfileCacheKey } from "@missu/cache";
import { logger } from "@missu/logger";
import { createDomainEvent, publishDomainEvent } from "@missu/queue";
import { AuthenticationError, ConflictError, NotFoundError, generateUniquePublicId } from "@missu/utils";
import { authRepository } from "../repositories/auth-repository";
import { eventRepository } from "../repositories/event-repository";
import { userRepository } from "../repositories/user-repository";
import type { SessionActor } from "@missu/types";
import type { RequestContext } from "../lib/request";
import type { GoogleLoginInput, LoginInput, SignupInput } from "../validators/auth";

function mapRole(user: { role: string; platformRole?: string | null; authRole?: string | null }): SessionActor["role"] {
  if (user.platformRole === "ADMIN" || user.authRole === "admin") return "ADMIN";
  if (user.role === "ADMIN") return "ADMIN";
  if (user.role === "HOST" || user.role === "MODEL") return "HOST";
  return "USER";
}

async function buildActor(userId: string): Promise<SessionActor> {
  const profile = await userRepository.getProfileById(userId);

  if (!profile.user) {
    throw new NotFoundError("User not found");
  }

  return {
    userId: profile.user.id,
    publicId: profile.user.publicId ?? profile.user.publicUserId ?? null,
    email: profile.user.email,
    role: mapRole(profile.user),
    sessionId: "",
    agencyId: profile.host?.agencyId ?? null,
  };
}

async function createSession(actor: Omit<SessionActor, "sessionId">, context: RequestContext, dbClient?: any) {
  const sessionId = randomUUID();
  const refreshToken = await signRefreshToken({ userId: actor.userId, sessionId, deviceId: context.deviceId });
  let session = null;

  try {
    session = await authRepository.createSession({
      id: sessionId,
      userId: actor.userId,
      deviceFingerprintHash: hashToken(context.deviceId),
      refreshTokenHash: hashToken(refreshToken),
      sessionStatus: "ACTIVE",
      ipHash: hashToken(context.ipAddress),
      userAgentHash: hashToken(context.userAgent),
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + getEnv().REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    }, dbClient);
  } catch (error) {
    logger.warn("portal_auth_session_persist_failed", {
      userId: actor.userId,
      sessionId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  const fullActor: SessionActor = { ...actor, sessionId };
  const accessToken = await signAccessToken(fullActor, context.deviceId);

  return {
    session: session ?? { id: sessionId },
    accessToken,
    refreshToken,
  };
}

async function cacheUserProfile(userId: string) {
  const profile = await userRepository.getProfileById(userId);

  if (!profile.user) {
    return null;
  }

  const cached = {
    id: profile.user.id,
    publicId: profile.user.publicId ?? profile.user.publicUserId ?? null,
    email: profile.user.email,
    displayName: profile.user.displayName,
    username: profile.user.username,
    role: mapRole(profile.user),
    phone: profile.user.phone,
    authProvider: profile.user.authProvider,
    agencyId: profile.host?.agencyId ?? null,
    createdAt: profile.user.createdAt.toISOString(),
  };

  await setCache(userProfileCacheKey(userId), cached, 300);
  return cached;
}

async function verifyGoogleIdToken(idToken: string) {
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, { cache: "no-store" });

  if (!response.ok) {
    throw new AuthenticationError("Invalid Google token");
  }

  const payload = (await response.json()) as {
    aud?: string;
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
  };

  const configuredClientIds = [getEnv().GOOGLE_CLIENT_ID, ...getEnv().GOOGLE_CLIENT_IDS.split(",")]
    .map((value) => value.trim())
    .filter(Boolean);

  if (configuredClientIds.length > 0 && (!payload.aud || !configuredClientIds.includes(payload.aud))) {
    throw new AuthenticationError("Google audience mismatch");
  }

  if (!payload.email) {
    throw new AuthenticationError("Google account email unavailable");
  }

  return payload;
}

export const authService = {
  async signup(input: SignupInput, context: RequestContext) {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("Email already exists");
    }

    // Generate username if not provided
    let username = input.username;
    if (!username) {
      const base = input.email.split("@")[0]!.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "missuuser";
      username = base;
      let suffix = 1;
      while (await userRepository.existsByUsername(username)) {
        username = `${base}${suffix}`;
        suffix += 1;
      }
    } else if (await userRepository.existsByUsername(username)) {
      throw new ConflictError("Username already exists");
    }

    const publicId = await generateUniquePublicId({
      prefix: "U",
      digits: 9,
      exists: (candidate) => userRepository.existsByPublicId(candidate),
    });
    const referralCode = await generateUniquePublicId({
      prefix: "REF",
      digits: 8,
      exists: (candidate) => userRepository.existsByReferralCode(candidate),
    });
    const passwordHash = await bcrypt.hash(input.password, 12);
    const userCreatedEvent = createDomainEvent({
      name: "USER_CREATED",
      aggregateType: "USER",
      aggregateId: publicId,
      payload: { publicId, email: input.email },
    });

    const { user, sessionArtifacts } = await db.transaction(async (tx) => {
      const createdUser = await userRepository.create({
        email: input.email,
        passwordHash,
        displayName: input.displayName,
        username,
        phone: input.phone ?? null,
        country: input.country ?? "ZZ",
        preferredLocale: input.preferredLocale ?? "en",
        preferredTimezone: input.preferredTimezone ?? "UTC",
        role: "USER",
        platformRole: "USER",
        authProvider: "EMAIL",
        status: "ACTIVE",
        publicId,
        publicUserId: publicId,
        referralCode,
        lastActiveAt: new Date(),
      }, tx);

      if (!createdUser) {
        throw new AuthenticationError("Unable to create user");
      }

      const actor: Omit<SessionActor, "sessionId"> = {
        userId: createdUser.id,
        publicId: createdUser.publicId ?? createdUser.publicUserId ?? null,
        email: createdUser.email,
        role: "USER",
        agencyId: null,
      };
      const createdSession = await createSession(actor, context, tx);
      await authRepository.createSecurityEvent({
        eventType: "LOGIN_SUCCESS",
        actorUserId: createdUser.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        deviceFingerprintHash: hashToken(context.deviceId),
        severity: "INFO",
        detailsJson: { provider: "EMAIL", requestId: context.requestId },
      }, tx);
      await eventRepository.create({ ...userCreatedEvent, aggregateId: createdUser.id }, tx);

      return { user: createdUser, sessionArtifacts: createdSession };
    });

    await cacheUserProfile(user.id);
    await publishDomainEvent({ ...userCreatedEvent, aggregateId: user.id, payload: { publicId, email: user.email } });

    return {
      user: await cacheUserProfile(user.id),
      platformRole: "USER" as const,
      rawAuthProvider: input.phone ? "PHONE_OTP" : "EMAIL",
      auth: {
        accessToken: sessionArtifacts.accessToken,
        refreshToken: sessionArtifacts.refreshToken,
        sessionId: sessionArtifacts.session.id,
        deviceId: context.deviceId,
      },
    };
  },

  async login(input: LoginInput, context: RequestContext) {
    const user = await userRepository.findByEmail(input.email);

    if (!user?.passwordHash) {
      throw new AuthenticationError("Invalid credentials");
    }

    const matches = await bcrypt.compare(input.password, user.passwordHash);

    if (!matches) {
      await authRepository.createSecurityEvent({
        eventType: "LOGIN_FAILURE",
        actorUserId: user.id,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        severity: "WARNING",
        detailsJson: { requestId: context.requestId },
      });
      throw new AuthenticationError("Invalid credentials");
    }

    const actor = await buildActor(user.id);
    const sessionArtifacts = await createSession(actor, context);
    await authRepository.createSecurityEvent({
      eventType: actor.role === "ADMIN" ? "ADMIN_LOGIN" : "LOGIN_SUCCESS",
      actorUserId: user.id,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      deviceFingerprintHash: hashToken(context.deviceId),
      severity: "INFO",
      detailsJson: { requestId: context.requestId },
    });
    await cacheUserProfile(user.id);

    return {
      user: await cacheUserProfile(user.id),
      platformRole: user.platformRole,
      rawAuthProvider: user.authProvider,
      auth: {
        accessToken: sessionArtifacts.accessToken,
        refreshToken: sessionArtifacts.refreshToken,
        sessionId: sessionArtifacts.session.id,
        deviceId: context.deviceId,
      },
    };
  },

  async google(input: GoogleLoginInput, context: RequestContext) {
    const googleProfile = await verifyGoogleIdToken(input.idToken);
    let user = await userRepository.findByEmail(googleProfile.email!);

    if (!user) {
      const baseUsername = googleProfile.email!.split("@")[0]!.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 20) || "missuuser";
      let username = baseUsername;
      let suffix = 1;

      while (await userRepository.existsByUsername(username)) {
        username = `${baseUsername}${suffix}`;
        suffix += 1;
      }

      const publicId = await generateUniquePublicId({
        prefix: "U",
        digits: 9,
        exists: (candidate) => userRepository.existsByPublicId(candidate),
      });
      const referralCode = await generateUniquePublicId({
        prefix: "REF",
        digits: 8,
        exists: (candidate) => userRepository.existsByReferralCode(candidate),
      });
      const createdEvent = createDomainEvent({
        name: "USER_CREATED",
        aggregateType: "USER",
        aggregateId: publicId,
        payload: { publicId, email: googleProfile.email!, provider: "GOOGLE" },
      });

      user = await db.transaction(async (tx) => {
        const createdUser = await userRepository.create({
          email: googleProfile.email!,
          displayName: googleProfile.name ?? googleProfile.email!.split("@")[0]!,
          username,
          country: "US",
          preferredLocale: "en",
          preferredTimezone: "UTC",
          role: "USER",
          platformRole: "USER",
          authProvider: "GOOGLE",
          status: "ACTIVE",
          avatarUrl: googleProfile.picture ?? null,
          authMetadataJson: { googleSub: googleProfile.sub },
          emailVerified: true,
          publicId,
          publicUserId: publicId,
          referralCode,
          lastActiveAt: new Date(),
        }, tx);

        if (!createdUser) {
          throw new AuthenticationError("Unable to create Google user");
        }

        await eventRepository.create({ ...createdEvent, aggregateId: createdUser.id }, tx);
        return createdUser;
      });

      await publishDomainEvent({ ...createdEvent, aggregateId: user.id, payload: { publicId, email: user.email, provider: "GOOGLE" } });
    }

    const actor = await buildActor(user.id);
    const sessionArtifacts = await createSession(actor, context);
    await cacheUserProfile(user.id);

    return {
      user: await cacheUserProfile(user.id),
      platformRole: user.platformRole,
      rawAuthProvider: user.authProvider,
      auth: {
        accessToken: sessionArtifacts.accessToken,
        refreshToken: sessionArtifacts.refreshToken,
        sessionId: sessionArtifacts.session.id,
        deviceId: context.deviceId,
      },
    };
  },

  async refresh(refreshToken: string, context: RequestContext) {
    const claims = await verifyRefreshToken(refreshToken);
    const session = await authRepository.getSessionById(claims.sid);

    if (!session || session.sessionStatus !== "ACTIVE") {
      throw new AuthenticationError("Session not active");
    }

    if (session.refreshTokenHash !== hashToken(refreshToken)) {
      throw new AuthenticationError("Refresh token rotation mismatch");
    }

    const actor = await buildActor(claims.sub);
    const nextRefreshToken = await signRefreshToken({ userId: claims.sub, sessionId: claims.sid, deviceId: claims.deviceId });
    await authRepository.rotateRefreshToken(claims.sid, hashToken(nextRefreshToken), new Date(Date.now() + getEnv().REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000));
    const accessToken = await signAccessToken({ ...actor, sessionId: claims.sid }, claims.deviceId);

    return {
      user: await cacheUserProfile(claims.sub),
      auth: {
        accessToken,
        refreshToken: nextRefreshToken,
        sessionId: claims.sid,
        deviceId: claims.deviceId,
      },
    };
  },

  async logout(sessionId: string | null) {
    if (sessionId) {
      await authRepository.revokeSession(sessionId);
    }

    logger.info("session_logged_out", { sessionId });
    return { loggedOut: true };
  },
};