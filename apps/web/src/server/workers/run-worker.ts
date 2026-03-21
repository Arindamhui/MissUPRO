/**
 * Standalone worker process entry point.
 * Run with: npx tsx apps/web/src/server/workers/run-worker.ts
 *
 * This process connects to Redis and processes domain events
 * from the BullMQ queue independently of the Next.js web process.
 * Designed for horizontal scaling — run multiple instances behind
 * a process manager (PM2, systemd, k8s Deployment).
 */
import { bootWorker } from "./boot";

bootWorker();
