import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { deviceTrustLevelEnum } from "./enums";
import { users } from "./users";

// ─── user_devices (device fingerprinting for multi-account detection) ───
export const userDevices = pgTable("user_devices", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  deviceFingerprintHash: text("device_fingerprint_hash").notNull(),
  deviceName: text("device_name"),
  deviceModel: text("device_model"),
  osName: text("os_name"),
  osVersion: text("os_version"),
  appVersion: text("app_version"),
  screenResolution: text("screen_resolution"),
  languageSetting: text("language_setting"),
  timezoneSetting: text("timezone_setting"),
  trustLevel: deviceTrustLevelEnum("trust_level").default("NORMAL").notNull(),
  isCurrentDevice: boolean("is_current_device").default(false).notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  lastIpAddress: text("last_ip_address"),
  lastGeoJson: jsonb("last_geo_json"),
  loginCount: integer("login_count").default(1).notNull(),
  flaggedAt: timestamp("flagged_at"),
  flagReason: text("flag_reason"),
  blockedAt: timestamp("blocked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("user_devices_user_fingerprint_idx").on(t.userId, t.deviceFingerprintHash),
  index("user_devices_fingerprint_idx").on(t.deviceFingerprintHash),
  index("user_devices_user_trust_idx").on(t.userId, t.trustLevel),
  index("user_devices_trust_last_seen_idx").on(t.trustLevel, t.lastSeenAt),
  index("user_devices_flagged_idx").on(t.flaggedAt),
]);

// ─── ip_addresses (IP tracking for anomaly detection) ───
export const ipAddresses = pgTable("ip_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  ipAddressHash: text("ip_address_hash").notNull(),
  userId: uuid("user_id").notNull().references(() => users.id),
  countryCode: text("country_code"),
  regionCode: text("region_code"),
  city: text("city"),
  isp: text("isp"),
  isVpn: boolean("is_vpn").default(false).notNull(),
  isProxy: boolean("is_proxy").default(false).notNull(),
  isTor: boolean("is_tor").default(false).notNull(),
  riskScore: integer("risk_score").default(0).notNull(),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  requestCount: integer("request_count").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("ip_addresses_ip_user_idx").on(t.ipAddressHash, t.userId),
  index("ip_addresses_user_last_seen_idx").on(t.userId, t.lastSeenAt),
  index("ip_addresses_ip_hash_idx").on(t.ipAddressHash),
  index("ip_addresses_risk_score_idx").on(t.riskScore),
  index("ip_addresses_vpn_proxy_tor_idx").on(t.isVpn, t.isProxy, t.isTor),
]);

// ─── device_fingerprint_clusters (multi-account detection) ───
export const deviceFingerprintClusters = pgTable("device_fingerprint_clusters", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceFingerprintHash: text("device_fingerprint_hash").notNull(),
  linkedUserIds: jsonb("linked_user_ids").notNull(),
  userCount: integer("user_count").notNull(),
  riskLevel: text("risk_level").default("LOW").notNull(),
  isReviewed: boolean("is_reviewed").default(false).notNull(),
  reviewedByAdminId: uuid("reviewed_by_admin_id"),
  reviewedAt: timestamp("reviewed_at"),
  notes: text("notes"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("device_clusters_fingerprint_idx").on(t.deviceFingerprintHash),
  index("device_clusters_risk_reviewed_idx").on(t.riskLevel, t.isReviewed),
  index("device_clusters_user_count_idx").on(t.userCount),
]);

// ─── Relations ───
export const userDevicesRelations = relations(userDevices, ({ one }) => ({
  user: one(users, { fields: [userDevices.userId], references: [users.id] }),
}));

export const ipAddressesRelations = relations(ipAddresses, ({ one }) => ({
  user: one(users, { fields: [ipAddresses.userId], references: [users.id] }),
}));
