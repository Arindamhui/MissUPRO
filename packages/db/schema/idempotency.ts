import {
  pgTable, uuid, text, integer, timestamp, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { idempotencyStatusEnum } from "./enums";
import { users } from "./users";

// ─── idempotency_keys ───
export const idempotencyKeys = pgTable("idempotency_keys", {
  id: uuid("id").primaryKey().defaultRandom(),
  idempotencyKey: text("idempotency_key").notNull(),
  operationScope: text("operation_scope").notNull(),
  actorUserId: uuid("actor_user_id").notNull().references(() => users.id),
  requestHash: text("request_hash").notNull(),
  responseSnapshotJson: jsonb("response_snapshot_json"),
  status: idempotencyStatusEnum("status").default("IN_PROGRESS").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("idempotency_keys_key_idx").on(t.idempotencyKey),
  index("idempotency_keys_actor_idx").on(t.actorUserId),
  index("idempotency_keys_expires_idx").on(t.expiresAt),
]);

// ─── Relations ───
export const idempotencyKeysRelations = relations(idempotencyKeys, ({ one }) => ({
  actor: one(users, { fields: [idempotencyKeys.actorUserId], references: [users.id] }),
}));
