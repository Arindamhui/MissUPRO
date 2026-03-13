CREATE TABLE "support_tickets" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "requester_user_id" uuid NOT NULL,
  "assigned_admin_id" uuid,
  "category" text NOT NULL,
  "priority" text DEFAULT 'NORMAL' NOT NULL,
  "status" text DEFAULT 'OPEN' NOT NULL,
  "subject" text NOT NULL,
  "description" text NOT NULL,
  "metadata_json" jsonb,
  "resolution_note" text,
  "closed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_requester_user_id_users_id_fk"
  FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "support_tickets"
  ADD CONSTRAINT "support_tickets_assigned_admin_id_users_id_fk"
  FOREIGN KEY ("assigned_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "support_tickets_requester_idx" ON "support_tickets" USING btree ("requester_user_id");
CREATE INDEX "support_tickets_status_priority_idx" ON "support_tickets" USING btree ("status", "priority");
CREATE INDEX "support_tickets_created_idx" ON "support_tickets" USING btree ("created_at");
