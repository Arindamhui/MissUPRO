DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'coin_transaction_type'
  ) THEN
    CREATE TYPE coin_transaction_type AS ENUM (
      'PURCHASE',
      'GIFT_SENT',
      'DAILY_REWARD',
      'STREAK_REWARD',
      'CALL_BILLING',
      'ADMIN_ADJUSTMENT',
      'REFUND',
      'PROMO_BONUS',
      'LEVEL_REWARD',
      'REFERRAL_REWARD'
    );
  END IF;

  ALTER TYPE coin_transaction_type ADD VALUE IF NOT EXISTS 'PK_BATTLE_REWARD';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE pk_sessions
  ADD COLUMN IF NOT EXISTS score_multiplier_percent integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS winner_reward_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS loser_reward_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS draw_reward_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rewards_granted_at timestamp;

ALTER TABLE pk_scores
  ADD COLUMN IF NOT EXISTS score_value integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_multiplier_percent integer NOT NULL DEFAULT 100;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pk_scores' AND column_name = 'coin_value'
  ) THEN
    EXECUTE $sql$
      UPDATE pk_scores
      SET
        score_value = CASE
          WHEN score_value IS NULL OR score_value = 0 THEN coin_value
          ELSE score_value
        END,
        score_multiplier_percent = CASE
          WHEN score_multiplier_percent IS NULL OR score_multiplier_percent = 0 THEN 100
          ELSE score_multiplier_percent
        END
    $sql$;
  ELSE
    UPDATE pk_scores
    SET score_multiplier_percent = CASE
      WHEN score_multiplier_percent IS NULL OR score_multiplier_percent = 0 THEN 100
      ELSE score_multiplier_percent
    END;
  END IF;
END $$;

UPDATE pk_sessions
SET
  score_multiplier_percent = CASE
    WHEN score_multiplier_percent IS NULL OR score_multiplier_percent = 0 THEN 100
    ELSE score_multiplier_percent
  END,
  winner_reward_coins = COALESCE(winner_reward_coins, 0),
  loser_reward_coins = COALESCE(loser_reward_coins, 0),
  draw_reward_coins = COALESCE(draw_reward_coins, 0);