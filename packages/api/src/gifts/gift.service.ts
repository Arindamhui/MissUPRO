import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { gifts, giftTransactions, liveGiftEvents, wallets, coinTransactions, diamondTransactions } from "@missu/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ECONOMY } from "@missu/config";
import { WalletService } from "../wallet/wallet.service";

@Injectable()
export class GiftService {
  constructor(private readonly walletService: WalletService) {}

  async getActiveCatalog() {
    return db.select().from(gifts)
      .where(eq(gifts.isActive, true))
      .orderBy(gifts.displayOrder);
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

    const coinCost = gift.coinPrice * comboCount;
    const diamondCredit = gift.diamondCredit * comboCount;
    const idemKey = idempotencyKey ?? `${senderId}:${receiverId}:${giftId}:${contextType}:${contextId}:${comboCount}`;

    const [existingTx] = await db
      .select()
      .from(giftTransactions)
      .where(eq(giftTransactions.idempotencyKey, idemKey))
      .limit(1);

    if (existingTx) {
      return existingTx;
    }

    await this.walletService.getOrCreateWallet(senderId);
    await this.walletService.getOrCreateWallet(receiverId);

    const giftTransactionId = crypto.randomUUID();

    try {
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
          economyProfileKeySnapshot: "default",
          platformCommissionBpsSnapshot: 7500,
          diamondValueUsdPer100Snapshot: "0.2500",
          senderDisplayNameSnapshot: senderId,
          idempotencyKey: idemKey,
        });
      });
    } catch (error) {
      const [raceExisting] = await db
        .select()
        .from(giftTransactions)
        .where(eq(giftTransactions.idempotencyKey, idemKey))
        .limit(1);
      if (raceExisting) return raceExisting;
      throw error;
    }

    const [txn] = await db
      .select()
      .from(giftTransactions)
      .where(eq(giftTransactions.id, giftTransactionId))
      .limit(1);

    if (!txn) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Gift transaction not created" });
    }

    if (["LIVE_STREAM", "GROUP_AUDIO", "PARTY", "PK_BATTLE"].includes(contextType)) {
      await db.insert(liveGiftEvents).values({
        giftTransactionId: txn.id,
        liveStreamId: contextId,
        roomId: contextId,
        senderUserId: senderId,
        receiverUserId: receiverId,
        displayMessage: `sent a ${gift.giftCode}!`,
        animationKey: gift.giftCode,
        comboGroupId,
        comboCountSnapshot: comboCount,
        broadcastEventId: crypto.randomUUID(),
      });
    }

    return txn;
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
