import { Injectable } from "@nestjs/common";
import bcrypt from "bcryptjs";
import { DEFAULTS, getEnv } from "@missu/config";
import { db } from "@missu/db";
import { admins, agencies, agencyApplications, agencyHosts, auditLogs, authSessions, emailVerifications, models, profiles, securityEvents, users } from "@missu/db/schema";
import type { AgencyStatus, AppRole, AuthProvider, PlatformRole, SessionActor } from "@missu/types";
import { eq, and, gt, desc, or } from "drizzle-orm";
import { randomBytes, createHash } from "node:crypto";
import { normalizeEmail, isAllowedAdminEmail } from "./auth.constants";
import { WalletService } from "../wallet/wallet.service";
import {
  completeAgencySignupSchema,
  type AgencyModelLoginInput,
  type CompleteAgencySignupInput,
  type CompleteMobileOnboardingInput,
  type EmailLoginInput,
  type EmailSignupInput,
  type GoogleAuthInput,
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

type ResolvedIdentity = {
  appUser: typeof users.$inferSelect;
  identityKey: string;
  email: string;
  sessionId: string | null;
};

type AuthMutationResult = {
  token: string;
  sessionId: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    platformRole: PlatformRole | null;
    authProvider: AuthProvider;
  };
};

type GoogleTokenInfo = {
  aud?: string;
  email?: string;
  email_verified?: string;
  name?: string;
  picture?: string;
  sub?: string;
};

type SessionState = {
  status: "admin" | "agency" | "needs_agency_profile" | "access_denied" | "agency_pending_approval";
  reason?: "admin_signup_forbidden" | "unauthorized_role" | "agency_record_missing" | "agency_pending_approval";
  role: "admin" | "agency" | null;
  platformRole: PlatformRole | null;
  userId: string;
  identityKey: string;
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
  identityKey: string;
  email: string;
  sessionId: string | null;
  agencyId?: string;
  agencyName?: string;
  agencyCode?: string;
};

@Injectable()
export class AuthService {
  private readonly env = getEnv();

  constructor(private readonly walletService: WalletService) {}

  private loadSharedAuth() {
    return (0, eval)("import('@missu/auth')") as Promise<{
      hashToken: (value: string) => string;
      signAccessToken: (actor: SessionActor, deviceId: string) => Promise<string>;
      verifyAccessToken: (token: string) => Promise<{ sub: string; sid: string }>;
    }>;
  }

  async createSession(userId: string, ip: string, userAgent: string) {
    const { hashToken } = await this.loadSharedAuth();
    const refreshToken = randomBytes(48).toString("hex");
    const deviceId = createHash("sha256").update(`${ip}:${userAgent}`).digest("hex");
    const [session] = await db
      .insert(authSessions)
      .values({
        userId,
        ipHash: createHash("sha256").update(ip).digest("hex"),
        userAgentHash: createHash("sha256").update(userAgent).digest("hex"),
        refreshTokenHash: hashToken(refreshToken),
        deviceFingerprintHash: deviceId,
        sessionStatus: "ACTIVE" as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();
    return { session: session!, refreshToken, deviceId };
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

  async signUpWithEmail(input: EmailSignupInput, ip: string, userAgent: string): Promise<AuthMutationResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const [existingUser] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (existingUser) {
      throw new Error("An account with this email already exists");
    }

    const displayName = input.displayName.trim();
    const publicUserId = await this.generateUniquePublicUserId();
    const referralCode = await this.generateUniqueReferralCode();
    const username = await this.generateUniqueUsername(displayName, normalizedEmail);
    const referredByUserId = await this.resolveReferrerId(input.referralCode);
    const passwordHash = await bcrypt.hash(input.password, 10);

    const [createdUser] = await db
      .insert(users)
      .values({
        publicUserId,
        publicId: publicUserId,
        clerkId: this.buildLegacyIdentityKey("local", normalizedEmail),
        email: normalizedEmail,
        emailVerified: false,
        passwordHash,
        displayName,
        username,
        platformRole: "USER",
        authProvider: "EMAIL",
        authMetadataJson: { authProvider: "EMAIL" },
        country: "ZZ",
        status: "ACTIVE" as any,
        referralCode,
        referredByUserId,
        lastActiveAt: new Date(),
      })
      .returning();

    if (!createdUser) {
      throw new Error("Failed to create account");
    }

    await db.insert(profiles).values({ userId: createdUser.id }).onConflictDoNothing();
    await this.walletService.getOrCreateWallet(createdUser.id);
    return this.createAuthMutationResult(createdUser, ip, userAgent);
  }

  async signInWithEmail(input: EmailLoginInput, ip: string, userAgent: string): Promise<AuthMutationResult> {
    const normalizedEmail = normalizeEmail(input.email);
    const [appUser] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);

    if (!appUser?.passwordHash) {
      throw new Error("Invalid email or password");
    }

    const matches = await bcrypt.compare(input.password, appUser.passwordHash);
    if (!matches) {
      throw new Error("Invalid email or password");
    }

    return this.createAuthMutationResult(appUser, ip, userAgent);
  }

  async signInWithGoogle(input: GoogleAuthInput, ip: string, userAgent: string): Promise<AuthMutationResult> {
    const googleProfile = await this.verifyGoogleIdToken(input.idToken);
    const appUser = await this.findOrCreateUserFromGoogle(googleProfile, input.displayName, input.referralCode);
    return this.createAuthMutationResult(appUser, ip, userAgent);
  }

  async logoutFromToken(token: string) {
    const identity = await this.resolveIdentityFromToken(token);
    if (identity.sessionId) {
      await this.revokeSession(identity.sessionId, identity.appUser.id);
    }
    return { success: true };
  }

  async authenticateToken(token: string): Promise<AuthenticatedUser> {
    const identity = await this.resolveIdentityFromToken(token);

    return {
      userId: identity.appUser.id,
      authRole: identity.appUser.authRole === "admin" || identity.appUser.authRole === "agency"
        ? identity.appUser.authRole
        : null,
      platformRole: identity.appUser.platformRole as PlatformRole,
      isAdmin: identity.appUser.platformRole === "ADMIN" || identity.appUser.authRole === "admin",
      sessionId: identity.sessionId,
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
      identityKey: appUser.clerkId ?? "",
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
      identityKey: appUser.clerkId ?? "",
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
      identityKey: this.resolveLegacyIdentityKey(appUser),
      email: normalizeEmail(appUser.email),
      sessionId: null,
    }, panel);
  }

  private async resolveIdentityFromToken(token: string): Promise<ResolvedIdentity> {
    return this.resolveIdentityFromLocalToken(token);
  }

  private async resolveIdentityFromLocalToken(token: string): Promise<ResolvedIdentity> {
    const { verifyAccessToken } = await this.loadSharedAuth();
    const payload = await verifyAccessToken(token);
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) {
      throw new Error("Auth token is missing subject");
    }

    const sessionId = typeof payload.sid === "string" ? payload.sid : null;
    if (sessionId) {
      const session = await this.validateSession(sessionId);
      if (!session || session.userId !== userId) {
        throw new Error("Session is no longer active");
      }
    }

    const [appUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!appUser) {
      throw new Error("App user not found");
    }

    return {
      appUser,
      identityKey: this.resolveLegacyIdentityKey(appUser),
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
          clerkId: identity.identityKey,
          adminName: identity.appUser.displayName ?? email.split("@")[0] ?? "Admin",
          isActive: true,
          mfaEnabled: false,
        })
        .onConflictDoNothing()
        .returning({ id: admins.id, userId: admins.userId, email: admins.email, isActive: admins.isActive });
      adminRecord = created ?? null;
    }

    if (adminRecord) {
      await this.bindAdminIdentity(adminRecord.id, identity.appUser.id, email, identity.identityKey);
      const adminUser = await this.updateUserAccess(identity.appUser.id, "admin");

      if (intent === "signup") {
        return {
          status: "access_denied",
          reason: "admin_signup_forbidden",
          role: null,
          platformRole: "ADMIN",
          userId: adminUser.id,
          identityKey: identity.identityKey,
          email,
          sessionId: identity.sessionId,
        };
      }

      return {
        status: "admin",
        role: "admin",
        platformRole: "ADMIN",
        userId: adminUser.id,
        identityKey: identity.identityKey,
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
          identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
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
      identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
        email: identity.email,
        sessionId: identity.sessionId,
      } satisfies SessionState;
    }

    const input = completeAgencySignupSchema.parse(rawInput);
    let agency = await this.getOwnedAgencyForUser(identity.appUser.id);

    if (!agency) {
      const agencyCode = await this.generateUniqueAgencyCode(input.agencyName);
      const agencyPublicId = await this.generateUniqueAgencyPublicId();
      const [createdAgency] = await db
        .insert(agencies)
        .values({
          userId: identity.appUser.id,
          clerkId: identity.identityKey,
          agencyName: input.agencyName,
          publicId: agencyPublicId,
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

      // Also create a formal agency_applications record for admin review
      await db.insert(agencyApplications).values({
        applicantUserId: identity.appUser.id,
        agencyName: input.agencyName,
        contactName: input.contactName,
        contactEmail: normalizeEmail(input.contactEmail),
        country: input.country,
        status: "PENDING" as any,
        createdAgencyId: createdAgency.id,
      }).onConflictDoNothing();

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
        identityKey: identity.identityKey,
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
      identityKey: identity.identityKey,
      email: identity.email,
      sessionId: identity.sessionId,
      agencyId: agency.id,
      agencyCode: agencyRecord?.agencyCode ?? undefined,
    } satisfies SessionState;
  }

  private async createAuthMutationResult(appUser: typeof users.$inferSelect, ip: string, userAgent: string): Promise<AuthMutationResult> {
    const { signAccessToken } = await this.loadSharedAuth();
    const actor = await this.buildSessionActor(appUser);
    const { session, deviceId } = await this.createSession(appUser.id, ip, userAgent);
    const token = await signAccessToken({ ...actor, sessionId: session.id }, deviceId);

    await db
      .update(users)
      .set({ lastActiveAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, appUser.id));

    return {
      token,
      sessionId: session.id,
      user: {
        id: appUser.id,
        email: normalizeEmail(appUser.email),
        displayName: appUser.displayName,
        platformRole: actor.platformRole,
        authProvider: appUser.authProvider as AuthProvider,
      },
    };
  }

  private buildLegacyIdentityKey(provider: "local" | "google", subject: string) {
    return `${provider}:${subject}`;
  }

  private isLegacyIdentityKey(value: string | null | undefined) {
    return Boolean(value?.startsWith("local:") || value?.startsWith("google:"));
  }

  private resolveLegacyIdentityKey(appUser: typeof users.$inferSelect) {
    if (appUser.clerkId) {
      return appUser.clerkId;
    }

    if (appUser.googleId) {
      return this.buildLegacyIdentityKey("google", appUser.googleId);
    }

    return this.buildLegacyIdentityKey("local", normalizeEmail(appUser.email));
  }

  private resolveDisplayName(value: string | null | undefined, email: string) {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : (email.split("@")[0] ?? "MissU User");
  }

  private async verifyGoogleIdToken(idToken: string): Promise<GoogleTokenInfo> {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!response.ok) {
      throw new Error("Google token verification failed");
    }

    const payload = await response.json() as GoogleTokenInfo;
    const configuredClientIds = Array.from(new Set([
      this.env.GOOGLE_CLIENT_ID,
      ...this.env.GOOGLE_CLIENT_IDS.split(","),
    ].map((value) => value.trim()).filter(Boolean)));

    if (configuredClientIds.length > 0 && payload.aud && !configuredClientIds.includes(payload.aud)) {
      throw new Error("Google token audience mismatch");
    }

    if (!payload.sub || !payload.email || payload.email_verified !== "true") {
      throw new Error("Google account email is not verified");
    }

    return payload;
  }

  private async findOrCreateUserFromGoogle(
    googleProfile: GoogleTokenInfo,
    displayNameOverride?: string,
    referralCode?: string,
  ) {
    const normalizedEmail = normalizeEmail(String(googleProfile.email));
    const googleSub = String(googleProfile.sub ?? "").trim();
    if (!googleSub) {
      throw new Error("Google subject is missing");
    }

    const legacyIdentityKey = this.buildLegacyIdentityKey("google", googleSub);
    const displayName = this.resolveDisplayName(displayNameOverride ?? googleProfile.name, normalizedEmail);

    const [existingByGoogleIdentity] = await db
      .select()
      .from(users)
      .where(or(eq(users.googleId, googleSub), eq(users.clerkId, legacyIdentityKey)))
      .limit(1);
    const [existingByEmail] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    if (existingByGoogleIdentity && existingByEmail && existingByGoogleIdentity.id !== existingByEmail.id) {
      throw new Error("Google account conflicts with an existing user record");
    }

    const storedGoogleSubject = existingByEmail ? this.getStoredGoogleSubject(existingByEmail) : null;
    if (!existingByGoogleIdentity && existingByEmail && storedGoogleSubject && storedGoogleSubject !== googleSub) {
      throw new Error("Google account does not match the existing identity for this email");
    }

    const matchedUser = existingByGoogleIdentity ?? existingByEmail ?? null;

    if (matchedUser) {
      const nextPublicUserId = matchedUser.publicUserId ?? await this.generateUniquePublicUserId();
      const nextPublicId = matchedUser.publicId ?? matchedUser.publicUserId ?? nextPublicUserId;
      const nextClerkId = matchedUser.clerkId && !this.isLegacyIdentityKey(matchedUser.clerkId)
        ? matchedUser.clerkId
        : legacyIdentityKey;
      const shouldSetLegacyKey = matchedUser.clerkId !== nextClerkId;
      const shouldSetDisplayName = displayName.length > 0 && matchedUser.displayName !== displayName;
      const shouldSetAvatar = typeof googleProfile.picture === "string" && googleProfile.picture.length > 0 && matchedUser.avatarUrl !== googleProfile.picture;
      const shouldSetPublicIds = matchedUser.publicUserId !== nextPublicUserId || matchedUser.publicId !== nextPublicId;
      const shouldSetGoogleId = matchedUser.googleId !== googleSub;
      const nextMetadata = this.mergeGoogleAuthMetadata(matchedUser.authMetadataJson ?? null, googleSub);

      if (shouldSetLegacyKey || shouldSetDisplayName || shouldSetAvatar || shouldSetPublicIds || shouldSetGoogleId || !matchedUser.emailVerified || matchedUser.authProvider !== "GOOGLE") {
        const [updatedUser] = await db
          .update(users)
          .set({
            publicUserId: nextPublicUserId,
            publicId: nextPublicId,
            clerkId: nextClerkId,
            googleId: googleSub,
            emailVerified: true,
            displayName: shouldSetDisplayName ? displayName : matchedUser.displayName,
            avatarUrl: shouldSetAvatar ? googleProfile.picture ?? matchedUser.avatarUrl : matchedUser.avatarUrl,
            authProvider: "GOOGLE",
            authMetadataJson: nextMetadata,
            lastActiveAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(users.id, matchedUser.id))
          .returning();

        return updatedUser ?? matchedUser;
      }

      return matchedUser;
    }

    const publicUserId = await this.generateUniquePublicUserId();
    const generatedReferralCode = await this.generateUniqueReferralCode();
    const username = await this.generateUniqueUsername(displayName, normalizedEmail);
    const referredByUserId = await this.resolveReferrerId(referralCode);

    const [createdUser] = await db
      .insert(users)
      .values({
        publicUserId,
        publicId: publicUserId,
        clerkId: legacyIdentityKey,
        googleId: googleSub,
        email: normalizedEmail,
        emailVerified: true,
        displayName,
        username,
        avatarUrl: googleProfile.picture ?? null,
        platformRole: "USER",
        authProvider: "GOOGLE",
        authMetadataJson: this.mergeGoogleAuthMetadata(null, googleSub),
        country: "ZZ",
        status: "ACTIVE" as any,
        referralCode: generatedReferralCode,
        referredByUserId,
        lastActiveAt: new Date(),
      })
      .returning();

    if (!createdUser) {
      throw new Error("Failed to create app user from Google identity");
    }

    await db.insert(profiles).values({ userId: createdUser.id }).onConflictDoNothing();
    await this.walletService.getOrCreateWallet(createdUser.id);
    return createdUser;
  }

  private getStoredGoogleSubject(appUser: typeof users.$inferSelect) {
    if (appUser.googleId?.trim()) {
      return appUser.googleId.trim();
    }

    const metadata = appUser.authMetadataJson;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }

    const value = (metadata as Record<string, unknown>).googleSub;
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
  }

  private mergeGoogleAuthMetadata(metadata: unknown, googleSub: string) {
    const next = metadata && typeof metadata === "object" && !Array.isArray(metadata)
      ? { ...(metadata as Record<string, unknown>) }
      : {};

    next.authProvider = "GOOGLE";
    next.googleSub = googleSub;
    return next;
  }

  private readString(value: unknown) {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
  }

  private readTimestamp(value: unknown) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }

    return new Date(value);
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

  private async generateUniqueAgencyPublicId() {
    for (let attempt = 0; attempt < 20; attempt++) {
      const publicId = `A${this.randomDigits(9)}`;
      const [existing] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.publicId, publicId)).limit(1);
      if (!existing) {
        return publicId;
      }
    }

    return `A${Date.now().toString().slice(-9)}`;
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

  private async buildSessionActor(appUser: typeof users.$inferSelect): Promise<Omit<SessionActor, "sessionId">> {
    const email = normalizeEmail(appUser.email);
    const ownedAgency = await this.getOwnedAgencyForUser(appUser.id);
    const isAdminUser = Boolean(
      appUser.platformRole === "ADMIN"
      || appUser.authRole === "admin"
      || appUser.role === "ADMIN"
      || isAllowedAdminEmail(email)
      || await this.getAdminRecordByEmail(email),
    );

    let role: AppRole = "USER";
    let platformRole: PlatformRole = "USER";
    let agencyStatus: AgencyStatus = "NONE";
    let agencyId: string | null = null;

    if (isAdminUser) {
      role = "ADMIN";
      platformRole = "ADMIN";
    } else if (ownedAgency || appUser.platformRole === "AGENCY" || appUser.authRole === "agency") {
      role = "AGENCY";
      platformRole = "AGENCY";
      agencyId = ownedAgency?.id ?? null;
      agencyStatus = ownedAgency ? this.resolveAgencyApproval(ownedAgency) : "NONE";
    } else if (
      appUser.platformRole === "MODEL_AGENCY"
      || appUser.platformRole === "MODEL_INDEPENDENT"
      || appUser.role === "HOST"
      || appUser.role === "MODEL"
    ) {
      role = "HOST";
      platformRole = appUser.platformRole === "MODEL_AGENCY" || appUser.platformRole === "MODEL_INDEPENDENT"
        ? appUser.platformRole
        : appUser.role === "HOST"
          ? "MODEL_AGENCY"
          : "MODEL_INDEPENDENT";
    }

    return {
      userId: appUser.id,
      publicId: appUser.publicId ?? appUser.publicUserId ?? null,
      email,
      role,
      platformRole,
      agencyStatus,
      agencyId,
    };
  }

  private async bindAdminIdentity(adminId: string, userId: string, email: string, identityKey: string) {
    await db
      .update(admins)
      .set({
        userId,
        email: normalizeEmail(email),
        clerkId: identityKey,
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
    if (approvalStatus === "PENDING") {
      return "PENDING" as const;
    }

    // Legacy fallback: only used when approvalStatus is empty/null (old data)
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
    identityKey?: string | null;
    agencyId?: string | null;
    modelType: "INDEPENDENT" | "AGENCY";
    authProvider: AuthProvider;
    metadata?: Record<string, unknown> | null;
  }) {
    const values = {
      userId,
      clerkId: input.identityKey ?? null,
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
          clerkId: input.identityKey ?? null,
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
    * Resolves a mobile session from an app auth token.
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
          identityKey: identity.identityKey,
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
          identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
        email: identity.email,
        sessionId: identity.sessionId,
      };
    }

    return {
      status: "user",
      panel: "user",
      role: derivedPlatformRole,
      userId: appUser.id,
      identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
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
          identityKey: identity.identityKey,
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
          identityKey: identity.identityKey,
          email: identity.email,
          sessionId: identity.sessionId,
          agencyId: agency.id,
          agencyName: agency.agencyName,
          agencyCode: agency.agencyCode ?? undefined,
        };
      }

      await this.ensureAgencyMembership(identity.appUser.id, agency.id);
      await this.upsertModelProfile(identity.appUser.id, {
        identityKey: identity.identityKey,
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
      identityKey: appUser.clerkId ?? "",
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
        identityKey: identity.identityKey,
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
        identityKey: identity.identityKey,
        email: identity.email,
        sessionId: identity.sessionId,
        agencyId: agency.id,
        agencyName: agency.agencyName,
        agencyCode: agency.agencyCode ?? undefined,
      };
    }

    await this.ensureAgencyMembership(appUser.id, agency.id);
    await this.upsertModelProfile(appUser.id, {
      identityKey: identity.identityKey,
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
      identityKey: identity.identityKey,
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
      .where(and(eq(agencies.id, agencyId), eq(agencies.approvalStatus, "PENDING" as any)))
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
      .where(and(eq(agencies.id, agencyId), eq(agencies.approvalStatus, "PENDING" as any)));

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
