import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { agencies } from "./agencies";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  actorPlatformRole: text("actor_platform_role"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  tenantAgencyId: uuid("tenant_agency_id").references(() => agencies.id),
  beforeStateJson: jsonb("before_state_json"),
  afterStateJson: jsonb("after_state_json"),
  metadataJson: jsonb("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("audit_logs_actor_created_idx").on(t.actorUserId, t.createdAt),
  index("audit_logs_entity_created_idx").on(t.entityType, t.entityId, t.createdAt),
  index("audit_logs_tenant_created_idx").on(t.tenantAgencyId, t.createdAt),
]);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorUserId], references: [users.id] }),
  tenantAgency: one(agencies, { fields: [auditLogs.tenantAgencyId], references: [agencies.id] }),
}));