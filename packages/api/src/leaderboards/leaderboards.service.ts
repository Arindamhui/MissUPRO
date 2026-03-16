import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { db } from "@missu/db";
import {
  leaderboards,
  leaderboardEntries,
  leaderboardSnapshots,
  giftTransactions,
  users,
} from "@missu/db/schema";
import { eq, and, desc, asc, sql, between } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { decodeCursor, encodeCursor } from "@missu/utils";

@Injectable()
export class LeaderboardsService {
  async listLeaderboards(status?: string) {
    const conditions = status ? [eq(leaderboards.status, status as any)] : [];
    return db
      .select()
      .from(leaderboards)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(leaderboards.updatedAt));
  }

  async getLeaderboard(leaderboardId: string) {
    const [board] = await db.select().from(leaderboards).where(eq(leaderboards.id, leaderboardId)).limit(1);
    if (!board) throw new TRPCError({ code: "NOT_FOUND", message: "Leaderboard not found" });
    return board;
  }

  async getEntries(leaderboardId: string, cursor?: string, limit = 50) {
    const [board] = await db.select().from(leaderboards).where(eq(leaderboards.id, leaderboardId)).limit(1);
    if (!board) throw new TRPCError({ code: "NOT_FOUND", message: "Leaderboard not found" });

    const offset = cursor ? decodeCursor(cursor) : 0;
    const results = await db
      .select({
        userId: leaderboardEntries.userId,
        rankPosition: leaderboardEntries.rankPosition,
        scoreValue: leaderboardEntries.scoreValue,
        scoreDelta: leaderboardEntries.scoreDelta,
        snapshotAt: leaderboardEntries.snapshotAt,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(leaderboardEntries)
      .innerJoin(users, eq(users.id, leaderboardEntries.userId))
      .where(eq(leaderboardEntries.leaderboardId, leaderboardId))
      .orderBy(asc(leaderboardEntries.rankPosition))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = results.length > limit;
    return {
      leaderboard: board,
      items: hasMore ? results.slice(0, limit) : results,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async getSnapshots(leaderboardId: string, limit = 30) {
    const [board] = await db.select().from(leaderboards).where(eq(leaderboards.id, leaderboardId)).limit(1);
    if (!board) throw new TRPCError({ code: "NOT_FOUND", message: "Leaderboard not found" });

    const snapshots = await db
      .select()
      .from(leaderboardSnapshots)
      .where(eq(leaderboardSnapshots.leaderboardId, leaderboardId))
      .orderBy(desc(leaderboardSnapshots.snapshotDate))
      .limit(limit);

    return { leaderboard: board, snapshots };
  }

  async refreshLeaderboard(leaderboardId: string) {
    const [board] = await db.select().from(leaderboards).where(eq(leaderboards.id, leaderboardId)).limit(1);
    if (!board) throw new TRPCError({ code: "NOT_FOUND", message: "Leaderboard not found" });

    const now = new Date();
    const windowStart = this.getWindowStart(board.windowType, now);
    const windowEnd = now;

    let ranked: { userId: string; scoreValue: string }[] = [];

    if (board.scoringMetric === "gift_coins_received" || board.scoringMetric === "gift_coins_sent") {
      const column = board.scoringMetric === "gift_coins_received"
        ? giftTransactions.receiverUserId
        : giftTransactions.senderUserId;
      const aggregated = await db
        .select({
          userId: column,
          total: sql<string>`COALESCE(SUM(${giftTransactions.coinCost}), 0)::numeric(14,4)`,
        })
        .from(giftTransactions)
        .where(between(giftTransactions.createdAt, windowStart, windowEnd))
        .groupBy(column)
        .orderBy(desc(sql`SUM(${giftTransactions.coinCost})`))
        .limit(board.maxEntries ?? 100);
      ranked = aggregated.map((r) => ({ userId: r.userId, scoreValue: String(r.total) }));
    } else {
      return { leaderboardId, updated: 0, message: "Unsupported scoring metric for refresh" };
    }

    const snapshotDate = now.toISOString().slice(0, 10);

    await db.transaction(async (tx) => {
      await tx.delete(leaderboardEntries).where(eq(leaderboardEntries.leaderboardId, leaderboardId));

      for (let i = 0; i < ranked.length; i++) {
        const row = ranked[i]!;
        await tx.insert(leaderboardEntries).values({
          leaderboardId,
          userId: row.userId,
          rankPosition: i + 1,
          scoreValue: row.scoreValue,
          scoreDelta: "0",
          snapshotAt: now,
        } as any);
      }

      await tx.insert(leaderboardSnapshots).values({
        leaderboardId,
        snapshotDate: snapshotDate as any,
        entriesJson: ranked,
        totalParticipants: ranked.length,
      } as any);

      await tx.update(leaderboards).set({ updatedAt: now }).where(eq(leaderboards.id, leaderboardId));
    });

    return { leaderboardId, updated: ranked.length };
  }

  private getWindowStart(windowType: string, now: Date): Date {
    const d = new Date(now);
    if (windowType === "DAILY") {
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    if (windowType === "WEEKLY") {
      const day = d.getUTCDay();
      const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
      d.setUTCDate(diff);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    if (windowType === "MONTHLY") {
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    }
    d.setTime(0);
    return d;
  }

  async createLeaderboard(
    data: {
      title: string;
      leaderboardType: string;
      scoringMetric: string;
      windowType: string;
      maxEntries?: number;
      refreshIntervalSeconds?: number;
    },
    createdByAdminId: string,
  ) {
    const [board] = await db
      .insert(leaderboards)
      .values({
        title: data.title,
        leaderboardType: data.leaderboardType as any,
        scoringMetric: data.scoringMetric,
        windowType: data.windowType,
        maxEntries: data.maxEntries ?? 100,
        refreshIntervalSeconds: data.refreshIntervalSeconds ?? 300,
        status: "ACTIVE" as any,
        createdByAdminId,
      } as any)
      .returning();
    return board!;
  }

  async updateLeaderboard(leaderboardId: string, data: Partial<{ title: string; status: string; maxEntries: number; refreshIntervalSeconds: number }>) {
    const [updated] = await db
      .update(leaderboards)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(leaderboards.id, leaderboardId))
      .returning();
    return updated ?? null;
  }

  @Cron("*/5 * * * *")
  async refreshDueLeaderboards() {
    const boards = await db
      .select({ id: leaderboards.id, updatedAt: leaderboards.updatedAt, refreshIntervalSeconds: leaderboards.refreshIntervalSeconds })
      .from(leaderboards)
      .where(eq(leaderboards.status, "ACTIVE" as any));
    const now = Date.now();
    for (const board of boards) {
      const updatedAt = board.updatedAt ? new Date(board.updatedAt).getTime() : 0;
      const intervalMs = (board.refreshIntervalSeconds ?? 300) * 1000;
      if (now - updatedAt >= intervalMs) {
        try {
          await this.refreshLeaderboard(board.id);
        } catch {
          // ignore per-board errors
        }
      }
    }
  }
}
