import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { callSessions, callBillingTicks, models, modelStats, systemSettings } from "@missu/db/schema";
import { eq, and, desc, or, isNull, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { calculateCallPrice } from "@missu/utils";
import { CALL_PRICING, LEVEL_PRICING } from "@missu/config";
import { RtcTokenService } from "../streaming/rtc-token.service";
import { ModelService } from "../models/model.service";

@Injectable()
export class CallService {
  constructor(
    private readonly rtcTokenService: RtcTokenService,
    private readonly modelService: ModelService,
  ) {}

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

    const [mStats] = await db.select().from(modelStats)
      .where(eq(modelStats.modelUserId, modelUserId)).limit(1);
    const modelLevel = mStats?.currentLevel ?? null;

    const coinsPerMinute = calculateCallPrice(callType, modelLevel, {
      levelBasedEnabled: LEVEL_PRICING.LEVEL_BASED_ENABLED,
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
      globalAudioRate: CALL_PRICING.AUDIO_COINS_PER_MINUTE,
      globalVideoRate: CALL_PRICING.VIDEO_COINS_PER_MINUTE,
    }, mStats?.priceOverrideVideo ?? mStats?.priceOverrideAudio ?? undefined);

    const [session] = await db.insert(callSessions).values({
      callerUserId,
      modelUserId,
      callType: callType as any,
      status: "REQUESTED" as any,
      coinsPerMinuteSnapshot: coinsPerMinute,
      modelLevelSnapshot: modelLevel,
    }).returning();

    return session!;
  }

  async acceptCall(sessionId: string, modelUserId: string) {
    const [session] = await db.select().from(callSessions)
      .where(and(eq(callSessions.id, sessionId), eq(callSessions.modelUserId, modelUserId)))
      .limit(1);
    if (!session || session.status !== "REQUESTED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid call session" });
    }

    await db.update(callSessions).set({
      status: "ACTIVE" as any,
      startedAt: new Date(),
    }).where(eq(callSessions.id, sessionId));

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

    await db.update(callSessions).set({
      status: "FAILED" as any,
      endReason: "TIMEOUT" as any,
      endedAt: new Date(),
    }).where(eq(callSessions.id, sessionId));

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

  async endCall(sessionId: string, reason?: string) {
    const [session] = await db.select().from(callSessions)
      .where(eq(callSessions.id, sessionId)).limit(1);
    if (!session) throw new TRPCError({ code: "NOT_FOUND" });

    const endedAt = new Date();
    const durationSeconds = session.startedAt
      ? Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : 0;
    const totalMinutes = Math.ceil(durationSeconds / 60);
    const totalCoins = totalMinutes * session.coinsPerMinuteSnapshot;

    await db.update(callSessions).set({
      status: "ENDED" as any,
      endReason: (reason ?? "NORMAL") as any,
      endedAt,
      totalDurationSeconds: durationSeconds,
      billableMinutes: totalMinutes,
      totalCoinsSpent: totalCoins,
    }).where(eq(callSessions.id, sessionId));

    return { sessionId, durationSeconds, totalCoinsCharged: totalCoins };
  }

  async processBillingTick(sessionId: string, tickNumber: number, userBalanceAfter: number) {
    const [session] = await db.select().from(callSessions)
      .where(eq(callSessions.id, sessionId)).limit(1);
    if (!session || session.status !== "ACTIVE") return null;

    const coinsToDeduct = session.coinsPerMinuteSnapshot;

    const [tick] = await db.insert(callBillingTicks).values({
      callSessionId: sessionId,
      tickNumber,
      coinsDeducted: coinsToDeduct,
      userBalanceAfter,
      tickTimestamp: new Date(),
    }).returning();

    const remainingAfterTick = Math.max(userBalanceAfter, 0);
    const isInsufficient = remainingAfterTick < coinsToDeduct;
    const isLowBalance = !isInsufficient && remainingAfterTick <= coinsToDeduct * 2;

    if (isInsufficient) {
      await db.update(callSessions).set({
        status: "ENDED" as any,
        endReason: "INSUFFICIENT_BALANCE" as any,
        endedAt: new Date(),
      }).where(eq(callSessions.id, sessionId));
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

    return {
      session,
      totalTicks: ticks.length,
      totalCoinsDeducted: ticks.reduce((s, t) => s + t.coinsDeducted, 0),
    };
  }
}
