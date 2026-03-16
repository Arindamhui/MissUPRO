CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id uuid NOT NULL REFERENCES users(id),
  assigned_admin_id uuid REFERENCES users(id),
  category text NOT NULL,
  priority text NOT NULL DEFAULT 'NORMAL',
  status text NOT NULL DEFAULT 'OPEN',
  subject text NOT NULL,
  description text NOT NULL,
  metadata_json jsonb,
  resolution_note text,
  closed_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_requester_idx ON support_tickets (requester_user_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_priority_idx ON support_tickets (status, priority);
CREATE INDEX IF NOT EXISTS support_tickets_created_idx ON support_tickets (created_at);