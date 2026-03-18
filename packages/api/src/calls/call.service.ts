import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { callSessions, callBillingTicks, models, modelStats, systemSettings, calls, callHistory, modelCallStats, modelApplications, profiles } from "@missu/db/schema";
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
  private modelSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private modelStatsSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private userSchemaModePromise: Promise<"modern" | "legacy"> | null = null;
  private callSessionSchemaModePromise: Promise<"modern" | "legacy"> | null = null;

  constructor(
    private readonly rtcTokenService: RtcTokenService,
    private readonly modelService: ModelService,
    private readonly walletService: WalletService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  private async getModelSchemaMode() {
    if (!this.modelSchemaModePromise) {
      this.modelSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'models'
        ) as has_models
      `).then((result) => {
        const value = result.rows[0] as { has_models?: boolean | string | number } | undefined;
        return value?.has_models ? "modern" : "legacy";
      });
    }

    return this.modelSchemaModePromise;
  }

  private async getModelStatsSchemaMode() {
    if (!this.modelStatsSchemaModePromise) {
      this.modelStatsSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.tables
          where table_schema = 'public'
            and table_name = 'model_stats'
        ) as has_model_stats
      `).then((result) => {
        const value = result.rows[0] as { has_model_stats?: boolean | string | number } | undefined;
        return value?.has_model_stats ? "modern" : "legacy";
      });
    }

    return this.modelStatsSchemaModePromise;
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

  private async getCallSessionSchemaMode() {
    if (!this.callSessionSchemaModePromise) {
      this.callSessionSchemaModePromise = db.execute(sql`
        select exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = 'call_sessions'
            and column_name = 'model_level_snapshot'
        ) as has_model_level_snapshot
      `).then((result) => {
        const value = result.rows[0] as { has_model_level_snapshot?: boolean | string | number } | undefined;
        return value?.has_model_level_snapshot ? "modern" : "legacy";
      });
    }

    return this.callSessionSchemaModePromise;
  }

  private getLegacyCallType(callType: "AUDIO" | "VIDEO") {
    return callType === "AUDIO" ? "VOICE" : "VIDEO";
  }

  private normalizeCallSessionRow(row: Record<string, unknown>) {
    return {
      ...row,
      coinsPerMinuteSnapshot: Number(row.coinsPerMinuteSnapshot ?? 0),
      totalDurationSeconds: Number(row.totalDurationSeconds ?? 0),
      billableMinutes: Number(row.billableMinutes ?? 0),
      totalCoinsSpent: Number(row.totalCoinsSpent ?? 0),
      minutesCreditedToModel: Number(row.minutesCreditedToModel ?? 0),
      startedAt: row.startedAt ? new Date(String(row.startedAt)) : null,
      endedAt: row.endedAt ? new Date(String(row.endedAt)) : null,
      createdAt: row.createdAt ? new Date(String(row.createdAt)) : null,
    } as unknown as typeof callSessions.$inferSelect;
  }

  private async getCallSessionById(sessionId: string) {
    if (await this.getCallSessionSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          caller_user_id as "callerUserId",
          model_user_id as "modelUserId",
          call_type as "callType",
          status,
          end_reason as "endReason",
          coins_per_minute_snapshot as "coinsPerMinuteSnapshot",
          total_duration_seconds as "totalDurationSeconds",
          billable_minutes as "billableMinutes",
          total_coins_spent as "totalCoinsSpent",
          minutes_credited_to_model as "minutesCreditedToModel",
          started_at as "startedAt",
          ended_at as "endedAt",
          created_at as "createdAt"
        from call_sessions
        where id = ${sessionId}::uuid
        limit 1
      `);
      return result.rows[0] ? this.normalizeCallSessionRow(result.rows[0] as Record<string, unknown>) : null;
    }

    const [session] = await db.select().from(callSessions)
      .where(eq(callSessions.id, sessionId)).limit(1);
    return session ?? null;
  }

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
    const modelStatsMode = await this.getModelStatsSchemaMode();
    const [modernStats, legacyProfileResult] = await Promise.all([
      modelStatsMode === "modern"
        ? db.select().from(modelStats).where(eq(modelStats.modelUserId, modelUserId)).limit(1)
        : Promise.resolve([] as typeof modelStats.$inferSelect[]),
      modelStatsMode === "legacy"
        ? db.execute(sql`select level from profiles where user_id = ${modelUserId}::uuid limit 1`)
        : Promise.resolve({ rows: [] } as { rows: unknown[] }),
    ]);
    const mStats = modernStats[0] ?? null;
    const legacyProfile = (legacyProfileResult.rows[0] as { level?: number | string } | undefined) ?? null;
    const policy = await this.getCallMonetizationPolicy();
    const modelLevelRaw = mStats?.currentLevel ?? legacyProfile?.level ?? null;
    const modelLevel = modelLevelRaw == null ? null : Number(modelLevelRaw);
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
    if (await this.getModelStatsSchemaMode() === "modern") {
      await db.insert(modelStats).values({ modelUserId }).onConflictDoNothing();
    }
  }

  private async creditModelMinutes(session: typeof callSessions.$inferSelect, chargedMinutes: number, endedAt: Date) {
    if (session.minutesCreditedToModel || chargedMinutes <= 0) {
      return;
    }

    await this.ensureModelCallStats(session.modelUserId);

    const sessionCallType = String(session.callType);
    const audioMinutes = sessionCallType === "AUDIO" || sessionCallType === "VOICE" ? chargedMinutes : 0;
    const videoMinutes = sessionCallType === "VIDEO" ? chargedMinutes : 0;

    await db
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

    if (await this.getModelStatsSchemaMode() === "modern") {
      await db
        .update(modelStats)
        .set({
          totalAudioMinutes: sql`${modelStats.totalAudioMinutes} + ${audioMinutes}`,
          totalVideoMinutes: sql`${modelStats.totalVideoMinutes} + ${videoMinutes}`,
          totalCallsCompleted: sql`${modelStats.totalCallsCompleted} + 1`,
          updatedAt: endedAt,
        })
        .where(eq(modelStats.modelUserId, session.modelUserId));
    }

    await db
      .update(callSessions)
      .set({
        minutesCreditedToModel: true,
      })
      .where(eq(callSessions.id, session.id));
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
    if (await this.getCallSessionSchemaMode() === "legacy") {
      const result = await db.execute(sql`
        select
          id,
          caller_user_id as "callerUserId",
          model_user_id as "modelUserId",
          call_type as "callType",
          status,
          end_reason as "endReason",
          coins_per_minute_snapshot as "coinsPerMinuteSnapshot",
          total_duration_seconds as "totalDurationSeconds",
          billable_minutes as "billableMinutes",
          total_coins_spent as "totalCoinsSpent",
          minutes_credited_to_model as "minutesCreditedToModel",
          started_at as "startedAt",
          ended_at as "endedAt",
          created_at as "createdAt"
        from call_sessions
        where id = ${sessionId}::uuid
          and (caller_user_id = ${userId}::uuid or model_user_id = ${userId}::uuid)
        limit 1
      `);

      return result.rows[0] ? this.normalizeCallSessionRow(result.rows[0] as Record<string, unknown>) : null;
    }

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

    const modelSchemaMode = await this.getModelSchemaMode();
    const [modernModels, legacyApplications] = await Promise.all([
      modelSchemaMode === "modern"
        ? db.select().from(models).where(eq(models.userId, modelUserId)).limit(1)
        : Promise.resolve([] as typeof models.$inferSelect[]),
      modelSchemaMode === "legacy"
        ? db.select().from(modelApplications).where(and(eq(modelApplications.userId, modelUserId), eq(modelApplications.status, "APPROVED" as any))).limit(1)
        : Promise.resolve([] as typeof modelApplications.$inferSelect[]),
    ]);
    const model = modernModels[0] ?? null;
    const legacyApplication = legacyApplications[0] ?? null;

    if ((!model || !model.approvedAt) && !legacyApplication) {
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
    const legacyCallType = this.getLegacyCallType(callType);
    const metadataJson = {
      billingMode: "PER_MINUTE",
      minimumBalanceCoinsRequired,
      callCommissionPercent: policy.callCommissionPercent,
      creatorPayoutPercent: policy.creatorPayoutPercent,
    };

    if (await this.getCallSessionSchemaMode() === "legacy") {
      await db.execute(sql`
        insert into call_sessions (
          id,
          caller_user_id,
          model_user_id,
          call_type,
          status,
          coins_per_minute_snapshot
        ) values (
          ${sessionId}::uuid,
          ${callerUserId}::uuid,
          ${modelUserId}::uuid,
          ${legacyCallType},
          'REQUESTED',
          ${coinsPerMinute}
        )
      `);
    } else {
      await db.insert(callSessions).values({
        id: sessionId,
        callerUserId,
        modelUserId,
        callType: callType as any,
        status: "REQUESTED" as any,
        coinsPerMinuteSnapshot: coinsPerMinute,
        modelLevelSnapshot: modelLevel,
      });
    }

    try {
      if (await this.getCallSessionSchemaMode() === "legacy") {
        await db.execute(sql`
          insert into calls (
            id,
            caller_user_id,
            model_user_id,
            call_type,
            status,
            requested_at,
            call_session_id,
            metadata_json,
            created_at
          ) values (
            ${callId}::uuid,
            ${callerUserId}::uuid,
            ${modelUserId}::uuid,
            ${legacyCallType},
            'REQUESTED',
            now(),
            ${sessionId}::uuid,
            ${JSON.stringify(metadataJson)}::jsonb,
            now()
          )
        `);
      } else {
        await db.insert(calls).values({
          id: callId,
          callerUserId,
          modelUserId,
          callType: callType as any,
          status: "REQUESTED" as any,
          callSessionId: sessionId,
          metadataJson,
        });
      }
    } catch (error) {
      await db.delete(callSessions).where(eq(callSessions.id, sessionId));
      throw error;
    }

    const session = await this.getCallSessionById(sessionId);

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
    const session = await this.getCallSessionById(sessionId);
    if (!session || session.status !== "REQUESTED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid call session" });
    }
    if (session.modelUserId !== modelUserId) {
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
    const session = await this.getCallSessionById(sessionId);
    if (!session || session.status !== "REQUESTED") {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid call session" });
    }
    if (session.modelUserId !== modelUserId) {
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

    const updatedSession = await this.getCallSessionById(sessionId);
    const callRecord = await this.getOrCreateCallRecord(updatedSession!);
    await this.upsertCallHistory(updatedSession!, callRecord, "FAILED");

    const modelProfile = (await this.getUserSchemaMode()) === "legacy"
      ? await db.execute(sql`
          select
            coalesce(p.display_name, u.username) as "displayName",
            u.username
          from users u
          left join profiles p on p.user_id = u.id
          where u.id = ${modelUserId}::uuid
          limit 1
        `).then((result) => result.rows[0] as { displayName?: string; username?: string } | undefined)
      : await db
          .select({
            displayName: users.displayName,
            username: users.username,
          })
          .from(users)
          .where(eq(users.id, modelUserId))
          .limit(1)
          .then((rows) => rows[0]);

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
    const session = await this.getCallSessionById(sessionId);

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
    const session = await this.getCallSessionById(sessionId);
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

    const updatedSession = await this.getCallSessionById(sessionId);
    const callRecord = await this.getOrCreateCallRecord(updatedSession!);
    await this.creditModelMinutes(updatedSession!, chargedMinutes, endedAt);
    await this.upsertCallHistory(updatedSession!, callRecord, "ENDED");

    return { sessionId, durationSeconds, totalCoinsCharged: totalCoins };
  }

  async processBillingTick(sessionId: string, tickNumber: number, _userBalanceAfter: number) {
    const session = await this.getCallSessionById(sessionId);
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
    const session = await this.getCallSessionById(sessionId);
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
