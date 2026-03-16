CREATE TABLE IF NOT EXISTS user_xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  source_type text NOT NULL,
  source_reference_id text,
  idempotency_key text NOT NULL,
  xp_amount integer NOT NULL,
  metadata_json jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_xp_events_idempotency_idx ON user_xp_events (idempotency_key);
CREATE INDEX IF NOT EXISTS user_xp_events_user_created_idx ON user_xp_events (user_id, created_at);
CREATE INDEX IF NOT EXISTS user_xp_events_source_reference_idx ON user_xp_events (source_type, source_reference_id);