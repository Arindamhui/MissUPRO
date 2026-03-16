# Implementation Gap Matrix

Source of truth used:
- `plan.md` (canonical requirements)
- `Reports-13.03.26.md` (historical audit context; validated against current code)
- Live repository scan across `apps/`, `packages/`, `services/`, `infra/`

**Last updated:** Full Parity implementation pass — PK module, Leaderboards module, Creator analytics job, Observability, and CI/CD deploy/rollback completed.

Status legend:
- `COMPLETE`: Implemented with backend/domain wiring and usable surface
- `PARTIAL`: Core pieces exist but required behaviors/interfaces are incomplete
- `STUB`: Scaffold/minimal implementation with placeholder behavior
- `MISSING`: No meaningful implementation found

## Recent Implementation Progress

### Services (previously STUB, now COMPLETE)
- **Payments Service** (`services/payments`): Stripe/Razorpay webhook verification, idempotency via Redis, wallet credit queue, refund queue, reconciliation
- **Games Service** (`services/games`): Socket.IO game engine, chess/ludo/carrom/sudoku session management, move validation
- **Analytics Service** (`services/analytics`): Buffered event ingestion, Redis pipeline batch writes, DAU tracking, event count aggregation
- **Moderation Service** (`services/moderation`): Text scanning (profanity/spam/severe), risk scoring, auto-block/flag, strike system, report/review queues

### Services (enhanced)
- **Streaming Service** (`services/streaming`): Gift broadcasts, PK battle events, group audio events, party activity events, presence updates, call signaling, stream chat
- **Chat Service** (`services/chat`): Typing indicators, read receipts, message history (Redis-backed, 500-msg cap), enhanced metrics

### Mobile App (screens fixed/created)
- **Signup screen** (`(auth)/signup.tsx`): NEW — form validation, email verification flow, referral code input
- **Notifications** (`notifications.tsx`): Rewritten — user notifications with mark-read, type icons
- **Events** (`events.tsx`): Rewritten — user events with join, active/upcoming/past filtering
- **Games** (`games.tsx`): Rewritten — game launcher with call-required gate
- **Gifts** (`gifts.tsx`): Rewritten — tier-grouped catalog, send-gift flow with coin balance check
- **Creator Dashboard** (`creator-dashboard.tsx`): Rewritten — full stats, level card, earnings, call performance
- **Referrals** (`referrals.tsx`): NEW — invite code, sharing, stats, rewards
- **Leaderboards** (`leaderboards.tsx`): NEW — board tabs, ranked entries with medals
- **Wallet** (`wallet.tsx`): Fixed — server-driven coin packages via `trpc.wallet.getCoinPackages`, transaction history
- **VIP** (`vip.tsx`): Fixed — wired to `trpc.vip.subscribe/cancelSubscription/getMySubscription/getAvailableTiers`

### Web Admin (action handlers wired, mock data replaced)
- **Dashboard**: Charts now use `analytics.getRevenueAnalytics` and `analytics.getEngagementMetrics`; model app approve/reject and withdrawal approve/reject buttons wired
- **Finance**: Withdrawal approve/reject/hold buttons wired to `admin.processWithdrawRequest`; charts use API data
- **Live**: End Stream button wired to `live.endStream`; PK Battles tab uses `admin.listPkSessions`; KPIs computed from data
- **Notifications**: Create Campaign form wired to `admin.createNotificationCampaign`
- **Analytics**: All charts use `analytics.getEngagementMetrics` and `analytics.getRevenueAnalytics` with date range selector
- **Group Audio / Party**: KPIs computed from actual data instead of hardcoded values
- **Public Pages**: Landing page with hero, features, creator section, CTA, and footer

### Full Parity implementation (latest pass)
- **PK module** (`packages/api/src/pk`): Dedicated PkService, PkRouter, PkModule; session CRUD, invite/accept, gift-based scoring via `addGiftScore` from gift flow, timer cron to end expired battles, winner/DRAW calculation; live router and admin delegate to PkService; tRPC `pk.*` and admin `createPKBattle`/`cancelPKBattle`.
- **Leaderboards module** (`packages/api/src/leaderboards`): LeaderboardsService, LeaderboardsRouter, LeaderboardsModule; list boards, get entries, get snapshots, refresh (gift_coins_received/sent + DAILY/WEEKLY/MONTHLY); cron to refresh due boards; tRPC `leaderboards.*`.
- **Creator analytics snapshot job**: Nightly cron in AnalyticsService writing to `host_analytics_snapshots` (diamonds, streams, watch minutes, unique viewers, gifts, top gift, follower delta); `getCreatorSnapshots` tRPC for creator dashboard.
- **Observability**: Sentry init and request/error handlers in `main.ts` (when `SENTRY_DSN` set); structured JSON request logging with requestId/method/url/statusCode/durationMs; `/metrics` extended with `api_http_requests_total`, `api_http_requests_errors_total`, `api_http_request_duration_seconds_*`.
- **CI/CD**: Deploy job runs `infra/scripts/deploy-api.sh` and `deploy-web.sh` with `IMAGE_URI`; `infra/ci/.github/workflows/rollback.yml` for manual rollback to a given revision (commit SHA or tag).

| Domain | Current Status | Missing Features | Required Backend Modules | Required Database Tables | Required Admin Interfaces | Required Mobile Screens | Priority |
|---|---|---|---|---|---|---|---|
| Authentication | PARTIAL | Clerk-aligned session policy hardening, stronger admin MFA enforcement, refresh/session risk workflows | `packages/api/src/auth/*`, `packages/api/src/security/*` | `auth_sessions`, `email_verifications`, `security_events` | admin auth session controls | auth recovery/session screens | HIGH |
| User Profiles | PARTIAL | Full lifecycle controls, profile completeness scoring, stronger media/profile policy checks | `packages/api/src/users/*`, `packages/api/src/media/*` | `users`, `profiles`, `followers`, `user_blocks` | user moderation/detail controls | profile editing and privacy refinement | MEDIUM |
| Wallet & Ledger | PARTIAL | Reconciliation automation and broader adoption of the shared idempotency registry outside economy-critical flows | `packages/api/src/wallet/*`, `packages/api/src/jobs/reconciliation/*` | `wallets`, `coin_transactions`, `diamond_transactions`, `idempotency_keys` | wallet ops + reconciliation dashboard | wallet history and reconciliation state | HIGH |
| Payments | PARTIAL | Provider SDK completion, IAP receipt validation expansion, disputes/refunds workflows | `packages/api/src/payments/*`, `packages/api/src/payments/webhooks/*` | `payments`, `webhook_events`, `idempotency_keys` | payment disputes + reconciliation controls | purchase result/failure flows | HIGH |
| Coin Packages | PARTIAL | Full CRUD + schedule/region validation workflow and audit | `packages/api/src/payments/*`, `packages/api/src/admin/*` | `coin_packages` | coin package CRUD + activation windows | wallet purchase catalog sync | HIGH |
| Gift System | PARTIAL | Admin-configurable economy profile resolution and realtime delivery ack/retry hardening | `packages/api/src/gifts/*`, `packages/api/src/wallet/*`, `packages/api/src/realtime/*` | `gifts`, `gift_transactions`, `live_gift_events`, `gift_animations` | gift catalog + economy profile controls | gift overlay/panel + context gift feeds | HIGH |
| Live Streaming | PARTIAL | RTC token lifecycle and richer host/viewer operational controls remain; reconnect recovery, viewer joins, and live chat durability/moderation are now hardened | `packages/api/src/streaming/*`, `services/streaming/*`, `packages/api/src/realtime/*` | `live_rooms`, `live_streams`, `live_viewers`, `chat_messages` | live moderation deep controls | live host/viewer production UX polish | HIGH |
| Voice/Video Calls | PARTIAL | Persisted session identity, reconnect sync, incoming accept/reject flow, and backend-emitted low-balance/session-ended signals are now in place; richer Agora/session resilience and stronger server-driven billing enforcement still remain | `packages/api/src/calls/*`, `packages/api/src/realtime/*`, `services/streaming/*` | `call_sessions`, `call_billing_ticks`, `model_call_stats` | call rates + payout settings + oversight | call lifecycle and quality indicators | HIGH |
| Chat | PARTIAL | Redis-backed fanout/replay plus DB-backed live, party, and group-audio chat moderation are in place; admin moderation controls and deeper policy tooling still remain | `packages/api/src/chat/*`, `services/chat/*`, `packages/api/src/realtime/*` | `chat_sessions`, `chat_messages`, `chat_billing_ticks` | live chat moderation controls | live chat UX hardening | HIGH |
| Direct Messaging | PARTIAL | Socket delivery now persists through `dm_messages` with moderation and read receipts; attachment governance, admin moderation tooling, and inbox UX depth remain | `packages/api/src/chat/*`, `packages/api/src/realtime/*` | `dm_conversations`, `dm_messages` | DM moderation console | inbox/conversation resilience UX | MEDIUM |
| Notifications | PARTIAL | Real delivery workers (push/email), retry/DLQ and preference enforcement at send-time | `packages/api/src/notifications/*`, `services/notifications/*` | `notifications`, `notification_preferences`, `notification_campaigns`, `push_tokens` | campaign builder + template workflows | notification center completeness | HIGH |
| Model Verification | PARTIAL | Full review checklist workflow, resubmission lifecycle and SLA metrics | `packages/api/src/models/*`, `packages/api/src/admin/*` | `model_applications`, `models` | verification queue depth features | model apply + status UX polishing | HIGH |
| Model Levels | PARTIAL | Batch/event-driven level compute engine and override auditability | `packages/api/src/levels/*` | `model_level_rules`, `model_stats`, `model_level_history` | level overrides + distribution analytics | model level visualization improvements | HIGH |
| Leaderboards | COMPLETE | Dedicated module with list/get/entries/snapshots/refresh and cron | `packages/api/src/leaderboards/*`, `packages/api/src/events/*` | `leaderboards`, `leaderboard_entries`, `leaderboard_snapshots` | leaderboard config + freeze controls | leaderboard/mobile ranking polish | MEDIUM |
| VIP System | PARTIAL | Provider billing parity and subscription lifecycle robustness; richer admin lifecycle controls | `packages/api/src/vip/*`, `packages/api/src/payments/*` | `vip_subscriptions`, `vip_tiers` | VIP tier management hardening | VIP purchase and perks UX polish | MEDIUM |
| Referral System | PARTIAL | Fraud guardrails and reward settlement reporting depth | `packages/api/src/referrals/*`, `packages/api/src/fraud/*` | `referrals`, `referral_rewards` | referral tier + abuse controls | referral campaign UX polish | MEDIUM |
| Events | PARTIAL | End-to-end event scoring, freeze windows, reward distribution controls | `packages/api/src/events/*` | `events`, `event_participants` | event authoring + enforcement tools | event participation UX polish | MEDIUM |
| Campaigns | PARTIAL | Delivery execution engine depth and reward analytics completeness | `packages/api/src/campaigns/*`, `services/notifications/*` | `campaigns`, `campaign_participants`, `campaign_rewards`, `notification_campaigns` | campaign workflow completion | campaign surfaces integration | MEDIUM |
| In-call Games | PARTIAL | Authoritative realtime join/move sync and reconnect snapshots are now in place; anti-collusion controls and client UX still need depth | `packages/api/src/games/*`, `services/games/*`, `packages/api/src/realtime/*` | `game_sessions`, `game_moves`, `game_results` | game dispute moderation | in-call game overlay robustness | MEDIUM |
| PK Battles | COMPLETE | Dedicated pk module; gift-to-score, timer, winner calc, admin create/cancel | `packages/api/src/pk/*`, `packages/api/src/realtime/*`, live/gifts integration | `pk_sessions`, `pk_scores` | PK operational controls (list/create/cancel) | PK room UX | MEDIUM |
| Party Rooms | PARTIAL | Cross-node durable seat sync improved and chat moderation is now enforced; advanced activity-state consistency and deeper moderation flows still incomplete | `packages/api/src/party/*`, `services/streaming/party/*`, `packages/api/src/realtime/*` | `party_rooms`, `party_seats`, `party_members`, `party_activities`, `party_activity_participants`, `party_themes` | party config and moderation expansion | party room UX hardening | HIGH |
| Group Audio Rooms | PARTIAL | Multi-speaker realtime consistency improved and chat moderation is now enforced; billing safety checks and admin intervention controls still need depth | `packages/api/src/group-audio/*`, `services/streaming/group-audio/*`, `packages/api/src/realtime/*` | `group_audio_rooms`, `group_audio_participants`, `group_audio_billing_ticks`, `group_audio_hand_raises` | room policy controls + interventions | group audio UX hardening | HIGH |
| Discovery Engine | PARTIAL | Ranking signal maturity, recommendation governance and explainability | `packages/api/src/discovery/*`, `packages/api/src/analytics/*` | `recommendation_configs`, `recommendation_candidates`, `recommendation_impressions` | discovery weight management | explore filters and ranking affordances | MEDIUM |
| Fraud Detection | PARTIAL | Workerized scoring pipelines and broader feature ingestion | `packages/api/src/fraud/*`, `services/fraud/*` | `fraud_flags`, `fraud_signals`, `security_events` | fraud queue and resolutions | risk feedback UX | HIGH |
| Moderation | PARTIAL | CSAM escalation protocol implementation and evidence workflows hardening | `packages/api/src/moderation/*`, `services/moderation/*` | `media_scan_results`, `security_incidents`, moderation-related entities | moderation policy engine controls | report/appeal UX completeness | HIGH |
| Creator Analytics | COMPLETE | Nightly job to host_analytics_snapshots; getCreatorSnapshots API | `packages/api/src/analytics/*`, `services/analytics/*` | `host_analytics_snapshots`, `analytics_events` | creator analytics admin views | creator dashboard refinements | MEDIUM |
| Presence System | PARTIAL | Heartbeat and socket subscription flow improved; multi-instance reconciliation and visibility controls still need depth | `packages/api/src/presence/*`, `services/presence/*`, `packages/api/src/realtime/*` | presence via Redis + user/session metadata | presence visibility controls | online/offline indicators polish | MEDIUM |
| Feature Flags | PARTIAL | Rollout strategies (percentage/segment), audit, and cache invalidation discipline | `packages/api/src/config/*`, `packages/api/src/admin/*` | `feature_flags`, `system_settings` | feature flag rollout console | client flag consumption guards | MEDIUM |
| Admin Panel | PARTIAL | Some module pages exist but backend action coverage and deep workflows are incomplete | `apps/web/src/app/admin/*`, `packages/api/src/admin/*` | `admin_logs`, config and domain tables | full control surfaces per plan section 16/55 | N/A (web-only) | HIGH |
| Security Systems | PARTIAL | HTTP security headers, stricter rate limiting policies, secrets posture checks | `packages/api/src/security/*`, middleware in API bootstrap | `security_events`, `security_incidents`, `service_identities` | security policy controls | client security prompts and session controls | HIGH |
| Observability | COMPLETE | Sentry, structured request logs, /metrics with request count/duration/errors | `packages/api/src/main.ts`, `packages/api/src/metrics/*`, `infra/deployment/monitoring/*` | N/A | operational dashboards/alert tuning | N/A | HIGH |
| CI/CD | COMPLETE | Deploy scripts (deploy-api.sh, deploy-web.sh) + rollback workflow | `infra/ci/.github/workflows/ci.yml`, `infra/ci/.github/workflows/rollback.yml`, `infra/scripts/*` | N/A | release governance tooling | N/A | MEDIUM |

## Priority Summary

High-priority execution blocks:
1. Economy correctness (wallet/payments/gifts idempotency and reconciliation)
2. Realtime resilience (Redis fanout consistency for stream/chat/call/party/group-audio/presence)
3. Security hardening (headers, rate-limits, incident handling)
4. Admin operational depth for economy + trust & safety

Medium-priority blocks:
1. Engagement depth (events/campaigns/referrals/VIP refinements)
2. Discovery and analytics quality uplift
3. CI/CD deployment hardening from pipeline skeleton to production automation
