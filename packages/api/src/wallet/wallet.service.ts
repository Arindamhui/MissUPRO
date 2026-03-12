import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { wallets, coinTransactions, diamondTransactions, coinPackages, withdrawRequests } from "@missu/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { acquireLock, releaseLock } from "@missu/utils";
import { generateIdempotencyKey } from "@missu/utils";

@Injectable()
export class WalletService {
  async getOrCreateWallet(userId: string) {
    const [existing] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
    if (existing) return existing;

    const [wallet] = await db
      .insert(wallets)
      .values({ userId, coinBalance: 0, diamondBalance: 0 })
      .onConflictDoNothing()
      .returning();

    if (!wallet) {
      const [retry] = await db.select().from(wallets).where(eq(wallets.userId, userId)).limit(1);
      return retry!;
    }
    return wallet;
  }

  async debitCoins(
    userId: string,
    amount: number,
    type: string,
    referenceId: string,
    description: string,
    idempotencyKey?: string,
  ) {
    const idemKey = idempotencyKey ?? generateIdempotencyKey(userId, "debit", referenceId);
    const lockToken = await acquireLock(`wallet:${userId}`, 5000);
    if (!lockToken) throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });

    try {
      const wallet = await this.getOrCreateWallet(userId);
      if (wallet.coinBalance < amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient balance" });
      }

      await db.transaction(async (tx) => {
        await tx
          .update(wallets)
          .set({
            coinBalance: sql`${wallets.coinBalance} - ${amount}`,
            lifetimeCoinsSpent: sql`${wallets.lifetimeCoinsSpent} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, userId));

        await tx.insert(coinTransactions).values({
          userId,
          transactionType: type as any,
          amount: -amount,
          balanceAfter: wallet.coinBalance - amount,
          referenceId,
          description,
          idempotencyKey: idemKey,
        });
      });

      return { success: true, newBalance: wallet.coinBalance - amount };
    } finally {
      await releaseLock(`wallet:${userId}`, lockToken);
    }
  }

  async creditCoins(
    userId: string,
    amount: number,
    type: string,
    referenceId: string,
    description: string,
    idempotencyKey?: string,
  ) {
    const idemKey = idempotencyKey ?? generateIdempotencyKey(userId, "credit", referenceId);
    const lockToken = await acquireLock(`wallet:${userId}`, 5000);
    if (!lockToken) throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });

    try {
      const wallet = await this.getOrCreateWallet(userId);

      await db.transaction(async (tx) => {
        await tx
          .update(wallets)
          .set({
            coinBalance: sql`${wallets.coinBalance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, userId));

        await tx.insert(coinTransactions).values({
          userId,
          transactionType: type as any,
          amount,
          balanceAfter: wallet.coinBalance + amount,
          referenceId,
          description,
          idempotencyKey: idemKey,
        });
      });

      return { success: true, newBalance: wallet.coinBalance + amount };
    } finally {
      await releaseLock(`wallet:${userId}`, lockToken);
    }
  }

  async creditDiamonds(
    userId: string,
    amount: number,
    type: string,
    referenceId: string,
    description: string,
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    const idemKey = generateIdempotencyKey(userId, "diamond_credit", referenceId);

    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          diamondBalance: sql`${wallets.diamondBalance} + ${amount}`,
          lifetimeDiamondsEarned: sql`${wallets.lifetimeDiamondsEarned} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));

      await tx.insert(diamondTransactions).values({
        userId,
        transactionType: type as any,
        amount,
        balanceAfter: wallet.diamondBalance + amount,
        referenceId,
        description,
        idempotencyKey: idemKey,
      });
    });
  }

  async getCoinPackages() {
    return db
      .select()
      .from(coinPackages)
      .where(eq(coinPackages.isActive, true))
      .orderBy(coinPackages.displayOrder);
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return { coins: wallet.coinBalance, diamonds: wallet.diamondBalance };
  }

  async requestWithdrawal(
    userId: string,
    amountDiamonds: number,
    payoutMethod: string,
    payoutDetails: Record<string, string>,
  ) {
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.diamondBalance < amountDiamonds) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient diamond balance" });
    }

    const amountUsd = (amountDiamonds / 100) * 0.25;

    const [request] = await db
      .insert(withdrawRequests)
      .values({
        modelUserId: userId,
        audioMinutesSnapshot: 0,
        videoMinutesSnapshot: 0,
        audioRateSnapshot: "0",
        videoRateSnapshot: "0",
        callEarningsSnapshot: "0",
        diamondBalanceSnapshot: amountDiamonds,
        diamondEarningsSnapshot: "0",
        totalPayoutAmount: amountUsd.toFixed(2),
        currency: "USD",
        payoutMethod: payoutMethod as any,
        payoutDetailsJson: payoutDetails,
      } as any)
      .returning();

    return request!;
  }

  async runReconciliation(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const [coinSum] = await db
      .select({ total: sql<number>`COALESCE(SUM(${coinTransactions.amount}), 0)` })
      .from(coinTransactions)
      .where(eq(coinTransactions.userId, userId));

    const expectedBalance = Number(coinSum?.total ?? 0);
    const mismatch = wallet.coinBalance !== expectedBalance;

    return {
      walletId: wallet.id,
      currentBalance: wallet.coinBalance,
      ledgerBalance: expectedBalance,
      mismatch,
    };
  }
}
