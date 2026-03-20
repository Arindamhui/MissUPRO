import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { db } from "@missu/db";
import { liveStreams, pkScores, pkSessions, users } from "@missu/db/schema";
import { PK } from "@missu/config";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ConfigService } from "../config/config.service";
import { WalletService } from "../wallet/wallet.service";
import { isDatabaseConnectionRefusedError } from "../common/database-errors";

export interface PKConfig {
  enabled: boolean;
  battleDurationSeconds: number;
  votingDurationSeconds: number;
  minHostLevel: number;
  maxConcurrentPerHost: number;
  selfGiftBlocked: boolean;
  scoreMultiplierPercent: number;
  rewards: {
    enabled: boolean;
    winnerRewardCoins: number;
    loserRewardCoins: number;
    drawRewardCoins: number;
  };
}

@Injectable()
export class PkService {
  private readonly logger = new Logger(PkService.name);
  private hasWarnedAboutDatabase = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly walletService: WalletService,
  ) {}

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

  async getConfig(): Promise<PKConfig> {
    const env = process.env["NODE_ENV"] === "production" ? "production" : "development";
    const scope = { environment: env };

    const [battleRulesSetting, rewardSystemSetting] = await Promise.all([
      this.configService.getSetting("pk", "battle_rules", scope),
      this.configService.getSetting("pk", "reward_system", scope),
    ]);

    const battleRules = (battleRulesSetting?.valueJson as {
      enabled?: boolean;
      battleDurationSeconds?: number;
      votingDurationSeconds?: number;
      minHostLevel?: number;
      maxConcurrentPerHost?: number;
      selfGiftBlocked?: boolean;
      scoreMultiplierPercent?: number;
    } | null) ?? {};
    const rewards = (rewardSystemSetting?.valueJson as {
      enabled?: boolean;
      winnerRewardCoins?: number;
      loserRewardCoins?: number;
      drawRewardCoins?: number;
    } | null) ?? {};

    return {
      enabled: Boolean(battleRules.enabled ?? true),
      battleDurationSeconds: Math.max(60, Number(battleRules.battleDurationSeconds ?? PK.BATTLE_DURATION_SECONDS)),
      votingDurationSeconds: Math.max(0, Number(battleRules.votingDurationSeconds ?? PK.VOTING_DURATION_SECONDS)),
      minHostLevel: Math.max(1, Number(battleRules.minHostLevel ?? 1)),
      maxConcurrentPerHost: Math.max(1, Number(battleRules.maxConcurrentPerHost ?? PK.MAX_CONCURRENT_PER_HOST)),
      selfGiftBlocked: Boolean(battleRules.selfGiftBlocked ?? PK.SELF_GIFT_BLOCKED),
      scoreMultiplierPercent: Math.max(1, Number(battleRules.scoreMultiplierPercent ?? PK.SCORE_MULTIPLIER_PERCENT)),
      rewards: {
        enabled: Boolean(rewards.enabled ?? true),
        winnerRewardCoins: Math.max(0, Number(rewards.winnerRewardCoins ?? PK.WINNER_REWARD_COINS)),
        loserRewardCoins: Math.max(0, Number(rewards.loserRewardCoins ?? PK.LOSER_REWARD_COINS)),
        drawRewardCoins: Math.max(0, Number(rewards.drawRewardCoins ?? PK.DRAW_REWARD_COINS)),
      },
    };
  }

  private async ensureHostHasActiveStream(userId: string) {
    const [activeStream] = await db.select({ id: liveStreams.id })
      .from(liveStreams)
      .where(and(eq(liveStreams.hostUserId, userId), eq(liveStreams.status, "LIVE" as any)))
      .limit(1);

    if (!activeStream) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Both hosts need an active live stream for a PK battle" });
    }

    return activeStream;
  }

  private async settleRewards(session: typeof pkSessions.$inferSelect) {
    if (session.rewardsGrantedAt) {
      return;
    }

    const creditOperations: Array<Promise<unknown>> = [];

    if (session.resultType === "DRAW") {
      if (session.drawRewardCoins > 0) {
        creditOperations.push(
          this.walletService.creditCoins(
            session.hostAUserId,
            session.drawRewardCoins,
            "PK_BATTLE_REWARD",
            session.id,
            "PK battle draw reward",
            `pk-reward:${session.id}:${session.hostAUserId}:draw`,
          ),
          this.walletService.creditCoins(
            session.hostBUserId,
            session.drawRewardCoins,
            "PK_BATTLE_REWARD",
            session.id,
            "PK battle draw reward",
            `pk-reward:${session.id}:${session.hostBUserId}:draw`,
          ),
        );
      }
    } else if (session.winnerUserId) {
      const loserUserId = session.winnerUserId === session.hostAUserId ? session.hostBUserId : session.hostAUserId;
      if (session.winnerRewardCoins > 0) {
        creditOperations.push(
          this.walletService.creditCoins(
            session.winnerUserId,
            session.winnerRewardCoins,
            "PK_BATTLE_REWARD",
            session.id,
            "PK battle winner reward",
            `pk-reward:${session.id}:${session.winnerUserId}:winner`,
          ),
        );
      }
      if (session.loserRewardCoins > 0) {
        creditOperations.push(
          this.walletService.creditCoins(
            loserUserId,
            session.loserRewardCoins,
            "PK_BATTLE_REWARD",
            session.id,
            "PK battle participation reward",
            `pk-reward:${session.id}:${loserUserId}:loser`,
          ),
        );
      }
    }

    if (creditOperations.length > 0) {
      await Promise.all(creditOperations);
    }

    await db.update(pkSessions)
      .set({ rewardsGrantedAt: new Date() })
      .where(eq(pkSessions.id, session.id));
  }

  async requestPKBattle(hostAId: string, hostBId: string) {
    const config = await this.getConfig();
    if (!config.enabled) {
      throw new TRPCError({ code: "FORBIDDEN", message: "PK battles are disabled" });
    }
    if (hostAId === hostBId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot request PK against yourself" });
    }

    await Promise.all([
      this.ensureHostHasActiveStream(hostAId),
      this.ensureHostHasActiveStream(hostBId),
    ]);

    const activeForHostA = await db
      .select()
      .from(pkSessions)
      .where(and(
        or(eq(pkSessions.hostAUserId, hostAId), eq(pkSessions.hostBUserId, hostAId)),
        inArray(pkSessions.status, ["CREATED", "MATCHING", "ACTIVE", "VOTING"] as any),
      ))
      .limit(1);
    const activeForHostB = await db
      .select()
      .from(pkSessions)
      .where(and(
        or(eq(pkSessions.hostAUserId, hostBId), eq(pkSessions.hostBUserId, hostBId)),
        inArray(pkSessions.status, ["CREATED", "MATCHING", "ACTIVE", "VOTING"] as any),
      ))
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
        scoreMultiplierPercent: config.scoreMultiplierPercent,
        winnerRewardCoins: config.rewards.enabled ? config.rewards.winnerRewardCoins : 0,
        loserRewardCoins: config.rewards.enabled ? config.rewards.loserRewardCoins : 0,
        drawRewardCoins: config.rewards.enabled ? config.rewards.drawRewardCoins : 0,
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

    await this.ensureHostHasActiveStream(hostBId);

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

    const scoreMultiplierPercent = Math.max(1, session.scoreMultiplierPercent ?? config.scoreMultiplierPercent);
    const scoreValue = Math.max(1, Math.round((coinValue * scoreMultiplierPercent) / 100));

    await db.insert(pkScores).values({
      pkSessionId,
      hostUserId,
      gifterUserId,
      giftId,
      coinValue,
      scoreValue,
      scoreMultiplierPercent,
    });

    const isHostA = session.hostAUserId === hostUserId;
    const newHostAScore = isHostA ? (session.hostAScore ?? 0) + scoreValue : (session.hostAScore ?? 0);
    const newHostBScore = !isHostA ? (session.hostBScore ?? 0) + scoreValue : (session.hostBScore ?? 0);

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

    const [endedSession] = await db.select().from(pkSessions).where(eq(pkSessions.id, pkSessionId)).limit(1);
    if (endedSession) {
      await this.settleRewards(endedSession);
    }

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
        scoreValue: score.scoreValue,
        scoreMultiplierPercent: score.scoreMultiplierPercent,
        scoredAt: score.scoredAt?.toISOString?.() ?? score.scoredAt,
      })),
    };
  }

  async listMyBattles(userId: string, statuses?: Array<"CREATED" | "MATCHING" | "ACTIVE" | "VOTING" | "ENDED" | "CANCELLED">, limit = 10) {
    const conditions = [or(eq(pkSessions.hostAUserId, userId), eq(pkSessions.hostBUserId, userId))];
    if (statuses && statuses.length > 0) {
      conditions.push(inArray(pkSessions.status, statuses as any));
    }

    const results = await db
      .select()
      .from(pkSessions)
      .where(and(...conditions))
      .orderBy(desc(pkSessions.createdAt))
      .limit(limit);

    return { items: results };
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
    const config = await this.getConfig();
    const [pk] = await db
      .insert(pkSessions)
      .values({
        hostAUserId,
        hostBUserId,
        status: "CREATED" as any,
        battleDurationSeconds,
        scoreMultiplierPercent: config.scoreMultiplierPercent,
        winnerRewardCoins: config.rewards.enabled ? config.rewards.winnerRewardCoins : 0,
        loserRewardCoins: config.rewards.enabled ? config.rewards.loserRewardCoins : 0,
        drawRewardCoins: config.rewards.enabled ? config.rewards.drawRewardCoins : 0,
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
    try {
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

      this.markDatabaseAvailable();
    } catch (error) {
      if (isDatabaseConnectionRefusedError(error)) {
        this.warnDatabaseUnavailable("Skipping expired PK battle sweep because the database is unavailable.");
        return;
      }

      this.logger.error("Expired PK battle sweep failed", error as Error);
    }
  }
}
