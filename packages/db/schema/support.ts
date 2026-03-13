import { pgTable, uuid, text, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  requesterUserId: uuid("requester_user_id").notNull().references(() => users.id),
  assignedAdminId: uuid("assigned_admin_id").references(() => users.id),
  category: text("category").notNull(),
  priority: text("priority").default("NORMAL").notNull(),
  status: text("status").default("OPEN").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  metadataJson: jsonb("metadata_json"),
  resolutionNote: text("resolution_note"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("support_tickets_requester_idx").on(t.requesterUserId),
  index("support_tickets_status_priority_idx").on(t.status, t.priority),
  index("support_tickets_created_idx").on(t.createdAt),
]);

export const supportTicketsRelations = relations(supportTickets, ({ one }) => ({
  requester: one(users, { fields: [supportTickets.requesterUserId], references: [users.id] }),
  assignedAdmin: one(users, { fields: [supportTickets.assignedAdminId], references: [users.id] }),
}));
