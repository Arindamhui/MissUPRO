import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { callSessions, callBillingTicks, models, modelStats } from "@missu/db/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { calculateCallPrice } from "@missu/utils";
import { CALL_PRICING, LEVEL_PRICING } from "@missu/config";

@Injectable()
export class CallService {
  async requestCall(
    callerUserId: string,
    modelUserId: string,
    callType: "AUDIO" | "VIDEO",
  ) {
    const [model] = await db.select().from(models)
      .where(and(eq(models.userId, modelUserId), eq(models.isOnline, true)))
      .limit(1);
    if (!model) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Model is unavailable" });
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

    return { sessionId, agoraChannel: `call_${sessionId}` };
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

    return tick!;
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
