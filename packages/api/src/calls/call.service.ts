import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { callSessions, callBillingTicks, models, modelStats, systemSettings, calls, callHistory, modelCallStats } from "@missu/db/schema";
import { eq, and, desc, or, isNull, gte, lte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { calculateCallPrice } from "@missu/utils";
import { CALL_PRICING, LEVEL_PRICING } from "@missu/config";
import { RtcTokenService } from "../streaming/rtc-token.service";
import { ModelService } from "../models/model.service";
import { WalletService } from "../wallet/wallet.service";
import { ConfigService } from "../config/config.service";
import { randomUUID } from "node:crypto";
import { NotificationService } from "../notifications/notification.service";
import { users } from "@missu/db/schema";

@Injectable()
export class CallService {
  constructor(
    private readonly rtcTokenService: RtcTokenService,
    private readonly modelService: ModelService,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  private async getCallMonetizationPolicy() {
    const [pricingSetting, commissionSetting] = await Promise.all([
      this.configService.getSetting("pricing.call", "rules"),
      this.configService.getSetting("commission", "revenue_share"),
    ]);

    const pricing = (pricingSetting?.valueJson as {
      audioCoinsPerMin?: number;
      videoCoinsPerMin?: number;
      maxCoinsPerMin?: number;
      modelLevelMultiplierEnabled?: boolean;
      minimumBalanceCoins?: number;
      lowBalanceWarningMultiplier?: number;
      callCommissionPercent?: number;
    } | null) ?? {};
    const commission = (commissionSetting?.valueJson as {
      platformCommissionPercent?: number;
      callCommissionPercent?: number;
    } | null) ?? {};

    const callCommissionPercent = Math.max(
      0,
      Math.min(100, Number(pricing.callCommissionPercent ?? commission.callCommissionPercent ?? commission.platformCommissionPercent ?? 65)),
    );

    return {
      audioCoinsPerMin: Math.max(1, Number(pricing.audioCoinsPerMin ?? CALL_PRICING.AUDIO_COINS_PER_MINUTE)),
      videoCoinsPerMin: Math.max(1, Number(pricing.videoCoinsPerMin ?? CALL_PRICING.VIDEO_COINS_PER_MINUTE)),
      maxCoinsPerMin: Math.max(1, Number(pricing.maxCoinsPerMin ?? Math.max(CALL_PRICING.VIDEO_COINS_PER_MINUTE, CALL_PRICING.AUDIO_COINS_PER_MINUTE))),
      modelLevelMultiplierEnabled: Boolean(pricing.modelLevelMultiplierEnabled ?? true),
      minimumBalanceCoins: Math.max(1, Number(pricing.minimumBalanceCoins ?? CALL_PRICING.VIDEO_COINS_PER_MINUTE)),
      lowBalanceWarningMultiplier: Math.max(1, Number(pricing.lowBalanceWarningMultiplier ?? 2)),
      callCommissionPercent,
      creatorPayoutPercent: Math.max(0, 100 - callCommissionPercent),
    };
  }

  private async resolveCoinsPerMinute(modelUserId: string, callType: "AUDIO" | "VIDEO") {
    const [mStats] = await db.select().from(modelStats)
      .where(eq(modelStats.modelUserId, modelUserId)).limit(1);
    const policy = await this.getCallMonetizationPolicy();
    const modelLevel = mStats?.currentLevel ?? null;
    const rawCoinsPerMinute = calculateCallPrice(callType, modelLevel, {
      levelBasedEnabled: policy.modelLevelMultiplierEnabled,
      formulaType: LEVEL_PRICING.FORMULA_TYPE,
      baseVideoPrice: LEVEL_PRICING.BASE_VIDEO_PRICE,
      baseAudioPrice: LEVEL_PRICING.BASE_AUDIO_PRICE,
      levelMultiplier: LEVEL_PRICING.LEVEL_MULTIPLIER,
      levelIncrementVideo: LEVEL_PRICING.LEVEL_INCREMENT_VIDEO,
      levelIncrementAudio: LEVEL_PRICING.LEVEL_INCREMENT_AUDIO,
      priceCapVideo: LEVEL_PRICING.PRICE_CAP_VIDEO,
      priceCapAudio: LEVEL_PRICING.PRICE_CAP_AUDIO,
      noLevelFallbackVideo: LEVEL_PRICING.NO_LEVEL_FALLBACK_VIDEO,
      noLevelFallbackAudio: LEVEL_PRICING.NO_LEVEL_FALLBACK_AUDIO,
      globalAudioRate: policy.audioCoinsPerMin,
      globalVideoRate: policy.videoCoinsPerMin,
    }, callType === "VIDEO" ? mStats?.priceOverrideVideo : mStats?.priceOverrideAudio);

    return {
      policy,
      modelLevel,
      coinsPerMinute: Math.max(1, Math.min(policy.maxCoinsPerMin, rawCoinsPerMinute)),
    };
  }

  private async getOrCreateCallRecord(session: typeof callSessions.$inferSelect) {
    const [existing] = await db.select().from(calls)
      .where(eq(calls.callSessionId, session.id))
      .limit(1);

    if (existing) {
      return existing;
    }

    const metadataJson = {
      coinsPerMinuteSnapshot: session.coinsPerMinuteSnapshot,
      billingMode: "PER_MINUTE",
    };

    const [created] = await db.insert(calls).values({
      callerUserId: session.callerUserId,
      modelUserId: session.modelUserId,
      callType: session.callType,
      status: session.status,
      requestedAt: session.createdAt,
      acceptedAt: session.startedAt,
      failedAt: session.status === "FAILED" ? session.endedAt : null,
      callSessionId: session.id,
      metadataJson,
    }).returning();

    return created!;
  }

  private async ensureModelCallStats(modelUserId: string) {
    await db.insert(modelCallStats).values({ modelUserId }).onConflictDoNothing();
    await db.insert(modelStats).values({ modelUserId }).onConflictDoNothing();
  }

  private async creditModelMinutes(session: typeof callSessions.$inferSelect, chargedMinutes: number, endedAt: Date) {
    if (session.minutesCreditedToModel || chargedMinutes <= 0) {
      return;
    }

    await this.ensureModelCallStats(session.modelUserId);

    const audioMinutes = session.callType === "AUDIO" ? chargedMinutes : 0;
    const videoMinutes = session.callType === "VIDEO" ? chargedMinutes : 0;

    await db.transaction(async (tx) => {
      await tx
        .update(modelCallStats)
        .set({
          audioMinutesTotal: sql`${modelCallStats.audioMinutesTotal} + ${audioMinutes}`,
          videoMinutesTotal: sql`${modelCallStats.videoMinutesTotal} + ${videoMinutes}`,
          audioMinutesPending: sql`${modelCallStats.audioMinutesPending} + ${audioMinutes}`,
          videoMinutesPending: sql`${modelCallStats.videoMinutesPending} + ${videoMinutes}`,
          lastCallAt: endedAt,
          updatedAt: endedAt,
        })
        .where(eq(modelCallStats.modelUserId, session.modelUserId));

      await tx
        .update(modelStats)
        .set({
          totalAudioMinutes: sql`${modelStats.totalAudioMinutes} + ${audioMinutes}`,
          totalVideoMinutes: sql`${modelStats.totalVideoMinutes} + ${videoMinutes}`,
          totalCallsCompleted: sql`${modelStats.totalCallsCompleted} + 1`,
          updatedAt: endedAt,
        })
        .where(eq(modelStats.modelUserId, session.modelUserId));

      await tx
        .update(callSessions)
        .set({
          minutesCreditedToModel: true,
        })
        .where(eq(callSessions.id, session.id));
    });
  }

  private async upsertCallHistory(
    session: typeof callSessions.$inferSelect,
    callRecord: typeof calls.$inferSelect,
    finalStatus: "ENDED" | "FAILED",
  ) {
    await db.insert(callHistory).values({
      callId: callRecord.id,
      callSessionId: session.id,
      callerUserId: session.callerUserId,
      modelUserId: session.modelUserId,
      callType: session.callType,
      finalStatus,
      totalDurationSeconds: session.totalDurationSeconds,
      billableMinutes: session.billableMinutes,
      totalCoinsSpent: session.totalCoinsSpent,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      endReason: session.endReason,
    }).onConflictDoNothing({ target: callHistory.callId });
  }

  private async getParticipantSession(sessionId: string, userId: string) {
    const [session] = await db.select().from(callSessions)
      .where(and(
        eq(callSessions.id, sessionId),
        or(eq(callSessions.callerUserId, userId), eq(callSessions.modelUserId, userId)),
      ))
      .limit(1);

    return session ?? null;
  }

  async requestCall(
    callerUserId: string,
    modelUserId: string,
    callType: "AUDIO" | "VIDEO",
  ) {
    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(
        and(
          eq(systemSettings.namespace, "model.availability"),
          eq(systemSettings.key, "enforce_schedule"),
          eq(systemSettings.status, "PUBLISHED" as any),
          lte(systemSettings.effectiveFrom, new Date()),
          or(isNull(systemSettings.effectiveTo), gte(systemSettings.effectiveTo, new Date())),
        ),
      )
      .orderBy(desc(systemSettings.version))
      .limit(1);

    const enforceSchedule = setting ? Boolean(setting.valueJson) : true;
    const availability = await this.modelService.getAvailabilitySummary(modelUserId);

    const [model] = await db.select().from(models)
      .where(eq(models.userId, modelUserId))
      .limit(1);

    if (!model || !model.approvedAt) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Model is unavailable" });
    }

    if (enforceSchedule && availability.availabilityStatus !== "AVAILABLE_NOW") {
      const nextSlot = availability.nextSlot
        ? ` Available at ${availability.nextSlot.dayOfWeek} ${availability.nextSlot.startTime} (${availability.nextSlot.timezone}).`
        : "";
      throw new TRPCError({ code: "BAD_REQUEST", message: `Model is unavailable.${nextSlot}`.trim() });
    }

    const { policy, modelLevel, coinsPerMinute } = await this.resolveCoinsPerMinute(modelUserId, callType);
    const wallet = await this.walletService.getOrCreateWallet(callerUserId);
    const minimumBalanceCoinsRequired = Math.max(policy.minimumBalanceCoins, coinsPerMinute);

    if (wallet.coinBalance < minimumBalanceCoinsRequired) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Minimum balance for this call is ${minimumBalanceCoinsRequired} coins`,
      });
    }

    const sessionId = randomUUID();
    const callId = randomUUID();
    const metadataJson = {
      billingMode: "PER_MINUTE",
      minimumBalanceCoinsRequired,
      callCommissionPercent: policy.callCommissionPercent,
      creatorPayoutPercent: policy.creatorPayoutPercent,
    };

    await db.transaction(async (tx) => {
      await tx.insert(callSessions).values({
        id: sessionId,
        callerUserId,
        modelUserId,
        callType: callType as any,
        status: "REQUESTED" as any,
        coinsPerMinuteSnapshot: coinsPerMinute,
        modelLevelSnapshot: modelLevel,
      });

      await tx.insert(calls).values({
        id: callId,
        callerUserId,
        modelUserId,
        callType: callType as any,
        status: "REQUESTED" as any,
        callSessionId: sessionId,
        metadataJson,
      });
    });

    const [session] = await db.select().from(callSessions).where(eq(callSessions.id, sessionId)).limit(1);

    return {
      ...session!,
      callId,
      minimumBalanceCoinsRequired,
      callCommissionPercent: policy.callCommissionPercent,
      creatorPayoutPercent: policy.creatorPayoutPercent,
      callerBalance: wallet.coinBalance,
    };
  }

  async getPricingPreview(callerUserId: string, modelUserId: string) {
    const [audioPricing, videoPricing, wallet] = await Promise.all([
      this.resolveCoinsPerMinute(modelUserId, "AUDIO"),
      this.resolveCoinsPerMinute(modelUserId, "VIDEO"),
      this.walletService.getOrCreateWallet(callerUserId),
    ]);

    const minimumBalanceCoins = Math.max(audioPricing.policy.minimumBalanceCoins, videoPricing.policy.minimumBalanceCoins);

    return {
      audioCoinsPerMinute: audioPricing.coinsPerMinute,
      videoCoinsPerMinute: videoPricing.coinsPerMinute,
      minimumBalanceCoins,
      callCommissionPercent: videoPricing.policy.callCommissionPercent,
      creatorPayoutPercent: videoPricing.policy.creatorPayoutPercent,
      currentBalanceCoins: wallet.coinBalance,
      canStartAudio: wallet.coinBalance >= Math.max(minimumBalanceCoins, audioPricing.coinsPerMinute),
      canStartVideo: wallet.coinBalance >= Math.max(minimumBalanceCoins, videoPricing.coinsPerMinute),
    };
  }

  async acceptCall(sessionId: string, modelUserId: string) {
    const [session] = await db.select().from(callSessions)
      .where(and(eq(callSessions.id, sessionId), eq(callSessions.modelUserId, modelUserId)))
      .limit(1);
    if (!session || session.status !== "REQUESTED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid call session" });
    }

    const policy = await this.getCallMonetizationPolicy();
    const callerWallet = await this.walletService.getOrCreateWallet(session.callerUserId);
    const minimumBalanceCoinsRequired = Math.max(policy.minimumBalanceCoins, session.coinsPerMinuteSnapshot);

    if (callerWallet.coinBalance < minimumBalanceCoinsRequired) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Caller balance fell below the minimum required balance of ${minimumBalanceCoinsRequired} coins`,
      });
    }

    const acceptedAt = new Date();
    await db.update(callSessions).set({
      status: "ACTIVE" as any,
      startedAt: acceptedAt,
    }).where(eq(callSessions.id, sessionId));

    await db.update(calls).set({
      status: "ACTIVE" as any,
      acceptedAt,
    }).where(eq(calls.callSessionId, sessionId));

    const agoraChannel = `call_${sessionId}`;
    const tokenPayload = this.rtcTokenService.issueToken(agoraChannel, 0, "publisher", 3600);

    return {
      sessionId,
      agoraChannel,
      agoraToken: tokenPayload.token,
      agoraAppId: tokenPayload.appId,
      expiresAt: tokenPayload.expiresAt,
    };
  }

  async rejectCall(sessionId: string, modelUserId: string) {
    const [session] = await db.select().from(callSessions)
      .where(and(eq(callSessions.id, sessionId), eq(callSessions.modelUserId, modelUserId)))
      .limit(1);
    if (!session || session.status !== "REQUESTED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid call session" });
    }

    const endedAt = new Date();
    await db.update(callSessions).set({
      status: "FAILED" as any,
      endReason: "TIMEOUT" as any,
      endedAt,
    }).where(eq(callSessions.id, sessionId));

    await db.update(calls).set({
      status: "FAILED" as any,
      failedAt: endedAt,
      failureReason: "rejected",
    }).where(eq(calls.callSessionId, sessionId));

    const [updatedSession] = await db.select().from(callSessions).where(eq(callSessions.id, sessionId)).limit(1);
    const callRecord = await this.getOrCreateCallRecord(updatedSession!);
    await this.upsertCallHistory(updatedSession!, callRecord, "FAILED");

    const [modelProfile] = await db
      .select({
        displayName: users.displayName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, modelUserId))
      .limit(1);

    const modelName = modelProfile?.displayName ?? modelProfile?.username ?? "The model";
    await this.notificationService.createNotification(
      session.callerUserId,
      "CALL_MISSED",
      `Missed ${session.callType.toLowerCase()} call`,
      `${modelName} could not take your ${session.callType.toLowerCase()} call.`,
      {
        callSessionId: sessionId,
        modelUserId,
        callType: session.callType,
        channels: ["PUSH"],
      },
    );

    return { sessionId, status: "FAILED" };
  }

  async refreshRtcToken(sessionId: string, role: "publisher" | "subscriber" = "subscriber") {
    const [session] = await db.select().from(callSessions)
      .where(eq(callSessions.id, sessionId)).limit(1);

    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Call session not found" });
    }

    if (session.status !== "ACTIVE" && session.status !== "REQUESTED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Call session is not active" });
    }

    const agoraChannel = `call_${sessionId}`;
    const tokenPayload = this.rtcTokenService.issueToken(agoraChannel, 0, role, 1800);

    return {
      sessionId,
      agoraChannel,
      agoraToken: tokenPayload.token,
      agoraAppId: tokenPayload.appId,
      expiresAt: tokenPayload.expiresAt,
    };
  }

  async getRealtimeState(sessionId: string, userId: string, role: "publisher" | "subscriber" = "subscriber") {
    const session = await this.getParticipantSession(sessionId, userId);
    if (!session) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Call session not found" });
    }

    const [latestTick] = await db.select().from(callBillingTicks)
      .where(eq(callBillingTicks.callSessionId, sessionId))
      .orderBy(desc(callBillingTicks.tickNumber))
      .limit(1);

    const tokenPayload = session.status === "ACTIVE" || session.status === "REQUESTED"
      ? this.rtcTokenService.issueToken(`call_${sessionId}`, 0, role, 1800)
      : null;

    return {
      session,
      latestTick: latestTick ?? null,
      rtc: tokenPayload
        ? {
            agoraChannel: `call_${sessionId}`,
            agoraToken: tokenPayload.token,
            agoraAppId: tokenPayload.appId,
            expiresAt: tokenPayload.expiresAt,
          }
        : null,
    };
  }

  async endCall(sessionId: string, reason?: string, options?: { skipOutstandingDebit?: boolean; endedAt?: Date }) {
    const [session] = await db.select().from(callSessions)
      .where(eq(callSessions.id, sessionId)).limit(1);
    if (!session) throw new TRPCError({ code: "NOT_FOUND" });

    if (session.status === "ENDED" || session.status === "FAILED") {
      return {
        sessionId,
        durationSeconds: session.totalDurationSeconds,
        totalCoinsCharged: session.totalCoinsSpent,
      };
    }

    const endedAt = options?.endedAt ?? new Date();
    const durationSeconds = session.startedAt
      ? Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : 0;
    const totalMinutes = Math.ceil(durationSeconds / 60);
    const existingTicks = await db.select().from(callBillingTicks)
      .where(eq(callBillingTicks.callSessionId, sessionId))
      .orderBy(desc(callBillingTicks.tickNumber));
    const alreadyChargedMinutes = existingTicks.length;
    const outstandingMinutes = options?.skipOutstandingDebit ? 0 : Math.max(totalMinutes - alreadyChargedMinutes, 0);
    let outstandingCoinsCharged = 0;

    if (outstandingMinutes > 0) {
      const outstandingCoins = outstandingMinutes * session.coinsPerMinuteSnapshot;
      try {
        await this.walletService.debitCoins(
          session.callerUserId,
          outstandingCoins,
          "CALL_BILLING",
          `${sessionId}:final`,
          `Call final billing for ${outstandingMinutes} minute(s)`,
          `${sessionId}:final:${outstandingMinutes}`,
        );
        outstandingCoinsCharged = outstandingCoins;
      } catch (error) {
        if (!(error instanceof TRPCError) || error.code !== "BAD_REQUEST") {
          throw error;
        }
      }
    }

    const chargedMinutes = alreadyChargedMinutes + Math.floor(outstandingCoinsCharged / session.coinsPerMinuteSnapshot);
    const totalCoins = existingTicks.reduce((sum, tick) => sum + tick.coinsDeducted, 0) + outstandingCoinsCharged;
    const finalReason = outstandingMinutes > 0 && outstandingCoinsCharged === 0
      ? "INSUFFICIENT_BALANCE"
      : (reason ?? "NORMAL");

    await db.update(callSessions).set({
      status: "ENDED" as any,
      endReason: finalReason as any,
      endedAt,
      totalDurationSeconds: durationSeconds,
      billableMinutes: chargedMinutes,
      totalCoinsSpent: totalCoins,
    }).where(eq(callSessions.id, sessionId));

    await db.update(calls).set({
      status: "ENDED" as any,
    }).where(eq(calls.callSessionId, sessionId));

    const [updatedSession] = await db.select().from(callSessions).where(eq(callSessions.id, sessionId)).limit(1);
    const callRecord = await this.getOrCreateCallRecord(updatedSession!);
    await this.creditModelMinutes(updatedSession!, chargedMinutes, endedAt);
    await this.upsertCallHistory(updatedSession!, callRecord, "ENDED");

    return { sessionId, durationSeconds, totalCoinsCharged: totalCoins };
  }

  async processBillingTick(sessionId: string, tickNumber: number, _userBalanceAfter: number) {
    const [session] = await db.select().from(callSessions)
      .where(eq(callSessions.id, sessionId)).limit(1);
    if (!session || session.status !== "ACTIVE") return null;

    const [existingTick] = await db.select().from(callBillingTicks)
      .where(and(eq(callBillingTicks.callSessionId, sessionId), eq(callBillingTicks.tickNumber, tickNumber)))
      .limit(1);

    if (existingTick) {
      return {
        tick: existingTick,
        session,
        classification: "OK" as const,
      };
    }

    const coinsToDeduct = session.coinsPerMinuteSnapshot;
    const policy = await this.getCallMonetizationPolicy();
    let newBalance = 0;

    try {
      const debitResult = await this.walletService.debitCoins(
        session.callerUserId,
        coinsToDeduct,
        "CALL_BILLING",
        `${sessionId}:tick:${tickNumber}`,
        `Call billing tick ${tickNumber}`,
        `${sessionId}:tick:${tickNumber}`,
      );
      newBalance = debitResult.newBalance;
    } catch (error) {
      if (!(error instanceof TRPCError) || error.code !== "BAD_REQUEST") {
        throw error;
      }

      await this.endCall(sessionId, "INSUFFICIENT_BALANCE", { skipOutstandingDebit: true, endedAt: new Date() });

      return {
        tick: null,
        session,
        classification: "INSUFFICIENT_BALANCE" as const,
      };
    }

    const [tick] = await db.insert(callBillingTicks).values({
      callSessionId: sessionId,
      tickNumber,
      coinsDeducted: coinsToDeduct,
      userBalanceAfter: newBalance,
      tickTimestamp: new Date(),
    }).returning();

    const remainingAfterTick = Math.max(newBalance, 0);
    const isInsufficient = remainingAfterTick < coinsToDeduct;
    const isLowBalance = !isInsufficient && remainingAfterTick <= coinsToDeduct * policy.lowBalanceWarningMultiplier;

    if (isInsufficient) {
      await this.endCall(sessionId, "INSUFFICIENT_BALANCE", { skipOutstandingDebit: true, endedAt: new Date() });
    }

    return {
      tick: tick!,
      session,
      classification: isInsufficient ? "INSUFFICIENT_BALANCE" : isLowBalance ? "LOW_BALANCE" : "OK",
    };
  }

  async getBillingState(sessionId: string) {
    const [session] = await db.select().from(callSessions)
      .where(eq(callSessions.id, sessionId)).limit(1);
    if (!session) return null;

    const ticks = await db.select().from(callBillingTicks)
      .where(eq(callBillingTicks.callSessionId, sessionId));
    const wallet = await this.walletService.getOrCreateWallet(session.callerUserId);
    const policy = await this.getCallMonetizationPolicy();

    return {
      session,
      totalTicks: ticks.length,
      totalCoinsDeducted: ticks.reduce((s, t) => s + t.coinsDeducted, 0),
      currentBalance: wallet.coinBalance,
      lowBalanceThreshold: session.coinsPerMinuteSnapshot * policy.lowBalanceWarningMultiplier,
      minimumBalanceCoins: policy.minimumBalanceCoins,
      callCommissionPercent: policy.callCommissionPercent,
      creatorPayoutPercent: policy.creatorPayoutPercent,
    };
  }

  async listMyCallHistory(userId: string, limit = 50) {
    const records = await db
      .select()
      .from(callHistory)
      .where(or(eq(callHistory.callerUserId, userId), eq(callHistory.modelUserId, userId)))
      .orderBy(desc(callHistory.endedAt), desc(callHistory.createdAt))
      .limit(limit);

    return {
      items: records.map((record) => ({
        ...record,
        direction: record.callerUserId === userId ? "outgoing" : "incoming",
        otherUserId: record.callerUserId === userId ? record.modelUserId : record.callerUserId,
      })),
    };
  }

  async listCallHistory(filters: { status?: string; callType?: string; limit?: number }) {
    const conditions = [] as any[];
    if (filters.status) conditions.push(eq(callHistory.finalStatus, filters.status as any));
    if (filters.callType) conditions.push(eq(callHistory.callType, filters.callType as any));

    return db
      .select()
      .from(callHistory)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(callHistory.endedAt), desc(callHistory.createdAt))
      .limit(filters.limit ?? 100);
  }

  async getCallOperationsReport(startDate: Date, endDate: Date) {
    const requestCounts = await db
      .select({ status: calls.status, count: sql<number>`count(*)` })
      .from(calls)
      .where(sql`${calls.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(calls.status);

    const historyCounts = await db
      .select({ status: callHistory.finalStatus, count: sql<number>`count(*)` })
      .from(callHistory)
      .where(sql`${callHistory.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(callHistory.finalStatus);

    const [summary] = await db
      .select({
        totalCoinsSpent: sql<number>`coalesce(sum(${callHistory.totalCoinsSpent}), 0)`,
        totalDurationSeconds: sql<number>`coalesce(sum(${callHistory.totalDurationSeconds}), 0)`,
        completedCalls: sql<number>`count(*) filter (where ${callHistory.finalStatus} = 'ENDED')`,
      })
      .from(callHistory)
      .where(sql`${callHistory.createdAt} BETWEEN ${startDate} AND ${endDate}`);

    return {
      summary: {
        totalCoinsSpent: Number(summary?.totalCoinsSpent ?? 0),
        totalDurationSeconds: Number(summary?.totalDurationSeconds ?? 0),
        completedCalls: Number(summary?.completedCalls ?? 0),
      },
      requestCounts,
      historyCounts,
    };
  }
}
