import { db, outboxEvents } from "@missu/db";
import type { DomainEvent } from "@missu/types";
import { eq } from "drizzle-orm";

type DbClient = any;

export const eventRepository = {
  async create(event: DomainEvent, dbClient: DbClient = db) {
    await dbClient.insert(outboxEvents).values({
      id: event.id,
      eventName: event.name,
      aggregateType: event.aggregateType,
      aggregateId: event.aggregateId,
      payloadJson: event.payload as Record<string, unknown>,
      status: "PENDING",
      availableAt: new Date(event.occurredAt),
    });
  },

  async markProcessed(id: string) {
    await db.update(outboxEvents).set({ status: "PROCESSED", processedAt: new Date() }).where(eq(outboxEvents.id, id));
  },
};