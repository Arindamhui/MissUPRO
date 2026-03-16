# Feature Implementation Roadmap

Canonical source: `plan.md`
Execution model: controlled batches with architecture verification before each batch.

**Last updated:** Full Parity implementation pass

## Full Parity Audit (latest)

Completed in this pass (per plan.md and MissUPRO Full Parity Plan):

| Item | Location | Status |
|------|----------|--------|
| PK Battle module | `packages/api/src/pk` | Done — service, router, module; gift-to-score, timer, winner calc; live/admin/gifts wired |
| Leaderboards module | `packages/api/src/leaderboards` | Done — list/entries/snapshots/refresh, gift-based metrics, refresh cron |
| Creator analytics snapshot job | `packages/api/src/analytics` | Done — nightly job to `host_analytics_snapshots`, `getCreatorSnapshots` tRPC |
| Observability | `packages/api/src/main.ts`, `packages/api/src/metrics` | Done — Sentry, structured logs, /metrics request counters |
| CI/CD deploy + rollback | `infra/ci/.github/workflows/`, `infra/scripts/` | Done — deploy-api.sh, deploy-web.sh, rollback.yml |

See **IMPLEMENTATION_GAP_MATRIX.md** for domain-level COMPLETE/PARTIAL/MISSING and remaining gaps.

## Implementation Status Summary

| Phase | Status | Key Deliverables |
|-------|--------|-----------------|
| Phase A — Economy | **IN PROGRESS** | Payments intent + webhook credit flow hardened, wallet screen fully server-driven, ledger idempotency added |
| Phase B — Realtime | **IN PROGRESS** | Redis-backed room state + replay added, reconnect sync wired, durable room joins integrated, DM/live chat persistence hardened, PK/game sync made authoritative, call session recovery plus incoming/billing edge handling aligned |
| Phase C — Creator | **IN PROGRESS** | Creator dashboard rewritten, model levels API wired; **creator analytics nightly job** writing to `host_analytics_snapshots`, `getCreatorSnapshots` tRPC |
| Phase D — Engagement | **IN PROGRESS** | Games service implemented, leaderboards/referrals/events screens; **PK module** (`packages/api/src/pk`) and **Leaderboards module** (`packages/api/src/leaderboards`) completed |
| Phase E — Security | **IN PROGRESS** | Moderation service implemented, fraud service exists |
| Phase F — Observability | **COMPLETE** | Sentry in API bootstrap, structured request logging, `/metrics` with request count/duration/errors; **CI/CD** deploy scripts + rollback workflow |

## Phase A — Economy System Completion (Batch 1)
Objective: satisfy immutable-ledger and idempotent-finance requirements before scaling realtime.

Scope:
- Wallet correctness hardening
- Payment webhook replay protection + verification flow completion
- Gift send atomicity and idempotent replay handling
- Reconciliation hooks and admin finance observability

Completed in current pass:
- Added shared API idempotency service backed by `idempotency_keys`
- Wrapped wallet debit/credit and gift send flows in deterministic idempotent execution
- Moved live gift event creation into the same gift transaction boundary
- Added payment intent API contract and webhook-driven coin crediting
- Removed hardcoded mobile coin package fallback in favor of backend-driven catalog state
- Switched VIP tier loading from static defaults to database-backed config on API and mobile

Planned backend work:
- `packages/api/src/wallet/*`
- `packages/api/src/payments/*`
- `packages/api/src/gifts/*`
- shared idempotency helper/service in API common layer

Planned DB work:
- Add/align unique constraints for webhook replay safety
- Add migration for any schema-index gaps found in idempotency/payment flow

Admin/UI work:
- Validate admin finance pages against updated APIs
- Ensure coin package and gift admin actions are fully functional

Exit criteria:
- Financial operations are replay-safe and deterministic
- Coin/debit/credit/gift flows never mutate balance without ledger record
- Build passes with updated tests

## Phase B — Realtime Infrastructure (Batch 2)
Objective: make realtime transport horizontally scalable and reliable.

Scope:
- Redis Pub/Sub fanout for stream/chat/call/gift/party/group-audio/presence events
- Ack/retry strategy for critical gift, call, and DM signals
- Room state consistency and reconnect sync

Completed in current pass:
- Added Redis-backed realtime room state and recent-event replay service in the API gateway
- Added pending critical delivery replay for user-targeted call and gift events
- Added socket sync handlers for stream, party, group audio, and game rooms
- Moved stream, party, and group-audio socket joins/leaves through domain services so reconnects preserve durable membership state
- Wired mobile stream, party, and group-audio screens to request sync state on join and replay recent room events
- Routed socket DM sends through persisted conversation/message services with moderation, unread/read state updates, and critical delivery replay
- Persisted live stream chat messages to `chat_messages`, added moderation checks, and returned DB-backed stream chat history during sync
- Fixed mobile DM routing so profile-originated chats resolve or create a conversation before loading history or sending messages
- Replaced raw PK/game socket fanout with service-backed joins, persisted game moves, and DB-backed sync snapshots for reconnect recovery
- Added moderation-enforced ack flows for party and group-audio chat so those rooms now reject blocked/spam content before fanout
- Replaced client-generated call ids with real backend call sessions before socket signaling so caller and callee share persisted session identity
- Added socket call sync recovery backed by persisted `call_sessions` plus refreshed RTC tokens, and wired mobile call state to rehydrate on reconnect
- Mounted a global mobile incoming-call listener so app-wide call requests navigate into the persisted session screen with explicit accept/reject actions
- Added service-backed call rejection plus realtime billing-tick classification to emit low-balance, insufficient-balance, and session-ended edge signals from authoritative backend state

Planned backend/service work:
- `packages/api/src/realtime/*`
- `services/chat/*`
- `services/presence/*`

Exit criteria:
- Multi-node event fanout verified
- Presence and room state remain consistent during reconnects

## Phase C — Creator Systems (Batch 4)
Objective: complete model growth and earnings workflows.

Scope:
- Model levels engine (batch + event driven)
- Dynamic call pricing governance
- Payout workflows and creator analytics completion

Completed in Full Parity pass:
- **Creator analytics snapshot job**: Nightly cron in `AnalyticsService` aggregates to `host_analytics_snapshots` (diamonds, streams, watch minutes, unique viewers, gifts, top gift, follower delta); `getCreatorSnapshots` tRPC for creator dashboard.

Planned work:
- `packages/api/src/levels/*`
- `packages/api/src/calls/pricing/*` (or integrated equivalent)
- `packages/api/src/payouts/*`
- `packages/api/src/analytics/*` (snapshot job done; admin views as needed)

Exit criteria:
- Level progression and pricing formulas are admin-governed and auditable
- Payout records are immutable and reconciliation-safe
- Creator analytics snapshots populated and consumable (done)

## Phase D — Engagement Features (Batch 5)
Objective: complete retention and social-economy loops.

Scope:
- Leaderboards/events/campaigns refinement
- PK battles and game/session reliability
- Party/group-audio advanced controls and moderation paths

Completed in Full Parity pass:
- **PK module** (`packages/api/src/pk`): PkService, PkRouter, PkModule; session lifecycle, invite/accept, gift-to-score from gift flow, timer cron, winner/DRAW; live and admin delegate to PkService; tRPC `pk.*` and admin create/cancel.
- **Leaderboards module** (`packages/api/src/leaderboards`): LeaderboardsService, LeaderboardsRouter, LeaderboardsModule; list/get/entries/snapshots/refresh (gift-based metrics, DAILY/WEEKLY/MONTHLY); cron to refresh due boards; tRPC `leaderboards.*`.

Planned work:
- `packages/api/src/events/*`
- `packages/api/src/campaigns/*`
- `packages/api/src/group-audio/*`
- `packages/api/src/party/*`
- `services/games/*`

Exit criteria:
- Engagement systems fully configurable by admin and stable in realtime usage (PK and Leaderboards backend complete)

## Phase E — Security Hardening (Batch 6)
Objective: enforce platform-wide trust and compliance controls.

Scope:
- API rate limiting/security headers
- Moderation and fraud pipeline depth (including severe-content escalation workflows)
- Account lifecycle/compliance flow completion

Planned work:
- `packages/api/src/security/*`
- `packages/api/src/moderation/*`
- `packages/api/src/fraud/*`
- `packages/api/src/compliance/*`
- `services/moderation/*`
- `services/fraud/*`

Exit criteria:
- Security baseline checks pass
- Moderation/fraud cases can be processed end-to-end with admin traceability

## Phase F — Observability and Scaling (Batch 7)
Objective: production reliability and operational readiness.

Scope:
- Structured logs, metrics, alerts, Sentry integration
- CI/CD deployment/rollback operationalization
- Capacity and scaling runbooks

Completed in Full Parity pass:
- **Sentry**: Init and request/error handlers in `packages/api/src/main.ts` when `SENTRY_DSN` is set.
- **Structured logging**: JSON request logs (requestId, method, url, statusCode, durationMs) in API bootstrap.
- **Prometheus**: `/metrics` extended with `api_http_requests_total`, `api_http_requests_errors_total`, `api_http_request_duration_seconds_*` via `packages/api/src/metrics/request-metrics.ts`.
- **CI/CD**: Deploy job runs `infra/scripts/deploy-api.sh` and `infra/scripts/deploy-web.sh` with `IMAGE_URI`; `infra/ci/.github/workflows/rollback.yml` for manual rollback to a given revision (commit SHA or tag).

Planned work:
- `infra/deployment/monitoring/*` (Grafana/dashboards, alert tuning)
- Capacity and scaling runbooks

Exit criteria:
- Actionable dashboards and alerting are live (metrics and Sentry in place; dashboards/alerting config as needed)
- Repeatable deploy/rollback workflow exists and is documented (done)

## Batch Dependencies
1. Batch 1 (Economy) must complete before Batch 2/3 feature expansion.
2. Batch 2 must complete before party/group-audio/large-scale engagement hardening.
3. Security and observability batches run after core economy/realtime correctness is stable.

## Verification Checklist Applied Per Batch
- Architecture compatibility (Nest module boundaries + Drizzle schema patterns)
- Migration presence for every schema change
- Zod validation on new/changed procedures
- No direct mutable-balance writes outside approved wallet ledger path
- Monorepo build green (`npm run build`)
