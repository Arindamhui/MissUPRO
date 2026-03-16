DO $$
BEGIN
  CREATE TYPE feature_flag_platform AS ENUM ('ALL', 'MOBILE', 'WEB', 'ANDROID', 'IOS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE feature_flag_type AS ENUM ('BOOLEAN', 'PERCENTAGE', 'USER_LIST', 'REGION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE layout_platform AS ENUM ('MOBILE', 'WEB', 'ALL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE report_entity_type AS ENUM ('USER', 'LIVE_STREAM', 'DM_MESSAGE', 'CALL_SESSION', 'GIFT_TRANSACTION', 'PAYMENT', 'MEDIA_ASSET', 'COMMENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE report_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'ACTIONED', 'DISMISSED', 'RESOLVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ban_scope AS ENUM ('ACCOUNT', 'LIVE', 'DM', 'CALL', 'WITHDRAWAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ban_status AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ban_reason AS ENUM ('HARASSMENT', 'SPAM', 'FRAUD', 'CHARGEBACK_ABUSE', 'SELF_GIFTING', 'UNDERAGE_RISK', 'POLICY_VIOLATION', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ui_component_type AS ENUM ('BANNER', 'CAROUSEL', 'GRID', 'CTA', 'TABS', 'CARD_LIST', 'ANNOUNCEMENT', 'FLOATING_ACTION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE ui_component_status AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE economy_setting_type AS ENUM ('COIN', 'DIAMOND', 'GIFT', 'CALL', 'WITHDRAWAL', 'REFERRAL', 'LEVEL', 'VIP');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE commission_rule_status AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_user_id uuid NOT NULL REFERENCES users(id),
  model_user_id uuid NOT NULL REFERENCES users(id),
  call_type call_type NOT NULL,
  status call_status NOT NULL DEFAULT 'REQUESTED',
  requested_at timestamp NOT NULL DEFAULT now(),
  accepted_at timestamp,
  cancelled_at timestamp,
  failed_at timestamp,
  failure_reason text,
  call_session_id uuid REFERENCES call_sessions(id),
  metadata_json jsonb,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id uuid NOT NULL REFERENCES calls(id),
  call_session_id uuid REFERENCES call_sessions(id),
  caller_user_id uuid NOT NULL REFERENCES users(id),
  model_user_id uuid NOT NULL REFERENCES users(id),
  call_type call_type NOT NULL,
  final_status call_status NOT NULL,
  total_duration_seconds integer NOT NULL DEFAULT 0,
  billable_minutes integer NOT NULL DEFAULT 0,
  total_coins_spent integer NOT NULL DEFAULT 0,
  started_at timestamp,
  ended_at timestamp,
  end_reason call_end_reason,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id uuid NOT NULL REFERENCES users(id),
  entity_type report_entity_type NOT NULL,
  entity_id uuid NOT NULL,
  reason_code text NOT NULL,
  description text,
  evidence_json jsonb,
  status report_status NOT NULL DEFAULT 'OPEN',
  priority_score integer NOT NULL DEFAULT 0,
  reviewed_by_admin_id uuid REFERENCES admins(id),
  reviewed_at timestamp,
  resolution_notes text,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  scope ban_scope NOT NULL,
  status ban_status NOT NULL DEFAULT 'ACTIVE',
  reason ban_reason NOT NULL,
  source_report_id uuid REFERENCES reports(id),
  imposed_by_admin_id uuid REFERENCES admins(id),
  notes text,
  starts_at timestamp NOT NULL DEFAULT now(),
  ends_at timestamp,
  revoked_at timestamp,
  revoked_by_admin_id uuid REFERENCES admins(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ui_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_key text NOT NULL,
  layout_name text NOT NULL,
  screen_key text NOT NULL,
  platform layout_platform NOT NULL,
  environment text NOT NULL DEFAULT 'development',
  region_code text,
  version integer NOT NULL DEFAULT 1,
  status setting_status NOT NULL DEFAULT 'DRAFT',
  tab_navigation_json jsonb,
  metadata_json jsonb,
  effective_from timestamp,
  effective_to timestamp,
  published_by_admin_id uuid REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ui_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_key text NOT NULL,
  component_type ui_component_type NOT NULL,
  display_name text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  props_json jsonb NOT NULL,
  data_source_key text,
  status ui_component_status NOT NULL DEFAULT 'DRAFT',
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  published_by_admin_id uuid REFERENCES users(id),
  published_at timestamp,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS component_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layout_id uuid NOT NULL REFERENCES ui_layouts(id),
  component_id uuid NOT NULL REFERENCES ui_components(id),
  section_key text NOT NULL,
  slot_key text,
  breakpoint text NOT NULL DEFAULT 'default',
  position_index integer NOT NULL DEFAULT 0,
  visibility_rules_json jsonb,
  overrides_json jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS economy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_type economy_setting_type NOT NULL,
  profile_key text NOT NULL,
  key text NOT NULL,
  value_json jsonb NOT NULL,
  environment text NOT NULL,
  region_code text,
  effective_from timestamp NOT NULL,
  effective_to timestamp,
  version integer NOT NULL DEFAULT 1,
  status setting_status NOT NULL DEFAULT 'DRAFT',
  changed_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id),
  rule_key text NOT NULL,
  rule_scope text NOT NULL,
  host_tier text,
  revenue_source text NOT NULL,
  commission_rate numeric(5, 4) NOT NULL,
  minimum_payout_usd numeric(12, 2),
  priority text NOT NULL DEFAULT 'NORMAL',
  constraints_json jsonb,
  status commission_rule_status NOT NULL DEFAULT 'DRAFT',
  effective_from timestamp NOT NULL,
  effective_to timestamp,
  created_by_admin_id uuid REFERENCES admins(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calls_caller_status_requested_idx ON calls (caller_user_id, status, requested_at);
CREATE INDEX IF NOT EXISTS calls_model_status_requested_idx ON calls (model_user_id, status, requested_at);
CREATE UNIQUE INDEX IF NOT EXISTS calls_session_idx ON calls (call_session_id);

CREATE UNIQUE INDEX IF NOT EXISTS call_history_call_idx ON call_history (call_id);
CREATE INDEX IF NOT EXISTS call_history_caller_ended_idx ON call_history (caller_user_id, ended_at);
CREATE INDEX IF NOT EXISTS call_history_model_ended_idx ON call_history (model_user_id, ended_at);
CREATE INDEX IF NOT EXISTS call_history_status_ended_idx ON call_history (final_status, ended_at);

CREATE INDEX IF NOT EXISTS reports_entity_status_created_idx ON reports (entity_type, entity_id, status, created_at);
CREATE INDEX IF NOT EXISTS reports_reporter_created_idx ON reports (reporter_user_id, created_at);
CREATE INDEX IF NOT EXISTS reports_status_priority_idx ON reports (status, priority_score, created_at);

CREATE INDEX IF NOT EXISTS bans_user_status_scope_idx ON bans (user_id, status, scope);
CREATE INDEX IF NOT EXISTS bans_source_report_idx ON bans (source_report_id);
CREATE INDEX IF NOT EXISTS bans_status_ends_idx ON bans (status, ends_at);

CREATE UNIQUE INDEX IF NOT EXISTS ui_layouts_scope_version_idx ON ui_layouts (layout_key, platform, environment, region_code, version);
CREATE INDEX IF NOT EXISTS ui_layouts_lookup_idx ON ui_layouts (layout_key, screen_key, platform, environment, region_code, status, effective_from);

CREATE UNIQUE INDEX IF NOT EXISTS ui_components_key_version_idx ON ui_components (component_key, schema_version);
CREATE INDEX IF NOT EXISTS ui_components_status_type_idx ON ui_components (status, component_type);

CREATE UNIQUE INDEX IF NOT EXISTS component_positions_layout_component_breakpoint_idx ON component_positions (layout_id, component_id, breakpoint);
CREATE INDEX IF NOT EXISTS component_positions_layout_section_position_idx ON component_positions (layout_id, section_key, position_index);

CREATE UNIQUE INDEX IF NOT EXISTS economy_settings_scope_version_idx ON economy_settings (setting_type, profile_key, key, environment, region_code, version);
CREATE INDEX IF NOT EXISTS economy_settings_lookup_idx ON economy_settings (setting_type, profile_key, key, environment, status, effective_from);

CREATE INDEX IF NOT EXISTS commission_rules_scope_status_effective_idx ON commission_rules (rule_scope, status, effective_from);
CREATE INDEX IF NOT EXISTS commission_rules_agency_source_idx ON commission_rules (agency_id, revenue_source, effective_from);
CREATE UNIQUE INDEX IF NOT EXISTS commission_rules_key_effective_idx ON commission_rules (rule_key, agency_id, effective_from);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'key'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'flag_key'
  ) THEN
    ALTER TABLE feature_flags RENAME COLUMN key TO flag_key;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'is_enabled'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'enabled'
  ) THEN
    ALTER TABLE feature_flags RENAME COLUMN is_enabled TO enabled;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'rollout_percentage'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'feature_flags' AND column_name = 'percentage_value'
  ) THEN
    ALTER TABLE feature_flags RENAME COLUMN rollout_percentage TO percentage_value;
  END IF;
END $$;

ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS flag_type feature_flag_type DEFAULT 'BOOLEAN';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS feature_name text;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS user_ids_json jsonb;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS region_codes_json jsonb;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES users(id);

UPDATE feature_flags
SET description = COALESCE(description, metadata ->> 'description', '')
WHERE description IS NULL OR description = '';

UPDATE feature_flags
SET flag_type = CASE
  WHEN percentage_value IS NOT NULL THEN 'PERCENTAGE'::feature_flag_type
  ELSE 'BOOLEAN'::feature_flag_type
END
WHERE flag_type IS NULL;

UPDATE feature_flags SET feature_name = flag_key WHERE feature_name IS NULL;
ALTER TABLE feature_flags ALTER COLUMN feature_name SET NOT NULL;
ALTER TABLE feature_flags ALTER COLUMN flag_type SET NOT NULL;

ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS platform feature_flag_platform DEFAULT 'ALL' NOT NULL;
ALTER TABLE feature_flags ADD COLUMN IF NOT EXISTS app_version text;

DROP INDEX IF EXISTS feature_flags_key_idx;
DROP INDEX IF EXISTS feature_flags_enabled_idx;

CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_scope_idx ON feature_flags (flag_key, platform, app_version);
CREATE INDEX IF NOT EXISTS feature_flags_feature_platform_idx ON feature_flags (feature_name, platform, app_version);
CREATE INDEX IF NOT EXISTS feature_flags_enabled_idx ON feature_flags (enabled, platform);