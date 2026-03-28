import {
  pgTable, uuid, text, timestamp, integer, jsonb, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { logLevelEnum, emailDeliveryStatusEnum, serviceNameEnum } from "./enums";
import { users } from "./users";

// ─── api_request_logs (high-cardinality, partitioned by date in production) ───
export const apiRequestLogs = pgTable("api_request_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  method: text("method").notNull(),
  path: text("path").notNull(),
  statusCode: integer("status_code").notNull(),
  durationMs: integer("duration_ms").notNull(),
  userId: uuid("user_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  requestBodySize: integer("request_body_size"),
  responseBodySize: integer("response_body_size"),
  errorCode: text("error_code"),
  traceId: text("trace_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("api_request_logs_created_idx").on(t.createdAt),
  index("api_request_logs_path_status_idx").on(t.path, t.statusCode),
  index("api_request_logs_user_created_idx").on(t.userId, t.createdAt),
  index("api_request_logs_error_created_idx").on(t.errorCode, t.createdAt),
  index("api_request_logs_trace_idx").on(t.traceId),
]);

// ─── system_error_logs (application errors for postmortem analysis) ───
export const systemErrorLogs = pgTable("system_error_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  level: logLevelEnum("level").default("ERROR").notNull(),
  service: serviceNameEnum("service").notNull(),
  errorCode: text("error_code"),
  message: text("message").notNull(),
  stackTrace: text("stack_trace"),
  context: jsonb("context"),
  userId: uuid("user_id"),
  traceId: text("trace_id"),
  hostname: text("hostname"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("system_error_logs_level_service_idx").on(t.level, t.service, t.createdAt),
  index("system_error_logs_error_code_idx").on(t.errorCode, t.createdAt),
  index("system_error_logs_created_idx").on(t.createdAt),
  index("system_error_logs_trace_idx").on(t.traceId),
]);

// ─── email_delivery_logs (tracks every email sent from the platform) ───
export const emailDeliveryLogs = pgTable("email_delivery_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  toEmail: text("to_email").notNull(),
  templateKey: text("template_key").notNull(),
  subject: text("subject").notNull(),
  provider: text("provider").notNull(),
  providerMessageId: text("provider_message_id"),
  status: emailDeliveryStatusEnum("status").default("QUEUED").notNull(),
  failureReason: text("failure_reason"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  bouncedAt: timestamp("bounced_at"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("email_delivery_logs_user_created_idx").on(t.userId, t.createdAt),
  index("email_delivery_logs_status_created_idx").on(t.status, t.createdAt),
  index("email_delivery_logs_template_idx").on(t.templateKey, t.createdAt),
  index("email_delivery_logs_provider_msg_idx").on(t.providerMessageId),
]);

// ─── webhook_delivery_logs (outgoing webhook delivery tracking) ───
export const webhookDeliveryLogs = pgTable("webhook_delivery_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  targetUrl: text("target_url").notNull(),
  eventType: text("event_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  httpStatus: integer("http_status"),
  responseBody: text("response_body"),
  attempt: integer("attempt").default(1).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  durationMs: integer("duration_ms"),
  status: text("status").default("PENDING").notNull(),
  nextRetryAt: timestamp("next_retry_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("webhook_delivery_logs_event_type_idx").on(t.eventType, t.createdAt),
  index("webhook_delivery_logs_status_retry_idx").on(t.status, t.nextRetryAt),
  index("webhook_delivery_logs_created_idx").on(t.createdAt),
]);

// ─── Relations ───
export const emailDeliveryLogsRelations = relations(emailDeliveryLogs, ({ one }) => ({
  user: one(users, { fields: [emailDeliveryLogs.userId], references: [users.id] }),
}));
