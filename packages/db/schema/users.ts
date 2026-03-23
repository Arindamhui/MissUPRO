import {
  pgTable, uuid, text, boolean, timestamp, date, integer, index, uniqueIndex, jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  userRoleEnum, userStatusEnum, genderEnum,
  authRoleEnum, authProviderEnum, platformRoleEnum,
  verificationTypeEnum, verificationStatusEnum,
  pushPlatformEnum, pushTokenStatusEnum,
  accountDeletionStatusEnum,
} from "./enums";

// ─── users ───
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  publicUserId: text("public_user_id"),
  publicId: text("public_id"),
  clerkId: text("clerk_id"),
  googleId: text("google_id"),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  passwordHash: text("password_hash"),
  displayName: text("display_name").notNull(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("USER").notNull(),
  platformRole: platformRoleEnum("platform_role").default("USER").notNull(),
  authRole: authRoleEnum("auth_role"),
  authProvider: authProviderEnum("auth_provider").default("UNKNOWN").notNull(),
  authMetadataJson: jsonb("auth_metadata_json"),
  profileDataJson: jsonb("profile_data_json"),
  status: userStatusEnum("status").default("ACTIVE").notNull(),
  country: text("country").notNull(),
  city: text("city"),
  preferredLocale: text("preferred_locale").default("en").notNull(),
  preferredTimezone: text("preferred_timezone").default("UTC").notNull(),
  gender: genderEnum("gender"),
  dateOfBirth: date("date_of_birth"),
  isVerified: boolean("is_verified").default(false).notNull(),
  vipType: text("vip_type"),
  vipExpiry: timestamp("vip_expiry"),
  referralCode: text("referral_code").notNull(),
  referredByUserId: uuid("referred_by_user_id"),
  lastActiveAt: timestamp("last_active_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("users_public_user_id_idx").on(t.publicUserId),
  uniqueIndex("users_public_id_idx").on(t.publicId),
  uniqueIndex("users_clerk_id_idx").on(t.clerkId),
  uniqueIndex("users_google_id_idx").on(t.googleId),
  uniqueIndex("users_email_idx").on(t.email),
  uniqueIndex("users_username_idx").on(t.username),
  uniqueIndex("users_phone_idx").on(t.phone),
  uniqueIndex("users_referral_code_idx").on(t.referralCode),
  index("users_auth_role_idx").on(t.authRole),
  index("users_platform_role_idx").on(t.platformRole),
  index("users_auth_provider_idx").on(t.authProvider),
  index("users_role_status_country_idx").on(t.role, t.status, t.country),
  index("users_last_active_at_idx").on(t.lastActiveAt),
  index("users_vip_expiry_idx").on(t.vipExpiry),
  index("users_created_at_idx").on(t.createdAt),
  index("users_deleted_at_idx").on(t.deletedAt),
]);

// ─── profiles ───
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  bio: text("bio"),
  socialLinksJson: jsonb("social_links_json"),
  interestsJson: jsonb("interests_json"),
  profileFrameUrl: text("profile_frame_url"),
  headerImageUrl: text("header_image_url"),
  locationDisplay: text("location_display"),
  profileCompletenessScore: integer("profile_completeness_score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("profiles_user_id_idx").on(t.userId),
]);

// ─── followers ───
export const followers = pgTable("followers", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerUserId: uuid("follower_user_id").notNull().references(() => users.id),
  followedUserId: uuid("followed_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("followers_pair_idx").on(t.followerUserId, t.followedUserId),
  index("followers_follower_created_idx").on(t.followerUserId, t.createdAt),
  index("followers_followed_created_idx").on(t.followedUserId, t.createdAt),
]);

// ─── user_blocks ───
export const userBlocks = pgTable("user_blocks", {
  id: uuid("id").primaryKey().defaultRandom(),
  blockerUserId: uuid("blocker_user_id").notNull().references(() => users.id),
  blockedUserId: uuid("blocked_user_id").notNull().references(() => users.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("user_blocks_pair_idx").on(t.blockerUserId, t.blockedUserId),
]);

// ─── email_verifications ───
export const emailVerifications = pgTable("email_verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  email: text("email").notNull(),
  verificationTokenHash: text("verification_token_hash").notNull(),
  verificationType: verificationTypeEnum("verification_type").notNull(),
  status: verificationStatusEnum("status").default("PENDING").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("email_verifications_token_idx").on(t.verificationTokenHash),
  index("email_verifications_user_type_status_idx").on(t.userId, t.verificationType, t.status),
  index("email_verifications_expires_at_idx").on(t.expiresAt),
]);

// ─── push_tokens ───
export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  deviceId: text("device_id").notNull(),
  platform: pushPlatformEnum("platform").notNull(),
  token: text("token").notNull(),
  tokenStatus: pushTokenStatusEnum("token_status").default("ACTIVE").notNull(),
  appVersion: text("app_version").notNull(),
  lastRefreshedAt: timestamp("last_refreshed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("push_tokens_token_idx").on(t.token),
  index("push_tokens_user_platform_idx").on(t.userId, t.platform),
  index("push_tokens_status_refresh_idx").on(t.tokenStatus, t.lastRefreshedAt),
]);

// ─── user_inbox_preferences ───
export const userInboxPreferences = pgTable("user_inbox_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  dmPrivacyRule: text("dm_privacy_rule").default("ALL_USERS").notNull(),
  allowLiveStreamLinks: boolean("allow_live_stream_links").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("user_inbox_preferences_user_idx").on(t.userId),
]);

// ─── account_deletion_requests ───
export const accountDeletionRequests = pgTable("account_deletion_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  status: accountDeletionStatusEnum("status").default("REQUESTED").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  coolingOffExpiresAt: timestamp("cooling_off_expires_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  processedByAdminId: uuid("processed_by_admin_id"),
  reason: text("reason").notNull(),
});

// ─── Relations ───
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  referredBy: one(users, { fields: [users.referredByUserId], references: [users.id], relationName: "referral" }),
  referrals: many(users, { relationName: "referral" }),
  pushTokens: many(pushTokens),
  inboxPreferences: many(userInboxPreferences),
  emailVerifications: many(emailVerifications),
}));

export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
}));

export const followersRelations = relations(followers, ({ one }) => ({
  follower: one(users, { fields: [followers.followerUserId], references: [users.id], relationName: "follower" }),
  followed: one(users, { fields: [followers.followedUserId], references: [users.id], relationName: "followed" }),
}));

export const userInboxPreferencesRelations = relations(userInboxPreferences, ({ one }) => ({
  user: one(users, { fields: [userInboxPreferences.userId], references: [users.id] }),
}));
