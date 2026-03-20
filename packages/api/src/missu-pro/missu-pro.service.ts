import { randomBytes } from "node:crypto";
import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  admins,
  agencies,
  agencyHosts,
  hostApplications,
  hosts,
  models,
  users,
} from "@missu/db/schema";
import { and, count, desc, eq, sql } from "drizzle-orm";

type HostApplicationInput = {
  mode: "PLATFORM" | "AGENCY";
  agencyCode?: string;
  idProofUrls: string[];
  talentDetails: Record<string, unknown>;
  profileInfo: Record<string, unknown>;
};

type AgencyRegistrationInput = {
  agencyName: string;
  contactName: string;
  contactEmail: string;
  country: string;
  website?: string;
  whatsappNumber?: string;
  notes?: string;
};

@Injectable()
export class MissuProService {
  async getMyWorkspace(userId: string) {
    const publicUserId = await this.ensureUserPublicId(userId);

    const [user] = await db
      .select({
        id: users.id,
        publicUserId: users.publicUserId,
        displayName: users.displayName,
        email: users.email,
        phone: users.phone,
        role: users.role,
        platformRole: users.platformRole,
        authProvider: users.authProvider,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [host] = await db
      .select({
        id: hosts.id,
        hostId: hosts.hostId,
        type: hosts.type,
        status: hosts.status,
        agencyId: hosts.agencyId,
        approvedAt: hosts.approvedAt,
      })
      .from(hosts)
      .where(eq(hosts.userId, userId))
      .limit(1);

    const [latestHostApplication] = await db
      .select({
        id: hostApplications.id,
        status: hostApplications.status,
        applicationType: hostApplications.applicationType,
        agencyCodeSnapshot: hostApplications.agencyCodeSnapshot,
        reviewNotes: hostApplications.reviewNotes,
        submittedAt: hostApplications.submittedAt,
        reviewedAt: hostApplications.reviewedAt,
      })
      .from(hostApplications)
      .where(eq(hostApplications.userId, userId))
      .orderBy(desc(hostApplications.submittedAt))
      .limit(1);

    const [ownedAgency] = await db
      .select({
        id: agencies.id,
        agencyName: agencies.agencyName,
        agencyCode: agencies.agencyCode,
        approvalStatus: agencies.approvalStatus,
        status: agencies.status,
        createdAt: agencies.createdAt,
      })
      .from(agencies)
      .where(eq(agencies.userId, userId))
      .limit(1);

    return {
      user: {
        ...user,
        publicUserId,
      },
      host: host ?? null,
      latestHostApplication: latestHostApplication ?? null,
      ownedAgency: ownedAgency ?? null,
      capabilities: {
        canApplyForHost: !host || host.status !== "APPROVED",
        canRegisterAgency: !ownedAgency,
        canOpenAgencyPanel: this.isAgencyApproved(ownedAgency),
      },
    };
  }

  async lookupAgencyByCode(agencyCode: string) {
    const agency = await this.findAgencyByCode(agencyCode);
    if (!agency) {
      return { found: false, status: "NOT_FOUND" as const };
    }

    return {
      found: true,
      status: this.isAgencyApproved(agency) ? "APPROVED" as const : "PENDING" as const,
      agency: {
        id: agency.id,
        agencyName: agency.agencyName,
        agencyCode: agency.agencyCode,
      },
    };
  }

  async submitHostApplication(userId: string, input: HostApplicationInput) {
    await this.ensureUserPublicId(userId);

    const [existingHost] = await db
      .select({ id: hosts.id, hostId: hosts.hostId, status: hosts.status })
      .from(hosts)
      .where(eq(hosts.userId, userId))
      .limit(1);

    if (existingHost?.status === "APPROVED") {
      return { status: "already_host" as const, host: existingHost };
    }

    const [pendingApplication] = await db
      .select()
      .from(hostApplications)
      .where(and(eq(hostApplications.userId, userId), eq(hostApplications.status, "PENDING" as any)))
      .limit(1);

    if (pendingApplication) {
      return { status: "already_pending" as const, application: pendingApplication };
    }

    let agencyId: string | null = null;
    let agencyCodeSnapshot: string | null = null;
    if (input.mode === "AGENCY") {
      const agency = await this.findAgencyByCode(input.agencyCode ?? "");
      if (!agency) {
        throw new Error("Agency ID was not found");
      }
      if (!this.isAgencyApproved(agency)) {
        throw new Error("Agency exists but is not approved yet");
      }
      agencyId = agency.id;
      agencyCodeSnapshot = agency.agencyCode ?? null;
    }

    const [createdApplication] = await db
      .insert(hostApplications)
      .values({
        userId,
        agencyId,
        applicationType: input.mode,
        status: "PENDING",
        agencyCodeSnapshot,
        talentDetailsJson: input.talentDetails,
        profileInfoJson: input.profileInfo,
        idProofUrlsJson: input.idProofUrls,
      })
      .returning();

    return { status: "submitted" as const, application: createdApplication! };
  }

  async registerAgency(userId: string, input: AgencyRegistrationInput) {
    await this.ensureUserPublicId(userId);

    const [existingAgency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.userId, userId))
      .limit(1);

    if (existingAgency) {
      return existingAgency;
    }

    const agencyCode = await this.generateUniqueAgencyCode();
    const metadataJson = {
      website: input.website ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      notes: input.notes ?? null,
      source: "missu_pro_agency_registration",
    } satisfies Record<string, unknown>;

    const [createdAgency] = await db
      .insert(agencies)
      .values({
        userId,
        agencyName: input.agencyName,
        contactName: input.contactName,
        contactEmail: input.contactEmail.toLowerCase(),
        country: input.country,
        agencyCode,
        status: "PENDING",
        approvalStatus: "PENDING",
        metadataJson,
      })
      .returning();

    return createdAgency!;
  }

  async getAgencyOverview(userId: string) {
    const [agency] = await db
      .select({
        id: agencies.id,
        agencyName: agencies.agencyName,
        agencyCode: agencies.agencyCode,
        contactName: agencies.contactName,
        contactEmail: agencies.contactEmail,
        country: agencies.country,
        status: agencies.status,
        approvalStatus: agencies.approvalStatus,
        createdAt: agencies.createdAt,
      })
      .from(agencies)
      .where(eq(agencies.userId, userId))
      .limit(1);

    if (!agency) {
      throw new Error("Agency profile not found");
    }

    const roster = await db
      .select({
        id: hosts.id,
        hostId: hosts.hostId,
        hostStatus: hosts.status,
        hostType: hosts.type,
        userId: users.id,
        publicUserId: users.publicUserId,
        displayName: users.displayName,
        email: users.email,
        createdAt: hosts.createdAt,
      })
      .from(hosts)
      .innerJoin(users, eq(users.id, hosts.userId))
      .where(eq(hosts.agencyId, agency.id))
      .orderBy(desc(hosts.createdAt));

    const [pendingApplicationsCountRow] = await db
      .select({ count: count() })
      .from(hostApplications)
      .where(and(eq(hostApplications.agencyId, agency.id), eq(hostApplications.status, "PENDING" as any)));

    return {
      agency,
      analytics: {
        totalHosts: roster.length,
        approvedHosts: roster.filter((item) => item.hostStatus === "APPROVED").length,
        platformHosts: roster.filter((item) => item.hostType === "PLATFORM").length,
        pendingApplications: Number(pendingApplicationsCountRow?.count ?? 0),
      },
      roster,
    };
  }

  async getAdminOverview() {
    const [userCountRow, hostCountRow, agencyCountRow, pendingHostCountRow, pendingAgencyCountRow] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(hosts).where(eq(hosts.status, "APPROVED" as any)),
      db.select({ count: count() }).from(agencies).where(eq(agencies.approvalStatus, "APPROVED" as any)),
      db.select({ count: count() }).from(hostApplications).where(eq(hostApplications.status, "PENDING" as any)),
      db.select({ count: count() }).from(agencies).where(eq(agencies.approvalStatus, "PENDING" as any)),
    ]).then((results) => results.map((rows) => rows[0]));

    const recentHostApplications = await this.listHostApplications("PENDING", 6);
    const recentAgencies = await this.listAgencies("PENDING", 6);

    return {
      kpis: {
        totalUsers: Number(userCountRow?.count ?? 0),
        totalHosts: Number(hostCountRow?.count ?? 0),
        totalAgencies: Number(agencyCountRow?.count ?? 0),
        pendingHostApplications: Number(pendingHostCountRow?.count ?? 0),
        pendingAgencyApprovals: Number(pendingAgencyCountRow?.count ?? 0),
      },
      recentHostApplications,
      recentAgencies,
    };
  }

  async listHostApplications(status?: "PENDING" | "APPROVED" | "REJECTED", limit = 20) {
    const rows = await db
      .select({
        id: hostApplications.id,
        status: hostApplications.status,
        applicationType: hostApplications.applicationType,
        agencyCodeSnapshot: hostApplications.agencyCodeSnapshot,
        reviewNotes: hostApplications.reviewNotes,
        submittedAt: hostApplications.submittedAt,
        reviewedAt: hostApplications.reviewedAt,
        userId: users.id,
        publicUserId: users.publicUserId,
        displayName: users.displayName,
        email: users.email,
        agencyId: agencies.id,
        agencyName: agencies.agencyName,
        agencyCode: agencies.agencyCode,
      })
      .from(hostApplications)
      .innerJoin(users, eq(users.id, hostApplications.userId))
      .leftJoin(agencies, eq(agencies.id, hostApplications.agencyId))
      .where(status ? eq(hostApplications.status, status as any) : undefined)
      .orderBy(desc(hostApplications.submittedAt))
      .limit(limit);

    return rows;
  }

  async reviewHostApplication(adminUserId: string, input: { applicationId: string; action: "approve" | "reject"; reason?: string }) {
    const [application] = await db
      .select()
      .from(hostApplications)
      .where(eq(hostApplications.id, input.applicationId))
      .limit(1);

    if (!application) {
      throw new Error("Host application not found");
    }

    const [user] = await db
      .select({ id: users.id, authProvider: users.authProvider })
      .from(users)
      .where(eq(users.id, application.userId))
      .limit(1);

    if (!user) {
      throw new Error("Host applicant was not found");
    }

    if (input.action === "reject") {
      const [updatedApplication] = await db
        .update(hostApplications)
        .set({
          status: "REJECTED",
          reviewNotes: input.reason ?? "Rejected during admin review",
          reviewedByAdminUserId: adminUserId,
          reviewedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(hostApplications.id, input.applicationId))
        .returning();

      return { application: updatedApplication!, host: null };
    }

    if (application.applicationType === "AGENCY" && !application.agencyId) {
      throw new Error("Agency host applications require a valid approved agency");
    }

    const existingHost = await this.getHostByUserId(application.userId);
    const hostId = existingHost?.hostId ?? await this.generateUniqueHostId(application.applicationType);

    let hostRecord = existingHost;
    if (existingHost) {
      const [updatedHost] = await db
        .update(hosts)
        .set({
          hostId,
          agencyId: application.agencyId,
          type: application.applicationType,
          status: "APPROVED",
          talentDetailsJson: application.talentDetailsJson,
          profileInfoJson: application.profileInfoJson,
          idProofUrlsJson: application.idProofUrlsJson,
          sourceApplicationId: application.id,
          reviewNotes: input.reason ?? null,
          reviewedByAdminUserId: adminUserId,
          approvedAt: new Date(),
          rejectedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(hosts.id, existingHost.id))
        .returning();
      hostRecord = updatedHost!;
    } else {
      const [createdHost] = await db
        .insert(hosts)
        .values({
          hostId,
          userId: application.userId,
          agencyId: application.agencyId,
          type: application.applicationType,
          status: "APPROVED",
          talentDetailsJson: application.talentDetailsJson,
          profileInfoJson: application.profileInfoJson,
          idProofUrlsJson: application.idProofUrlsJson,
          sourceApplicationId: application.id,
          reviewNotes: input.reason ?? null,
          reviewedByAdminUserId: adminUserId,
          approvedAt: new Date(),
        })
        .returning();
      hostRecord = createdHost!;
    }

    if (application.agencyId) {
      await db.insert(agencyHosts).values({
        agencyId: application.agencyId,
        userId: application.userId,
        status: "ACTIVE" as any,
      }).onConflictDoNothing();
    }

    await db
      .update(users)
      .set({
        role: "HOST" as any,
        platformRole: application.applicationType === "AGENCY" ? "MODEL_AGENCY" as any : "MODEL_INDEPENDENT" as any,
        authRole: null,
        lastActiveAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, application.userId));

    await this.upsertCreatorProfile({
      userId: application.userId,
      hostId,
      agencyId: application.agencyId,
      applicationType: application.applicationType,
      authProvider: user.authProvider,
      talentDetailsJson: application.talentDetailsJson,
      profileInfoJson: application.profileInfoJson,
    });

    const [updatedApplication] = await db
      .update(hostApplications)
      .set({
        status: "APPROVED",
        reviewNotes: input.reason ?? null,
        reviewedByAdminUserId: adminUserId,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(hostApplications.id, input.applicationId))
      .returning();

    return { application: updatedApplication!, host: hostRecord };
  }

  async listAgencies(status?: "PENDING" | "APPROVED" | "REJECTED", limit = 20) {
    const agencyRows = await db
      .select({
        id: agencies.id,
        userId: agencies.userId,
        agencyName: agencies.agencyName,
        agencyCode: agencies.agencyCode,
        contactName: agencies.contactName,
        contactEmail: agencies.contactEmail,
        country: agencies.country,
        status: agencies.status,
        approvalStatus: agencies.approvalStatus,
        createdAt: agencies.createdAt,
      })
      .from(agencies)
      .where(status ? eq(agencies.approvalStatus, status as any) : undefined)
      .orderBy(desc(agencies.createdAt))
      .limit(limit);

    return Promise.all(
      agencyRows.map(async (agency) => {
        const [hostCountRow] = await db
          .select({ count: count() })
          .from(hosts)
          .where(eq(hosts.agencyId, agency.id));

        return {
          ...agency,
          hostCount: Number(hostCountRow?.count ?? 0),
        };
      }),
    );
  }

  async reviewAgency(adminUserId: string, input: { agencyId: string; action: "approve" | "reject"; reason?: string }) {
    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, input.agencyId))
      .limit(1);

    if (!agency) {
      throw new Error("Agency application not found");
    }

    const adminRecordId = await this.resolveAdminRecordId(adminUserId);
    const metadataJson = {
      ...(agency.metadataJson as Record<string, unknown> | null ?? {}),
      reviewReason: input.reason ?? null,
      reviewedFrom: "missu_pro_admin",
    };

    const approvalStatus = input.action === "approve" ? "APPROVED" : "REJECTED";
    const status = input.action === "approve" ? "ACTIVE" : "REJECTED";

    const [updatedAgency] = await db
      .update(agencies)
      .set({
        status,
        approvalStatus: approvalStatus as any,
        approvedAt: input.action === "approve" ? new Date() : null,
        rejectedAt: input.action === "reject" ? new Date() : null,
        approvedByAdminId: input.action === "approve" ? adminRecordId : agency.approvedByAdminId,
        metadataJson,
        updatedAt: new Date(),
      })
      .where(eq(agencies.id, input.agencyId))
      .returning();

    if (input.action === "approve" && agency.userId) {
      await db
        .update(users)
        .set({
          role: "HOST" as any,
          authRole: "agency" as any,
          platformRole: "AGENCY" as any,
          updatedAt: new Date(),
          lastActiveAt: new Date(),
        })
        .where(eq(users.id, agency.userId));
    }

    return updatedAgency!;
  }

  async listHosts(status?: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED", limit = 25) {
    return db
      .select({
        id: hosts.id,
        hostId: hosts.hostId,
        status: hosts.status,
        type: hosts.type,
        approvedAt: hosts.approvedAt,
        createdAt: hosts.createdAt,
        userId: users.id,
        publicUserId: users.publicUserId,
        displayName: users.displayName,
        email: users.email,
        agencyId: agencies.id,
        agencyName: agencies.agencyName,
        agencyCode: agencies.agencyCode,
      })
      .from(hosts)
      .innerJoin(users, eq(users.id, hosts.userId))
      .leftJoin(agencies, eq(agencies.id, hosts.agencyId))
      .where(status ? eq(hosts.status, status as any) : undefined)
      .orderBy(desc(hosts.createdAt))
      .limit(limit);
  }

  private async resolveAdminRecordId(adminUserId: string) {
    const [adminRecord] = await db
      .select({ id: admins.id })
      .from(admins)
      .where(eq(admins.userId, adminUserId))
      .limit(1);

    return adminRecord?.id ?? null;
  }

  private async ensureUserPublicId(userId: string) {
    const [user] = await db
      .select({ publicUserId: users.publicUserId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.publicUserId) {
      return user.publicUserId;
    }

    const publicUserId = await this.generateUniqueUserId();
    await db
      .update(users)
      .set({ publicUserId, updatedAt: new Date() })
      .where(eq(users.id, userId));

    return publicUserId;
  }

  private async findAgencyByCode(agencyCode: string) {
    const normalizedCode = agencyCode.trim().toUpperCase();
    if (!normalizedCode) {
      return null;
    }

    const [agency] = await db
      .select({
        id: agencies.id,
        agencyName: agencies.agencyName,
        agencyCode: agencies.agencyCode,
        status: agencies.status,
        approvalStatus: agencies.approvalStatus,
      })
      .from(agencies)
      .where(eq(agencies.agencyCode, normalizedCode))
      .limit(1);

    return agency ?? null;
  }

  private isAgencyApproved(agency: { status?: string | null; approvalStatus?: string | null } | null | undefined) {
    const approvalStatus = String(agency?.approvalStatus ?? "").toUpperCase();
    const status = String(agency?.status ?? "").toUpperCase();
    return approvalStatus === "APPROVED" || status === "ACTIVE";
  }

  private async getHostByUserId(userId: string) {
    const [existingHost] = await db
      .select({
        id: hosts.id,
        hostId: hosts.hostId,
      })
      .from(hosts)
      .where(eq(hosts.userId, userId))
      .limit(1);

    return existingHost ?? null;
  }

  private async upsertCreatorProfile(input: {
    userId: string;
    hostId: string;
    agencyId: string | null;
    applicationType: "PLATFORM" | "AGENCY";
    authProvider: typeof users.$inferSelect.authProvider;
    talentDetailsJson: unknown;
    profileInfoJson: unknown;
  }) {
    const talentDetails = (input.talentDetailsJson as Record<string, unknown> | null) ?? {};
    const profileInfo = (input.profileInfoJson as Record<string, unknown> | null) ?? {};
    const talentCategories = Array.isArray(talentDetails.categories)
      ? talentDetails.categories.map((item) => String(item))
      : [];
    const languages = Array.isArray(profileInfo.languages)
      ? profileInfo.languages.map((item) => String(item))
      : [];
    const talentDescription = typeof talentDetails.description === "string"
      ? talentDetails.description
      : typeof profileInfo.tagline === "string"
        ? profileInfo.tagline
        : "MissU approved host";
    const aboutText = typeof profileInfo.about === "string" ? profileInfo.about : null;

    const [existingModel] = await db
      .select({ id: models.id })
      .from(models)
      .where(eq(models.userId, input.userId))
      .limit(1);

    const values = {
      userId: input.userId,
      agencyId: input.agencyId,
      modelType: input.applicationType === "AGENCY" ? "AGENCY" as const : "INDEPENDENT" as const,
      registrationStatus: "ACTIVE" as any,
      authProvider: input.authProvider,
      metadataJson: {
        source: "missu_host_program",
        hostId: input.hostId,
      },
      talentCategoriesJson: talentCategories,
      talentDescription,
      languagesJson: languages,
      aboutText,
      callRateAudioCoins: 0,
      callRateVideoCoins: 0,
      approvedAt: new Date(),
    };

    if (existingModel) {
      await db
        .update(models)
        .set({
          ...values,
          updatedAt: new Date(),
        })
        .where(eq(models.id, existingModel.id));
      return;
    }

    await db.insert(models).values(values as any);
  }

  private async generateUniqueUserId() {
    return this.generateUniqueCode("U", 9, async (candidate) => {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.publicUserId, candidate)).limit(1);
      return Boolean(existing);
    });
  }

  private async generateUniqueAgencyCode() {
    return this.generateUniqueCode("AG", 8, async (candidate) => {
      const [existing] = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.agencyCode, candidate)).limit(1);
      return Boolean(existing);
    });
  }

  private async generateUniqueHostId(type: "PLATFORM" | "AGENCY") {
    const prefix = type === "AGENCY" ? "AH" : "H";
    const digits = type === "AGENCY" ? 8 : 9;
    return this.generateUniqueCode(prefix, digits, async (candidate) => {
      const [existing] = await db.select({ id: hosts.id }).from(hosts).where(eq(hosts.hostId, candidate)).limit(1);
      return Boolean(existing);
    });
  }

  private async generateUniqueCode(prefix: string, digits: number, exists: (candidate: string) => Promise<boolean>) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const candidate = `${prefix}${this.randomDigits(digits)}`;
      if (!(await exists(candidate))) {
        return candidate;
      }
    }

    return `${prefix}${String(Date.now()).slice(-digits).padStart(digits, "0")}`;
  }

  private randomDigits(length: number) {
    let digits = "";
    while (digits.length < length) {
      digits += randomBytes(Math.max(length, 6)).toString("hex").replace(/[^0-9]/g, "");
    }
    return digits.slice(0, length);
  }
}