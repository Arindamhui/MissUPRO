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

  private async selectWallet(userId: string) {
    const [wallet] = await db
      .select({
        id: wallets.id,
        userId: wallets.userId,
        coinBalance: wallets.coinBalance,
        diamondBalance: wallets.diamondBalance,
      })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    return wallet ?? null;
  }

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

          const senderWallet = await this.selectWallet(senderId);
          const receiverWallet = await this.selectWallet(receiverId);

          if (!senderWallet || !receiverWallet) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Wallet missing" });
          }

          if (senderWallet.coinBalance < coinCost) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
          }

          await db
            .update(wallets)
            .set({
              coinBalance: sql`${wallets.coinBalance} - ${coinCost}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, senderId));

          await db.execute(sql`
            insert into coin_transactions (
              user_id,
              wallet_id,
              amount,
              direction,
              balance_after,
              reason,
              reference_id,
              metadata,
              created_at
            )
            values (
              ${senderId}::uuid,
              ${senderWallet.id}::uuid,
              ${-coinCost},
              'DEBIT',
              ${senderWallet.coinBalance - coinCost},
              'GIFT_SENT',
              ${giftTransactionId}::uuid,
              ${JSON.stringify({ description: `Gift sent: ${gift.name}`, idempotencyKey: `gift:coin:${idemKey}` })}::jsonb,
              now()
            )
          `);

          await db
            .update(wallets)
            .set({
              diamondBalance: sql`${wallets.diamondBalance} + ${diamondCredit}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, receiverId));

          await db.execute(sql`
            insert into diamond_transactions (
              user_id,
              wallet_id,
              amount,
              direction,
              balance_after,
              reason,
              reference_id,
              metadata,
              created_at
            )
            values (
              ${receiverId}::uuid,
              ${receiverWallet.id}::uuid,
              ${diamondCredit},
              'CREDIT',
              ${receiverWallet.diamondBalance + diamondCredit},
              'GIFT_CREDIT',
              ${giftTransactionId}::uuid,
              ${JSON.stringify({ description: `Gift received: ${gift.name}`, idempotencyKey: `gift:diamond:${idemKey}` })}::jsonb,
              now()
            )
          `);

          await db.execute(sql`
            insert into gift_transactions (
              id,
              sender_user_id,
              receiver_user_id,
              gift_id,
              context_type,
              context_id,
              coin_debit_amount,
              diamond_credit_amount,
              economy_profile_key,
              created_at
            )
            values (
              ${giftTransactionId}::uuid,
              ${senderId}::uuid,
              ${receiverId}::uuid,
              ${giftId}::uuid,
              ${contextType},
              ${contextId}::uuid,
              ${coinCost},
              ${diamondCredit},
              ${gift.economyProfileKey ?? "default"},
              now()
            )
          `);

          if (["LIVE_STREAM", "GROUP_AUDIO", "PARTY", "PK_BATTLE"].includes(contextType)) {
            let liveRoomId = contextId;

            if (contextType === "LIVE_STREAM") {
              const [currentStream] = await db.execute(sql`
                select
                  id,
                  live_room_id as "liveRoomId",
                  total_gift_coins as "totalGiftCoins",
                  peak_viewers as "peakViewers"
                from live_streams
                where id = ${contextId}::uuid
                limit 1
              `).then((result) => result.rows as Array<Record<string, unknown>>);

              if (currentStream) {
                liveRoomId = String(currentStream.liveRoomId ?? contextId);
                const [viewerCount] = await db.execute(sql`
                  select count(*)::int as count
                  from live_viewers
                  where live_stream_id = ${contextId}::uuid and left_at is null
                `).then((result) => result.rows as Array<Record<string, unknown>>);

                const nextGiftRevenue = Number(currentStream.totalGiftCoins ?? 0) + coinCost;
                const nextTrendingScore = calculateTrendingScore(
                  nextGiftRevenue,
                  Number(currentStream.peakViewers ?? 0),
                  Number(viewerCount?.count ?? 0),
                );

                await db.execute(sql`
                  update live_streams
                  set total_gift_coins = coalesce(total_gift_coins, 0) + ${coinCost},
                      trending_score = ${String(nextTrendingScore)}
                  where id = ${contextId}::uuid
                `);
              }
            }

            await db.execute(sql`
              insert into live_gift_events (
                gift_transaction_id,
                live_stream_id,
                live_room_id,
                sender_user_id,
                receiver_user_id,
                display_message,
                animation_key,
                combo_group_id,
                combo_count_snapshot,
                broadcast_event_id,
                metadata_json,
                created_at
              )
              values (
                ${giftTransactionId}::uuid,
                ${contextId}::uuid,
                ${liveRoomId}::uuid,
                ${senderId}::uuid,
                ${receiverId}::uuid,
                ${`sent a ${gift.giftCode}!`},
                ${gift.giftCode},
                ${comboGroupId ?? null},
                ${comboCount},
                ${randomUUID()},
                ${JSON.stringify({ contextType, comboCount, platformCommissionPercent, diamondValueUsdPer100: policy.diamondValueUsdPer100 })}::jsonb,
                now()
              )
            `);
          }

          const transaction = {
            id: giftTransactionId,
          };

          if (!transaction) {
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Gift transaction not created" });
          }

          try {
            await this.levelService.awardGiftXp(senderId, coinCost, transaction.id, {
              receiverUserId: receiverId,
              contextType,
              contextId,
            });
          } catch (error) {
            console.warn("Gift XP award failed", {
              transactionId: transaction.id,
              senderId,
              receiverId,
              contextType,
              contextId,
              error: error instanceof Error ? error.message : String(error),
            });
          }

          const [senderProfile] = await db
            .select({
              username: users.username,
            })
            .from(users)
            .where(eq(users.id, senderId))
            .limit(1);

          const senderName = senderProfile?.username ?? senderId;

          try {
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
          } catch (error) {
            console.warn("Gift notification failed", {
              transactionId: transaction.id,
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
    const leaderboard = await db.execute(sql`
      select
        sender_user_id as "senderUserId",
        sum(coin_debit_amount)::int as "totalCoins"
      from gift_transactions
      where context_type = ${contextType}
        and context_id = ${contextId}::uuid
      group by sender_user_id
      order by sum(coin_debit_amount) desc
      limit ${limit}
    `);

    return leaderboard.rows;
  }
}
