CREATE UNIQUE INDEX IF NOT EXISTS webhook_provider_event_unique_idx
ON webhook_events (provider, provider_event_id);
