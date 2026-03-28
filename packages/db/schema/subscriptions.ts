import {
  pgTable, uuid, text, timestamp, decimal, integer, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  subscriptionPlanIntervalEnum, vipStatusEnum, invoiceStatusEnum,
  paymentProviderEnum, iapPlatformEnum, iapReceiptStatusEnum,
} from "./enums";
import { users } from "./users";

// ─── subscription_plans (admin-managed pricing tiers) ───
export const subscriptionPlans = pgTable("subscription_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  tier: text("tier").notNull(),
  interval: subscriptionPlanIntervalEnum("interval").notNull(),
  priceUsd: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD").notNull(),
  coinBonusPerPeriod: integer("coin_bonus_per_period").default(0).notNull(),
  featuresJson: jsonb("features_json"),
  stripeProductId: text("stripe_product_id"),
  stripePriceId: text("stripe_price_id"),
  appleProductId: text("apple_product_id"),
  googleProductId: text("google_product_id"),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  trialDays: integer("trial_days").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("subscription_plans_active_order_idx").on(t.isActive, t.displayOrder),
  uniqueIndex("subscription_plans_stripe_price_idx").on(t.stripePriceId),
  uniqueIndex("subscription_plans_apple_idx").on(t.appleProductId),
  uniqueIndex("subscription_plans_google_idx").on(t.googleProductId),
]);

// ─── invoices (billing history per user) ───
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  invoiceNumber: text("invoice_number").notNull(),
  subscriptionPlanId: uuid("subscription_plan_id").references(() => subscriptionPlans.id),
  provider: paymentProviderEnum("provider").notNull(),
  providerInvoiceId: text("provider_invoice_id"),
  amountDue: decimal("amount_due", { precision: 10, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 10, scale: 2 }).default("0").notNull(),
  currency: text("currency").default("USD").notNull(),
  status: invoiceStatusEnum("status").default("DRAFT").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  lineItemsJson: jsonb("line_items_json"),
  paidAt: timestamp("paid_at"),
  dueAt: timestamp("due_at"),
  voidedAt: timestamp("voided_at"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("invoices_number_idx").on(t.invoiceNumber),
  index("invoices_user_status_idx").on(t.userId, t.status, t.createdAt),
  index("invoices_status_due_idx").on(t.status, t.dueAt),
  uniqueIndex("invoices_provider_invoice_idx").on(t.providerInvoiceId),
]);

// ─── iap_receipts (Apple/Google IAP receipt validation) ───
export const iapReceipts = pgTable("iap_receipts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  platform: iapPlatformEnum("platform").notNull(),
  productId: text("product_id").notNull(),
  transactionId: text("transaction_id").notNull(),
  originalTransactionId: text("original_transaction_id"),
  receiptData: text("receipt_data").notNull(),
  status: iapReceiptStatusEnum("status").default("PENDING_VERIFICATION").notNull(),
  purchaseDate: timestamp("purchase_date").notNull(),
  expiresDate: timestamp("expires_date"),
  isTrialPeriod: boolean("is_trial_period").default(false).notNull(),
  isSandbox: boolean("is_sandbox").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  revokedAt: timestamp("revoked_at"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("iap_receipts_transaction_platform_idx").on(t.platform, t.transactionId),
  index("iap_receipts_user_platform_idx").on(t.userId, t.platform, t.purchaseDate),
  index("iap_receipts_original_txn_idx").on(t.originalTransactionId),
  index("iap_receipts_status_idx").on(t.status),
]);

// ─── Relations ───
export const subscriptionPlansRelations = relations(subscriptionPlans, ({ many }) => ({
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  user: one(users, { fields: [invoices.userId], references: [users.id] }),
  plan: one(subscriptionPlans, { fields: [invoices.subscriptionPlanId], references: [subscriptionPlans.id] }),
}));

export const iapReceiptsRelations = relations(iapReceipts, ({ one }) => ({
  user: one(users, { fields: [iapReceipts.userId], references: [users.id] }),
}));
