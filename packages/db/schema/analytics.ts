import {
  pgTable, uuid, text, timestamp, jsonb, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

// ─── analytics_events (append-only) ───
export const analyticsEvents = pgTable("analytics_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventName: text("event_name").notNull(),
  userId: uuid("user_id").references(() => users.id),
  anonymousId: text("anonymous_id"),
  sessionId: text("session_id"),
  platform: text("platform"),
  appVersion: text("app_version"),
  region: text("region"),
  payloadJson: jsonb("payload_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("analytics_events_user_created_idx").on(t.userId, t.createdAt),
  index("analytics_events_name_created_idx").on(t.eventName, t.createdAt),
  index("analytics_events_session_idx").on(t.sessionId),
]);

// ─── Relations ───
export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  user: one(users, { fields: [analyticsEvents.userId], references: [users.id] }),
}));
