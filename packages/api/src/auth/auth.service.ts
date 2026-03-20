import { Injectable } from "@nestjs/common";
import { createClerkClient, verifyToken } from "@clerk/backend";
import { DEFAULTS, getEnv } from "@missu/config";
import { db } from "@missu/db";
import { admins, agencies, agencyHosts, auditLogs, authSessions, emailVerifications, models, profiles, securityEvents, users } from "@missu/db/schema";
import type { AuthProvider, PlatformRole } from "@missu/types";
import { eq, and, gt, desc, or } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { normalizeEmail, isAllowedAdminEmail } from "./auth.constants";
import {
  completeAgencySignupSchema,
  type AgencyModelLoginInput,
  type CompleteAgencySignupInput,
  type CompleteMobileOnboardingInput,
  type MobilePanel,
  type SessionIntent,
} from "./auth.schemas";

type AuthenticatedUser = {
  userId: string;
  authRole: "admin" | "agency" | null;
  platformRole: PlatformRole | null;
  isAdmin: boolean;
  sessionId: string | null;
};

type VerifiedClerkToken = {
  sub?: string;
  sid?: string;
};

type ResolvedIdentity = {
  appUser: typeof users.$inferSelect;
  clerkUserId: string;
  email: string;
  sessionId: string | null;
};

type SessionState = {
  status: "admin" | "agency" | "needs_agency_profile" | "access_denied" | "agency_pending_approval";
  reason?: "admin_signup_forbidden" | "unauthorized_role" | "agency_record_missing" | "agency_pending_approval";
  role: "admin" | "agency" | null;
  platformRole: PlatformRole | null;
  userId: string;
  clerkUserId: string;
  email: string;
  sessionId: string | null;
  agencyId?: string;
  agencyCode?: string;
};

/** Session state returned for mobile app authentication. */
type MobileSessionState = {
  status: "user" | "model" | "agency_model" | "needs_onboarding" | "access_denied" | "agency_pending_approval";
  reason?: "invalid_agency" | "agency_not_approved" | "agency_not_found" | "already_in_agency";
  panel: MobilePanel;
  role: PlatformRole | null;
  userId: string;
  clerkUserId: string;
  email: string;
  sessionId: string | null;
  agencyId?: string;
  agencyName?: string;
  agencyCode?: string;
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
    const sessionState = await this.getSessionStateFromToken(token, "login");

    return {
      userId: sessionState.userId,
      authRole: sessionState.role,
      platformRole: sessionState.platformRole,
      isAdmin: sessionState.role === "admin",
      sessionId: sessionState.sessionId,
    };
  }

  async getSessionStateFromToken(token: string, intent: SessionIntent): Promise<SessionState> {
    const identity = await this.resolveIdentityFromToken(token);
    return this.resolveSessionState(identity, intent);
  }

  async completeAgencySignupFromToken(token: string, input: CompleteAgencySignupInput) {
    const identity = await this.resolveIdentityFromToken(token);
    return this.completeAgencySignup(identity, input);
  }

  async completeAgencySignupForUser(userId: string, input: CompleteAgencySignupInput) {
    const [appUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!appUser) {
      throw new Error("App user not found");
    }

    return this.completeAgencySignup({
      appUser,
      clerkUserId: appUser.clerkId ?? "",
      email: normalizeEmail(appUser.email),
      sessionId: null,
    }, input);
  }

  async completeMobileOnboardingFromToken(token: string, input: CompleteMobileOnboardingInput) {
    const identity = await this.resolveIdentityFromToken(token);
    return this.completeMobileOnboarding(identity, input);
  }

  async completeMobileOnboardingForUser(userId: string, input: CompleteMobileOnboardingInput) {
    const [appUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!appUser) {
      throw new Error("App user not found");
    }

    return this.completeMobileOnboarding({
      appUser,
      clerkUserId: appUser.clerkId ?? "",
      email: normalizeEmail(appUser.email),
      sessionId: null,
    }, input);
  }

  async getMobileSessionForUser(userId: string, panel: MobilePanel): Promise<MobileSessionState> {
    const [appUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!appUser) {
      throw new Error("App user not found");
    }

    return this.resolveMobileSession({
      appUser,
      clerkUserId: appUser.clerkId ?? "",
      email: normalizeEmail(appUser.email),
      sessionId: null,
    }, panel);
  }

  private async resolveIdentityFromToken(token: string): Promise<ResolvedIdentity> {
    if (!this.env.CLERK_SECRET_KEY) {
      throw new Error("CLERK_SECRET_KEY is not configured");
    }

    // @clerk/backend v3: verifyToken returns the JWT payload directly.
    // It throws on invalid tokens, so no { data, errors } wrapper.
    const jwtPayload = await verifyToken(token, {
      secretKey: this.env.CLERK_SECRET_KEY,
    });

    const clerkUserId = typeof jwtPayload === "object" && jwtPayload !== null
      ? (jwtPayload as Record<string, unknown>).sub as string | undefined
      : undefined;

    if (!clerkUserId) {
      throw new Error("Clerk token is missing subject");
    }

    const sessionId = typeof (jwtPayload as Record<string, unknown>).sid === "string"
      ? (jwtPayload as Record<string, unknown>).sid as string
      : null;

    const clerkUser = await this.clerkClient.users.getUser(clerkUserId);
    const appUser = await this.findOrCreateUserFromClerk(clerkUser as any);

    return {
      appUser,
      clerkUserId,
      email: normalizeEmail(appUser.email),
      sessionId,
    };
  }

  private async resolveSessionState(identity: ResolvedIdentity, intent: SessionIntent): Promise<SessionState> {
    const email = normalizeEmail(identity.email);
    let adminRecord = await this.getAdminRecordByEmail(email);

    // Auto-provision admin record for allowlisted emails on first login
    if (!adminRecord && isAllowedAdminEmail(email)) {
      const [created] = await db
        .insert(admins)
        .values({
          userId: identity.appUser.id,
          email,
          clerkId: identity.clerkUserId,
          adminName: identity.appUser.displayName ?? email.split("@")[0] ?? "Admin",
          isActive: true,
          mfaEnabled: false,
        })
        .onConflictDoNothing()
        .returning({ id: admins.id, userId: admins.userId, email: admins.email, isActive: admins.isActive });
      adminRecord = created ?? null;
    }

    if (adminRecord) {
      await this.bindAdminIdentity(adminRecord.id, identity.appUser.id, email, identity.clerkUserId);
      const adminUser = await this.updateUserAccess(identity.appUser.id, "admin");

      if (intent === "signup") {
        return {
          status: "access_denied",
          reason: "admin_signup_forbidden",
          role: null,
          platformRole: "ADMIN",
          userId: adminUser.id,
          clerkUserId: identity.clerkUserId,
          email,
          sessionId: identity.sessionId,
        };
      }

      return {
        status: "admin",
        role: "admin",
        platformRole: "ADMIN",
        userId: adminUser.id,
        clerkUserId: identity.clerkUserId,
        email,
        sessionId: identity.sessionId,
      };
    }

    const ownedAgency = await this.getOwnedAgencyForUser(identity.appUser.id);

    if (ownedAgency) {
      const approvalStatus = this.resolveAgencyApproval(ownedAgency);

      if (approvalStatus !== "APPROVED") {
        await this.updateUserAccess(identity.appUser.id, "agency");
        return {
          status: "agency_pending_approval",
          reason: "agency_pending_approval",
          role: "agency",
          platformRole: "AGENCY",
          userId: identity.appUser.id,
          clerkUserId: identity.clerkUserId,
          email,
          sessionId: identity.sessionId,
          agencyId: ownedAgency.id,
          agencyCode: ownedAgency.agencyCode ?? undefined,
        };
      }

      await this.ensureAgencyMembership(identity.appUser.id, ownedAgency.id);
      const agencyUser = await this.updateUserAccess(identity.appUser.id, "agency");

      return {
        status: "agency",
        role: "agency",
        platformRole: "AGENCY",
        userId: agencyUser.id,
        clerkUserId: identity.clerkUserId,
        email,
        sessionId: identity.sessionId,
        agencyId: ownedAgency.id,
        agencyCode: ownedAgency.agencyCode ?? undefined,
      };
    }

    if (identity.appUser.authRole === "agency" || identity.appUser.platformRole === "AGENCY") {
      return {
        status: "access_denied",
        reason: "agency_record_missing",
        role: null,
        platformRole: identity.appUser.platformRole as PlatformRole,
        userId: identity.appUser.id,
        clerkUserId: identity.clerkUserId,
        email,
        sessionId: identity.sessionId,
      };
    }

    if (intent === "signup") {
      return {
        status: "needs_agency_profile",
        role: null,
        platformRole: identity.appUser.platformRole as PlatformRole,
        userId: identity.appUser.id,
        clerkUserId: identity.clerkUserId,
        email,
        sessionId: identity.sessionId,
      };
    }

    return {
      status: "access_denied",
      reason: "unauthorized_role",
      role: null,
      platformRole: identity.appUser.platformRole as PlatformRole,
      userId: identity.appUser.id,
      clerkUserId: identity.clerkUserId,
      email,
      sessionId: identity.sessionId,
    };
  }

  private async completeAgencySignup(identity: ResolvedIdentity, rawInput: CompleteAgencySignupInput) {
    if (await this.getAdminRecordByEmail(identity.email)) {
      return {
        status: "access_denied",
        reason: "admin_signup_forbidden",
        role: null,
        platformRole: "ADMIN",
        userId: identity.appUser.id,
        clerkUserId: identity.clerkUserId,
        email: identity.email,
        sessionId: identity.sessionId,
      } satisfies SessionState;
    }

    const input = completeAgencySignupSchema.parse(rawInput);
    let agency = await this.getOwnedAgencyForUser(identity.appUser.id);

    if (!agency) {
      const agencyCode = await this.generateUniqueAgencyCode(input.agencyName);
      const [createdAgency] = await db
        .insert(agencies)
        .values({
          userId: identity.appUser.id,
          clerkId: identity.clerkUserId,
          agencyName: input.agencyName,
          agencyCode,
          contactName: input.contactName,
          contactEmail: normalizeEmail(input.contactEmail),
          country: input.country,
          status: "PENDING",
          approvalStatus: "PENDING" as any,
          metadataJson: { panel: "agency", createdBy: "portal_signup" },
          commissionTier: DEFAULTS.AGENCY_COMMISSION_TIERS[0]?.name ?? "STANDARD",
          updatedAt: new Date(),
        })
        .returning({
          id: agencies.id,
          agencyCode: agencies.agencyCode,
          status: agencies.status,
          approvalStatus: agencies.approvalStatus,
        });

      if (!createdAgency) {
        throw new Error("Failed to create agency profile");
      }

      agency = createdAgency;
    }

    if (!agency) {
      throw new Error("Failed to resolve agency profile");
    }

    await this.ensureAgencyMembership(identity.appUser.id, agency.id);
    const agencyUser = await this.updateUserAccess(identity.appUser.id, "agency");

    const [agencyRecord] = await db
      .select({ status: agencies.status, approvalStatus: agencies.approvalStatus, agencyCode: agencies.agencyCode })
      .from(agencies)
      .where(eq(agencies.id, agency.id))
      .limit(1);
    const isApproved = this.resolveAgencyApproval(agencyRecord) === "APPROVED";

    await this.logAuditEvent({
      actorUserId: identity.appUser.id,
      actorPlatformRole: "AGENCY",
      action: "agency.signup.completed",
      entityType: "agency",
      entityId: agency.id,
      tenantAgencyId: agency.id,
      afterStateJson: { approvalStatus: agencyRecord?.approvalStatus, status: agencyRecord?.status },
    });

    if (!isApproved) {
      return {
        status: "agency_pending_approval",
        reason: "agency_pending_approval",
        role: "agency",
        platformRole: "AGENCY",
        userId: agencyUser.id,
        clerkUserId: identity.clerkUserId,
        email: identity.email,
        sessionId: identity.sessionId,
        agencyId: agency.id,
        agencyCode: agencyRecord?.agencyCode ?? undefined,
      } satisfies SessionState;
    }

    return {
      status: "agency",
      role: "agency",
      platformRole: "AGENCY",
      userId: agencyUser.id,
      clerkUserId: identity.clerkUserId,
      email: identity.email,
      sessionId: identity.sessionId,
      agencyId: agency.id,
      agencyCode: agencyRecord?.agencyCode ?? undefined,
    } satisfies SessionState;
  }

  private async findOrCreateUserFromClerk(clerkUser: any) {
    const primaryEmail = this.getPrimaryEmail(clerkUser);
    const primaryPhone = this.getPrimaryPhone(clerkUser);
    const normalizedEmail = primaryEmail
      ? normalizeEmail(primaryEmail.emailAddress)
      : `clerk-${String(clerkUser?.id ?? randomBytes(4).toString("hex"))}@phone.local`;
    const displayName = this.resolveDisplayName(clerkUser, normalizedEmail);
    const emailVerified = primaryEmail?.verification?.status === "verified";
    const phoneNumber = typeof primaryPhone?.phoneNumber === "string" ? primaryPhone.phoneNumber : null;
    const phoneVerified = primaryPhone?.verification?.status === "verified";
    const clerkUserId = typeof clerkUser?.id === "string" ? clerkUser.id : null;
    const authProvider = this.extractAuthProvider(clerkUser);
    const authMetadata = this.extractAuthMetadata(clerkUser, authProvider);
    const profileData = this.extractProfileData(clerkUser);

    const [existingByClerkId] = clerkUserId
      ? await db.select().from(users).where(eq(users.clerkId, clerkUserId)).limit(1)
      : [];
    const [existingByEmail] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    const matchedUser = existingByClerkId ?? existingByEmail ?? null;

    if (matchedUser) {
      const shouldUpdateDisplayName = displayName && matchedUser.displayName !== displayName;
      const shouldVerifyEmail = emailVerified && !matchedUser.emailVerified;
      const shouldSetClerkId = Boolean(clerkUserId) && matchedUser.clerkId !== clerkUserId;
      const shouldSetPhone = Boolean(phoneNumber) && matchedUser.phone !== phoneNumber;
      const shouldVerifyPhone = phoneVerified && !matchedUser.phoneVerified;
      const shouldSetAuthProvider = matchedUser.authProvider !== authProvider;
      const shouldSetProfileData = profileData !== null;
      const shouldSetPublicUserId = !matchedUser.publicUserId;
      const publicUserId = shouldSetPublicUserId
        ? await this.generateUniquePublicUserId()
        : matchedUser.publicUserId;

      if (shouldUpdateDisplayName || shouldVerifyEmail || shouldSetClerkId || shouldSetPhone || shouldVerifyPhone || shouldSetAuthProvider || shouldSetProfileData || shouldSetPublicUserId) {
        const [updatedUser] = await db
          .update(users)
          .set({
            publicUserId,
            clerkId: shouldSetClerkId ? clerkUserId : matchedUser.clerkId,
            displayName: shouldUpdateDisplayName ? displayName : matchedUser.displayName,
            emailVerified: shouldVerifyEmail ? true : matchedUser.emailVerified,
            phone: shouldSetPhone ? phoneNumber : matchedUser.phone,
            phoneVerified: shouldVerifyPhone ? true : matchedUser.phoneVerified,
            authProvider,
            authMetadataJson: authMetadata,
            profileDataJson: shouldSetProfileData ? profileData : matchedUser.profileDataJson,
            lastActiveAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, matchedUser.id))
          .returning();
        return updatedUser ?? matchedUser;
      }

      return matchedUser;
    }

    const username = await this.generateUniqueUsername(displayName, normalizedEmail);
    const referralCode = await this.generateUniqueReferralCode();
    const referredByUserId = await this.resolveReferrerId(clerkUser?.unsafeMetadata?.referralCode);
    const publicUserId = await this.generateUniquePublicUserId();

    const [createdUser] = await db
      .insert(users)
      .values({
        publicUserId,
        clerkId: clerkUserId,
        email: normalizedEmail,
        emailVerified,
        phone: phoneNumber,
        phoneVerified,
        displayName,
        username,
        platformRole: "USER",
        authProvider,
        authMetadataJson: authMetadata,
        profileDataJson: profileData,
        country: "GLOBAL",
        status: emailVerified || phoneVerified ? "ACTIVE" as any : "PENDING_VERIFICATION" as any,
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

  private getPrimaryPhone(clerkUser: any) {
    if (!clerkUser?.phoneNumbers?.length) {
      return null;
    }

    return clerkUser.phoneNumbers.find(
      (phone: any) => phone.id === clerkUser.primaryPhoneNumberId,
    ) ?? clerkUser.phoneNumbers[0] ?? null;
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

  private extractAuthProvider(clerkUser: any): AuthProvider {
    const metadataProvider = typeof clerkUser?.unsafeMetadata?.authProvider === "string"
      ? String(clerkUser.unsafeMetadata.authProvider).trim().toUpperCase()
      : "";

    if (["EMAIL", "GOOGLE", "FACEBOOK", "PHONE_OTP", "WHATSAPP_OTP", "CUSTOM_OTP", "UNKNOWN"].includes(metadataProvider)) {
      return metadataProvider as AuthProvider;
    }

    const externalAccounts = Array.isArray(clerkUser?.externalAccounts) ? clerkUser.externalAccounts : [];
    if (externalAccounts.some((account: any) => String(account?.provider).toLowerCase().includes("google"))) {
      return "GOOGLE";
    }
    if (externalAccounts.some((account: any) => String(account?.provider).toLowerCase().includes("facebook"))) {
      return "FACEBOOK";
    }

    if (this.getPrimaryPhone(clerkUser)) {
      return typeof clerkUser?.unsafeMetadata?.otpChannel === "string" && String(clerkUser.unsafeMetadata.otpChannel).toLowerCase() === "whatsapp"
        ? "WHATSAPP_OTP"
        : "PHONE_OTP";
    }

    if (this.getPrimaryEmail(clerkUser)) {
      return "EMAIL";
    }

    return "UNKNOWN";
  }

  private extractAuthMetadata(clerkUser: any, authProvider: AuthProvider) {
    const externalAccounts = Array.isArray(clerkUser?.externalAccounts)
      ? clerkUser.externalAccounts.map((account: any) => ({
          provider: account?.provider ?? null,
          providerUserId: account?.providerUserId ?? null,
        }))
      : [];

    return {
      authProvider,
      otpChannel: clerkUser?.unsafeMetadata?.otpChannel ?? null,
      whatsappNumber: clerkUser?.unsafeMetadata?.whatsappNumber ?? null,
      externalAccounts,
    };
  }

  private extractProfileData(clerkUser: any) {
    if (clerkUser?.unsafeMetadata && typeof clerkUser.unsafeMetadata === "object") {
      const profileData = clerkUser.unsafeMetadata.profileData;
      if (profileData && typeof profileData === "object" && !Array.isArray(profileData)) {
        return profileData as Record<string, unknown>;
      }
    }

    return null;
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

  private async generateUniquePublicUserId() {
    for (let attempt = 0; attempt < 20; attempt++) {
      const publicUserId = `U${this.randomDigits(9)}`;
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.publicUserId, publicUserId)).limit(1);
      if (!existing) {
        return publicUserId;
      }
    }

    return `U${Date.now().toString().slice(-9)}`;
  }

  private randomDigits(length: number) {
    let value = "";
    while (value.length < length) {
      value += String(randomBytes(length).readUIntBE(0, Math.min(6, length))).replace(/\D/g, "");
    }
    return value.slice(0, length);
  }

  private async generateUniqueAgencyCode(agencyName: string) {
    const slugBase = agencyName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 28) || "agency";

    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = randomBytes(3).toString("hex");
      const agencyCode = `${slugBase}-${suffix}`;
      const [existing] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.agencyCode, agencyCode)).limit(1);
      if (!existing) {
        return agencyCode;
      }
    }

    return `agency-${randomBytes(4).toString("hex")}`;
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

  private async getAdminRecordByEmail(email: string) {
    const [adminRecord] = await db
      .select({ id: admins.id, userId: admins.userId, email: admins.email, isActive: admins.isActive })
      .from(admins)
      .where(eq(admins.email, normalizeEmail(email)))
      .limit(1);

    return adminRecord?.isActive ? adminRecord : null;
  }

  private async bindAdminIdentity(adminId: string, userId: string, email: string, clerkUserId: string) {
    await db
      .update(admins)
      .set({
        userId,
        email: normalizeEmail(email),
        clerkId: clerkUserId,
        lastLoginAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(admins.id, adminId));
  }

  private async getOwnedAgencyForUser(userId: string) {
    const [agency] = await db
      .select({
        id: agencies.id,
        agencyCode: agencies.agencyCode,
        status: agencies.status,
        approvalStatus: agencies.approvalStatus,
      })
      .from(agencies)
      .where(eq(agencies.userId, userId))
      .limit(1);

    return agency ?? null;
  }

  private async getActiveAgencyForUser(userId: string) {
    const [membership] = await db
      .select({
        id: agencies.id,
        agencyCode: agencies.agencyCode,
        agencyName: agencies.agencyName,
        status: agencies.status,
        approvalStatus: agencies.approvalStatus,
      })
      .from(agencyHosts)
      .innerJoin(agencies, eq(agencies.id, agencyHosts.agencyId))
      .where(and(eq(agencyHosts.userId, userId), eq(agencyHosts.status, "ACTIVE" as any)))
      .limit(1);

    return membership ?? null;
  }

  private async ensureAgencyMembership(userId: string, agencyId: string) {
    await db.insert(agencyHosts).values({
      agencyId,
      userId,
      status: "ACTIVE" as any,
    }).onConflictDoNothing();
  }

  private async findAgencyByIdentifier(identifier: string) {
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const [agency] = await db
      .select({
        id: agencies.id,
        agencyName: agencies.agencyName,
        agencyCode: agencies.agencyCode,
        status: agencies.status,
        approvalStatus: agencies.approvalStatus,
      })
      .from(agencies)
      .where(or(eq(agencies.id, identifier), eq(agencies.agencyCode, normalizedIdentifier)))
      .limit(1);

    return agency ?? null;
  }

  private resolveAgencyApproval(agency: { status?: string | null; approvalStatus?: string | null } | null | undefined) {
    if (!agency) {
      return "PENDING" as const;
    }

    const approvalStatus = String(agency.approvalStatus ?? "").toUpperCase();
    if (approvalStatus === "APPROVED") {
      return "APPROVED" as const;
    }
    if (approvalStatus === "REJECTED") {
      return "REJECTED" as const;
    }

    const legacyStatus = String(agency.status ?? "").toUpperCase();
    if (legacyStatus === "ACTIVE") {
      return "APPROVED" as const;
    }
    if (legacyStatus === "REJECTED") {
      return "REJECTED" as const;
    }

    return "PENDING" as const;
  }

  private async updateUserAccess(userId: string, authRole: "admin" | "agency") {
    const [updatedUser] = await db
      .update(users)
      .set({
        authRole,
        platformRole: authRole === "admin" ? "ADMIN" as any : "AGENCY" as any,
        role: authRole === "admin" ? "ADMIN" as any : "HOST" as any,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to update user access role");
    }

    return updatedUser;
  }

  private async updateUserPlatformRole(userId: string, platformRole: PlatformRole) {
    const legacyRole = platformRole === "MODEL_AGENCY"
      ? "HOST"
      : platformRole === "MODEL_INDEPENDENT"
        ? "MODEL"
        : platformRole === "ADMIN"
          ? "ADMIN"
          : "USER";

    const [updatedUser] = await db
      .update(users)
      .set({
        platformRole,
        role: legacyRole as any,
        authRole: platformRole === "AGENCY" ? "agency" as any : platformRole === "ADMIN" ? "admin" as any : null,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error("Failed to update user platform role");
    }

    return updatedUser;
  }

  private async upsertModelProfile(userId: string, input: {
    clerkUserId?: string | null;
    agencyId?: string | null;
    modelType: "INDEPENDENT" | "AGENCY";
    authProvider: AuthProvider;
    metadata?: Record<string, unknown> | null;
  }) {
    const values = {
      userId,
      clerkId: input.clerkUserId ?? null,
      agencyId: input.agencyId ?? null,
      modelType: input.modelType,
      registrationStatus: "ACTIVE" as any,
      authProvider: input.authProvider,
      metadataJson: input.metadata ?? null,
      talentCategoriesJson: [],
      talentDescription: "",
      languagesJson: [],
      callRateAudioCoins: 0,
      callRateVideoCoins: 0,
      updatedAt: new Date(),
    };

    await db
      .insert(models)
      .values(values as any)
      .onConflictDoUpdate({
        target: models.userId,
        set: {
          clerkId: input.clerkUserId ?? null,
          agencyId: input.agencyId ?? null,
          modelType: input.modelType as any,
          registrationStatus: "ACTIVE" as any,
          authProvider: input.authProvider as any,
          metadataJson: input.metadata ?? null,
          updatedAt: new Date(),
        },
      });
  }

  private async logAuditEvent(input: {
    actorUserId: string | null;
    actorPlatformRole: PlatformRole | null;
    action: string;
    entityType: string;
    entityId: string;
    tenantAgencyId?: string | null;
    beforeStateJson?: Record<string, unknown> | null;
    afterStateJson?: Record<string, unknown> | null;
    metadataJson?: Record<string, unknown> | null;
  }) {
    await db.insert(auditLogs).values({
      actorUserId: input.actorUserId,
      actorPlatformRole: input.actorPlatformRole,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      tenantAgencyId: input.tenantAgencyId ?? null,
      beforeStateJson: input.beforeStateJson ?? null,
      afterStateJson: input.afterStateJson ?? null,
      metadataJson: input.metadataJson ?? null,
    });
  }

  // ─── Mobile session resolution ───

  /**
   * Resolves a mobile session from a Clerk token.
   * Determines the user's panel: user, model, or agency-model.
   */
  async getMobileSessionFromToken(token: string, panel: MobilePanel): Promise<MobileSessionState> {
    const identity = await this.resolveIdentityFromToken(token);
    return this.resolveMobileSession(identity, panel);
  }

  private async resolveMobileSession(identity: ResolvedIdentity, panel: MobilePanel): Promise<MobileSessionState> {
    const { appUser } = identity;
    const [modelProfile] = await db
      .select({
        id: models.id,
        agencyId: models.agencyId,
        modelType: models.modelType,
        registrationStatus: models.registrationStatus,
      })
      .from(models)
      .where(eq(models.userId, appUser.id))
      .limit(1);

    const derivedPlatformRole = (appUser.platformRole as PlatformRole | null)
      ?? (appUser.role === "HOST" ? "MODEL_AGENCY" : appUser.role === "MODEL" ? "MODEL_INDEPENDENT" : appUser.role === "ADMIN" ? "ADMIN" : "USER");

    if (derivedPlatformRole === "MODEL_AGENCY" || modelProfile?.modelType === "AGENCY" || modelProfile?.agencyId) {
      const agencyMembership = await this.getActiveAgencyForUser(appUser.id);
      const agency = modelProfile?.agencyId
        ? await this.findAgencyByIdentifier(modelProfile.agencyId)
        : agencyMembership;

      if (!agency) {
        return {
          status: "needs_onboarding",
          panel: "agency_model",
          role: null,
          userId: appUser.id,
          clerkUserId: identity.clerkUserId,
          email: identity.email,
          sessionId: identity.sessionId,
        };
      }

      if (this.resolveAgencyApproval(agency) !== "APPROVED") {
        return {
          status: "agency_pending_approval",
          reason: "agency_not_approved",
          panel: "agency_model",
          role: "MODEL_AGENCY",
          userId: appUser.id,
          clerkUserId: identity.clerkUserId,
          email: identity.email,
          sessionId: identity.sessionId,
          agencyId: agency.id,
          agencyName: agency.agencyName,
          agencyCode: agency.agencyCode ?? undefined,
        };
      }

      return {
        status: "agency_model",
        panel: "agency_model",
        role: "MODEL_AGENCY",
        userId: appUser.id,
        clerkUserId: identity.clerkUserId,
        email: identity.email,
        sessionId: identity.sessionId,
        agencyId: agency.id,
        agencyName: agency.agencyName,
        agencyCode: agency.agencyCode ?? undefined,
      };
    }

    if (derivedPlatformRole === "MODEL_INDEPENDENT" || modelProfile?.modelType === "INDEPENDENT") {
      return {
        status: "model",
        panel: "model",
        role: "MODEL_INDEPENDENT",
        userId: appUser.id,
        clerkUserId: identity.clerkUserId,
        email: identity.email,
        sessionId: identity.sessionId,
      };
    }

    if (panel !== "user") {
      return {
        status: "needs_onboarding",
        panel,
        role: derivedPlatformRole,
        userId: appUser.id,
        clerkUserId: identity.clerkUserId,
        email: identity.email,
        sessionId: identity.sessionId,
      };
    }

    return {
      status: "user",
      panel: "user",
      role: derivedPlatformRole,
      userId: appUser.id,
      clerkUserId: identity.clerkUserId,
      email: identity.email,
      sessionId: identity.sessionId,
    };
  }

  private async completeMobileOnboarding(identity: ResolvedIdentity, rawInput: CompleteMobileOnboardingInput): Promise<MobileSessionState> {
    const input = rawInput;
    const beforeRole = identity.appUser.platformRole as PlatformRole | null;

    if (input.selectedRole === "USER") {
      await db.update(users).set({
        platformRole: "USER" as any,
        role: "USER" as any,
        authRole: null,
        profileDataJson: input.profileData ?? identity.appUser.profileDataJson,
        updatedAt: new Date(),
      }).where(eq(users.id, identity.appUser.id));
    } else if (input.selectedRole === "MODEL_INDEPENDENT") {
      await this.upsertModelProfile(identity.appUser.id, {
        clerkUserId: identity.clerkUserId,
        agencyId: null,
        modelType: "INDEPENDENT",
        authProvider: (identity.appUser.authProvider as AuthProvider) ?? "UNKNOWN",
        metadata: input.profileData ?? null,
      });
      await db.update(users).set({
        platformRole: "MODEL_INDEPENDENT" as any,
        role: "MODEL" as any,
        authRole: null,
        profileDataJson: input.profileData ?? identity.appUser.profileDataJson,
        updatedAt: new Date(),
      }).where(eq(users.id, identity.appUser.id));
    } else {
      const agency = input.agencyId ? await this.findAgencyByIdentifier(input.agencyId) : null;
      if (!agency) {
        return {
          status: "access_denied",
          reason: "agency_not_found",
          panel: "agency_model",
          role: null,
          userId: identity.appUser.id,
          clerkUserId: identity.clerkUserId,
          email: identity.email,
          sessionId: identity.sessionId,
        };
      }

      if (this.resolveAgencyApproval(agency) !== "APPROVED") {
        return {
          status: "agency_pending_approval",
          reason: "agency_not_approved",
          panel: "agency_model",
          role: "MODEL_AGENCY",
          userId: identity.appUser.id,
          clerkUserId: identity.clerkUserId,
          email: identity.email,
          sessionId: identity.sessionId,
          agencyId: agency.id,
          agencyName: agency.agencyName,
          agencyCode: agency.agencyCode ?? undefined,
        };
      }

      await this.ensureAgencyMembership(identity.appUser.id, agency.id);
      await this.upsertModelProfile(identity.appUser.id, {
        clerkUserId: identity.clerkUserId,
        agencyId: agency.id,
        modelType: "AGENCY",
        authProvider: (identity.appUser.authProvider as AuthProvider) ?? "UNKNOWN",
        metadata: input.profileData ?? null,
      });
      await db.update(users).set({
        platformRole: "MODEL_AGENCY" as any,
        role: "HOST" as any,
        authRole: null,
        profileDataJson: input.profileData ?? identity.appUser.profileDataJson,
        updatedAt: new Date(),
      }).where(eq(users.id, identity.appUser.id));
    }

    await this.logAuditEvent({
      actorUserId: identity.appUser.id,
      actorPlatformRole: input.selectedRole,
      action: "mobile.onboarding.completed",
      entityType: "user",
      entityId: identity.appUser.id,
      beforeStateJson: { platformRole: beforeRole },
      afterStateJson: { platformRole: input.selectedRole },
      metadataJson: input.profileData ?? null,
    });

    return this.getMobileSessionForUser(identity.appUser.id, input.selectedRole === "MODEL_AGENCY" ? "agency_model" : input.selectedRole === "MODEL_INDEPENDENT" ? "model" : "user");
  }

  // ─── Agency-model login (model logging in through agency) ───

  /**
   * Authenticates a mobile user as an agency model.
   * Validates the agency exists and is active, then links the user to the agency.
   */
  async loginAsAgencyModelFromToken(token: string, input: AgencyModelLoginInput): Promise<MobileSessionState> {
    const identity = await this.resolveIdentityFromToken(token);
    return this.loginAsAgencyModel(identity, input);
  }

  async loginAsAgencyModelForUser(userId: string, input: AgencyModelLoginInput): Promise<MobileSessionState> {
    const [appUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!appUser) {
      throw new Error("App user not found");
    }
    return this.loginAsAgencyModel({
      appUser,
      clerkUserId: appUser.clerkId ?? "",
      email: appUser.email.trim().toLowerCase(),
      sessionId: null,
    }, input);
  }

  private async loginAsAgencyModel(identity: ResolvedIdentity, input: AgencyModelLoginInput): Promise<MobileSessionState> {
    const { appUser } = identity;

    const agency = await this.findAgencyByIdentifier(input.agencyId);

    if (!agency) {
      return {
        status: "access_denied",
        reason: "agency_not_found",
        panel: "agency_model",
        role: null,
        userId: appUser.id,
        clerkUserId: identity.clerkUserId,
        email: identity.email,
        sessionId: identity.sessionId,
      };
    }

    if (this.resolveAgencyApproval(agency) !== "APPROVED") {
      return {
        status: "agency_pending_approval",
        reason: "agency_not_approved",
        panel: "agency_model",
        role: "MODEL_AGENCY",
        userId: appUser.id,
        clerkUserId: identity.clerkUserId,
        email: identity.email,
        sessionId: identity.sessionId,
        agencyId: agency.id,
        agencyName: agency.agencyName,
        agencyCode: agency.agencyCode ?? undefined,
      };
    }

    await this.ensureAgencyMembership(appUser.id, agency.id);
    await this.upsertModelProfile(appUser.id, {
      clerkUserId: identity.clerkUserId,
      agencyId: agency.id,
      modelType: "AGENCY",
      authProvider: (appUser.authProvider as AuthProvider) ?? "UNKNOWN",
      metadata: { linkedBy: "agency_login", agencyCode: agency.agencyCode ?? null },
    });
    await this.updateUserPlatformRole(appUser.id, "MODEL_AGENCY");

    await this.logAuditEvent({
      actorUserId: appUser.id,
      actorPlatformRole: "MODEL_AGENCY",
      action: "agency.model.linked",
      entityType: "agency",
      entityId: agency.id,
      tenantAgencyId: agency.id,
      metadataJson: { agencyCode: agency.agencyCode ?? null },
    });

    return {
      status: "agency_model",
      panel: "agency_model",
      role: "MODEL_AGENCY",
      userId: appUser.id,
      clerkUserId: identity.clerkUserId,
      email: identity.email,
      sessionId: identity.sessionId,
      agencyId: agency.id,
      agencyName: agency.agencyName,
      agencyCode: agency.agencyCode ?? undefined,
    };
  }

  // ─── Admin: approve/reject agency ───

  async approveAgency(agencyId: string, adminUserId: string) {
    const [adminRecord] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, adminUserId), eq(users.authRole, "admin"))).limit(1);
    if (!adminRecord) throw new Error("Only admins can approve agencies");

    const [updated] = await db
      .update(agencies)
      .set({ status: "ACTIVE", approvalStatus: "APPROVED" as any, approvedAt: new Date(), updatedAt: new Date(), rejectedAt: null })
      .where(and(eq(agencies.id, agencyId), eq(agencies.status, "PENDING")))
      .returning({ id: agencies.id, agencyName: agencies.agencyName, agencyCode: agencies.agencyCode });

    if (!updated) throw new Error("Agency not found or already approved");

    await this.logAuditEvent({
      actorUserId: adminUserId,
      actorPlatformRole: "ADMIN",
      action: "agency.approved",
      entityType: "agency",
      entityId: updated.id,
      tenantAgencyId: updated.id,
      afterStateJson: { status: "ACTIVE", approvalStatus: "APPROVED", agencyCode: updated.agencyCode },
    });
    await this.logSecurityEvent(adminUserId, "ADMIN_LOGIN" as any, "INFO" as any, "", "", { action: "agency_approved", agencyId, agencyName: updated.agencyName });
    return updated;
  }

  async rejectAgency(agencyId: string, adminUserId: string, reason?: string) {
    const [adminRecord] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, adminUserId), eq(users.authRole, "admin"))).limit(1);
    if (!adminRecord) throw new Error("Only admins can reject agencies");

    await db
      .update(agencies)
      .set({ status: "REJECTED", approvalStatus: "REJECTED" as any, rejectedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(agencies.id, agencyId), eq(agencies.status, "PENDING")));

    await this.logAuditEvent({
      actorUserId: adminUserId,
      actorPlatformRole: "ADMIN",
      action: "agency.rejected",
      entityType: "agency",
      entityId: agencyId,
      tenantAgencyId: agencyId,
      afterStateJson: { status: "REJECTED", approvalStatus: "REJECTED" },
      metadataJson: reason ? { reason } : null,
    });
    await this.logSecurityEvent(adminUserId, "ADMIN_LOGIN" as any, "INFO" as any, "", "", { action: "agency_rejected", agencyId, reason });
    return { success: true };
  }

  async listPendingAgencies() {
    return db
      .select({
        id: agencies.id,
        agencyName: agencies.agencyName,
        contactName: agencies.contactName,
        contactEmail: agencies.contactEmail,
        agencyCode: agencies.agencyCode,
        country: agencies.country,
        status: agencies.status,
        approvalStatus: agencies.approvalStatus,
        createdAt: agencies.createdAt,
      })
      .from(agencies)
      .where(eq(agencies.approvalStatus, "PENDING" as any))
      .orderBy(desc(agencies.createdAt));
  }
}
