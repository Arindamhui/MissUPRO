# Neon Schema Design

This schema keeps the existing Drizzle domain model as the canonical source of truth and fills the missing platform-control tables needed for scale.

## Canonical Coverage

The following requested tables already exist directly in the schema:

- `users`
- `profiles`
- `wallets`
- `coin_packages`
- `gifts`
- `gift_transactions`
- `live_streams`
- `call_sessions`
- `levels`
- `user_levels`
- `agencies`
- `referrals`
- `withdraw_requests`
- `notifications`
- `followers`
- `feature_flags`
- `admin_logs`

The following requested names map to existing canonical tables:

- `transactions` → `coin_transactions` + `diamond_transactions`
- `diamonds` → wallet diamond balance + `diamond_transactions`
- `stream_viewers` → `live_viewers`
- `live_comments` → `chat_messages`
- `messages` → `dm_messages` for peer chat, `messages` for system/admin inbox
- `conversations` → `dm_conversations`
- `pk_battles` → `pk_sessions`
- `agency_members` → `agency_hosts`
- `ui_layouts` → `ui_layout_configs`

The following requested tables were added as first-class schema objects because they were genuine gaps:

- `calls`
- `call_history`
- `reports`
- `bans`
- `ui_components`
- `component_positions`
- `economy_settings`
- `commission_rules`

## Design Notes

- `calls` captures call intent and lifecycle before a billable session exists.
- `call_sessions` remains the metered runtime record for live billing.
- `call_history` is the immutable query-optimized summary for analytics, support, and payout audits.
- `reports` and `bans` separate user-generated trust signals from moderator enforcement actions.
- `ui_layout_configs`, `ui_components`, and `component_positions` form a server-driven UI model that supports versioned layouts and component reuse.
- `economy_settings` centralizes environment, region, and profile-scoped monetization knobs without overloading generic system settings.
- `commission_rules` defines agency or global revenue-share policies independently from settled commission records.