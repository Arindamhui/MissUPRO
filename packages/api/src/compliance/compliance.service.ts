import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { accountDeletionRequests, users } from "@missu/db/schema";
import { and, desc, eq } from "drizzle-orm";

@Injectable()
export class ComplianceService {
  async requestAccountDeletion(userId: string, reason: string) {
    const [existing] = await db
      .select()
      .from(accountDeletionRequests)
      .where(and(eq(accountDeletionRequests.userId, userId), eq(accountDeletionRequests.status, "REQUESTED" as any)))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(accountDeletionRequests)
      .values({
        userId,
        reason,
        status: "REQUESTED",
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

  async listDeletionRequests(status?: string) {
    return db
      .select()
      .from(accountDeletionRequests)
      .where(status ? eq(accountDeletionRequests.status, status as any) : undefined)
      .orderBy(desc(accountDeletionRequests.requestedAt));
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
