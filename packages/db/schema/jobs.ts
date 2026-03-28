import {
  pgTable, uuid, text, timestamp, integer, jsonb, index,
} from "drizzle-orm/pg-core";
import { jobStatusEnum, jobPriorityEnum } from "./enums";

// ─── background_jobs (persistent job queue with retry tracking) ───
export const backgroundJobs = pgTable("background_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  queue: text("queue").notNull(),
  jobType: text("job_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  status: jobStatusEnum("status").default("PENDING").notNull(),
  priority: jobPriorityEnum("priority").default("NORMAL").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  lastError: text("last_error"),
  scheduledAt: timestamp("scheduled_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  nextRetryAt: timestamp("next_retry_at"),
  lockedBy: text("locked_by"),
  lockedAt: timestamp("locked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("background_jobs_status_scheduled_idx").on(t.status, t.scheduledAt),
  index("background_jobs_queue_status_idx").on(t.queue, t.status, t.priority),
  index("background_jobs_type_status_idx").on(t.jobType, t.status),
  index("background_jobs_locked_by_idx").on(t.lockedBy),
  index("background_jobs_next_retry_idx").on(t.nextRetryAt),
]);

// ─── dead_letter_queue (permanently failed jobs for inspection) ───
export const deadLetterQueue = pgTable("dead_letter_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  originalJobId: uuid("original_job_id"),
  queue: text("queue").notNull(),
  jobType: text("job_type").notNull(),
  payloadJson: jsonb("payload_json").notNull(),
  lastError: text("last_error"),
  totalAttempts: integer("total_attempts").notNull(),
  failedAt: timestamp("failed_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: text("resolved_by"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("dead_letter_queue_queue_type_idx").on(t.queue, t.jobType),
  index("dead_letter_queue_failed_at_idx").on(t.failedAt),
  index("dead_letter_queue_resolved_idx").on(t.resolvedAt),
]);

// ─── scheduled_tasks (recurring cron-like tasks with execution tracking) ───
export const scheduledTasks = pgTable("scheduled_tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  taskName: text("task_name").notNull(),
  cronExpression: text("cron_expression").notNull(),
  queue: text("queue").default("default").notNull(),
  payloadJson: jsonb("payload_json"),
  isEnabled: integer("is_enabled").default(1).notNull(),
  lastRunAt: timestamp("last_run_at"),
  lastRunStatus: text("last_run_status"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("scheduled_tasks_enabled_next_idx").on(t.isEnabled, t.nextRunAt),
  index("scheduled_tasks_name_idx").on(t.taskName),
]);
