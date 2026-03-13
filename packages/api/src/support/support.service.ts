import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { supportTickets } from "@missu/db/schema";
import { and, desc, eq } from "drizzle-orm";

@Injectable()
export class SupportService {
  async createTicket(
    requesterUserId: string,
    data: { category: string; priority: string; subject: string; description: string; metadataJson?: Record<string, unknown> },
  ) {
    const [ticket] = await db
      .insert(supportTickets)
      .values({
        requesterUserId,
        category: data.category,
        priority: data.priority,
        subject: data.subject,
        description: data.description,
        metadataJson: data.metadataJson,
      })
      .returning();

    return ticket!;
  }

  async listMyTickets(requesterUserId: string) {
    return db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.requesterUserId, requesterUserId))
      .orderBy(desc(supportTickets.createdAt));
  }

  async listTickets(filters: { status?: string; category?: string }) {
    const conditions = [] as any[];
    if (filters.status) conditions.push(eq(supportTickets.status, filters.status));
    if (filters.category) conditions.push(eq(supportTickets.category, filters.category));

    return db
      .select()
      .from(supportTickets)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(supportTickets.createdAt));
  }

  async assignTicket(ticketId: string, adminId: string) {
    const [updated] = await db
      .update(supportTickets)
      .set({ assignedAdminId: adminId, status: "IN_PROGRESS", updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    return updated;
  }

  async resolveTicket(ticketId: string, resolutionNote: string) {
    const [updated] = await db
      .update(supportTickets)
      .set({
        status: "RESOLVED",
        resolutionNote,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supportTickets.id, ticketId))
      .returning();

    return updated;
  }
}
