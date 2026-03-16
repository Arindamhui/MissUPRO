import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { wallets, coinTransactions, diamondTransactions, coinPackages, withdrawRequests } from "@missu/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { acquireLock, releaseLock } from "@missu/utils";
import { generateIdempotencyKey } from "@missu/utils";
import { randomUUID } from "node:crypto";
import { IdempotencyService } from "../common/idempotency.service";
import { ConfigService } from "../config/config.service";

@Injectable()
export class WalletService {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly configService: ConfigService,
  ) {}

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
    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "wallet:debit",
        actorUserId: userId,
        requestData: { amount, type, referenceId, description },
      },
      async () => {
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
      },
    );
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
    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "wallet:credit",
        actorUserId: userId,
        requestData: { amount, type, referenceId, description },
      },
      async () => {
        const lockToken = await acquireLock(`wallet:${userId}`, 5000);
        if (!lockToken) throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });

        try {
          const wallet = await this.getOrCreateWallet(userId);

          await db.transaction(async (tx) => {
            await tx
              .update(wallets)
              .set({
                coinBalance: sql`${wallets.coinBalance} + ${amount}`,
                lifetimeCoinsPurchased: sql`${wallets.lifetimeCoinsPurchased} + ${amount}`,
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
      },
    );
  }

  async creditDiamonds(
    userId: string,
    amount: number,
    type: string,
    referenceId: string,
    description: string,
    idempotencyKey?: string,
  ) {
    const idemKey = idempotencyKey ?? generateIdempotencyKey(userId, "diamond_credit", referenceId);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "wallet:diamond-credit",
        actorUserId: userId,
        requestData: { amount, type, referenceId, description },
      },
      async () => {
        const wallet = await this.getOrCreateWallet(userId);

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

        return { success: true, newBalance: wallet.diamondBalance + amount };
      },
    );
  }

  async debitDiamonds(
    userId: string,
    amount: number,
    type: string,
    referenceId: string,
    description: string,
    idempotencyKey?: string,
  ) {
    const idemKey = idempotencyKey ?? generateIdempotencyKey(userId, "diamond_debit", referenceId);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "wallet:diamond-debit",
        actorUserId: userId,
        requestData: { amount, type, referenceId, description },
      },
      async () => {
        const lockToken = await acquireLock(`wallet:${userId}`, 5000);
        if (!lockToken) throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });

        try {
          const wallet = await this.getOrCreateWallet(userId);
          if (wallet.diamondBalance < amount) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient diamond balance" });
          }

          await db.transaction(async (tx) => {
            await tx
              .update(wallets)
              .set({
                diamondBalance: sql`${wallets.diamondBalance} - ${amount}`,
                updatedAt: new Date(),
              })
              .where(eq(wallets.userId, userId));

            await tx.insert(diamondTransactions).values({
              userId,
              transactionType: type as any,
              amount: -amount,
              balanceAfter: wallet.diamondBalance - amount,
              referenceId,
              description,
              idempotencyKey: idemKey,
            });
          });

          return { success: true, newBalance: wallet.diamondBalance - amount };
        } finally {
          await releaseLock(`wallet:${userId}`, lockToken);
        }
      },
    );
  }

  async getCoinPackages() {
    const packages = await db
      .select()
      .from(coinPackages)
      .where(eq(coinPackages.isActive, true))
      .orderBy(coinPackages.displayOrder);

    return packages.map((coinPackage) => ({
      ...coinPackage,
      coins: coinPackage.coinAmount + coinPackage.bonusCoins,
      amount: coinPackage.coinAmount + coinPackage.bonusCoins,
      baseCoins: coinPackage.coinAmount,
      price: coinPackage.priceUsd,
      priceDisplay: coinPackage.currency === "USD" ? `$${coinPackage.priceUsd}` : `${coinPackage.currency} ${coinPackage.priceUsd}`,
    }));
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const [recentCoinTransactions, recentDiamondTransactions] = await Promise.all([
      db.select().from(coinTransactions).where(eq(coinTransactions.userId, userId)).orderBy(desc(coinTransactions.createdAt)).limit(10),
      db.select().from(diamondTransactions).where(eq(diamondTransactions.userId, userId)).orderBy(desc(diamondTransactions.createdAt)).limit(10),
    ]);

    const recentTransactions = [
      ...recentCoinTransactions.map((transaction) => ({ ...transaction, ledger: "COIN" as const })),
      ...recentDiamondTransactions.map((transaction) => ({ ...transaction, ledger: "DIAMOND" as const })),
    ]
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
      .slice(0, 10);

    return {
      coins: wallet.coinBalance,
      diamonds: wallet.diamondBalance,
      coinBalance: wallet.coinBalance,
      diamondBalance: wallet.diamondBalance,
      recentTransactions,
    };
  }

  async requestWithdrawal(
    userId: string,
    amountDiamonds: number,
    payoutMethod: string,
    payoutDetails: Record<string, string>,
  ) {
    const policy = await this.configService.getCreatorEconomyPolicy();
    const amountUsd = Number(((amountDiamonds / 100) * policy.diamondValueUsdPer100).toFixed(2));

    if (amountUsd < policy.withdrawLimits.minUsd) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Minimum withdrawal is $${policy.withdrawLimits.minUsd.toFixed(2)}`,
      });
    }

    if (policy.withdrawLimits.maxUsd != null && amountUsd > policy.withdrawLimits.maxUsd) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Maximum withdrawal is $${policy.withdrawLimits.maxUsd.toFixed(2)}`,
      });
    }

    const lockToken = await acquireLock(`wallet:${userId}`, 5000);
    if (!lockToken) throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });

    try {
      const wallet = await this.getOrCreateWallet(userId);
      if (wallet.diamondBalance < amountDiamonds) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient diamond balance" });
      }

      const withdrawRequestId = randomUUID();
      const withdrawIdempotencyKey = generateIdempotencyKey(userId, "withdraw_request", withdrawRequestId);

      const [request] = await db.transaction(async (tx) => {
        await tx
          .update(wallets)
          .set({
            diamondBalance: sql`${wallets.diamondBalance} - ${amountDiamonds}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, userId));

        await tx.insert(diamondTransactions).values({
          userId,
          transactionType: "WITHDRAWAL_DEBIT" as any,
          amount: -amountDiamonds,
          balanceAfter: wallet.diamondBalance - amountDiamonds,
          referenceType: "withdraw_request",
          referenceId: withdrawRequestId,
          description: `Withdrawal requested: ${amountDiamonds} diamonds`,
          idempotencyKey: withdrawIdempotencyKey,
        });

        return tx
          .insert(withdrawRequests)
          .values({
            id: withdrawRequestId,
            modelUserId: userId,
            audioMinutesSnapshot: 0,
            videoMinutesSnapshot: 0,
            audioRateSnapshot: "0",
            videoRateSnapshot: "0",
            callEarningsSnapshot: "0",
            diamondBalanceSnapshot: amountDiamonds,
            diamondEarningsSnapshot: amountUsd.toFixed(2),
            totalPayoutAmount: amountUsd.toFixed(2),
            currency: "USD",
            payoutMethod: payoutMethod as any,
            payoutDetailsJson: {
              ...payoutDetails,
              creatorEconomySnapshot: {
                diamondValueUsdPer100: policy.diamondValueUsdPer100,
                minWithdrawalUsd: policy.withdrawLimits.minUsd,
                maxWithdrawalUsd: policy.withdrawLimits.maxUsd,
              },
            },
          } as any)
          .returning();
      });

      return request!;
    } finally {
      await releaseLock(`wallet:${userId}`, lockToken);
    }
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
      userId,
      currentBalance: wallet.coinBalance,
      ledgerBalance: expectedBalance,
      mismatch,
    };
  }

  /** Admin: verify ledger for a user (read-only). Same shape as runReconciliation. */
  async getLedgerVerification(userId: string) {
    return this.runReconciliation(userId);
  }

  /** Admin: list wallets where coin balance does not match sum of coin_transactions. */
  async listLedgerMismatches(limit = 100) {
    const allWallets = await db.select().from(wallets).limit(limit * 2);
    const mismatches: Array<{ userId: string; walletId: string; currentBalance: number; ledgerBalance: number }> = [];
    for (const w of allWallets) {
      const [coinSum] = await db
        .select({ total: sql<number>`COALESCE(SUM(${coinTransactions.amount}), 0)` })
        .from(coinTransactions)
        .where(eq(coinTransactions.userId, w.userId));
      const ledgerBalance = Number(coinSum?.total ?? 0);
      if (w.coinBalance !== ledgerBalance) {
        mismatches.push({
          userId: w.userId,
          walletId: w.id,
          currentBalance: w.coinBalance,
          ledgerBalance,
        });
        if (mismatches.length >= limit) break;
      }
    }
    return { items: mismatches };
  }
}
