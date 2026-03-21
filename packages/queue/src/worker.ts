import { Job, Queue, QueueEvents, Worker } from "bullmq";
import type { DomainEvent } from "@missu/types";
import { getEnv } from "@missu/config";
import { logger } from "@missu/logger";

export type DomainEventHandler = (event: DomainEvent) => Promise<void>;

let queue: Queue<DomainEvent, void, string> | null = null;
let deadLetterQueue: Queue<DomainEvent, void, string> | null = null;
let queueEvents: QueueEvents | null = null;

function hasRedisConfig() {
  return Boolean(getEnv().REDIS_URL);
}

function connection() {
  if (!hasRedisConfig()) {
    throw new Error("Redis unavailable");
  }

  const url = new URL(getEnv().REDIS_URL);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname && url.pathname !== "/" ? Number(url.pathname.slice(1)) || 0 : 0,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 500,
    tls: url.protocol === "rediss:" ? {} : undefined,
  };
}

function queueName() {
  return getEnv().BULLMQ_QUEUE_NAME;
}

export function getDomainQueue() {
  if (queue) {
    return queue;
  }

  const instance = new Queue<DomainEvent, void, string>(queueName(), {
    connection: connection(),
    prefix: getEnv().BULLMQ_PREFIX,
    defaultJobOptions: {
      attempts: 5,
      removeOnComplete: 500,
      removeOnFail: 1000,
      backoff: { type: "exponential", delay: 1000 },
    },
  });

  queue = instance;
  return instance;
}

export function getDeadLetterQueue() {
  if (deadLetterQueue) {
    return deadLetterQueue;
  }

  const instance = new Queue<DomainEvent, void, string>(`${queueName()}:dlq`, {
    connection: connection(),
    prefix: getEnv().BULLMQ_PREFIX,
  });

  deadLetterQueue = instance;
  return instance;
}

export async function publishDomainEvent(event: DomainEvent) {
  if (!hasRedisConfig()) {
    logger.warn("domain_event_enqueue_skipped", {
      eventId: event.id,
      eventName: event.name,
      reason: "missing_redis_config",
    });
    return;
  }

  try {
    await getDomainQueue().add(event.name, event, {
      jobId: event.id,
    });
  } catch (error) {
    logger.warn("domain_event_enqueue_deferred", {
      eventId: event.id,
      eventName: event.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function createQueueEvents() {
  if (queueEvents) {
    return queueEvents;
  }

  const instance = new QueueEvents(queueName(), {
    connection: connection(),
    prefix: getEnv().BULLMQ_PREFIX,
  });

  queueEvents = instance;
  return instance;
}

export function startDomainWorker(handlers: Partial<Record<DomainEvent["name"], DomainEventHandler>>) {
  return new Worker<DomainEvent, void, string>(
    queueName(),
    async (job: Job<DomainEvent, void, string>) => {
      const handler = handlers[job.data.name];

      if (!handler) {
        logger.warn("Unhandled domain event", { eventName: job.data.name, eventId: job.data.id });
        return;
      }

      try {
        await handler(job.data);
      } catch (error) {
        if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1)) {
          await getDeadLetterQueue().add(job.name, job.data, { jobId: `${job.id}:dlq` });
        }

        throw error;
      }
    },
    {
      connection: connection(),
      prefix: getEnv().BULLMQ_PREFIX,
      concurrency: 20,
    },
  );
}