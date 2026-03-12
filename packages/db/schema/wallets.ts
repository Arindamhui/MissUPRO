import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, jsonb,
  index, uniqueIndex, check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { coinTransactionTypeEnum, diamondTransactionTypeEnum } from "./enums";
import { users } from "./users";

// ─── wallets ───
export const wallets = pgTable("wallets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  coinBalance: integer("coin_balance").default(0).notNull(),
  diamondBalance: integer("diamond_balance").default(0).notNull(),
  lifetimeCoinsPurchased: integer("lifetime_coins_purchased").default(0).notNull(),
  lifetimeCoinsSpent: integer("lifetime_coins_spent").default(0).notNull(),
  lifetimeDiamondsEarned: integer("lifetime_diamonds_earned").default(0).notNull(),
  lifetimeDiamondsWithdrawn: integer("lifetime_diamonds_withdrawn").default(0).notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("wallets_user_id_idx").on(t.userId),
  check("wallets_coin_balance_check", sql`${t.coinBalance} >= 0`),
  check("wallets_diamond_balance_check", sql`${t.diamondBalance} >= 0`),
]);

// ─── coin_transactions ───
export const coinTransactions = pgTable("coin_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  transactionType: coinTransactionTypeEnum("transaction_type").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  referenceType: text("reference_type"),
  referenceId: uuid("reference_id"),
  description: text("description"),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("coin_tx_user_created_idx").on(t.userId, t.createdAt),
  uniqueIndex("coin_tx_idempotency_idx").on(t.idempotencyKey),
  index("coin_tx_ref_idx").on(t.referenceType, t.referenceId),
  index("coin_tx_type_created_idx").on(t.transactionType, t.createdAt),
]);

// ─── diamond_transactions ───
export const diamondTransactions = pgTable("diamond_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  transactionType: diamondTransactionTypeEnum("transaction_type").notNull(),
  amount: integer("amount").notNull(),
  balanceAfter: integer("balance_after").notNull(),
  referenceType: text("reference_type"),
  referenceId: uuid("reference_id"),
  description: text("description"),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("diamond_tx_user_created_idx").on(t.userId, t.createdAt),
  uniqueIndex("diamond_tx_idempotency_idx").on(t.idempotencyKey),
  index("diamond_tx_ref_idx").on(t.referenceType, t.referenceId),
]);

// ─── coin_packages ───
export const coinPackages = pgTable("coin_packages", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  coinAmount: integer("coin_amount").notNull(),
  bonusCoins: integer("bonus_coins").default(0).notNull(),
  priceUsd: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  appleProductId: text("apple_product_id"),
  googleProductId: text("google_product_id"),
  isActive: boolean("is_active").default(true).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  regionScope: jsonb("region_scope"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("coin_packages_active_order_idx").on(t.isActive, t.displayOrder),
  uniqueIndex("coin_packages_apple_idx").on(t.appleProductId),
  uniqueIndex("coin_packages_google_idx").on(t.googleProductId),
]);

// ─── Relations ───
export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
}));

export const coinTransactionsRelations = relations(coinTransactions, ({ one }) => ({
  user: one(users, { fields: [coinTransactions.userId], references: [users.id] }),
}));

export const diamondTransactionsRelations = relations(diamondTransactions, ({ one }) => ({
  user: one(users, { fields: [diamondTransactions.userId], references: [users.id] }),
}));
