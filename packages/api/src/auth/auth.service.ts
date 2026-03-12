import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { authSessions, emailVerifications, securityEvents, users } from "@missu/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";

@Injectable()
export class AuthService {
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
}
