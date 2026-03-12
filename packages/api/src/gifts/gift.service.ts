import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { gifts, giftTransactions, liveGiftEvents } from "@missu/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { ECONOMY } from "@missu/config";

@Injectable()
export class GiftService {
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
    idempotencyKey?: string,
  ) {
    const [gift] = await db.select().from(gifts).where(eq(gifts.id, giftId)).limit(1);
    if (!gift || !gift.isActive) throw new TRPCError({ code: "BAD_REQUEST", message: "Gift not available" });

    const coinCost = gift.coinPrice * comboCount;
    const diamondCredit = gift.diamondCredit * comboCount;

    const [txn] = await db.insert(giftTransactions).values({
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
      idempotencyKey: idempotencyKey ?? `${senderId}_${giftId}_${Date.now()}`,
    }).returning();

    if (["LIVE_STREAM", "GROUP_AUDIO", "PARTY", "PK_BATTLE"].includes(contextType)) {
      await db.insert(liveGiftEvents).values({
        giftTransactionId: txn!.id,
        liveStreamId: contextId,
        roomId: contextId,
        senderUserId: senderId,
        receiverUserId: receiverId,
        displayMessage: `sent a ${gift.giftCode}!`,
        animationKey: gift.giftCode,
        broadcastEventId: crypto.randomUUID(),
      });
    }

    return txn!;
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
