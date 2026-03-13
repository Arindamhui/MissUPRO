# Feature Implementation Roadmap

Canonical source: `plan.md`
Execution model: controlled batches with architecture verification before each batch.

## Phase A — Economy System Completion (Batch 1)
Objective: satisfy immutable-ledger and idempotent-finance requirements before scaling realtime.

Scope:
- Wallet correctness hardening
- Payment webhook replay protection + verification flow completion
- Gift send atomicity and idempotent replay handling
- Reconciliation hooks and admin finance observability

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
- Ack/retry strategy for critical gift and call signals
- Room state consistency and reconnect sync

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

Planned work:
- `packages/api/src/levels/*`
- `packages/api/src/calls/pricing/*` (or integrated equivalent)
- `packages/api/src/payouts/*`
- `packages/api/src/analytics/*`

Exit criteria:
- Level progression and pricing formulas are admin-governed and auditable
- Payout records are immutable and reconciliation-safe

## Phase D — Engagement Features (Batch 5)
Objective: complete retention and social-economy loops.

Scope:
- Leaderboards/events/campaigns refinement
- PK battles and game/session reliability
- Party/group-audio advanced controls and moderation paths

Planned work:
- `packages/api/src/events/*`
- `packages/api/src/campaigns/*`
- `packages/api/src/pk/*`
- `packages/api/src/group-audio/*`
- `packages/api/src/party/*`
- `services/games/*`

Exit criteria:
- Engagement systems fully configurable by admin and stable in realtime usage

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

Planned work:
- `infra/deployment/monitoring/*`
- `infra/ci/.github/workflows/*`
- `infra/scripts/*`
- service/API instrumentation points

Exit criteria:
- Actionable dashboards and alerting are live
- Repeatable deploy/rollback workflow exists and is documented

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
