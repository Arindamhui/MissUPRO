DO $$
DECLARE
  bootstrap_user_id uuid;
  uses_canonical_user_shape boolean;
BEGIN
  SELECT id INTO bootstrap_user_id
  FROM users
  ORDER BY created_at
  LIMIT 1;

  IF bootstrap_user_id IS NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'display_name'
    ) INTO uses_canonical_user_shape;

    IF uses_canonical_user_shape THEN
      INSERT INTO users (
        email,
        email_verified,
        display_name,
        username,
        role,
        status,
        country,
        preferred_locale,
        preferred_timezone,
        is_verified,
        referral_code
      ) VALUES (
        'seed-admin@missu.local',
        true,
        'Seed Admin',
        'seed_admin',
        'ADMIN',
        'ACTIVE',
        'US',
        'en',
        'UTC',
        true,
        'SEEDADMIN'
      )
      ON CONFLICT (email) DO UPDATE
      SET updated_at = users.updated_at
      RETURNING id INTO bootstrap_user_id;
    ELSE
      INSERT INTO users (
        email,
        username,
        password_hash,
        role,
        is_suspended,
        is_banned,
        email_verified_at
      ) VALUES (
        'seed-admin@missu.local',
        'seed_admin',
        'seed-bootstrap',
        'ADMIN',
        false,
        false,
        now()
      )
      ON CONFLICT (email) DO UPDATE
      SET updated_at = users.updated_at
      RETURNING id INTO bootstrap_user_id;
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'system_settings'
  ) THEN
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS namespace text;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS environment text;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS region_code text;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS segment_code text;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS status setting_status DEFAULT 'PUBLISHED';
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS effective_from timestamp;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS effective_to timestamp;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS change_reason text;
    ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS updated_by_admin_id uuid REFERENCES users(id);

    UPDATE system_settings
    SET namespace = CASE key
      WHEN 'conversion_profile' THEN 'economy'
      WHEN 'withdrawal_policy' THEN 'economy'
      WHEN 'revenue_share' THEN 'commission'
      ELSE 'system'
    END
    WHERE namespace IS NULL;

    UPDATE system_settings
    SET environment = 'development'
    WHERE environment IS NULL;

    UPDATE system_settings
    SET status = 'PUBLISHED'::setting_status
    WHERE status IS NULL;

    UPDATE system_settings
    SET effective_from = COALESCE(effective_from, created_at, now())
    WHERE effective_from IS NULL;

    UPDATE system_settings
    SET change_reason = COALESCE(change_reason, description, 'Legacy setting import')
    WHERE change_reason IS NULL OR change_reason = '';

    UPDATE system_settings
    SET updated_by_admin_id = bootstrap_user_id
    WHERE updated_by_admin_id IS NULL;

    ALTER TABLE system_settings ALTER COLUMN namespace SET NOT NULL;
    ALTER TABLE system_settings ALTER COLUMN environment SET NOT NULL;
    ALTER TABLE system_settings ALTER COLUMN status SET NOT NULL;
    ALTER TABLE system_settings ALTER COLUMN effective_from SET NOT NULL;
    ALTER TABLE system_settings ALTER COLUMN change_reason SET NOT NULL;
    ALTER TABLE system_settings ALTER COLUMN updated_by_admin_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'coin_packages'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'coins'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'coin_amount'
    ) THEN
      ALTER TABLE coin_packages RENAME COLUMN coins TO coin_amount;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'sort_order'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'display_order'
    ) THEN
      ALTER TABLE coin_packages RENAME COLUMN sort_order TO display_order;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'starts_at'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'start_at'
    ) THEN
      ALTER TABLE coin_packages RENAME COLUMN starts_at TO start_at;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'ends_at'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'end_at'
    ) THEN
      ALTER TABLE coin_packages RENAME COLUMN ends_at TO end_at;
    END IF;

    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS price_usd numeric(10, 2);
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD';
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS apple_product_id text;
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS google_product_id text;
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS region_scope jsonb;
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS start_at timestamp;
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS end_at timestamp;
    ALTER TABLE coin_packages ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES users(id);

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'price_usd_cents'
    ) THEN
      UPDATE coin_packages
      SET price_usd = ROUND((price_usd_cents::numeric / 100.0), 2)
      WHERE price_usd IS NULL;
    END IF;

    UPDATE coin_packages
    SET currency = COALESCE(currency, 'USD')
    WHERE currency IS NULL;

    UPDATE coin_packages
    SET is_featured = COALESCE(is_featured, false)
    WHERE is_featured IS NULL;

    UPDATE coin_packages
    SET display_order = COALESCE(display_order, 0)
    WHERE display_order IS NULL;

    UPDATE coin_packages
    SET created_by_admin_id = bootstrap_user_id
    WHERE created_by_admin_id IS NULL;

    ALTER TABLE coin_packages ALTER COLUMN coin_amount SET NOT NULL;
    ALTER TABLE coin_packages ALTER COLUMN price_usd SET NOT NULL;
    ALTER TABLE coin_packages ALTER COLUMN currency SET NOT NULL;
    ALTER TABLE coin_packages ALTER COLUMN is_featured SET NOT NULL;
    ALTER TABLE coin_packages ALTER COLUMN display_order SET NOT NULL;
    ALTER TABLE coin_packages ALTER COLUMN created_by_admin_id SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'gifts'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'supported_contexts'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'supported_contexts_json'
    ) THEN
      ALTER TABLE gifts RENAME COLUMN supported_contexts TO supported_contexts_json;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'sort_order'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'display_order'
    ) THEN
      ALTER TABLE gifts RENAME COLUMN sort_order TO display_order;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'starts_at'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'start_at'
    ) THEN
      ALTER TABLE gifts RENAME COLUMN starts_at TO start_at;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'ends_at'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'gifts' AND column_name = 'end_at'
    ) THEN
      ALTER TABLE gifts RENAME COLUMN ends_at TO end_at;
    END IF;

    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS gift_code text;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS category text;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS sound_effect_url text;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS economy_profile_key text;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS is_limited_time boolean DEFAULT false;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS season_tag text;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS region_scope text;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS supported_contexts_json jsonb;
    ALTER TABLE gifts ADD COLUMN IF NOT EXISTS created_by_admin_id uuid REFERENCES users(id);

    UPDATE gifts
    SET gift_code = CONCAT(
      COALESCE(NULLIF(REGEXP_REPLACE(UPPER(name), '[^A-Z0-9]+', '_', 'g'), ''), 'GIFT'),
      '_',
      LEFT(REPLACE(id::text, '-', ''), 8)
    )
    WHERE gift_code IS NULL OR gift_code = '';

    UPDATE gifts
    SET category = COALESCE(category, 'STANDARD')
    WHERE category IS NULL;

    UPDATE gifts
    SET is_limited_time = COALESCE(is_limited_time, false)
    WHERE is_limited_time IS NULL;

    UPDATE gifts
    SET display_order = COALESCE(display_order, 0)
    WHERE display_order IS NULL;

    UPDATE gifts
    SET supported_contexts_json = COALESCE(
      supported_contexts_json,
      '["LIVE_STREAM","VIDEO_CALL","VOICE_CALL","CHAT_CONVERSATION","PK_BATTLE","GROUP_AUDIO","PARTY"]'::jsonb
    )
    WHERE supported_contexts_json IS NULL;

    UPDATE gifts
    SET created_by_admin_id = bootstrap_user_id
    WHERE created_by_admin_id IS NULL;

    ALTER TABLE gifts ALTER COLUMN gift_code SET NOT NULL;
    ALTER TABLE gifts ALTER COLUMN supported_contexts_json SET NOT NULL;
    ALTER TABLE gifts ALTER COLUMN is_limited_time SET NOT NULL;
    ALTER TABLE gifts ALTER COLUMN display_order SET NOT NULL;
    ALTER TABLE gifts ALTER COLUMN created_by_admin_id SET NOT NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS system_settings_composite_idx ON system_settings (
  namespace,
  key,
  environment,
  region_code,
  segment_code,
  version
);
CREATE INDEX IF NOT EXISTS system_settings_lookup_idx ON system_settings (
  namespace,
  key,
  environment,
  region_code,
  segment_code,
  status,
  effective_from
);
CREATE INDEX IF NOT EXISTS system_settings_version_idx ON system_settings (namespace, key, version);
CREATE INDEX IF NOT EXISTS system_settings_admin_updated_idx ON system_settings (updated_by_admin_id, updated_at);
CREATE INDEX IF NOT EXISTS system_settings_status_effective_idx ON system_settings (status, effective_from, effective_to);

CREATE INDEX IF NOT EXISTS coin_packages_active_order_idx ON coin_packages (is_active, display_order);
CREATE UNIQUE INDEX IF NOT EXISTS coin_packages_apple_idx ON coin_packages (apple_product_id);
CREATE UNIQUE INDEX IF NOT EXISTS coin_packages_google_idx ON coin_packages (google_product_id);

CREATE UNIQUE INDEX IF NOT EXISTS gifts_code_idx ON gifts (gift_code);
CREATE INDEX IF NOT EXISTS gifts_active_order_idx ON gifts (is_active, display_order);
CREATE INDEX IF NOT EXISTS gifts_active_time_idx ON gifts (is_active, start_at, end_at);
CREATE INDEX IF NOT EXISTS gifts_season_active_idx ON gifts (season_tag, is_active);