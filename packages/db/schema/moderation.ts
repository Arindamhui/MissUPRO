import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, decimal, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  mediaVisibilityEnum, scanStatusEnum,
  fraudEntityTypeEnum, fraudSignalTypeEnum,
  fraudFlagEntityTypeEnum, fraudRiskLevelEnum, fraudFlagStatusEnum,
} from "./enums";
import { users } from "./users";

// ─── media_assets ───
export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerUserId: uuid("owner_user_id").notNull().references(() => users.id),
  assetType: text("asset_type").notNull(),
  storageKey: text("storage_key").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  visibility: mediaVisibilityEnum("visibility").default("PRIVATE").notNull(),
  checksumSha256: text("checksum_sha256").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("media_assets_owner_idx").on(t.ownerUserId),
  index("media_assets_storage_key_idx").on(t.storageKey),
]);

// ─── media_scan_results ───
export const mediaScanResults = pgTable("media_scan_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  mediaAssetId: uuid("media_asset_id").notNull().references(() => mediaAssets.id),
  scannerName: text("scanner_name").notNull(),
  scanStatus: scanStatusEnum("scan_status").default("PENDING").notNull(),
  riskLabelsJson: jsonb("risk_labels_json"),
  scannedAt: timestamp("scanned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("media_scan_results_asset_idx").on(t.mediaAssetId),
  index("media_scan_results_status_idx").on(t.scanStatus),
]);

// ─── fraud_flags ───
export const fraudFlags = pgTable("fraud_flags", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: fraudFlagEntityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  riskScore: integer("risk_score").notNull(),
  riskLevel: fraudRiskLevelEnum("risk_level").notNull(),
  signalsJson: jsonb("signals_json"),
  actionTaken: text("action_taken"),
  status: fraudFlagStatusEnum("status").default("OPEN").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
}, (t) => [
  index("fraud_flags_entity_status_score_idx").on(t.entityType, t.entityId, t.status, t.riskScore),
]);

// ─── fraud_signals ───
export const fraudSignals = pgTable("fraud_signals", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: fraudEntityTypeEnum("entity_type").notNull(),
  entityId: uuid("entity_id").notNull(),
  signalType: fraudSignalTypeEnum("signal_type").notNull(),
  signalValue: decimal("signal_value", { precision: 5, scale: 4 }).notNull(),
  weight: decimal("weight", { precision: 5, scale: 4 }).notNull(),
  detailsJson: jsonb("details_json").notNull(),
  fraudFlagId: uuid("fraud_flag_id").references(() => fraudFlags.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("fraud_signals_entity_created_idx").on(t.entityType, t.entityId, t.createdAt),
  index("fraud_signals_type_created_idx").on(t.signalType, t.createdAt),
  index("fraud_signals_flag_idx").on(t.fraudFlagId),
]);

// ─── Relations ───
export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  owner: one(users, { fields: [mediaAssets.ownerUserId], references: [users.id] }),
  scanResults: many(mediaScanResults),
}));

export const mediaScanResultsRelations = relations(mediaScanResults, ({ one }) => ({
  mediaAsset: one(mediaAssets, { fields: [mediaScanResults.mediaAssetId], references: [mediaAssets.id] }),
}));

export const fraudSignalsRelations = relations(fraudSignals, ({ one }) => ({
  fraudFlag: one(fraudFlags, { fields: [fraudSignals.fraudFlagId], references: [fraudFlags.id] }),
}));

export const fraudFlagsRelations = relations(fraudFlags, ({ many }) => ({
  signals: many(fraudSignals),
}));
