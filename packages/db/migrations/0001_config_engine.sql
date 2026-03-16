DO $$
BEGIN
  CREATE TYPE setting_status AS ENUM ('DRAFT', 'PUBLISHED', 'ROLLED_BACK');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS pricing_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  category text NOT NULL,
  formula_json jsonb NOT NULL,
  constraints_json jsonb,
  status setting_status NOT NULL DEFAULT 'DRAFT',
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamp NOT NULL,
  effective_to timestamp,
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gift_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalog_key text NOT NULL,
  display_name text NOT NULL,
  coin_price integer NOT NULL,
  diamond_credit integer NOT NULL,
  effect_tier text NOT NULL,
  animation_config_json jsonb,
  availability_json jsonb,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leaderboard_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  leaderboard_type text NOT NULL,
  scoring_metric text NOT NULL,
  refresh_interval_seconds integer NOT NULL,
  max_entries integer NOT NULL,
  ranking_formula_json jsonb,
  status setting_status NOT NULL DEFAULT 'DRAFT',
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamp NOT NULL,
  effective_to timestamp,
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS event_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  event_type text NOT NULL,
  config_json jsonb NOT NULL,
  status setting_status NOT NULL DEFAULT 'DRAFT',
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamp NOT NULL,
  effective_to timestamp,
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vip_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_code text NOT NULL,
  display_name text NOT NULL,
  monthly_price_usd numeric(10,2) NOT NULL,
  coin_price integer,
  perk_json jsonb NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referral_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key text NOT NULL,
  qualification_json jsonb NOT NULL,
  inviter_reward_json jsonb NOT NULL,
  invitee_reward_json jsonb,
  anti_fraud_json jsonb,
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamp NOT NULL,
  effective_to timestamp,
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS group_audio_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  config_json jsonb NOT NULL,
  status setting_status NOT NULL DEFAULT 'DRAFT',
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamp NOT NULL,
  effective_to timestamp,
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS party_room_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text NOT NULL,
  config_json jsonb NOT NULL,
  status setting_status NOT NULL DEFAULT 'DRAFT',
  is_active boolean NOT NULL DEFAULT true,
  effective_from timestamp NOT NULL,
  effective_to timestamp,
  created_by_admin_id uuid NOT NULL REFERENCES users(id),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS pricing_rules_key_idx ON pricing_rules (rule_key);
CREATE INDEX IF NOT EXISTS pricing_rules_active_effective_idx ON pricing_rules (is_active, effective_from, effective_to);
CREATE INDEX IF NOT EXISTS pricing_rules_category_idx ON pricing_rules (category);

CREATE UNIQUE INDEX IF NOT EXISTS gift_catalog_key_idx ON gift_catalog (catalog_key);
CREATE INDEX IF NOT EXISTS gift_catalog_active_order_idx ON gift_catalog (is_active, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_configs_key_idx ON leaderboard_configs (config_key);
CREATE INDEX IF NOT EXISTS leaderboard_configs_type_active_idx ON leaderboard_configs (leaderboard_type, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS event_configs_key_idx ON event_configs (config_key);
CREATE INDEX IF NOT EXISTS event_configs_type_active_idx ON event_configs (event_type, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS vip_tiers_code_idx ON vip_tiers (tier_code);
CREATE INDEX IF NOT EXISTS vip_tiers_active_order_idx ON vip_tiers (is_active, display_order);

CREATE UNIQUE INDEX IF NOT EXISTS referral_rules_key_idx ON referral_rules (rule_key);
CREATE INDEX IF NOT EXISTS referral_rules_active_effective_idx ON referral_rules (is_active, effective_from, effective_to);

CREATE UNIQUE INDEX IF NOT EXISTS group_audio_configs_key_idx ON group_audio_configs (config_key);
CREATE INDEX IF NOT EXISTS group_audio_configs_active_effective_idx ON group_audio_configs (is_active, effective_from, effective_to);

CREATE UNIQUE INDEX IF NOT EXISTS party_room_configs_key_idx ON party_room_configs (config_key);
CREATE INDEX IF NOT EXISTS party_room_configs_active_effective_idx ON party_room_configs (is_active, effective_from, effective_to);