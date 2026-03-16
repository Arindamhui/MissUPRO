import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { gifts, giftTransactions, liveGiftEvents, wallets, coinTransactions, diamondTransactions } from "@missu/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { acquireLock, generateIdempotencyKey, releaseLock } from "@missu/utils";
import { WalletService } from "../wallet/wallet.service";
import { IdempotencyService } from "../common/idempotency.service";
import { PkService } from "../pk/pk.service";
import { randomUUID } from "node:crypto";

@Injectable()
export class GiftService {
  constructor(
    private readonly walletService: WalletService,
    private readonly idempotencyService: IdempotencyService,
    private readonly pkService: PkService,
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
    return {
      gift,
      totalCost: gift.coinPrice * quantity,
      diamondsToReceiver: gift.diamondCredit * quantity,
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

    const coinCost = gift.coinPrice * comboCount;
    const diamondCredit = gift.diamondCredit * comboCount;
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
              platformCommissionBpsSnapshot: 7500,
              diamondValueUsdPer100Snapshot: "0.2500",
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

          if (contextType === "PK_BATTLE") {
            await this.pkService.addGiftScore(contextId, senderId, receiverId, giftId, coinCost);
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
