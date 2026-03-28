import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { adminActionEnum, adminTargetTypeEnum, adminLevelEnum, adminPermissionScopeEnum } from "./enums";
import { users } from "./users";

// ─── admins ───
export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicAdminId: text("public_admin_id"),
  userId: uuid("user_id").notNull().references(() => users.id),
  email: text("email"),
  /** Legacy identity key (was clerk_id). */
  identityKey: text("clerk_id"),
  adminName: text("admin_name").notNull(),
  adminLevel: adminLevelEnum("admin_level").default("MODERATOR").notNull(),
  accessScope: adminPermissionScopeEnum("access_scope").default("GLOBAL").notNull(),
  accessScopeValue: text("access_scope_value"),
  permissionsJson: jsonb("permissions_json"),
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
  uniqueIndex("admins_public_admin_id_idx").on(t.publicAdminId),
  uniqueIndex("admins_user_id_idx").on(t.userId),
  uniqueIndex("admins_email_idx").on(t.email),
  uniqueIndex("admins_clerk_id_idx").on(t.identityKey),
  index("admins_level_active_idx").on(t.adminLevel, t.isActive),
  index("admins_scope_idx").on(t.accessScope, t.accessScopeValue),
]);

// ─── admin_roles ───
export const adminRoles = pgTable("admin_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleName: text("role_name").notNull(),
  roleKey: text("role_key").notNull(),
  description: text("description").notNull(),
  permissionsJson: jsonb("permissions_json").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdByAdminId: uuid("created_by_admin_id").references(() => admins.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("admin_roles_key_idx").on(t.roleKey),
  index("admin_roles_active_idx").on(t.isActive),
]);

// ─── admin_role_assignments ───
export const adminRoleAssignments = pgTable("admin_role_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminId: uuid("admin_id").notNull().references(() => admins.id),
  roleId: uuid("role_id").notNull().references(() => adminRoles.id),
  grantedByAdminId: uuid("granted_by_admin_id").references(() => admins.id),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  revokedAt: timestamp("revoked_at"),
  revokedByAdminId: uuid("revoked_by_admin_id").references(() => admins.id),
}, (t) => [
  uniqueIndex("admin_role_assignments_admin_role_idx").on(t.adminId, t.roleId),
  index("admin_role_assignments_role_idx").on(t.roleId),
  index("admin_role_assignments_expires_idx").on(t.expiresAt),
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
  roleAssignments: many(adminRoleAssignments),
}));

export const adminRolesRelations = relations(adminRoles, ({ many }) => ({
  assignments: many(adminRoleAssignments),
}));

export const adminRoleAssignmentsRelations = relations(adminRoleAssignments, ({ one }) => ({
  admin: one(admins, { fields: [adminRoleAssignments.adminId], references: [admins.id] }),
  role: one(adminRoles, { fields: [adminRoleAssignments.roleId], references: [adminRoles.id] }),
  grantedBy: one(admins, { fields: [adminRoleAssignments.grantedByAdminId], references: [admins.id], relationName: "roleGrantedBy" }),
}));

export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  admin: one(admins, { fields: [adminLogs.adminId], references: [admins.id] }),
}));
