import { createDomainEvent, publishDomainEvent } from "@missu/queue";
import type { DomainEventName } from "@missu/queue";
import { eventRepository } from "../repositories/event-repository";

export const eventService = {
  async publish<TPayload extends Record<string, unknown>>(name: DomainEventName, aggregateType: string, aggregateId: string, payload: TPayload) {
    const event = createDomainEvent({ name, aggregateType, aggregateId, payload });
    await eventRepository.create(event);
    await publishDomainEvent(event);
    return event;
  },
};