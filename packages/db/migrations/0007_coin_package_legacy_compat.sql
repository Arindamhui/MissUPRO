DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'coin_packages' AND column_name = 'price_usd_cents'
  ) THEN
    UPDATE coin_packages
    SET price_usd_cents = ROUND(price_usd * 100)
    WHERE price_usd_cents IS NULL AND price_usd IS NOT NULL;

    ALTER TABLE coin_packages ALTER COLUMN price_usd_cents DROP NOT NULL;
  END IF;
END $$;