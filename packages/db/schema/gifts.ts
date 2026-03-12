import {
  pgTable, uuid, text, integer, timestamp, decimal, boolean, jsonb,
  index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { effectTierEnum, giftContextTypeEnum, deliveryStatusEnum } from "./enums";
import { users } from "./users";

// ─── gifts ───
export const gifts = pgTable("gifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  giftCode: text("gift_code").notNull(),
  name: text("name").notNull(),
  iconUrl: text("icon_url").notNull(),
  coinPrice: integer("coin_price").notNull(),
  diamondCredit: integer("diamond_credit").notNull(),
  effectTier: effectTierEnum("effect_tier").notNull(),
  category: text("category"),
  supportedContextsJson: jsonb("supported_contexts_json").notNull(),
  soundEffectUrl: text("sound_effect_url"),
  economyProfileKey: text("economy_profile_key"),
  isActive: boolean("is_active").default(true).notNull(),
  isLimitedTime: boolean("is_limited_time").default(false).notNull(),
  seasonTag: text("season_tag"),
  regionScope: text("region_scope"),
  startAt: timestamp("start_at"),
  endAt: timestamp("end_at"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("gifts_code_idx").on(t.giftCode),
  index("gifts_active_order_idx").on(t.isActive, t.displayOrder),
  index("gifts_active_time_idx").on(t.isActive, t.startAt, t.endAt),
  index("gifts_season_active_idx").on(t.seasonTag, t.isActive),
]);

// ─── gift_transactions ───
export const giftTransactions = pgTable("gift_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  senderUserId: uuid("sender_user_id").notNull().references(() => users.id),
  receiverUserId: uuid("receiver_user_id").notNull().references(() => users.id),
  giftId: uuid("gift_id").notNull().references(() => gifts.id),
  coinCost: integer("coin_cost").notNull(),
  diamondCredit: integer("diamond_credit").notNull(),
  contextType: giftContextTypeEnum("context_type").notNull(),
  contextId: uuid("context_id"),
  economyProfileKeySnapshot: text("economy_profile_key_snapshot").notNull(),
  platformCommissionBpsSnapshot: integer("platform_commission_bps_snapshot").notNull(),
  diamondValueUsdPer100Snapshot: decimal("diamond_value_usd_per_100_snapshot", { precision: 10, scale: 4 }).notNull(),
  senderDisplayNameSnapshot: text("sender_display_name_snapshot").notNull(),
  comboCount: integer("combo_count").default(1).notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("gift_tx_sender_created_idx").on(t.senderUserId, t.createdAt),
  index("gift_tx_receiver_created_idx").on(t.receiverUserId, t.createdAt),
  index("gift_tx_gift_created_idx").on(t.giftId, t.createdAt),
  index("gift_tx_context_idx").on(t.contextType, t.contextId, t.createdAt),
  uniqueIndex("gift_tx_idempotency_idx").on(t.idempotencyKey),
]);

// ─── gift_animations ───
export const giftAnimations = pgTable("gift_animations", {
  id: uuid("id").primaryKey().defaultRandom(),
  giftId: uuid("gift_id").notNull().references(() => gifts.id),
  animationUrl: text("animation_url").notNull(),
  previewThumbnailUrl: text("preview_thumbnail_url").notNull(),
  durationMs: integer("duration_ms").notNull(),
  effectTier: text("effect_tier").notNull(),
  platform: text("platform").default("ALL").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
}, (t) => [
  index("gift_animations_gift_idx").on(t.giftId),
]);

// ─── live_gift_events ───
export const liveGiftEvents = pgTable("live_gift_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  giftTransactionId: uuid("gift_transaction_id").notNull().references(() => giftTransactions.id),
  liveStreamId: uuid("live_stream_id").notNull(),
  roomId: uuid("room_id").notNull(),
  senderUserId: uuid("sender_user_id").notNull().references(() => users.id),
  receiverUserId: uuid("receiver_user_id").notNull().references(() => users.id),
  displayMessage: text("display_message").notNull(),
  animationKey: text("animation_key").notNull(),
  soundEffectKey: text("sound_effect_key"),
  comboGroupId: text("combo_group_id"),
  comboCountSnapshot: integer("combo_count_snapshot").default(1).notNull(),
  broadcastEventId: text("broadcast_event_id").notNull(),
  deliveryStatus: deliveryStatusEnum("delivery_status").default("QUEUED").notNull(),
  viewerCountSnapshot: integer("viewer_count_snapshot").default(0).notNull(),
  publishedAt: timestamp("published_at"),
  expiresAt: timestamp("expires_at"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("live_gift_events_stream_created_idx").on(t.liveStreamId, t.createdAt),
  index("live_gift_events_delivery_created_idx").on(t.deliveryStatus, t.createdAt),
  uniqueIndex("live_gift_events_broadcast_idx").on(t.broadcastEventId),
  uniqueIndex("live_gift_events_tx_idx").on(t.giftTransactionId),
]);

// ─── Relations ───
export const giftsRelations = relations(gifts, ({ many, one }) => ({
  transactions: many(giftTransactions),
  animation: one(giftAnimations, { fields: [gifts.id], references: [giftAnimations.giftId] }),
}));

export const giftTransactionsRelations = relations(giftTransactions, ({ one }) => ({
  sender: one(users, { fields: [giftTransactions.senderUserId], references: [users.id], relationName: "giftSender" }),
  receiver: one(users, { fields: [giftTransactions.receiverUserId], references: [users.id], relationName: "giftReceiver" }),
  gift: one(gifts, { fields: [giftTransactions.giftId], references: [gifts.id] }),
  liveGiftEvent: one(liveGiftEvents),
}));

export const giftAnimationsRelations = relations(giftAnimations, ({ one }) => ({
  gift: one(gifts, { fields: [giftAnimations.giftId], references: [gifts.id] }),
}));

export const liveGiftEventsRelations = relations(liveGiftEvents, ({ one }) => ({
  giftTransaction: one(giftTransactions, { fields: [liveGiftEvents.giftTransactionId], references: [giftTransactions.id] }),
  sender: one(users, { fields: [liveGiftEvents.senderUserId], references: [users.id], relationName: "liveGiftSender" }),
  receiver: one(users, { fields: [liveGiftEvents.receiverUserId], references: [users.id], relationName: "liveGiftReceiver" }),
}));
