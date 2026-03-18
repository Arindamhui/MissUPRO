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

  private async selectWallet(userId: string) {
    const [wallet] = await db
      .select({
        id: wallets.id,
        userId: wallets.userId,
        coinBalance: wallets.coinBalance,
        diamondBalance: wallets.diamondBalance,
        version: wallets.version,
        createdAt: wallets.createdAt,
        updatedAt: wallets.updatedAt,
      })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    return wallet ?? null;
  }

  private async insertCoinLedgerEntry(
    userId: string,
    walletId: string,
    amount: number,
    balanceAfter: number,
    reason: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
  ) {
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
        ${userId}::uuid,
        ${walletId}::uuid,
        ${amount},
        ${amount >= 0 ? "CREDIT" : "DEBIT"},
        ${balanceAfter},
        ${reason},
        ${referenceId}::uuid,
        ${JSON.stringify({ description, idempotencyKey })}::jsonb,
        now()
      )
    `);
  }

  private async insertDiamondLedgerEntry(
    userId: string,
    walletId: string,
    amount: number,
    balanceAfter: number,
    reason: string,
    referenceId: string,
    description: string,
    idempotencyKey: string,
  ) {
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
        ${userId}::uuid,
        ${walletId}::uuid,
        ${amount},
        ${amount >= 0 ? "CREDIT" : "DEBIT"},
        ${balanceAfter},
        ${reason},
        ${referenceId}::uuid,
        ${JSON.stringify({ description, idempotencyKey })}::jsonb,
        now()
      )
    `);
  }

  async getOrCreateWallet(userId: string) {
    const existing = await this.selectWallet(userId);
    if (existing) return existing;

    await db.execute(sql`
      insert into wallets (
        id,
        user_id,
        coin_balance,
        diamond_balance,
        version,
        updated_at,
        created_at
      )
      values (
        gen_random_uuid(),
        ${userId}::uuid,
        0,
        0,
        1,
        now(),
        now()
      )
      on conflict (user_id) do nothing
    `);

    const wallet = await this.selectWallet(userId);
    return wallet!;
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

          await db
            .update(wallets)
            .set({
              coinBalance: sql`${wallets.coinBalance} - ${amount}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, userId));

          await this.insertCoinLedgerEntry(
            userId,
            wallet.id,
            -amount,
            wallet.coinBalance - amount,
            type,
            referenceId,
            description,
            idemKey,
          );

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

          await db
            .update(wallets)
            .set({
              coinBalance: sql`${wallets.coinBalance} + ${amount}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, userId));

          await this.insertCoinLedgerEntry(
            userId,
            wallet.id,
            amount,
            wallet.coinBalance + amount,
            type,
            referenceId,
            description,
            idemKey,
          );

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

        await db
          .update(wallets)
          .set({
            diamondBalance: sql`${wallets.diamondBalance} + ${amount}`,
            updatedAt: new Date(),
          })
          .where(eq(wallets.userId, userId));

        await this.insertDiamondLedgerEntry(
          userId,
          wallet.id,
          amount,
          wallet.diamondBalance + amount,
          type,
          referenceId,
          description,
          idemKey,
        );

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

          await db
            .update(wallets)
            .set({
              diamondBalance: sql`${wallets.diamondBalance} - ${amount}`,
              updatedAt: new Date(),
            })
            .where(eq(wallets.userId, userId));

          await this.insertDiamondLedgerEntry(
            userId,
            wallet.id,
            -amount,
            wallet.diamondBalance - amount,
            type,
            referenceId,
            description,
            idemKey,
          );

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
      db.execute(sql`
        select
          id,
          user_id as "userId",
          amount,
          balance_after as "balanceAfter",
          reason as "transactionType",
          reference_id as "referenceId",
          metadata,
          created_at as "createdAt"
        from coin_transactions
        where user_id = ${userId}::uuid
        order by created_at desc
        limit 10
      `),
      db.execute(sql`
        select
          id,
          user_id as "userId",
          amount,
          balance_after as "balanceAfter",
          reason as "transactionType",
          reference_id as "referenceId",
          metadata,
          created_at as "createdAt"
        from diamond_transactions
        where user_id = ${userId}::uuid
        order by created_at desc
        limit 10
      `),
    ]);

    const normalizedCoinTransactions = recentCoinTransactions.rows as Array<Record<string, unknown>>;
    const normalizedDiamondTransactions = recentDiamondTransactions.rows as Array<Record<string, unknown>>;
    const getTransactionTimestamp = (transaction: Record<string, unknown>) => new Date(String(transaction.createdAt ?? 0)).getTime();

    const recentTransactions: Array<Record<string, unknown> & { ledger: "COIN" | "DIAMOND" }> = [
      ...normalizedCoinTransactions.map((transaction) => ({ ...transaction, ledger: "COIN" as const })),
      ...normalizedDiamondTransactions.map((transaction) => ({ ...transaction, ledger: "DIAMOND" as const })),
    ]
      .sort((left, right) => getTransactionTimestamp(right as Record<string, unknown>) - getTransactionTimestamp(left as Record<string, unknown>))
      .slice(0, 10);

    return {
      coins: wallet.coinBalance,
      diamonds: wallet.diamondBalance,
      coinBalance: wallet.coinBalance,
      diamondBalance: wallet.diamondBalance,
      recentTransactions,
    };
  }

  async getTopUpHistory(userId: string) {
    const result = await db.execute(sql`
      select
        p.id,
        p.status,
        p.provider,
        p.amount_usd as "amountUsd",
        p.coins_credited as "coinsCredited",
        p.failure_reason as "failureReason",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        cp.name as "packageName",
        cp.coin_amount as "baseCoins",
        cp.bonus_coins as "bonusCoins"
      from payments p
      inner join coin_packages cp on cp.id = p.coin_package_id
      where p.user_id = ${userId}::uuid
      order by p.created_at desc
      limit 30
    `);

    return result.rows.map((row) => ({
      id: String(row.id),
      status: String(row.status ?? "PENDING"),
      provider: String(row.provider ?? "UNKNOWN"),
      amountUsd: Number(row.amountUsd ?? 0),
      coinsCredited: Number(row.coinsCredited ?? 0),
      failureReason: row.failureReason ? String(row.failureReason) : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      packageName: String(row.packageName ?? "Top up package"),
      baseCoins: Number(row.baseCoins ?? 0),
      bonusCoins: Number(row.bonusCoins ?? 0),
    }));
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

      await db
        .update(wallets)
        .set({
          diamondBalance: sql`${wallets.diamondBalance} - ${amountDiamonds}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, userId));

      await this.insertDiamondLedgerEntry(
        userId,
        wallet.id,
        -amountDiamonds,
        wallet.diamondBalance - amountDiamonds,
        "WITHDRAWAL_DEBIT",
        withdrawRequestId,
        `Withdrawal requested: ${amountDiamonds} diamonds`,
        withdrawIdempotencyKey,
      );

      const [request] = await db
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
    const allWallets = await db
      .select({
        id: wallets.id,
        userId: wallets.userId,
        coinBalance: wallets.coinBalance,
      })
      .from(wallets)
      .limit(limit * 2);
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
