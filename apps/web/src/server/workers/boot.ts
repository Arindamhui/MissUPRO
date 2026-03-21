import { startDomainWorker, createQueueEvents } from "@missu/queue";
import { logger } from "@missu/logger";
import { domainEventHandlers } from "./domain-event-processor";

let isShuttingDown = false;

export function bootWorker() {
  logger.info("worker_boot_starting", { handlers: Object.keys(domainEventHandlers) });

  const worker = startDomainWorker(domainEventHandlers);

  worker.on("completed", (job) => {
    logger.info("worker_job_completed", { jobId: job.id, eventName: job.data.name });
  });

  worker.on("failed", (job, error) => {
    logger.error("worker_job_failed", {
      jobId: job?.id,
      eventName: job?.data.name,
      attempt: job?.attemptsMade,
      error: error.message,
    });
  });

  worker.on("error", (error) => {
    logger.error("worker_error", { error: error.message });
  });

  const queueEvents = createQueueEvents();

  queueEvents.on("waiting", ({ jobId }) => {
    logger.debug("worker_job_waiting", { jobId });
  });

  async function shutdown(signal: string) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info("worker_shutdown_start", { signal });

    await worker.close();
    await queueEvents.close();
    logger.info("worker_shutdown_complete");
    process.exit(0);
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  logger.info("worker_boot_complete", { concurrency: 20 });
  return worker;
}
