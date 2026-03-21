import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";
import { db } from "@missu/db";
import { coinPackages, coinTransactions, diamondTransactions, wallets, withdrawRequests } from "@missu/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { acquireLock, decodeCursor, encodeCursor, generateIdempotencyKey, releaseLock } from "@missu/utils";
import { randomUUID } from "node:crypto";
import { IdempotencyService } from "../common/idempotency.service";
import { ConfigService } from "../config/config.service";

type DbClient = any;

type WalletRow = {
  id: string;
  userId: string;
  coinBalance: number;
  diamondBalance: number;
  lifetimeCoinsPurchased: number;
  lifetimeCoinsSpent: number;
  lifetimeDiamondsEarned: number;
  lifetimeDiamondsWithdrawn: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

type CoinMutationInput = {
  userId: string;
  amount: number;
  transactionType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  description: string;
  idempotencyKey: string;
};

type DiamondMutationInput = {
  userId: string;
  amount: number;
  transactionType: string;
  referenceType?: string | null;
  referenceId?: string | null;
  description: string;
  idempotencyKey: string;
};

@Injectable()
export class WalletService {
  constructor(
    private readonly idempotencyService: IdempotencyService,
    private readonly configService: ConfigService,
  ) {}

  private assertPositiveAmount(amount: number, label: string) {
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: `${label} must be a positive integer` });
    }
  }

  private async selectWallet(userId: string, dbClient: DbClient = db): Promise<WalletRow | null> {
    const [wallet] = await dbClient
      .select({
        id: wallets.id,
        userId: wallets.userId,
        coinBalance: wallets.coinBalance,
        diamondBalance: wallets.diamondBalance,
        lifetimeCoinsPurchased: wallets.lifetimeCoinsPurchased,
        lifetimeCoinsSpent: wallets.lifetimeCoinsSpent,
        lifetimeDiamondsEarned: wallets.lifetimeDiamondsEarned,
        lifetimeDiamondsWithdrawn: wallets.lifetimeDiamondsWithdrawn,
        version: wallets.version,
        createdAt: wallets.createdAt,
        updatedAt: wallets.updatedAt,
      })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);

    return wallet ?? null;
  }

  async getOrCreateWallet(userId: string, dbClient: DbClient = db): Promise<WalletRow> {
    const existing = await this.selectWallet(userId, dbClient);
    if (existing) {
      return existing;
    }

    await dbClient.execute(sql`
      insert into wallets (id, user_id)
      values (gen_random_uuid(), ${userId}::uuid)
      on conflict (user_id) do nothing
    `);

    const wallet = await this.selectWallet(userId, dbClient);
    if (!wallet) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Unable to initialize wallet" });
    }

    return wallet;
  }

  async applyCoinMutation(dbClient: DbClient, input: CoinMutationInput) {
    const wallet = await this.getOrCreateWallet(input.userId, dbClient);

    if (input.amount === 0) {
      return wallet;
    }

    const now = new Date();
    const isCredit = input.amount > 0;
    const absoluteAmount = Math.abs(input.amount);
    const extraPurchased = isCredit && input.transactionType === "PURCHASE" ? absoluteAmount : 0;
    const extraSpent = !isCredit ? absoluteAmount : 0;

    const [updated] = await dbClient
      .update(wallets)
      .set({
        coinBalance: isCredit
          ? sql`${wallets.coinBalance} + ${absoluteAmount}`
          : sql`${wallets.coinBalance} - ${absoluteAmount}`,
        lifetimeCoinsPurchased: extraPurchased > 0
          ? sql`${wallets.lifetimeCoinsPurchased} + ${extraPurchased}`
          : wallets.lifetimeCoinsPurchased,
        lifetimeCoinsSpent: extraSpent > 0
          ? sql`${wallets.lifetimeCoinsSpent} + ${extraSpent}`
          : wallets.lifetimeCoinsSpent,
        version: sql`${wallets.version} + 1`,
        updatedAt: now,
      })
      .where(
        isCredit
          ? eq(wallets.userId, input.userId)
          : and(eq(wallets.userId, input.userId), gte(wallets.coinBalance, absoluteAmount)),
      )
      .returning({
        id: wallets.id,
        userId: wallets.userId,
        coinBalance: wallets.coinBalance,
        diamondBalance: wallets.diamondBalance,
        lifetimeCoinsPurchased: wallets.lifetimeCoinsPurchased,
        lifetimeCoinsSpent: wallets.lifetimeCoinsSpent,
        lifetimeDiamondsEarned: wallets.lifetimeDiamondsEarned,
        lifetimeDiamondsWithdrawn: wallets.lifetimeDiamondsWithdrawn,
        version: wallets.version,
        createdAt: wallets.createdAt,
        updatedAt: wallets.updatedAt,
      });

    if (!updated) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient coin balance" });
    }

    await dbClient.insert(coinTransactions).values({
      userId: input.userId,
      transactionType: input.transactionType as any,
      amount: input.amount,
      balanceAfter: updated.coinBalance,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      description: input.description,
      idempotencyKey: input.idempotencyKey,
    });

    return updated;
  }

  async applyDiamondMutation(dbClient: DbClient, input: DiamondMutationInput) {
    const wallet = await this.getOrCreateWallet(input.userId, dbClient);

    if (input.amount === 0) {
      return wallet;
    }

    const now = new Date();
    const isCredit = input.amount > 0;
    const absoluteAmount = Math.abs(input.amount);
    const extraEarned = isCredit ? absoluteAmount : 0;
    const extraWithdrawn = !isCredit && input.transactionType === "WITHDRAWAL_DEBIT" ? absoluteAmount : 0;

    const [updated] = await dbClient
      .update(wallets)
      .set({
        diamondBalance: isCredit
          ? sql`${wallets.diamondBalance} + ${absoluteAmount}`
          : sql`${wallets.diamondBalance} - ${absoluteAmount}`,
        lifetimeDiamondsEarned: extraEarned > 0
          ? sql`${wallets.lifetimeDiamondsEarned} + ${extraEarned}`
          : wallets.lifetimeDiamondsEarned,
        lifetimeDiamondsWithdrawn: extraWithdrawn > 0
          ? sql`${wallets.lifetimeDiamondsWithdrawn} + ${extraWithdrawn}`
          : wallets.lifetimeDiamondsWithdrawn,
        version: sql`${wallets.version} + 1`,
        updatedAt: now,
      })
      .where(
        isCredit
          ? eq(wallets.userId, input.userId)
          : and(eq(wallets.userId, input.userId), gte(wallets.diamondBalance, absoluteAmount)),
      )
      .returning({
        id: wallets.id,
        userId: wallets.userId,
        coinBalance: wallets.coinBalance,
        diamondBalance: wallets.diamondBalance,
        lifetimeCoinsPurchased: wallets.lifetimeCoinsPurchased,
        lifetimeCoinsSpent: wallets.lifetimeCoinsSpent,
        lifetimeDiamondsEarned: wallets.lifetimeDiamondsEarned,
        lifetimeDiamondsWithdrawn: wallets.lifetimeDiamondsWithdrawn,
        version: wallets.version,
        createdAt: wallets.createdAt,
        updatedAt: wallets.updatedAt,
      });

    if (!updated) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Insufficient diamond balance" });
    }

    await dbClient.insert(diamondTransactions).values({
      userId: input.userId,
      transactionType: input.transactionType as any,
      amount: input.amount,
      balanceAfter: updated.diamondBalance,
      referenceType: input.referenceType ?? null,
      referenceId: input.referenceId ?? null,
      description: input.description,
      idempotencyKey: input.idempotencyKey,
    });

    return updated;
  }

  async debitCoins(
    userId: string,
    amount: number,
    type: string,
    referenceId: string,
    description: string,
    idempotencyKey?: string,
  ) {
    this.assertPositiveAmount(amount, "Coin debit amount");
    const idemKey = idempotencyKey ?? generateIdempotencyKey(userId, "coin_debit", referenceId);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "wallet:coin-debit",
        actorUserId: userId,
        requestData: { amount, type, referenceId, description },
      },
      async () => {
        const lockToken = await acquireLock(`wallet:${userId}`, 5000);
        if (!lockToken) {
          throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });
        }

        try {
          const updated = await db.transaction((tx) => this.applyCoinMutation(tx, {
            userId,
            amount: -amount,
            transactionType: type,
            referenceType: type,
            referenceId,
            description,
            idempotencyKey: idemKey,
          }));

          return { success: true, newBalance: updated.coinBalance };
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
    this.assertPositiveAmount(amount, "Coin credit amount");
    const idemKey = idempotencyKey ?? generateIdempotencyKey(userId, "coin_credit", referenceId);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "wallet:coin-credit",
        actorUserId: userId,
        requestData: { amount, type, referenceId, description },
      },
      async () => {
        const lockToken = await acquireLock(`wallet:${userId}`, 5000);
        if (!lockToken) {
          throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });
        }

        try {
          const updated = await db.transaction((tx) => this.applyCoinMutation(tx, {
            userId,
            amount,
            transactionType: type,
            referenceType: type,
            referenceId,
            description,
            idempotencyKey: idemKey,
          }));

          return { success: true, newBalance: updated.coinBalance };
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
    this.assertPositiveAmount(amount, "Diamond credit amount");
    const idemKey = idempotencyKey ?? generateIdempotencyKey(userId, "diamond_credit", referenceId);

    return this.idempotencyService.execute(
      {
        key: idemKey,
        operationScope: "wallet:diamond-credit",
        actorUserId: userId,
        requestData: { amount, type, referenceId, description },
      },
      async () => {
        const lockToken = await acquireLock(`wallet:${userId}`, 5000);
        if (!lockToken) {
          throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });
        }

        try {
          const updated = await db.transaction((tx) => this.applyDiamondMutation(tx, {
            userId,
            amount,
            transactionType: type,
            referenceType: type,
            referenceId,
            description,
            idempotencyKey: idemKey,
          }));

          return { success: true, newBalance: updated.diamondBalance };
        } finally {
          await releaseLock(`wallet:${userId}`, lockToken);
        }
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
    this.assertPositiveAmount(amount, "Diamond debit amount");
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
        if (!lockToken) {
          throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });
        }

        try {
          const updated = await db.transaction((tx) => this.applyDiamondMutation(tx, {
            userId,
            amount: -amount,
            transactionType: type,
            referenceType: type,
            referenceId,
            description,
            idempotencyKey: idemKey,
          }));

          return { success: true, newBalance: updated.diamondBalance };
        } finally {
          await releaseLock(`wallet:${userId}`, lockToken);
        }
      },
    );
  }

  async topUpCoins(userId: string, amount: number, paymentReferenceId?: string, description?: string) {
    const referenceId = paymentReferenceId ?? randomUUID();
    return this.creditCoins(
      userId,
      amount,
      "PURCHASE",
      referenceId,
      description ?? `Wallet top-up: ${amount} coins`,
      generateIdempotencyKey(userId, "wallet_topup", referenceId),
    );
  }

  async spendCoins(userId: string, amount: number, source: string, referenceId?: string, description?: string) {
    const effectiveReferenceId = referenceId ?? randomUUID();
    return this.debitCoins(
      userId,
      amount,
      source,
      effectiveReferenceId,
      description ?? `Wallet spend: ${amount} coins`,
      generateIdempotencyKey(userId, "wallet_spend", effectiveReferenceId),
    );
  }

  async adjustWallet(targetUserId: string, adminUserId: string, coinDelta: number, diamondDelta: number, description?: string) {
    if (!Number.isInteger(coinDelta) || !Number.isInteger(diamondDelta)) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Wallet adjustments must be integers" });
    }

    if (coinDelta === 0 && diamondDelta === 0) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "At least one wallet balance must change" });
    }

    const adjustmentId = randomUUID();
    const note = description?.trim() || `Manual wallet adjustment by admin ${adminUserId}`;
    const lockToken = await acquireLock(`wallet:${targetUserId}`, 5000);
    if (!lockToken) {
      throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });
    }

    try {
      const updated = await db.transaction(async (tx) => {
        let currentWallet = await this.getOrCreateWallet(targetUserId, tx);

        if (coinDelta !== 0) {
          currentWallet = await this.applyCoinMutation(tx, {
            userId: targetUserId,
            amount: coinDelta,
            transactionType: "ADMIN_ADJUSTMENT",
            referenceType: "ADMIN",
            referenceId: adjustmentId,
            description: note,
            idempotencyKey: generateIdempotencyKey(targetUserId, "admin_coin_adjustment", adjustmentId),
          });
        }

        if (diamondDelta !== 0) {
          currentWallet = await this.applyDiamondMutation(tx, {
            userId: targetUserId,
            amount: diamondDelta,
            transactionType: "ADMIN_ADJUSTMENT",
            referenceType: "ADMIN",
            referenceId: adjustmentId,
            description: note,
            idempotencyKey: generateIdempotencyKey(targetUserId, "admin_diamond_adjustment", adjustmentId),
          });
        }

        return currentWallet;
      });

      return {
        adjustmentId,
        userId: targetUserId,
        coinBalance: updated.coinBalance,
        diamondBalance: updated.diamondBalance,
      };
    } finally {
      await releaseLock(`wallet:${targetUserId}`, lockToken);
    }
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

  async listTransactions(userId: string, cursor?: string, limit = 20) {
    const offset = cursor ? decodeCursor(cursor) : 0;
    const result = await db.execute(sql`
      select *
      from (
        select
          id,
          'COIN'::text as ledger,
          transaction_type as "transactionType",
          amount,
          balance_after as "balanceAfter",
          reference_type as "referenceType",
          reference_id as "referenceId",
          description,
          created_at as "createdAt"
        from coin_transactions
        where user_id = ${userId}::uuid

        union all

        select
          id,
          'DIAMOND'::text as ledger,
          transaction_type as "transactionType",
          amount,
          balance_after as "balanceAfter",
          reference_type as "referenceType",
          reference_id as "referenceId",
          description,
          created_at as "createdAt"
        from diamond_transactions
        where user_id = ${userId}::uuid
      ) merged_transactions
      order by "createdAt" desc
      limit ${limit + 1}
      offset ${offset}
    `);

    const rows = result.rows as Array<Record<string, unknown>>;
    const hasMore = rows.length > limit;

    return {
      items: hasMore ? rows.slice(0, limit) : rows,
      nextCursor: hasMore ? encodeCursor(offset + limit) : null,
    };
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    const transactions = await this.listTransactions(userId, undefined, 10);

    return {
      coins: wallet.coinBalance,
      diamonds: wallet.diamondBalance,
      coinBalance: wallet.coinBalance,
      diamondBalance: wallet.diamondBalance,
      recentTransactions: transactions.items,
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

    return (result.rows as Array<Record<string, unknown>>).map((row) => ({
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

  async requestWithdrawal(userId: string, amountDiamonds: number, payoutMethod: string, payoutDetails: Record<string, string>) {
    this.assertPositiveAmount(amountDiamonds, "Withdrawal amount");
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

    const withdrawalId = randomUUID();
    const lockToken = await acquireLock(`wallet:${userId}`, 5000);
    if (!lockToken) {
      throw new TRPCError({ code: "CONFLICT", message: "Wallet operation in progress" });
    }

    try {
      const request = await db.transaction(async (tx) => {
        await this.applyDiamondMutation(tx, {
          userId,
          amount: -amountDiamonds,
          transactionType: "WITHDRAWAL_DEBIT",
          referenceType: "WITHDRAWAL",
          referenceId: withdrawalId,
          description: `Withdrawal requested: ${amountDiamonds} diamonds`,
          idempotencyKey: generateIdempotencyKey(userId, "withdraw_request", withdrawalId),
        });

        const [created] = await tx
          .insert(withdrawRequests)
          .values({
            id: withdrawalId,
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

        return created;
      });

      return request ?? null;
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

  async getLedgerVerification(userId: string) {
    return this.runReconciliation(userId);
  }

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

    for (const wallet of allWallets) {
      const [coinSum] = await db
        .select({ total: sql<number>`COALESCE(SUM(${coinTransactions.amount}), 0)` })
        .from(coinTransactions)
        .where(eq(coinTransactions.userId, wallet.userId));

      const ledgerBalance = Number(coinSum?.total ?? 0);
      if (wallet.coinBalance !== ledgerBalance) {
        mismatches.push({
          userId: wallet.userId,
          walletId: wallet.id,
          currentBalance: wallet.coinBalance,
          ledgerBalance,
        });
      }

      if (mismatches.length >= limit) {
        break;
      }
    }

    return { items: mismatches };
  }
}
