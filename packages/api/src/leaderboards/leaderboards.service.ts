import { Injectable, Logger } from "@nestjs/common";
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
import { isDatabaseConnectionRefusedError } from "../common/database-errors";

@Injectable()
export class LeaderboardsService {
  private readonly logger = new Logger(LeaderboardsService.name);
  private userSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private leaderboardSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private hasWarnedAboutDatabase = false;

  private markDatabaseAvailable() {
    this.hasWarnedAboutDatabase = false;
  }

  private warnDatabaseUnavailable(message: string) {
    if (this.hasWarnedAboutDatabase) {
      return;
    }

    this.hasWarnedAboutDatabase = true;
    this.logger.warn(message);
  }

  private async getUserSchemaMode() {
    if (!this.userSchemaModePromise) {
      this.userSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'users'
            and column_name = 'display_name'
        ) as has_display_name
      `).then((result) => {
        const value = result.rows[0] as { has_display_name?: boolean | string | number } | undefined;
        return value?.has_display_name ? "modern" : "legacy";
      });
    }

    return this.userSchemaModePromise;
  }

  private async getLeaderboardSchemaMode() {
    if (!this.leaderboardSchemaModePromise) {
      this.leaderboardSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'leaderboards'
            and column_name = 'leaderboard_type'
        ) as has_leaderboard_type
      `).then((result) => {
        const value = result.rows[0] as { has_leaderboard_type?: boolean | string | number } | undefined;
        return value?.has_leaderboard_type ? "modern" : "legacy";
      });
    }

    return this.leaderboardSchemaModePromise;
  }

  private mapLegacyBoard(row: Record<string, unknown>) {
    return {
      id: String(row.id),
      title: String(row.name ?? "Leaderboard"),
      leaderboardType: String(row.boardType ?? row.board_type ?? "GENERAL"),
      scoringMetric: String(row.boardType ?? row.board_type ?? "legacy_score"),
      windowType: "ALL_TIME",
      maxEntries: 100,
      refreshIntervalSeconds: Number(row.refreshIntervalSeconds ?? row.refresh_interval_seconds ?? 300),
      status: row.isActive ?? row.is_active ? "ACTIVE" : "INACTIVE",
      createdAt: row.createdAt ?? row.created_at ?? null,
      updatedAt: row.createdAt ?? row.created_at ?? null,
      createdByAdminId: null,
    };
  }

  async listLeaderboards(status?: string) {
    if (await this.getLeaderboardSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          name,
          board_type as "boardType",
          refresh_interval_seconds as "refreshIntervalSeconds",
          is_active as "isActive",
          created_at as "createdAt"
        from leaderboards
        where (${status ? sql`${status.toUpperCase()} = case when is_active then 'ACTIVE' else 'INACTIVE' end` : sql`true`})
        order by created_at desc
      `);

      return (result.rows as Array<Record<string, unknown>>).map((row) => this.mapLegacyBoard(row));
    }

    const conditions = status ? [eq(leaderboards.status, status as any)] : [];
    return db
      .select()
      .from(leaderboards)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(leaderboards.updatedAt));
  }

  async getLeaderboard(leaderboardId: string) {
    if (await this.getLeaderboardSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          name,
          board_type as "boardType",
          refresh_interval_seconds as "refreshIntervalSeconds",
          is_active as "isActive",
          created_at as "createdAt"
        from leaderboards
        where id = ${leaderboardId}::uuid
        limit 1
      `);
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Leaderboard not found" });
      return this.mapLegacyBoard(row);
    }

    const [board] = await db.select().from(leaderboards).where(eq(leaderboards.id, leaderboardId)).limit(1);
    if (!board) throw new TRPCError({ code: "NOT_FOUND", message: "Leaderboard not found" });
    return board;
  }

  async getEntries(leaderboardId: string, cursor?: string, limit = 50) {
    const board = await this.getLeaderboard(leaderboardId);

    const offset = cursor ? decodeCursor(cursor) : 0;
    if ((await this.getLeaderboardSchemaMode()) === "legacy") {
      const result = await db.execute(sql`
        select
          le.user_id as "userId",
          le.rank as "rankPosition",
          le.score as "scoreValue",
          '0'::text as "scoreDelta",
          le.updated_at as "snapshotAt",
          coalesce(p.display_name, u.username) as "displayName",
          p.avatar_url as "avatarUrl"
        from leaderboard_entries le
        inner join users u on u.id = le.user_id
        left join profiles p on p.user_id = u.id
        where le.leaderboard_id = ${leaderboardId}::uuid
        order by le.rank_position asc
        limit ${limit + 1}
        offset ${offset}
      `);

      const rows = result.rows as Array<Record<string, unknown>>;
      const hasMore = rows.length > limit;
      return {
        leaderboard: board,
        items: hasMore ? rows.slice(0, limit) : rows,
        nextCursor: hasMore ? encodeCursor(offset + limit) : null,
      };
    }

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
    const board = await this.getLeaderboard(leaderboardId);

    if (await this.getLeaderboardSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          leaderboard_id as "leaderboardId",
          snapshot_json as "entriesJson",
          snapshot_at as "snapshotDate",
          created_at as "createdAt"
        from leaderboard_snapshots
        where leaderboard_id = ${leaderboardId}::uuid
        order by snapshot_at desc
        limit ${limit}
      `);

      return { leaderboard: board, snapshots: result.rows };
    }

    const snapshots = await db
      .select()
      .from(leaderboardSnapshots)
      .where(eq(leaderboardSnapshots.leaderboardId, leaderboardId))
      .orderBy(desc(leaderboardSnapshots.snapshotDate))
      .limit(limit);

    return { leaderboard: board, snapshots };
  }

  async refreshLeaderboard(leaderboardId: string) {
    const board = await this.getLeaderboard(leaderboardId);

    const now = new Date();
    const windowStart = this.getWindowStart(String((board as Record<string, unknown>).windowType ?? "ALL_TIME"), now);
    const windowEnd = now;

    let ranked: { userId: string; scoreValue: string }[] = [];

    const scoringMetric = String((board as Record<string, unknown>).scoringMetric ?? "gift_coins_received");
    const maxEntries = Number((board as Record<string, unknown>).maxEntries ?? 100);

    if (scoringMetric === "gift_coins_received" || scoringMetric === "gift_coins_sent" || (await this.getLeaderboardSchemaMode()) === "legacy") {
      const column = scoringMetric === "gift_coins_sent"
        ? giftTransactions.senderUserId
        : giftTransactions.receiverUserId;
      const aggregated = await db
        .select({
          userId: column,
          total: sql<string>`COALESCE(SUM(${giftTransactions.coinCost}), 0)::numeric(14,4)`,
        })
        .from(giftTransactions)
        .where(between(giftTransactions.createdAt, windowStart, windowEnd))
        .groupBy(column)
        .orderBy(desc(sql`SUM(${giftTransactions.coinCost})`))
        .limit(maxEntries);
      ranked = aggregated.map((r) => ({ userId: r.userId, scoreValue: String(r.total) }));
    } else {
      return { leaderboardId, updated: 0, message: "Unsupported scoring metric for refresh" };
    }

    const snapshotDate = now.toISOString().slice(0, 10);

    if (await this.getLeaderboardSchemaMode() === "legacy") {
      await db.execute(sql`delete from leaderboard_entries where leaderboard_id = ${leaderboardId}::uuid`);

      for (let i = 0; i < ranked.length; i++) {
        const row = ranked[i]!;
        await db.execute(sql`
          insert into leaderboard_entries (leaderboard_id, user_id, score, rank, updated_at, created_at)
          values (
            ${leaderboardId}::uuid,
            ${row.userId}::uuid,
            ${row.scoreValue},
            ${i + 1},
            ${now},
            ${now}
          )
        `);
      }

      await db.execute(sql`
        insert into leaderboard_snapshots (leaderboard_id, snapshot_json, snapshot_at, created_at)
        values (${leaderboardId}::uuid, ${JSON.stringify(ranked)}::jsonb, ${now}, ${now})
      `);

      return { leaderboardId, updated: ranked.length, snapshotDate };
    }

    await db.delete(leaderboardEntries).where(eq(leaderboardEntries.leaderboardId, leaderboardId));

    for (let i = 0; i < ranked.length; i++) {
      const row = ranked[i]!;
      await db.insert(leaderboardEntries).values({
        leaderboardId,
        userId: row.userId,
        rankPosition: i + 1,
        scoreValue: row.scoreValue,
        scoreDelta: "0",
        snapshotAt: now,
      } as any);
    }

    await db.insert(leaderboardSnapshots).values({
      leaderboardId,
      snapshotDate: snapshotDate as any,
      entriesJson: ranked,
      totalParticipants: ranked.length,
    } as any);

    await db.update(leaderboards).set({ updatedAt: now }).where(eq(leaderboards.id, leaderboardId));

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
    if (await this.getLeaderboardSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        insert into leaderboards (name, board_type, refresh_interval_seconds, is_active, created_at)
        values (
          ${data.title},
          ${data.leaderboardType},
          ${data.refreshIntervalSeconds ?? 300},
          true,
          now()
        )
        returning
          id,
          name,
          board_type as "boardType",
          refresh_interval_seconds as "refreshIntervalSeconds",
          is_active as "isActive",
          created_at as "createdAt"
      `);
      return this.mapLegacyBoard((result.rows[0] as Record<string, unknown>) ?? {});
    }

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
    if (await this.getLeaderboardSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        update leaderboards
        set
          name = coalesce(${data.title ?? null}, name),
          refresh_interval_seconds = coalesce(${data.refreshIntervalSeconds ?? null}, refresh_interval_seconds),
          is_active = coalesce(${data.status ? data.status.toUpperCase() === "ACTIVE" : null}, is_active)
        where id = ${leaderboardId}::uuid
        returning
          id,
          name,
          board_type as "boardType",
          refresh_interval_seconds as "refreshIntervalSeconds",
          is_active as "isActive",
          created_at as "createdAt"
      `);
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return row ? this.mapLegacyBoard(row) : null;
    }

    const [updated] = await db
      .update(leaderboards)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(leaderboards.id, leaderboardId))
      .returning();
    return updated ?? null;
  }

  @Cron("*/5 * * * *")
  async refreshDueLeaderboards() {
    try {
      if (await this.getLeaderboardSchemaMode() === "legacy") {
        const result = await db.execute(sql`
          select
            id,
            created_at as "updatedAt",
            refresh_interval_seconds as "refreshIntervalSeconds"
          from leaderboards
          where is_active = true
        `);
        const boards = result.rows as Array<{ id: string; updatedAt?: Date | string | null; refreshIntervalSeconds?: number | string | null }>;
        const now = Date.now();
        for (const board of boards) {
          const updatedAt = board.updatedAt ? new Date(board.updatedAt).getTime() : 0;
          const intervalMs = Number(board.refreshIntervalSeconds ?? 300) * 1000;
          if (now - updatedAt >= intervalMs) {
            try {
              await this.refreshLeaderboard(board.id);
            } catch {
              // ignore per-board errors
            }
          }
        }

        this.markDatabaseAvailable();
        return;
      }

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

      this.markDatabaseAvailable();
    } catch (error) {
      if (isDatabaseConnectionRefusedError(error)) {
        this.warnDatabaseUnavailable("Skipping leaderboard refresh because the database is unavailable.");
        return;
      }

      this.logger.error("Leaderboard refresh job failed", error as Error);
    }
  }
}
