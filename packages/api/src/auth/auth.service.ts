import { Injectable } from "@nestjs/common";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { getEnv } from "@missu/config";
import { db } from "@missu/db";
import { authSessions, emailVerifications, profiles, securityEvents, users } from "@missu/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";

type AuthenticatedUser = {
  userId: string;
  isAdmin: boolean;
  sessionId: string | null;
};

type VerifiedClerkToken = {
  sub?: string;
  sid?: string;
};

@Injectable()
export class AuthService {
  private readonly env = getEnv();
  private readonly clerkClient = createClerkClient({ secretKey: this.env.CLERK_SECRET_KEY });

  async createSession(userId: string, ip: string, userAgent: string) {
    const refreshToken = randomBytes(48).toString("hex");
    const [session] = await db
      .insert(authSessions)
      .values({
        userId,
        ipHash: createHash("sha256").update(ip).digest("hex"),
        userAgentHash: createHash("sha256").update(userAgent).digest("hex"),
        refreshTokenHash: createHash("sha256").update(refreshToken).digest("hex"),
        deviceFingerprintHash: createHash("sha256").update(`${ip}:${userAgent}`).digest("hex"),
        sessionStatus: "ACTIVE" as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();
    return { session: session!, refreshToken };
  }

  async revokeSession(sessionId: string, userId: string) {
    await db
      .update(authSessions)
      .set({ sessionStatus: "REVOKED" as any })
      .where(and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)));
    await this.logSecurityEvent(userId, "SESSION_REVOKED" as any, "INFO" as any, "", "", { sessionId, selfRevoke: true });
  }

  async validateSession(sessionId: string) {
    const [session] = await db
      .select()
      .from(authSessions)
      .where(
        and(
          eq(authSessions.id, sessionId),
          eq(authSessions.sessionStatus, "ACTIVE" as any),
          gt(authSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return session ?? null;
  }

  async listMySessions(userId: string) {
    return db
      .select({
        id: authSessions.id,
        sessionStatus: authSessions.sessionStatus,
        lastSeenAt: authSessions.lastSeenAt,
        expiresAt: authSessions.expiresAt,
        createdAt: authSessions.createdAt,
      })
      .from(authSessions)
      .where(eq(authSessions.userId, userId))
      .orderBy(desc(authSessions.createdAt));
  }

  async sendVerificationEmail(userId: string, email: string, type: string) {
    const token = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(emailVerifications).values({
      userId,
      email,
      verificationTokenHash: tokenHash,
      verificationType: type as any,
      expiresAt,
    });

    return { token };
  }

  async verifyEmail(token: string) {
    const tokenHash = createHash("sha256").update(token).digest("hex");

    const [verification] = await db
      .select()
      .from(emailVerifications)
      .where(
        and(
          eq(emailVerifications.verificationTokenHash, tokenHash),
          eq(emailVerifications.status, "PENDING" as any),
          gt(emailVerifications.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!verification) return null;

    await db
      .update(emailVerifications)
      .set({ status: "VERIFIED" as any, verifiedAt: new Date() })
      .where(eq(emailVerifications.id, verification.id));

    if (verification.verificationType === "SIGNUP") {
      await db
        .update(users)
        .set({ status: "ACTIVE" as any, emailVerified: true })
        .where(eq(users.id, verification.userId));
    }

    return verification;
  }

  async logSecurityEvent(
    userId: string | null,
    eventType: string,
    severity: string,
    ip: string,
    userAgent: string = "",
    details?: Record<string, unknown>,
  ) {
    await db.insert(securityEvents).values({
      actorUserId: userId,
      eventType: eventType as any,
      severity: severity as any,
      ipAddress: ip,
      userAgent,
      deviceFingerprintHash: createHash("sha256").update(`${ip}:${userAgent}`).digest("hex"),
      detailsJson: details,
    });
  }

  extractBearerToken(authorization?: string | string[]): string | null {
    if (!authorization) return null;

    const headerValue = Array.isArray(authorization) ? authorization[0] : authorization;
    if (!headerValue) return null;

    const [scheme, token] = headerValue.split(" ");
    if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
      return null;
    }

    return token.trim() || null;
  }

  async authenticateToken(token: string): Promise<AuthenticatedUser> {
    if (!this.env.CLERK_SECRET_KEY) {
      throw new Error("CLERK_SECRET_KEY is not configured");
    }

    const verification = await verifyToken(token, {
      secretKey: this.env.CLERK_SECRET_KEY,
    });
    const verificationErrors = Array.isArray((verification as { errors?: unknown }).errors)
      ? ((verification as { errors?: unknown[] }).errors ?? [])
      : [];
    const verificationData = ((verification as { data?: VerifiedClerkToken }).data ?? null);

    if (!verificationData || verificationErrors.length > 0) {
      throw new Error("Invalid Clerk session token");
    }

    const clerkUserId = verificationData.sub;
    if (!clerkUserId) {
      throw new Error("Clerk token is missing subject");
    }

    const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
    const appUser = await this.findOrCreateUserFromClerk(clerkUser as any);

    return {
      userId: appUser.id,
      isAdmin: appUser.role === "ADMIN",
      sessionId: typeof verificationData.sid === "string" ? verificationData.sid : null,
    };
  }

  private async findOrCreateUserFromClerk(clerkUser: any) {
    const primaryEmail = this.getPrimaryEmail(clerkUser);
    if (!primaryEmail) {
      throw new Error("Clerk user does not have a primary email address");
    }

    const normalizedEmail = primaryEmail.emailAddress.toLowerCase();
    const displayName = this.resolveDisplayName(clerkUser, normalizedEmail);
    const emailVerified = primaryEmail.verification?.status === "verified";

    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      const shouldUpdateDisplayName = displayName && existingUser.displayName !== displayName;
      const shouldVerifyEmail = emailVerified && !existingUser.emailVerified;

      if (shouldUpdateDisplayName || shouldVerifyEmail) {
        const [updatedUser] = await db
          .update(users)
          .set({
            displayName: shouldUpdateDisplayName ? displayName : existingUser.displayName,
            emailVerified: shouldVerifyEmail ? true : existingUser.emailVerified,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return updatedUser ?? existingUser;
      }

      return existingUser;
    }

    const username = await this.generateUniqueUsername(displayName, normalizedEmail);
    const referralCode = await this.generateUniqueReferralCode();
    const referredByUserId = await this.resolveReferrerId(clerkUser?.unsafeMetadata?.referralCode);

    const [createdUser] = await db
      .insert(users)
      .values({
        email: normalizedEmail,
        emailVerified,
        displayName,
        username,
        country: "GLOBAL",
        status: emailVerified ? "ACTIVE" as any : "PENDING_VERIFICATION" as any,
        referralCode,
        referredByUserId,
        lastActiveAt: new Date(),
      })
      .returning();

    if (!createdUser) {
      throw new Error("Failed to create app user from Clerk identity");
    }

    await db.insert(profiles).values({ userId: createdUser.id }).onConflictDoNothing();

    return createdUser;
  }

  private getPrimaryEmail(clerkUser: any) {
    if (!clerkUser?.emailAddresses?.length) {
      return null;
    }

    return clerkUser.emailAddresses.find(
      (email: any) => email.id === clerkUser.primaryEmailAddressId,
    ) ?? clerkUser.emailAddresses[0] ?? null;
  }

  private resolveDisplayName(clerkUser: any, email: string) {
    const metadataDisplayName = typeof clerkUser?.unsafeMetadata?.displayName === "string"
      ? clerkUser.unsafeMetadata.displayName.trim()
      : "";

    if (metadataDisplayName) return metadataDisplayName;

    const nameParts = [clerkUser?.firstName, clerkUser?.lastName]
      .filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0)
      .map((value) => value.trim());

    if (nameParts.length > 0) {
      return nameParts.join(" ");
    }

    return email.split("@")[0] ?? "MissU User";
  }

  private async generateUniqueUsername(displayName: string, email: string) {
    const base = (displayName || email.split("@")[0] || "user")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .slice(0, 18) || "user";

    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = attempt === 0 ? "" : randomBytes(2).toString("hex");
      const username = `${base}${suffix}`.slice(0, 24);
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
      if (!existing) {
        return username;
      }
    }

    return `user${randomBytes(4).toString("hex")}`;
  }

  private async generateUniqueReferralCode() {
    for (let attempt = 0; attempt < 10; attempt++) {
      const referralCode = randomBytes(4).toString("hex").toUpperCase();
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.referralCode, referralCode)).limit(1);
      if (!existing) {
        return referralCode;
      }
    }

    return randomBytes(6).toString("hex").toUpperCase();
  }

  private async resolveReferrerId(referralCode: unknown) {
    if (typeof referralCode !== "string" || !referralCode.trim()) {
      return null;
    }

    const normalizedCode = referralCode.trim().toUpperCase();
    const [referrer] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.referralCode, normalizedCode))
      .limit(1);

    return referrer?.id ?? null;
  }
}
