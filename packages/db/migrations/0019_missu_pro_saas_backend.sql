ALTER TABLE users ADD COLUMN IF NOT EXISTS public_id text;
CREATE UNIQUE INDEX IF NOT EXISTS users_public_id_idx ON users(public_id);
CREATE INDEX IF NOT EXISTS users_created_at_idx ON users(created_at);

ALTER TABLE agencies ADD COLUMN IF NOT EXISTS public_id text;
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id);
CREATE UNIQUE INDEX IF NOT EXISTS agencies_public_id_idx ON agencies(public_id);
CREATE INDEX IF NOT EXISTS agencies_owner_id_idx ON agencies(owner_id);
CREATE INDEX IF NOT EXISTS agencies_created_at_idx ON agencies(created_at);

ALTER TABLE hosts ADD COLUMN IF NOT EXISTS public_id text;
CREATE UNIQUE INDEX IF NOT EXISTS hosts_public_id_idx ON hosts(public_id);
CREATE INDEX IF NOT EXISTS hosts_created_at_idx ON hosts(created_at);

CREATE TABLE IF NOT EXISTS agency_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  status agency_application_status NOT NULL DEFAULT 'PENDING',
  notes text,
  metadata_json jsonb,
  reviewed_by_user_id uuid REFERENCES users(id),
  reviewed_at timestamp,
  deleted_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agency_requests_user_status_idx ON agency_requests(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS agency_requests_agency_status_idx ON agency_requests(agency_id, status, created_at);
CREATE INDEX IF NOT EXISTS agency_requests_deleted_at_idx ON agency_requests(deleted_at);

CREATE TABLE IF NOT EXISTS host_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  agency_id uuid REFERENCES agencies(id),
  request_type host_type NOT NULL,
  documents_json jsonb NOT NULL,
  talent_info text NOT NULL,
  storage_keys_json jsonb,
  status host_application_status NOT NULL DEFAULT 'PENDING',
  idempotency_key text,
  reviewed_by_user_id uuid REFERENCES users(id),
  reviewed_at timestamp,
  deleted_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS host_requests_idempotency_idx ON host_requests(idempotency_key);
CREATE INDEX IF NOT EXISTS host_requests_user_status_idx ON host_requests(user_id, status, created_at);
CREATE INDEX IF NOT EXISTS host_requests_agency_status_idx ON host_requests(agency_id, status, created_at);
CREATE INDEX IF NOT EXISTS host_requests_type_status_idx ON host_requests(request_type, status, created_at);
CREATE INDEX IF NOT EXISTS host_requests_deleted_at_idx ON host_requests(deleted_at);

CREATE TABLE IF NOT EXISTS outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  aggregate_type text NOT NULL,
  aggregate_id text NOT NULL,
  payload_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PENDING',
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamp NOT NULL DEFAULT now(),
  processed_at timestamp,
  last_error text,
  created_at timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS outbox_events_status_available_idx ON outbox_events(status, available_at);
CREATE INDEX IF NOT EXISTS outbox_events_aggregate_idx ON outbox_events(aggregate_type, aggregate_id, created_at);
CREATE INDEX IF NOT EXISTS outbox_events_name_created_idx ON outbox_events(event_name, created_at);