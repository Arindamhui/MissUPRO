import {
  pgTable, uuid, text, integer, timestamp, boolean, jsonb, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  sessionStatusEnum, securityEventTypeEnum, severityEnum,
  serviceNameEnum, serviceStatusEnum, incidentSeverityEnum, incidentStatusEnum,
} from "./enums";
import { users } from "./users";

// ─── auth_sessions ───
export const authSessions = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  deviceFingerprintHash: text("device_fingerprint_hash").notNull(),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  sessionStatus: sessionStatusEnum("session_status").default("ACTIVE").notNull(),
  ipHash: text("ip_hash").notNull(),
  userAgentHash: text("user_agent_hash").notNull(),
  riskScore: integer("risk_score").default(0).notNull(),
  lastSeenAt: timestamp("last_seen_at"),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("auth_sessions_user_id_idx").on(t.userId),
  index("auth_sessions_status_idx").on(t.sessionStatus),
  index("auth_sessions_expires_at_idx").on(t.expiresAt),
]);

// ─── security_events (append-only) ───
export const securityEvents = pgTable("security_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventType: securityEventTypeEnum("event_type").notNull(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  ipAddress: text("ip_address").notNull(),
  userAgent: text("user_agent"),
  geoLocationJson: jsonb("geo_location_json"),
  deviceFingerprintHash: text("device_fingerprint_hash"),
  severity: severityEnum("severity").notNull(),
  detailsJson: jsonb("details_json"),
  relatedEntityType: text("related_entity_type"),
  relatedEntityId: uuid("related_entity_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("security_events_actor_created_idx").on(t.actorUserId, t.createdAt),
  index("security_events_type_severity_idx").on(t.eventType, t.severity, t.createdAt),
  index("security_events_ip_created_idx").on(t.ipAddress, t.createdAt),
  index("security_events_severity_created_idx").on(t.severity, t.createdAt),
]);

// ─── service_identities ───
export const serviceIdentities = pgTable("service_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  serviceName: serviceNameEnum("service_name").notNull(),
  publicKeyHash: text("public_key_hash").notNull(),
  certificateFingerprint: text("certificate_fingerprint"),
  allowedEndpointsJson: jsonb("allowed_endpoints_json").notNull(),
  status: serviceStatusEnum("status").default("ACTIVE").notNull(),
  issuedAt: timestamp("issued_at").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  rotatedAt: timestamp("rotated_at"),
  revokedAt: timestamp("revoked_at"),
  revocationReason: text("revocation_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("service_identities_key_hash_idx").on(t.publicKeyHash),
  index("service_identities_name_status_idx").on(t.serviceName, t.status),
  index("service_identities_expires_status_idx").on(t.expiresAt, t.status),
]);

// ─── security_incidents ───
export const securityIncidents = pgTable("security_incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentType: text("incident_type").notNull(),
  severity: incidentSeverityEnum("severity").notNull(),
  status: incidentStatusEnum("status").default("OPEN").notNull(),
  sourceEventId: uuid("source_event_id").references(() => securityEvents.id),
  ownerAdminId: uuid("owner_admin_id").notNull(),
  startedAt: timestamp("started_at").notNull(),
  resolvedAt: timestamp("resolved_at"),
  postmortemUrl: text("postmortem_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("security_incidents_status_severity_idx").on(t.status, t.severity),
]);

// ─── Relations ───
export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(users, { fields: [authSessions.userId], references: [users.id] }),
}));

export const securityEventsRelations = relations(securityEvents, ({ one }) => ({
  actor: one(users, { fields: [securityEvents.actorUserId], references: [users.id] }),
}));
