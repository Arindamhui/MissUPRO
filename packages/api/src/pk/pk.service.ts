import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { db } from "@missu/db";
import { pkSessions, pkScores } from "@missu/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ConfigService } from "../config/config.service";

export interface PKConfig {
  enabled: boolean;
  battleDurationSeconds: number;
  votingDurationSeconds: number;
  minHostLevel: number;
  maxConcurrentPerHost: number;
  selfGiftBlocked: boolean;
  winnerBonusCoins?: number;
}

@Injectable()
export class PkService {
  constructor(private readonly configService: ConfigService) {}

  async getConfig(): Promise<PKConfig> {
    const env = process.env["NODE_ENV"] === "production" ? "production" : "development";
    const scope = { environment: env };
    const get = async (key: string, fallback: string | number | boolean) => {
      const row = await this.configService.getSetting("pk", key, scope);
      if (row?.valueJson == null) return fallback;
      if (typeof fallback === "number") return Number(row.valueJson) ?? fallback;
      if (typeof fallback === "boolean") return row.valueJson === true || row.valueJson === "true";
      return String(row.valueJson ?? fallback);
    };
    return {
      enabled: (await get("enabled", true)) as boolean,
      battleDurationSeconds: (await get("battle_duration_seconds", 300)) as number,
      votingDurationSeconds: (await get("voting_duration_seconds", 30)) as number,
      minHostLevel: (await get("min_host_level", 1)) as number,
      maxConcurrentPerHost: (await get("max_concurrent_per_host", 1)) as number,
      selfGiftBlocked: (await get("self_gift_blocked", true)) as boolean,
      winnerBonusCoins: (await get("winner_coins", 0)) as number | undefined,
    };
  }

  async requestPKBattle(hostAId: string, hostBId: string) {
    const config = await this.getConfig();
    if (!config.enabled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "PK battles are disabled" });
    }
    if (hostAId === hostBId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot request PK against yourself" });
    }

    const activeForHostA = await db
      .select()
      .from(pkSessions)
      .where(and(eq(pkSessions.hostAUserId, hostAId), eq(pkSessions.status, "ACTIVE" as any)))
      .limit(1);
    const activeForHostB = await db
      .select()
      .from(pkSessions)
      .where(and(eq(pkSessions.hostBUserId, hostBId), eq(pkSessions.status, "ACTIVE" as any)))
      .limit(1);
    if (activeForHostA.length > 0 || activeForHostB.length > 0) {
      throw new TRPCError({ code: "CONFLICT", message: "One or both hosts already have an active PK battle" });
    }

    const [pk] = await db
      .insert(pkSessions)
      .values({
        hostAUserId: hostAId,
        hostBUserId: hostBId,
        status: "CREATED" as any,
        battleDurationSeconds: config.battleDurationSeconds,
      })
      .returning();
    return pk!;
  }

  async acceptPKBattle(pkSessionId: string, hostBId: string) {
    const [session] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "PK session not found" });
    }
    if (session.hostBUserId !== hostBId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only the invited host can accept" });
    }
    if (session.status !== "CREATED" && session.status !== "MATCHING") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Session is no longer open for acceptance" });
    }

    await db
      .update(pkSessions)
      .set({ status: "ACTIVE" as any, startedAt: new Date() })
      .where(eq(pkSessions.id, pkSessionId));
    return { success: true };
  }

  async joinPKBattle(pkSessionId: string, userId: string) {
    const [session] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "PK session not found" });
    }
    if (session.hostAUserId !== userId && session.hostBUserId !== userId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only battle hosts can join this PK room" });
    }
    return this.getPKBattleRealtimeState(pkSessionId, 20);
  }

  async updatePKBattleScore(
    pkSessionId: string,
    actorUserId: string,
    scores: { hostAScore?: number; hostBScore?: number },
  ) {
    const [session] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "PK session not found" });
    }
    if (session.hostAUserId !== actorUserId && session.hostBUserId !== actorUserId) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only battle hosts can update PK score" });
    }

    await db
      .update(pkSessions)
      .set({
        hostAScore: scores.hostAScore ?? session.hostAScore,
        hostBScore: scores.hostBScore ?? session.hostBScore,
        status: session.status === "CREATED" ? ("ACTIVE" as any) : session.status,
        startedAt: session.startedAt ?? new Date(),
      })
      .where(eq(pkSessions.id, pkSessionId));

    return this.getPKBattleRealtimeState(pkSessionId, 20);
  }

  /** Called from gift flow when contextType is PK_BATTLE and contextId is pkSessionId. */
  async addGiftScore(
    pkSessionId: string,
    gifterUserId: string,
    hostUserId: string,
    giftId: string,
    coinValue: number,
  ): Promise<{ added: boolean; session?: any }> {
    const [session] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    if (!session) return { added: false };
    if (session.status !== "ACTIVE") return { added: false };
    if (session.hostAUserId !== hostUserId && session.hostBUserId !== hostUserId) return { added: false };

    const config = await this.getConfig();
    if (config.selfGiftBlocked && gifterUserId === hostUserId) return { added: false };

    const startedAt = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const endAt = startedAt + (session.battleDurationSeconds ?? 300) * 1000;
    if (Date.now() > endAt) return { added: false };

    await db.insert(pkScores).values({
      pkSessionId,
      hostUserId,
      gifterUserId,
      giftId,
      coinValue,
    });

    const isHostA = session.hostAUserId === hostUserId;
    const newHostAScore = isHostA ? (session.hostAScore ?? 0) + coinValue : (session.hostAScore ?? 0);
    const newHostBScore = !isHostA ? (session.hostBScore ?? 0) + coinValue : (session.hostBScore ?? 0);

    await db
      .update(pkSessions)
      .set({ hostAScore: newHostAScore, hostBScore: newHostBScore })
      .where(eq(pkSessions.id, pkSessionId));

    return { added: true, session: await this.getPKBattleState(pkSessionId) };
  }

  async endBattle(pkSessionId: string): Promise<{ session: any }> {
    const [session] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "PK session not found" });
    }
    if (session.status !== "ACTIVE" && session.status !== "VOTING") {
      return { session: await this.getPKBattleState(pkSessionId) };
    }

    const hostAScore = session.hostAScore ?? 0;
    const hostBScore = session.hostBScore ?? 0;
    let winnerUserId: string | null = null;
    let resultType: "WIN" | "DRAW" | "CANCELLED" = "DRAW";
    if (hostAScore > hostBScore) {
      winnerUserId = session.hostAUserId;
      resultType = "WIN";
    } else if (hostBScore > hostAScore) {
      winnerUserId = session.hostBUserId;
      resultType = "WIN";
    }

    await db
      .update(pkSessions)
      .set({
        status: "ENDED" as any,
        endedAt: new Date(),
        winnerUserId,
        resultType: resultType as any,
      })
      .where(eq(pkSessions.id, pkSessionId));

    return { session: await this.getPKBattleState(pkSessionId) };
  }

  async getPKBattleState(pkSessionId: string) {
    const [pk] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    const scores = await db.select().from(pkScores).where(eq(pkScores.pkSessionId, pkSessionId));
    return { session: pk, scores };
  }

  async getPKBattleRealtimeState(pkSessionId: string, limit = 20) {
    const [session] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "PK session not found" });
    }

    const recentScores = await db
      .select()
      .from(pkScores)
      .where(eq(pkScores.pkSessionId, pkSessionId))
      .orderBy(desc(pkScores.scoredAt))
      .limit(limit);

    return {
      session,
      recentScores: recentScores.reverse().map((score) => ({
        id: score.id,
        pkSessionId: score.pkSessionId,
        hostUserId: score.hostUserId,
        gifterUserId: score.gifterUserId,
        giftId: score.giftId,
        coinValue: score.coinValue,
        scoredAt: score.scoredAt?.toISOString?.() ?? score.scoredAt,
      })),
    };
  }

  async listSessions(cursor?: string, limit = 20, status?: string) {
    const { decodeCursor, encodeCursor } = await import("@missu/utils");
    const offset = cursor ? decodeCursor(cursor) : 0;
    const conditions = status ? [eq(pkSessions.status, status as any)] : [];
    const results = await db
      .select()
      .from(pkSessions)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(pkSessions.createdAt))
      .limit(limit + 1)
      .offset(offset);
    const hasMore = results.length > limit;
    return {
      items: hasMore ? results.slice(0, limit) : results,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async createPKBattleByAdmin(
    hostAUserId: string,
    hostBUserId: string,
    battleDurationSeconds: number,
    adminId: string,
  ) {
    const [pk] = await db
      .insert(pkSessions)
      .values({
        hostAUserId,
        hostBUserId,
        status: "CREATED" as any,
        battleDurationSeconds,
        createdByAdminId: adminId,
      })
      .returning();
    return pk!;
  }

  async cancelPKBattle(pkSessionId: string) {
    const [session] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "PK session not found" });
    }
    if (session.status === "ENDED" || session.status === "CANCELLED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Session already ended or cancelled" });
    }
    await db
      .update(pkSessions)
      .set({ status: "CANCELLED" as any, endedAt: new Date(), resultType: "CANCELLED" as any })
      .where(eq(pkSessions.id, pkSessionId));
    return { success: true };
  }

  @Cron("*/30 * * * * *")
  async endExpiredBattles() {
    const active = await db
      .select({ id: pkSessions.id, startedAt: pkSessions.startedAt, battleDurationSeconds: pkSessions.battleDurationSeconds })
      .from(pkSessions)
      .where(eq(pkSessions.status, "ACTIVE" as any));
    const now = Date.now();
    for (const row of active) {
      const started = row.startedAt ? new Date(row.startedAt).getTime() : 0;
      const endAt = started + (row.battleDurationSeconds ?? 300) * 1000;
      if (endAt > 0 && now >= endAt) {
        try {
          await this.endBattle(row.id);
        } catch {
          // ignore per-session errors
        }
      }
    }
  }
}
