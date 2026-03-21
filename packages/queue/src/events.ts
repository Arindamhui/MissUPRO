import { randomUUID } from "node:crypto";
import type { DomainEvent } from "@missu/types";

export const DOMAIN_EVENT_NAMES = {
  USER_CREATED: "USER_CREATED",
  HOST_REQUESTED: "HOST_REQUESTED",
  HOST_APPROVED: "HOST_APPROVED",
  AGENCY_CREATED: "AGENCY_CREATED",
} as const;

export type DomainEventName = typeof DOMAIN_EVENT_NAMES[keyof typeof DOMAIN_EVENT_NAMES];

export function createDomainEvent<TPayload extends Record<string, unknown>>(params: {
  name: DomainEventName;
  aggregateType: string;
  aggregateId: string;
  payload: TPayload;
}): DomainEvent<TPayload> {
  return {
    id: randomUUID(),
    name: params.name,
    aggregateType: params.aggregateType,
    aggregateId: params.aggregateId,
    occurredAt: new Date().toISOString(),
    payload: params.payload,
  };
}