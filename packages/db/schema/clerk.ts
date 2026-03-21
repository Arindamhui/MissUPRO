import { pgTable, uuid, text, timestamp, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

export const clerkWebhookEvents = pgTable("clerk_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  svixId: text("svix_id").notNull(),
  svixTimestamp: text("svix_timestamp").notNull(),
  eventType: text("event_type").notNull(),
  clerkEventId: text("clerk_event_id"),
  payloadHash: text("payload_hash").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  signatureValid: boolean("signature_valid").notNull(),
  processingStatus: text("processing_status").default("RECEIVED").notNull(),
  failureReason: text("failure_reason"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
}, (t) => [
  uniqueIndex("clerk_webhook_events_svix_id_idx").on(t.svixId),
  index("clerk_webhook_events_type_received_idx").on(t.eventType, t.receivedAt),
  index("clerk_webhook_events_status_received_idx").on(t.processingStatus, t.receivedAt),
]);