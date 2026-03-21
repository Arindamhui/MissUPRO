import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { db } from "@missu/db";
import { giftTransactions, gifts, liveGiftEvents, liveStreams, liveViewers, users } from "@missu/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { acquireLock, generateIdempotencyKey, releaseLock } from "@missu/utils";
import { calculateTrendingScore } from "@missu/utils";
import { WalletService } from "../wallet/wallet.service";
import { IdempotencyService } from "../common/idempotency.service";
import { PkService } from "../pk/pk.service";
import { ConfigService } from "../config/config.service";
import { randomUUID } from "node:crypto";
import { RealtimeStateService } from "../realtime/realtime-state.service";
import { SocketEmitterService } from "../common/socket-emitter.service";
import { SOCKET_EVENTS } from "@missu/types";
import { LevelService } from "../levels/level.service";
import { NotificationService } from "../notifications/notification.service";

@Injectable()
export class GiftService {
  constructor(
    private readonly walletService: WalletService,
    private readonly idempotencyService: IdempotencyService,
    private readonly pkService: PkService,
    private readonly configService: ConfigService,
    private readonly realtimeStateService: RealtimeStateService,
    private readonly socketEmitterService: SocketEmitterService,
    private readonly levelService: LevelService,
    private readonly notificationService: NotificationService,
  ) {}

  async getActiveCatalog() {
    const catalog = await db
      .select()
      .from(gifts)
      .where(and(eq(gifts.isActive, true), isNull(gifts.deletedAt)))
      .orderBy(gifts.displayOrder);

    return catalog.map((gift) => ({
      ...gift,
      displayName: gift.name,
      catalogKey: gift.giftCode,
    }));
  }

  async previewSendGift(giftId: string, quantity: number) {
    const [gift] = await db
      .select()
      .from(gifts)
      .where(and(eq(gifts.id, giftId), eq(gifts.isActive, true), isNull(gifts.deletedAt)))
      .limit(1);

    if (!gift) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Gift not available" });
    }

    const policy = await this.configService.getCreatorEconomyPolicy();
    const platformCommissionPercent = policy.commission.platformCommissionPercent;
    const derivedDiamondCredit = Math.round(
      gift.coinPrice * (policy.diamondConversion.diamonds / policy.diamondConversion.coins) * (1 - platformCommissionPercent / 100),
    );
    const effectiveDiamondCredit = gift.diamondCredit > 0 ? gift.diamondCredit : Math.max(0, derivedDiamondCredit);

    return {
      gift,
      totalCost: gift.coinPrice * quantity,
      diamondsToReceiver: effectiveDiamondCredit * quantity,
      commissionPercent: platformCommissionPercent,
    };
  }

  async sendGift(
    senderId: string,
    giftId: string,
    receiverId: string,
    contextType: string,
    contextId: string,
    comboCount: number = 1,
    comboGroupId?: string,
    idempotencyKey?: string,
  ) {
    if (!Number.isInteger(comboCount) || comboCount <= 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Gift quantity must be a positive integer" });
    }

    if (senderId === receiverId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Users cannot send gifts to themselves" });
    }

    const [gift] = await db
      .select()
      .from(gifts)
      .where(and(eq(gifts.id, giftId), eq(gifts.isActive, true), isNull(gifts.deletedAt)))
      .limit(1);

    if (!gift) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Gift not available" });
    }

    const supportedContexts = Array.isArray(gift.supportedContextsJson) ? gift.supportedContextsJson as string[] : [];
    if (supportedContexts.length > 0 && !supportedContexts.includes(contextType)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Gift is not supported in this context" });
    }

    const policy = await this.configService.getCreatorEconomyPolicy();
    const platformCommissionPercent = policy.commission.platformCommissionPercent;
    const coinCost = gift.coinPrice * comboCount;
    const derivedDiamondCredit = Math.round(
      gift.coinPrice * (policy.diamondConversion.diamonds / policy.diamondConversion.coins) * (1 - platformCommissionPercent / 100),
    );
    const diamondCreditPerUnit = gift.diamondCredit > 0 ? gift.diamondCredit : Math.max(0, derivedDiamondCredit);
    const diamondCredit = diamondCreditPerUnit * comboCount;
    const idemKey = idempotencyKey ?? generateIdempotencyKey(senderId, receiverId, giftId, contextType, contextId, String(comboCount));

    await this.walletService.getOrCreateWallet(senderId);
    await this.walletService.getOrCreateWallet(receiverId);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "gifts:send",
        actorUserId: senderId,
        requestData: { giftId, receiverId, contextType, contextId, comboCount, comboGroupId },
      },
      async () => {
        const lockKeys = [senderId, receiverId].sort();
        const heldLocks: Array<{ key: string; token: string }> = [];

        try {
          for (const userId of lockKeys) {
            const token = await acquireLock(`wallet:${userId}`, 5000);
            if (!token) {
              throw new TRPCError({ code: "CONFLICT", message: "Gift operation in progress" });
            }
            heldLocks.push({ key: `wallet:${userId}`, token });
          }

          const result = await db.transaction(async (tx) => {
            const transactionId = randomUUID();
            const [senderUser] = await tx
              .select({ displayName: users.displayName, username: users.username })
              .from(users)
              .where(eq(users.id, senderId))
              .limit(1);

            const senderName = senderUser?.username ?? senderUser?.displayName ?? senderId;

            await this.walletService.applyCoinMutation(tx, {
              userId: senderId,
              amount: -coinCost,
              transactionType: "GIFT_SENT",
              referenceType: "GIFT_TRANSACTION",
              referenceId: transactionId,
              description: `Gift sent: ${gift.name}`,
              idempotencyKey: `gift:coin:${idemKey}`,
            });

            await this.walletService.applyDiamondMutation(tx, {
              userId: receiverId,
              amount: diamondCredit,
              transactionType: "GIFT_CREDIT",
              referenceType: "GIFT_TRANSACTION",
              referenceId: transactionId,
              description: `Gift received: ${gift.name}`,
              idempotencyKey: `gift:diamond:${idemKey}`,
            });

            await tx.insert(giftTransactions).values({
              id: transactionId,
              senderUserId: senderId,
              receiverUserId: receiverId,
              giftId,
              coinCost,
              diamondCredit,
              contextType: contextType as any,
              contextId,
              economyProfileKeySnapshot: gift.economyProfileKey ?? "default",
              platformCommissionBpsSnapshot: Math.round(platformCommissionPercent * 100),
              diamondValueUsdPer100Snapshot: policy.diamondValueUsdPer100.toFixed(4),
              senderDisplayNameSnapshot: senderName,
              comboCount,
              idempotencyKey: idemKey,
            });

            if (contextType === "LIVE_STREAM") {
              const [stream] = await tx
                .select({
                  id: liveStreams.id,
                  roomId: liveStreams.roomId,
                  giftRevenueCoins: liveStreams.giftRevenueCoins,
                  viewerCountPeak: liveStreams.viewerCountPeak,
                })
                .from(liveStreams)
                .where(eq(liveStreams.id, contextId))
                .limit(1);

              if (stream) {
                const [viewerCountRow] = await tx
                  .select({ count: sql<number>`count(*)::int` })
                  .from(liveViewers)
                  .where(and(eq(liveViewers.streamId, contextId), isNull(liveViewers.leftAt)));

                const viewerCount = Number(viewerCountRow?.count ?? 0);
                const nextGiftRevenue = Number(stream.giftRevenueCoins ?? 0) + coinCost;
                const nextTrendingScore = calculateTrendingScore(nextGiftRevenue, Number(stream.viewerCountPeak ?? 0), viewerCount);

                await tx
                  .update(liveStreams)
                  .set({
                    giftRevenueCoins: nextGiftRevenue,
                    trendingScore: String(nextTrendingScore),
                  })
                  .where(eq(liveStreams.id, stream.id));

                await tx.insert(liveGiftEvents).values({
                  giftTransactionId: transactionId,
                  liveStreamId: stream.id,
                  roomId: stream.roomId,
                  senderUserId: senderId,
                  receiverUserId: receiverId,
                  displayMessage: `sent ${comboCount}x ${gift.name}`,
                  animationKey: gift.giftCode,
                  comboGroupId: comboGroupId ?? null,
                  comboCountSnapshot: comboCount,
                  broadcastEventId: randomUUID(),
                  metadataJson: {
                    contextType,
                    comboCount,
                    platformCommissionPercent,
                    diamondValueUsdPer100: policy.diamondValueUsdPer100,
                  },
                });
              }
            }

            return {
              id: transactionId,
              senderName,
              giftName: gift.name,
            };
          });

          try {
            await this.levelService.awardGiftXp(senderId, coinCost, result.id, {
              receiverUserId: receiverId,
              contextType,
              contextId,
            });
          } catch (error) {
            console.warn("Gift XP award failed", {
              transactionId: result.id,
              senderId,
              receiverId,
              contextType,
              contextId,
              error: error instanceof Error ? error.message : String(error),
            });
          }

          try {
            await this.notificationService.createNotification(
              receiverId,
              "GIFT_RECEIVED",
              `${result.senderName} sent you a gift`,
              `${result.senderName} sent ${comboCount}x ${result.giftName}.`,
              {
                senderUserId: senderId,
                receiverUserId: receiverId,
                giftId,
                giftName: result.giftName,
                quantity: comboCount,
                contextType,
                contextId,
                transactionId: result.id,
                channels: ["PUSH"],
              },
            );
          } catch (error) {
            console.warn("Gift notification failed", {
              transactionId: result.id,
              senderId,
              receiverId,
              contextType,
              contextId,
              error: error instanceof Error ? error.message : String(error),
            });
          }

          if (contextType === "PK_BATTLE") {
            const scoreResult = await this.pkService.addGiftScore(contextId, senderId, receiverId, giftId, coinCost);
            if (scoreResult.added) {
              const state = await this.pkService.getPKBattleRealtimeState(contextId, 20);
              const deliveryId = randomUUID();
              const payload = {
                sessionId: contextId,
                state,
                deliveryId,
                emittedAt: new Date().toISOString(),
              };

              await this.realtimeStateService.appendRecentEvent({
                deliveryId,
                event: SOCKET_EVENTS.PK.SCORE_UPDATE,
                roomId: contextId,
                roomScope: "pk",
                payload,
                critical: false,
                createdAt: new Date().toISOString(),
              });

              this.socketEmitterService.emitToRoom("pk", contextId, SOCKET_EVENTS.PK.SCORE_UPDATE, payload);
            }
          }

          if (contextType === "LIVE_STREAM") {
            const deliveryId = randomUUID();
            const emittedAt = new Date().toISOString();
            const payload = {
              roomId: contextId,
              transactionId: result.id,
              giftId,
              giftName: result.giftName,
              senderId,
              senderName: result.senderName,
              receiverId,
              quantity: comboCount,
              effect: gift.giftCode,
              deliveryId,
              emittedAt,
            };

            await this.realtimeStateService.appendRecentEvent({
              deliveryId,
              event: SOCKET_EVENTS.GIFT.RECEIVED_LIVE,
              roomId: contextId,
              roomScope: "stream",
              payload,
              critical: true,
              createdAt: emittedAt,
            });

            this.socketEmitterService.emitToRoom("stream", contextId, SOCKET_EVENTS.GIFT.RECEIVED_LIVE, payload);
          }

          return { id: result.id };
        } finally {
          for (const lock of heldLocks.reverse()) {
            await releaseLock(lock.key, lock.token);
          }
        }
      },
    );
  }

  async getGiftLeaderboard(contextType: string, contextId: string, limit: number) {
    const leaderboard = await db.execute(sql`
      select
        sender_user_id as "senderUserId",
        sum(coin_cost)::int as "totalCoins"
      from gift_transactions
      where context_type = ${contextType}
        and context_id = ${contextId}::uuid
      group by sender_user_id
      order by sum(coin_cost) desc
      limit ${limit}
    `);

    return leaderboard.rows;
  }
}
