import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import {
  accountDeletionRequests, users, dataExportRequests, profiles, wallets,
  vipSubscriptions, referrals, referralRewards, notifications, authSessions,
} from "@missu/db/schema";
import { and, desc, eq } from "drizzle-orm";

@Injectable()
export class ComplianceService {
  async requestAccountDeletion(userId: string, reason: string) {
    const [existing] = await db
      .select()
      .from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.userId, userId), eq(accountDeletionRequests.status, "COOLING_OFF" as any)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(accountDeletionRequests)
      .values({
        userId,
        reason,
        status: "COOLING_OFF",
        coolingOffExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      })
      .returning();

    return created!;
  }

  async getMyDeletionRequest(userId: string) {
    const [request] = await db
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.userId, userId))
      .orderBy(desc(accountDeletionRequests.requestedAt))
      .limit(1);

    return request ?? null;
  }

  async cancelAccountDeletion(userId: string) {
    const [existing] = await db
      .select()
      .from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.userId, userId), eq(accountDeletionRequests.status, "COOLING_OFF" as any)))
      .limit(1);

    if (!existing) {
      throw new Error("No pending deletion request found");
    }

    const [cancelled] = await db
      .update(accountDeletionRequests)
      .set({ status: "CANCELLED" as any, cancelledAt: new Date() })
      .where(eq(accountDeletionRequests.id, existing.id))
      .returning();

    return cancelled!;
  }

  async deleteMyAccount(userId: string, reason: string) {
    const now = new Date();
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

    if (!user) {
      throw new Error("User not found");
    }

    const [existingRequest] = await db
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.userId, userId))
      .orderBy(desc(accountDeletionRequests.requestedAt))
      .limit(1);

    if (existingRequest) {
      await db
        .update(accountDeletionRequests)
        .set({
          status: "COMPLETED" as any,
          reason,
          completedAt: now,
          cancelledAt: null,
          coolingOffExpiresAt: now,
        })
        .where(eq(accountDeletionRequests.id, existingRequest.id));
    } else {
      await db.insert(accountDeletionRequests).values({
        userId,
        reason,
        status: "COMPLETED",
        requestedAt: now,
        coolingOffExpiresAt: now,
        completedAt: now,
      });
    }

    const deletedEmail = `deleted+${user.id}@missu.local`;
    const deletedUsername = `deleted_${user.id.replace(/-/g, "").slice(0, 24)}`;
    const deletedReferralCode = `DEL${user.id.replace(/-/g, "").slice(0, 12).toUpperCase()}`;

    await db
      .update(users)
      .set({
        clerkId: null,
        email: deletedEmail,
        emailVerified: false,
        phone: null,
        phoneVerified: false,
        passwordHash: null,
        displayName: "Deleted User",
        username: deletedUsername,
        avatarUrl: null,
        authRole: null,
        role: "USER" as any,
        status: "DELETED" as any,
        city: null,
        gender: null,
        dateOfBirth: null,
        referralCode: deletedReferralCode,
        lastActiveAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    await db
      .update(profiles)
      .set({
        bio: null,
        socialLinksJson: null,
        interestsJson: null,
        profileFrameUrl: null,
        headerImageUrl: null,
        locationDisplay: null,
        updatedAt: now,
      })
      .where(eq(profiles.userId, userId));

    await db.delete(authSessions).where(eq(authSessions.userId, userId));

    return { success: true };
  }

  async listDeletionRequests(status?: string) {
    return db
      .select()
      .from(accountDeletionRequests)
      .where(status ? eq(accountDeletionRequests.status, status as any) : undefined)
      .orderBy(desc(accountDeletionRequests.requestedAt));
  }

  async requestDataExport(userId: string) {
    const [existing] = await db
      .select()
      .from(dataExportRequests)
      .where(and(eq(dataExportRequests.userId, userId), eq(dataExportRequests.status, "REQUESTED" as any)))
      .orderBy(desc(dataExportRequests.requestedAt))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(dataExportRequests)
      .values({
        userId,
        status: "REQUESTED" as any,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      })
      .returning();

    return created!;
  }

  async listMyDataExports(userId: string) {
    return db
      .select()
      .from(dataExportRequests)
      .where(eq(dataExportRequests.userId, userId))
      .orderBy(desc(dataExportRequests.requestedAt));
  }

  async getMyDataExport(userId: string, requestId: string) {
    const [request] = await db
      .select()
      .from(dataExportRequests)
      .where(and(eq(dataExportRequests.id, requestId), eq(dataExportRequests.userId, userId)))
      .limit(1);

    return request ?? null;
  }

  async listDataExportRequests(status?: string) {
    return db
      .select()
      .from(dataExportRequests)
      .where(status ? eq(dataExportRequests.status, status as any) : undefined)
      .orderBy(desc(dataExportRequests.requestedAt));
  }

  async processDataExportRequest(requestId: string, adminId: string) {
    const [request] = await db
      .update(dataExportRequests)
      .set({
        status: "PROCESSING" as any,
        processingStartedAt: new Date(),
        processedByAdminId: adminId,
        updatedAt: new Date(),
      })
      .where(eq(dataExportRequests.id, requestId))
      .returning();

    if (!request) {
      throw new Error("Data export request not found");
    }

    const [user, profile, wallet, subscriptions, userReferrals, rewards, recentNotifications, sessions] = await Promise.all([
      db.select().from(users).where(eq(users.id, request.userId)).limit(1).then((rows) => rows[0] ?? null),
      db.select().from(profiles).where(eq(profiles.userId, request.userId)).limit(1).then((rows) => rows[0] ?? null),
      db.select().from(wallets).where(eq(wallets.userId, request.userId)).limit(1).then((rows) => rows[0] ?? null),
      db.select().from(vipSubscriptions).where(eq(vipSubscriptions.userId, request.userId)),
      db.select().from(referrals).where(eq(referrals.inviterUserId, request.userId)),
      db.select().from(referralRewards).where(eq(referralRewards.inviterUserId, request.userId)),
      db.select().from(notifications).where(eq(notifications.userId, request.userId)).orderBy(desc(notifications.createdAt)).limit(100),
      db.select().from(authSessions).where(eq(authSessions.userId, request.userId)).orderBy(desc(authSessions.createdAt)).limit(25),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      user,
      profile,
      wallet,
      subscriptions,
      referrals: userReferrals,
      referralRewards: rewards,
      recentNotifications,
      sessions,
    };

    const [updated] = await db
      .update(dataExportRequests)
      .set({
        status: "COMPLETED" as any,
        payloadJson: payload as any,
        completedAt: new Date(),
        retentionUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(dataExportRequests.id, request.id))
      .returning();

    return updated!;
  }

  async runRetentionSweep() {
    const now = new Date();
    const completedExports = await db
      .select()
      .from(dataExportRequests)
      .where(eq(dataExportRequests.status, "COMPLETED" as any));

    let expiredExports = 0;
    for (const exportRequest of completedExports) {
      if (exportRequest.retentionUntil && new Date(exportRequest.retentionUntil) <= now) {
        await db
          .update(dataExportRequests)
          .set({
            status: "EXPIRED" as any,
            payloadJson: null,
            downloadUrl: null,
            updatedAt: now,
          })
          .where(eq(dataExportRequests.id, exportRequest.id));
        expiredExports += 1;
      }
    }

    const readyForDeletion = await db
      .select()
      .from(accountDeletionRequests)
      .where(eq(accountDeletionRequests.status, "COOLING_OFF" as any));

    const deletionsReady = readyForDeletion.filter(
      (request) => request.coolingOffExpiresAt && new Date(request.coolingOffExpiresAt) <= now,
    ).length;

    return { expiredExports, deletionsReady };
  }

  async processDeletionRequest(
    requestId: string,
    adminId: string,
    action: "COMPLETED" | "CANCELLED" | "LEGAL_HOLD",
  ) {
    const now = new Date();
    const updatePayload: Record<string, unknown> = {
      status: action,
      processedByAdminId: adminId,
    };

    if (action === "COMPLETED") {
      updatePayload.completedAt = now;
    }

    if (action === "CANCELLED") {
      updatePayload.cancelledAt = now;
    }

    const [updated] = await db
      .update(accountDeletionRequests)
      .set(updatePayload)
      .where(eq(accountDeletionRequests.id, requestId))
      .returning();

    if (updated && action === "COMPLETED") {
      await db
        .update(users)
        .set({ status: "DELETED" as any, updatedAt: now })
        .where(eq(users.id, updated.userId));
    }

    return updated;
  }
}
