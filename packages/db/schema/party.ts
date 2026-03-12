import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  partyRoomTypeEnum, partyRoomStatusEnum, seatStatusEnum, seatLayoutTypeEnum,
  partyMemberRoleEnum, partyMemberStatusEnum, partyThemeStatusEnum,
  partyActivityTypeEnum, partyActivityStatusEnum, partyActivityResultEnum,
} from "./enums";
import { users } from "./users";
import { events } from "./events";

// ─── party_themes ───
export const partyThemes = pgTable("party_themes", {
  id: uuid("id").primaryKey().defaultRandom(),
  themeName: text("theme_name").notNull(),
  description: text("description").notNull(),
  backgroundAssetUrl: text("background_asset_url").notNull(),
  seatFrameAssetUrl: text("seat_frame_asset_url").notNull(),
  ambientSoundUrl: text("ambient_sound_url"),
  colorSchemeJson: jsonb("color_scheme_json").notNull(),
  isPremium: boolean("is_premium").default(false).notNull(),
  coinPrice: integer("coin_price"),
  status: partyThemeStatusEnum("status").default("ACTIVE").notNull(),
  seasonTag: text("season_tag"),
  createdByAdminId: uuid("created_by_admin_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("party_themes_status_idx").on(t.status),
  index("party_themes_season_status_idx").on(t.seasonTag, t.status),
]);

// ─── party_rooms ───
export const partyRooms = pgTable("party_rooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  hostUserId: uuid("host_user_id").notNull().references(() => users.id),
  roomName: text("room_name").notNull(),
  description: text("description"),
  roomType: partyRoomTypeEnum("room_type").default("PUBLIC").notNull(),
  status: partyRoomStatusEnum("status").default("CREATED").notNull(),
  passwordHash: text("password_hash"),
  maxSeats: integer("max_seats").default(8).notNull(),
  maxAudience: integer("max_audience").default(500).notNull(),
  seatLayoutType: seatLayoutTypeEnum("seat_layout_type").default("CIRCLE").notNull(),
  entryFeeCoins: integer("entry_fee_coins"),
  themeId: uuid("theme_id").references(() => partyThemes.id),
  isPersistent: boolean("is_persistent").default(false).notNull(),
  eventId: uuid("event_id").references(() => events.id),
  totalUniqueVisitors: integer("total_unique_visitors").default(0).notNull(),
  peakOccupancy: integer("peak_occupancy").default(0).notNull(),
  totalGiftsValueCoins: integer("total_gifts_value_coins").default(0).notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  totalDurationSeconds: integer("total_duration_seconds").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("party_rooms_status_type_idx").on(t.status, t.roomType),
  index("party_rooms_host_status_idx").on(t.hostUserId, t.status),
  index("party_rooms_persistent_status_idx").on(t.isPersistent, t.status),
  index("party_rooms_event_idx").on(t.eventId),
]);

// ─── party_seats ───
export const partySeats = pgTable("party_seats", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => partyRooms.id),
  seatNumber: integer("seat_number").notNull(),
  status: seatStatusEnum("status").default("EMPTY").notNull(),
  occupantUserId: uuid("occupant_user_id").references(() => users.id),
  reservedForUserId: uuid("reserved_for_user_id").references(() => users.id),
  isMuted: boolean("is_muted").default(false).notNull(),
  isVipReserved: boolean("is_vip_reserved").default(false).notNull(),
  occupiedAt: timestamp("occupied_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("party_seats_room_seat_idx").on(t.roomId, t.seatNumber),
  index("party_seats_room_status_idx").on(t.roomId, t.status),
  index("party_seats_occupant_idx").on(t.occupantUserId),
]);

// ─── party_members ───
export const partyMembers = pgTable("party_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => partyRooms.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  role: partyMemberRoleEnum("role").default("AUDIENCE").notNull(),
  status: partyMemberStatusEnum("status").default("ACTIVE").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  leftAt: timestamp("left_at"),
  totalDurationSeconds: integer("total_duration_seconds").default(0).notNull(),
  totalCoinsSpent: integer("total_coins_spent").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("party_members_room_status_idx").on(t.roomId, t.status),
  index("party_members_user_status_idx").on(t.userId, t.status),
]);

// ─── party_activities ───
export const partyActivities = pgTable("party_activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  roomId: uuid("room_id").notNull().references(() => partyRooms.id),
  activityType: partyActivityTypeEnum("activity_type").notNull(),
  status: partyActivityStatusEnum("status").default("CREATED").notNull(),
  configJson: jsonb("config_json").notNull(),
  potTotalCoins: integer("pot_total_coins").default(0).notNull(),
  platformFeeCoins: integer("platform_fee_coins").default(0).notNull(),
  winnerUserId: uuid("winner_user_id"),
  prizeCoins: integer("prize_coins").default(0).notNull(),
  participantCount: integer("participant_count").default(0).notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  createdByUserId: uuid("created_by_user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("party_activities_room_status_idx").on(t.roomId, t.status),
  index("party_activities_type_status_idx").on(t.activityType, t.status),
]);

// ─── party_activity_participants ───
export const partyActivityParticipants = pgTable("party_activity_participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  activityId: uuid("activity_id").notNull().references(() => partyActivities.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  coinsContributed: integer("coins_contributed").default(0).notNull(),
  result: partyActivityResultEnum("result").default("PARTICIPATING").notNull(),
  diceRollValue: integer("dice_roll_value"),
  raffleTicketCount: integer("raffle_ticket_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("party_activity_participants_activity_user_idx").on(t.activityId, t.userId),
  index("party_activity_participants_activity_result_idx").on(t.activityId, t.result),
]);

// ─── Relations ───
export const partyThemesRelations = relations(partyThemes, ({ many }) => ({
  rooms: many(partyRooms),
}));

export const partyRoomsRelations = relations(partyRooms, ({ one, many }) => ({
  host: one(users, { fields: [partyRooms.hostUserId], references: [users.id] }),
  theme: one(partyThemes, { fields: [partyRooms.themeId], references: [partyThemes.id] }),
  event: one(events, { fields: [partyRooms.eventId], references: [events.id] }),
  seats: many(partySeats),
  members: many(partyMembers),
  activities: many(partyActivities),
}));

export const partySeatsRelations = relations(partySeats, ({ one }) => ({
  room: one(partyRooms, { fields: [partySeats.roomId], references: [partyRooms.id] }),
  occupant: one(users, { fields: [partySeats.occupantUserId], references: [users.id], relationName: "seatOccupant" }),
  reservedFor: one(users, { fields: [partySeats.reservedForUserId], references: [users.id], relationName: "seatReserved" }),
}));

export const partyMembersRelations = relations(partyMembers, ({ one }) => ({
  room: one(partyRooms, { fields: [partyMembers.roomId], references: [partyRooms.id] }),
  user: one(users, { fields: [partyMembers.userId], references: [users.id] }),
}));

export const partyActivitiesRelations = relations(partyActivities, ({ one, many }) => ({
  room: one(partyRooms, { fields: [partyActivities.roomId], references: [partyRooms.id] }),
  creator: one(users, { fields: [partyActivities.createdByUserId], references: [users.id] }),
  participants: many(partyActivityParticipants),
}));

export const partyActivityParticipantsRelations = relations(partyActivityParticipants, ({ one }) => ({
  activity: one(partyActivities, { fields: [partyActivityParticipants.activityId], references: [partyActivities.id] }),
  user: one(users, { fields: [partyActivityParticipants.userId], references: [users.id] }),
}));
