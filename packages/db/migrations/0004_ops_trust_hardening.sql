DO $$
BEGIN
  CREATE TYPE payment_dispute_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'WON', 'LOST', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE data_export_status AS ENUM ('REQUESTED', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE agency_application_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE agency_commission_status AS ENUM ('PENDING', 'APPROVED', 'PAID', 'VOID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS payment_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL REFERENCES payments(id),
  provider_dispute_id text NOT NULL,
  dispute_reason text NOT NULL,
  amount_usd numeric(10,2) NOT NULL,
  status payment_dispute_status NOT NULL DEFAULT 'OPEN',
  evidence_due_at timestamp,
  resolution_notes text,
  metadata_json jsonb,
  opened_at timestamp NOT NULL DEFAULT now(),
  resolved_at timestamp,
  created_by_admin_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS payment_disputes_provider_idx ON payment_disputes (provider_dispute_id);
CREATE INDEX IF NOT EXISTS payment_disputes_payment_status_idx ON payment_disputes (payment_id, status, opened_at);
CREATE INDEX IF NOT EXISTS payment_disputes_status_opened_idx ON payment_disputes (status, opened_at);

CREATE TABLE IF NOT EXISTS data_export_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  status data_export_status NOT NULL DEFAULT 'REQUESTED',
  requested_at timestamp NOT NULL DEFAULT now(),
  processing_started_at timestamp,
  completed_at timestamp,
  expires_at timestamp,
  retention_until timestamp,
  download_url text,
  failure_reason text,
  payload_json jsonb,
  processed_by_admin_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS data_export_requests_user_status_idx ON data_export_requests (user_id, status, requested_at);
CREATE INDEX IF NOT EXISTS data_export_requests_status_requested_idx ON data_export_requests (status, requested_at);
CREATE INDEX IF NOT EXISTS data_export_requests_retention_idx ON data_export_requests (retention_until);

CREATE TABLE IF NOT EXISTS agency_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_user_id uuid NOT NULL REFERENCES users(id),
  agency_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  country text NOT NULL,
  notes text,
  status agency_application_status NOT NULL DEFAULT 'PENDING',
  created_agency_id uuid REFERENCES agencies(id),
  reviewed_by_admin_id uuid REFERENCES admins(id),
  reviewed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_applications_status_created_idx ON agency_applications (status, created_at);
CREATE INDEX IF NOT EXISTS agency_applications_applicant_status_idx ON agency_applications (applicant_user_id, status, created_at);

CREATE TABLE IF NOT EXISTS agency_commission_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  host_user_id uuid NOT NULL REFERENCES users(id),
  period_start timestamp NOT NULL,
  period_end timestamp NOT NULL,
  gross_revenue_usd numeric(12,2) NOT NULL,
  host_payout_usd numeric(12,2) NOT NULL,
  commission_rate numeric(5,4) NOT NULL,
  commission_amount_usd numeric(12,2) NOT NULL,
  status agency_commission_status NOT NULL DEFAULT 'PENDING',
  metadata_json jsonb,
  approved_by_admin_id uuid REFERENCES admins(id),
  approved_at timestamp,
  settled_at timestamp,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agency_commissions_agency_status_period_idx ON agency_commission_records (agency_id, status, period_start);
CREATE INDEX IF NOT EXISTS agency_commissions_host_period_idx ON agency_commission_records (host_user_id, period_start);
