import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { gifts, giftTransactions, liveGiftEvents, wallets, coinTransactions, diamondTransactions, liveStreams, liveViewers, users } from "@missu/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
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
    const catalog = await db.select().from(gifts)
      .where(eq(gifts.isActive, true))
      .orderBy(gifts.displayOrder);

    return catalog.map((gift) => ({
      ...gift,
      displayName: gift.name,
      catalogKey: gift.giftCode,
    }));
  }

  async previewSendGift(giftId: string, quantity: number) {
    const [gift] = await db.select().from(gifts).where(eq(gifts.id, giftId)).limit(1);
    if (!gift || !gift.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Gift not available" });
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
    const [gift] = await db.select().from(gifts).where(eq(gifts.id, giftId)).limit(1);
    if (!gift || !gift.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Gift not available" });

    if (senderId === receiverId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Users cannot send gifts to themselves" });
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

          const giftTransactionId = randomUUID();

          await db.transaction(async (tx) => {
            const [senderWallet] = await tx
              .select()
              .from(wallets)
              .where(eq(wallets.userId, senderId))
              .limit(1);

            const [receiverWallet] = await tx
              .select()
              .from(wallets)
              .where(eq(wallets.userId, receiverId))
              .limit(1);

            if (!senderWallet || !receiverWallet) {
              throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wallet missing" });
            }

            if (senderWallet.coinBalance < coinCost) {
              throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
            }

            await tx
              .update(wallets)
              .set({
                coinBalance: sql`${wallets.coinBalance} - ${coinCost}`,
                lifetimeCoinsSpent: sql`${wallets.lifetimeCoinsSpent} + ${coinCost}`,
                updatedAt: new Date(),
              })
              .where(eq(wallets.userId, senderId));

            await tx.insert(coinTransactions).values({
              userId: senderId,
              transactionType: "GIFT_SENT" as any,
              amount: -coinCost,
              balanceAfter: senderWallet.coinBalance - coinCost,
              referenceType: "gift_transaction",
              referenceId: giftTransactionId,
              description: `Gift sent: ${gift.name}`,
              idempotencyKey: `gift:coin:${idemKey}`,
            });

            await tx
              .update(wallets)
              .set({
                diamondBalance: sql`${wallets.diamondBalance} + ${diamondCredit}`,
                lifetimeDiamondsEarned: sql`${wallets.lifetimeDiamondsEarned} + ${diamondCredit}`,
                updatedAt: new Date(),
              })
              .where(eq(wallets.userId, receiverId));

            await tx.insert(diamondTransactions).values({
              userId: receiverId,
              transactionType: "GIFT_CREDIT" as any,
              amount: diamondCredit,
              balanceAfter: receiverWallet.diamondBalance + diamondCredit,
              referenceType: "gift_transaction",
              referenceId: giftTransactionId,
              description: `Gift received: ${gift.name}`,
              idempotencyKey: `gift:diamond:${idemKey}`,
            });

            await tx.insert(giftTransactions).values({
              id: giftTransactionId,
              giftId,
              senderUserId: senderId,
              receiverUserId: receiverId,
              coinCost,
              diamondCredit,
              contextType: contextType as any,
              contextId,
              comboCount,
              economyProfileKeySnapshot: gift.economyProfileKey ?? "default",
              platformCommissionBpsSnapshot: Math.round(platformCommissionPercent * 100),
              diamondValueUsdPer100Snapshot: policy.diamondValueUsdPer100.toFixed(4),
              senderDisplayNameSnapshot: senderId,
              idempotencyKey: idemKey,
            });

            if (["LIVE_STREAM", "GROUP_AUDIO", "PARTY", "PK_BATTLE"].includes(contextType)) {
              await tx.insert(liveGiftEvents).values({
                giftTransactionId,
                liveStreamId: contextId,
                roomId: contextId,
                senderUserId: senderId,
                receiverUserId: receiverId,
                displayMessage: `sent a ${gift.giftCode}!`,
                animationKey: gift.giftCode,
                comboGroupId,
                comboCountSnapshot: comboCount,
                broadcastEventId: randomUUID(),
              });

              if (contextType === "LIVE_STREAM") {
                const [currentStream] = await tx
                  .select({
                    giftRevenueCoins: liveStreams.giftRevenueCoins,
                    viewerCountPeak: liveStreams.viewerCountPeak,
                    viewerCountCurrent: liveStreams.viewerCountCurrent,
                  })
                  .from(liveStreams)
                  .where(eq(liveStreams.id, contextId))
                  .limit(1);

                if (currentStream) {
                  const nextGiftRevenue = Number(currentStream.giftRevenueCoins ?? 0) + coinCost;
                  const nextTrendingScore = calculateTrendingScore(
                    nextGiftRevenue,
                    Number(currentStream.viewerCountPeak ?? 0),
                    Number(currentStream.viewerCountCurrent ?? 0),
                  );

                  await tx
                    .update(liveStreams)
                    .set({
                      giftRevenueCoins: sql`${liveStreams.giftRevenueCoins} + ${coinCost}`,
                      trendingScore: String(nextTrendingScore),
                    })
                    .where(eq(liveStreams.id, contextId));
                }

                await tx
                  .update(liveViewers)
                  .set({
                    giftCoinsSent: sql`${liveViewers.giftCoinsSent} + ${coinCost}`,
                  })
                  .where(
                    and(
                      eq(liveViewers.streamId, contextId),
                      eq(liveViewers.userId, senderId),
                      sql`${liveViewers.leftAt} is null`,
                    ),
                  );
              }
            }
          });

          const [transaction] = await db
            .select()
            .from(giftTransactions)
            .where(eq(giftTransactions.idempotencyKey, idemKey))
            .limit(1);

          if (!transaction) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Gift transaction not created" });
          }

          await this.levelService.awardGiftXp(senderId, coinCost, transaction.id, {
            receiverUserId: receiverId,
            contextType,
            contextId,
          });

          const [senderProfile] = await db
            .select({
              displayName: users.displayName,
              username: users.username,
            })
            .from(users)
            .where(eq(users.id, senderId))
            .limit(1);

          const senderName = senderProfile?.displayName ?? senderProfile?.username ?? senderId;

          await this.notificationService.createNotification(
            receiverId,
            "GIFT_RECEIVED",
            `${senderName} sent you a gift`,
            `${senderName} sent ${comboCount}x ${gift.name}.`,
            {
              senderUserId: senderId,
              receiverUserId: receiverId,
              giftId,
              giftName: gift.name,
              quantity: comboCount,
              contextType,
              contextId,
              transactionId: transaction.id,
              channels: ["PUSH"],
            },
          );

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
              transactionId: transaction.id,
              giftId,
              giftName: gift.name,
              senderId,
              senderName,
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

          return transaction;
        } finally {
          for (const lock of heldLocks.reverse()) {
            await releaseLock(lock.key, lock.token);
          }
        }
      },
    );
  }

  async getGiftLeaderboard(contextType: string, contextId: string, limit: number) {
    const leaderboard = await db
      .select({
        senderUserId: giftTransactions.senderUserId,
        totalCoins: sql<number>`SUM(${giftTransactions.coinCost})`,
      })
      .from(giftTransactions)
      .where(
        and(
          eq(giftTransactions.contextType, contextType as any),
          eq(giftTransactions.contextId, contextId),
        ),
      )
      .groupBy(giftTransactions.senderUserId)
      .orderBy(sql`SUM(${giftTransactions.coinCost}) DESC`)
      .limit(limit);

    return leaderboard;
  }
}
