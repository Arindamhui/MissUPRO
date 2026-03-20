import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { adminActionEnum, adminTargetTypeEnum } from "./enums";
import { users } from "./users";

// ─── admins ───
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  email: text("email"),
  clerkId: text("clerk_id"),
  adminName: text("admin_name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  mfaEnabled: boolean("mfa_enabled").default(true).notNull(),
  mfaSecretEncrypted: text("mfa_secret_encrypted"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: text("last_login_ip"),
  loginAttemptsFailed: integer("login_attempts_failed").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  ipAllowlistJson: jsonb("ip_allowlist_json"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("admins_user_id_idx").on(t.userId),
  uniqueIndex("admins_email_idx").on(t.email),
  uniqueIndex("admins_clerk_id_idx").on(t.clerkId),
]);

// ─── admin_logs (append-only) ───
export const adminLogs = pgTable("admin_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => admins.id),
  action: adminActionEnum("action").notNull(),
  targetType: adminTargetTypeEnum("target_type").notNull(),
  targetId: text("target_id").notNull(),
  beforeStateJson: jsonb("before_state_json"),
  afterStateJson: jsonb("after_state_json"),
  reason: text("reason").notNull(),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("admin_logs_admin_created_idx").on(t.adminId, t.createdAt),
  index("admin_logs_target_created_idx").on(t.targetType, t.targetId, t.createdAt),
  index("admin_logs_action_created_idx").on(t.action, t.createdAt),
  index("admin_logs_created_idx").on(t.createdAt),
]);

// ─── Relations ───
export const adminsRelations = relations(admins, ({ one, many }) => ({
  user: one(users, { fields: [admins.userId], references: [users.id] }),
  logs: many(adminLogs),
}));

export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  admin: one(admins, { fields: [adminLogs.adminId], references: [admins.id] }),
}));
