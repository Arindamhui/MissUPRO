import { pgTable, uuid, text, timestamp, boolean, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users";
import { admins } from "./admin";

export const supportTickets = pgTable("support_tickets", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketNumber: text("ticket_number"),
  requesterUserId: uuid("requester_user_id").notNull().references(() => users.id),
  assignedAdminId: uuid("assigned_admin_id").references(() => admins.id),
  category: text("category").notNull(),
  priority: text("priority").default("NORMAL").notNull(),
  status: text("status").default("OPEN").notNull(),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  metadataJson: jsonb("metadata_json"),
  resolutionNote: text("resolution_note"),
  satisfactionRating: text("satisfaction_rating"),
  escalatedAt: timestamp("escalated_at"),
  firstResponseAt: timestamp("first_response_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("support_tickets_number_idx").on(t.ticketNumber),
  index("support_tickets_requester_idx").on(t.requesterUserId),
  index("support_tickets_assigned_admin_idx").on(t.assignedAdminId),
  index("support_tickets_status_priority_idx").on(t.status, t.priority),
  index("support_tickets_category_status_idx").on(t.category, t.status),
  index("support_tickets_created_idx").on(t.createdAt),
]);

// ─── support_ticket_replies ───
export const supportTicketReplies = pgTable("support_ticket_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  ticketId: uuid("ticket_id").notNull().references(() => supportTickets.id),
  senderUserId: uuid("sender_user_id").references(() => users.id),
  senderAdminId: uuid("sender_admin_id").references(() => admins.id),
  senderType: text("sender_type").notNull(),
  body: text("body").notNull(),
  attachmentUrlsJson: jsonb("attachment_urls_json"),
  isInternal: boolean("is_internal").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("support_ticket_replies_ticket_created_idx").on(t.ticketId, t.createdAt),
  index("support_ticket_replies_sender_admin_idx").on(t.senderAdminId, t.createdAt),
]);

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  requester: one(users, { fields: [supportTickets.requesterUserId], references: [users.id] }),
  assignedAdmin: one(admins, { fields: [supportTickets.assignedAdminId], references: [admins.id] }),
  replies: many(supportTicketReplies),
}));

export const supportTicketRepliesRelations = relations(supportTicketReplies, ({ one }) => ({
  ticket: one(supportTickets, { fields: [supportTicketReplies.ticketId], references: [supportTickets.id] }),
  senderUser: one(users, { fields: [supportTicketReplies.senderUserId], references: [users.id], relationName: "ticketReplyUser" }),
  senderAdmin: one(admins, { fields: [supportTicketReplies.senderAdminId], references: [admins.id], relationName: "ticketReplyAdmin" }),
}));
