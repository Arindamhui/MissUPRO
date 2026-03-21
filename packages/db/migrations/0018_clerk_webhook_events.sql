CREATE TABLE IF NOT EXISTS "clerk_webhook_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "svix_id" text NOT NULL,
  "svix_timestamp" text NOT NULL,
  "event_type" text NOT NULL,
  "clerk_event_id" text,
  "payload_hash" text NOT NULL,
  "payload_json" jsonb NOT NULL,
  "signature_valid" boolean NOT NULL,
  "processing_status" text NOT NULL DEFAULT 'RECEIVED',
  "failure_reason" text,
  "received_at" timestamp NOT NULL DEFAULT now(),
  "processed_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "clerk_webhook_events_svix_id_idx"
  ON "clerk_webhook_events" USING btree ("svix_id");

CREATE INDEX IF NOT EXISTS "clerk_webhook_events_type_received_idx"
  ON "clerk_webhook_events" USING btree ("event_type", "received_at");

CREATE INDEX IF NOT EXISTS "clerk_webhook_events_status_received_idx"
  ON "clerk_webhook_events" USING btree ("processing_status", "received_at");