# Implementation Gap Matrix

Source of truth used:
- `plan.md` (canonical requirements)
- `Reports-13.03.26.md` (historical audit context; validated against current code)
- Live repository scan across `apps/`, `packages/`, `services/`, `infra/`

Status legend:
- `COMPLETE`: Implemented with backend/domain wiring and usable surface
- `PARTIAL`: Core pieces exist but required behaviors/interfaces are incomplete
- `STUB`: Scaffold/minimal implementation with placeholder behavior
- `MISSING`: No meaningful implementation found

| Domain | Current Status | Missing Features | Required Backend Modules | Required Database Tables | Required Admin Interfaces | Required Mobile Screens | Priority |
|---|---|---|---|---|---|---|---|
| Authentication | PARTIAL | Clerk-aligned session policy hardening, stronger admin MFA enforcement, refresh/session risk workflows | `packages/api/src/auth/*`, `packages/api/src/security/*` | `auth_sessions`, `email_verifications`, `security_events` | admin auth session controls | auth recovery/session screens | HIGH |
| User Profiles | PARTIAL | Full lifecycle controls, profile completeness scoring, stronger media/profile policy checks | `packages/api/src/users/*`, `packages/api/src/media/*` | `users`, `profiles`, `followers`, `user_blocks` | user moderation/detail controls | profile editing and privacy refinement | MEDIUM |
| Wallet & Ledger | PARTIAL | End-to-end idempotency registry usage, stricter race protection, reconciliation automation | `packages/api/src/wallet/*`, `packages/api/src/jobs/reconciliation/*` | `wallets`, `coin_transactions`, `diamond_transactions`, `idempotency_keys` | wallet ops + reconciliation dashboard | wallet history and reconciliation state | HIGH |
| Payments | PARTIAL | Robust webhook replay protection, provider-specific verification flow completion, IAP expansion | `packages/api/src/payments/*`, `packages/api/src/payments/webhooks/*` | `payments`, `webhook_events`, `idempotency_keys` | payment disputes + reconciliation controls | purchase result/failure flows | HIGH |
| Coin Packages | PARTIAL | Full CRUD + schedule/region validation workflow and audit | `packages/api/src/payments/*`, `packages/api/src/admin/*` | `coin_packages` | coin package CRUD + activation windows | wallet purchase catalog sync | HIGH |
| Gift System | PARTIAL | Atomic coin debit + diamond credit + gift transaction idempotency enforcement, context validation tightening | `packages/api/src/gifts/*`, `packages/api/src/wallet/*`, `packages/api/src/realtime/*` | `gifts`, `gift_transactions`, `live_gift_events`, `gift_animations` | gift catalog + economy profile controls | gift overlay/panel + context gift feeds | HIGH |
| Live Streaming | PARTIAL | RTC token lifecycle, reconnect recovery, viewer join guarantees, distributed fanout | `packages/api/src/streaming/*`, `services/streaming/*`, `packages/api/src/realtime/*` | `live_rooms`, `live_streams`, `live_viewers` | live moderation deep controls | live host/viewer production UX polish | HIGH |
| Voice/Video Calls | PARTIAL | Full Agora token/session resilience, disconnect recovery and low-balance enforcement edge-cases | `packages/api/src/calls/*`, `packages/api/src/realtime/*`, `services/streaming/*` | `call_sessions`, `call_billing_ticks`, `model_call_stats` | call rates + payout settings + oversight | call lifecycle and quality indicators | HIGH |
| Chat | PARTIAL | Redis-backed horizontal fanout path and moderation/rate-limit enforcement for high throughput | `packages/api/src/chat/*`, `services/chat/*`, `packages/api/src/realtime/*` | `chat_sessions`, `chat_messages`, `chat_billing_ticks` | live chat moderation controls | live chat UX hardening | HIGH |
| Direct Messaging | PARTIAL | Message delivery state, moderation hooks, attachment governance | `packages/api/src/chat/*` | `dm_conversations`, `dm_messages` | DM moderation console | inbox/conversation resilience UX | MEDIUM |
| Notifications | PARTIAL | Real delivery workers (push/email), retry/DLQ and preference enforcement at send-time | `packages/api/src/notifications/*`, `services/notifications/*` | `notifications`, `notification_preferences`, `notification_campaigns`, `push_tokens` | campaign builder + template workflows | notification center completeness | HIGH |
| Model Verification | PARTIAL | Full review checklist workflow, resubmission lifecycle and SLA metrics | `packages/api/src/models/*`, `packages/api/src/admin/*` | `model_applications`, `models` | verification queue depth features | model apply + status UX polishing | HIGH |
| Model Levels | PARTIAL | Batch/event-driven level compute engine and override auditability | `packages/api/src/levels/*` | `model_level_rules`, `model_stats`, `model_level_history` | level overrides + distribution analytics | model level visualization improvements | HIGH |
| Leaderboards | PARTIAL | Dedicated leaderboard service contract and snapshot refresh orchestration | `packages/api/src/events/*`, `packages/api/src/config/*` | `leaderboards`, `leaderboard_entries`, `leaderboard_snapshots` | leaderboard config + freeze controls | leaderboard/mobile ranking polish | MEDIUM |
| VIP System | PARTIAL | Provider billing parity and subscription lifecycle robustness | `packages/api/src/vip/*`, `packages/api/src/payments/*` | `vip_subscriptions` | VIP tier management hardening | VIP purchase and perks UX polish | MEDIUM |
| Referral System | PARTIAL | Fraud guardrails and reward settlement reporting depth | `packages/api/src/referrals/*`, `packages/api/src/fraud/*` | `referrals`, `referral_rewards` | referral tier + abuse controls | referral campaign UX polish | MEDIUM |
| Events | PARTIAL | End-to-end event scoring, freeze windows, reward distribution controls | `packages/api/src/events/*` | `events`, `event_participants` | event authoring + enforcement tools | event participation UX polish | MEDIUM |
| Campaigns | PARTIAL | Delivery execution engine depth and reward analytics completeness | `packages/api/src/campaigns/*`, `services/notifications/*` | `campaigns`, `campaign_participants`, `campaign_rewards`, `notification_campaigns` | campaign workflow completion | campaign surfaces integration | MEDIUM |
| In-call Games | PARTIAL | Realtime state recovery and anti-collusion controls at scale | `packages/api/src/games/*`, `services/games/*`, `packages/api/src/realtime/*` | `game_sessions`, `game_moves`, `game_results` | game dispute moderation | in-call game overlay robustness | MEDIUM |
| PK Battles | PARTIAL | Session arbitration, payout/score closure, event fanout hardening | `packages/api/src/pk/*`, `packages/api/src/realtime/*` | `pk_sessions`, `pk_scores` | PK operational controls | PK room UX | MEDIUM |
| Party Rooms | PARTIAL | Durable seat sync and activity-state consistency across nodes | `packages/api/src/party/*`, `services/streaming/party/*`, `packages/api/src/realtime/*` | `party_rooms`, `party_seats`, `party_members`, `party_activities`, `party_activity_participants`, `party_themes` | party config and moderation expansion | party room UX hardening | HIGH |
| Group Audio Rooms | PARTIAL | Multi-speaker realtime consistency, billing safety checks, moderation controls depth | `packages/api/src/group-audio/*`, `services/streaming/group-audio/*`, `packages/api/src/realtime/*` | `group_audio_rooms`, `group_audio_participants`, `group_audio_billing_ticks`, `group_audio_hand_raises` | room policy controls + interventions | group audio UX hardening | HIGH |
| Discovery Engine | PARTIAL | Ranking signal maturity, recommendation governance and explainability | `packages/api/src/discovery/*`, `packages/api/src/analytics/*` | `recommendation_configs`, `recommendation_candidates`, `recommendation_impressions` | discovery weight management | explore filters and ranking affordances | MEDIUM |
| Fraud Detection | PARTIAL | Workerized scoring pipelines and broader feature ingestion | `packages/api/src/fraud/*`, `services/fraud/*` | `fraud_flags`, `fraud_signals`, `security_events` | fraud queue and resolutions | risk feedback UX | HIGH |
| Moderation | PARTIAL | CSAM escalation protocol implementation and evidence workflows hardening | `packages/api/src/moderation/*`, `services/moderation/*` | `media_scan_results`, `security_incidents`, moderation-related entities | moderation policy engine controls | report/appeal UX completeness | HIGH |
| Creator Analytics | PARTIAL | Snapshot job depth and creator-facing metric completeness | `packages/api/src/analytics/*`, `services/analytics/*` | `host_analytics_snapshots`, `analytics_events` | creator analytics admin views | creator dashboard refinements | MEDIUM |
| Presence System | PARTIAL | Dedicated service fanout and multi-instance presence reconciliation | `packages/api/src/presence/*`, `services/presence/*`, `packages/api/src/realtime/*` | presence via Redis + user/session metadata | presence visibility controls | online/offline indicators polish | MEDIUM |
| Feature Flags | PARTIAL | Rollout strategies (percentage/segment), audit, and cache invalidation discipline | `packages/api/src/config/*`, `packages/api/src/admin/*` | `feature_flags`, `system_settings` | feature flag rollout console | client flag consumption guards | MEDIUM |
| Admin Panel | PARTIAL | Some module pages exist but backend action coverage and deep workflows are incomplete | `apps/web/src/app/admin/*`, `packages/api/src/admin/*` | `admin_logs`, config and domain tables | full control surfaces per plan section 16/55 | N/A (web-only) | HIGH |
| Security Systems | PARTIAL | HTTP security headers, stricter rate limiting policies, secrets posture checks | `packages/api/src/security/*`, middleware in API bootstrap | `security_events`, `security_incidents`, `service_identities` | security policy controls | client security prompts and session controls | HIGH |
| Observability | PARTIAL | Sentry integration, structured logs, richer metrics/alerts wiring | `infra/deployment/monitoring/*`, service/API instrumentation | metrics tables/events as needed | operational dashboards/alert tuning | N/A | HIGH |
| CI/CD | PARTIAL | CI exists, but deployment path/runbook automation still placeholder-level | `infra/ci/.github/workflows/ci.yml`, `infra/scripts/*` | N/A | release governance tooling | N/A | MEDIUM |

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
