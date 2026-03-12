import {
  pgTable, uuid, text, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  vipStatusEnum, referralStatusEnum, referralRewardTypeEnum, referralRewardStatusEnum,
} from "./enums";
import { users } from "./users";

// ─── vip_subscriptions ───
export const vipSubscriptions = pgTable("vip_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tier: text("tier").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: vipStatusEnum("status").default("ACTIVE").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelledAt: timestamp("cancelled_at"),
}, (t) => [
  index("vip_subscriptions_user_status_idx").on(t.userId, t.status),
  index("vip_subscriptions_status_period_idx").on(t.status, t.currentPeriodEnd),
]);

// ─── referrals ───
export const referrals = pgTable("referrals", {
  id: uuid("id").primaryKey().defaultRandom(),
  inviterUserId: uuid("inviter_user_id").notNull().references(() => users.id),
  inviteeUserId: uuid("invitee_user_id").notNull().references(() => users.id),
  referralCode: text("referral_code").notNull(),
  attributionSource: text("attribution_source").notNull(),
  status: referralStatusEnum("status").default("PENDING").notNull(),
  qualifiedAt: timestamp("qualified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("referrals_inviter_status_created_idx").on(t.inviterUserId, t.status, t.createdAt),
  uniqueIndex("referrals_invitee_idx").on(t.inviteeUserId),
]);

// ─── referral_rewards ───
export const referralRewards = pgTable("referral_rewards", {
  id: uuid("id").primaryKey().defaultRandom(),
  referralId: uuid("referral_id").notNull().references(() => referrals.id),
  inviterUserId: uuid("inviter_user_id").notNull().references(() => users.id),
  rewardType: referralRewardTypeEnum("reward_type").notNull(),
  rewardValueJson: jsonb("reward_value_json").notNull(),
  ledgerTxnId: uuid("ledger_txn_id"),
  status: referralRewardStatusEnum("status").default("PENDING").notNull(),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
}, (t) => [
  index("referral_rewards_referral_idx").on(t.referralId),
  index("referral_rewards_inviter_status_idx").on(t.inviterUserId, t.status),
]);

// ─── Relations ───
export const vipSubscriptionsRelations = relations(vipSubscriptions, ({ one }) => ({
  user: one(users, { fields: [vipSubscriptions.userId], references: [users.id] }),
}));

export const referralsRelations = relations(referrals, ({ one, many }) => ({
  inviter: one(users, { fields: [referrals.inviterUserId], references: [users.id], relationName: "refInviter" }),
  invitee: one(users, { fields: [referrals.inviteeUserId], references: [users.id], relationName: "refInvitee" }),
  rewards: many(referralRewards),
}));

export const referralRewardsRelations = relations(referralRewards, ({ one }) => ({
  referral: one(referrals, { fields: [referralRewards.referralId], references: [referrals.id] }),
  inviter: one(users, { fields: [referralRewards.inviterUserId], references: [users.id] }),
}));
