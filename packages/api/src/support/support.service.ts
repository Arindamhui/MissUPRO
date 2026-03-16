import { Injectable } from "@nestjs/common";
import { db } from "@missu/db";
import { supportTickets } from "@missu/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";

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

  async getTicketDetail(ticketId: string) {
    const [ticket] = await db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);

    return ticket ?? null;
  }

  async getOperationsReport(startDate: Date, endDate: Date) {
    const statusCounts = await db
      .select({ status: supportTickets.status, count: sql<number>`count(*)` })
      .from(supportTickets)
      .where(sql`${supportTickets.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(supportTickets.status);

    const categoryCounts = await db
      .select({ category: supportTickets.category, count: sql<number>`count(*)` })
      .from(supportTickets)
      .where(sql`${supportTickets.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(supportTickets.category);

    const priorityCounts = await db
      .select({ priority: supportTickets.priority, count: sql<number>`count(*)` })
      .from(supportTickets)
      .where(sql`${supportTickets.createdAt} BETWEEN ${startDate} AND ${endDate}`)
      .groupBy(supportTickets.priority);

    const [summary] = await db
      .select({
        openCount: sql<number>`count(*) filter (where ${supportTickets.status} = 'OPEN')`,
        resolvedCount: sql<number>`count(*) filter (where ${supportTickets.status} = 'RESOLVED')`,
        assignedCount: sql<number>`count(*) filter (where ${supportTickets.assignedAdminId} is not null)`,
      })
      .from(supportTickets)
      .where(sql`${supportTickets.createdAt} BETWEEN ${startDate} AND ${endDate}`);

    return {
      summary: {
        openCount: Number(summary?.openCount ?? 0),
        resolvedCount: Number(summary?.resolvedCount ?? 0),
        assignedCount: Number(summary?.assignedCount ?? 0),
      },
      statusCounts,
      categoryCounts,
      priorityCounts,
    };
  }
}
