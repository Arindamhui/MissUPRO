# MissUPRO System Architecture (Plan-Aligned)

## 1) System Components

- Client Apps
  - Mobile app (Expo Router): user and creator experiences
  - Web app (Next.js): public web + admin control platform
- API Layer
  - NestJS monolith with modular domains
  - tRPC gateway with auth/admin procedures
  - Zod validation schemas from shared types package
- Realtime Layer
  - Socket.io gateways for chat, call signaling, room state, notifications
  - Redis pub/sub for fan-out and cross-instance event propagation
- Data Layer
  - PostgreSQL (Neon) via Drizzle ORM
  - Redis for cache, locks, rate limits, queue coordination
- Async Processing
  - Webhook handlers, reconciliation jobs, moderation/fraud processors
- Observability & Ops
  - Prometheus + Grafana, structured logs, health checks, CI/CD

## 2) Service & Module Topology

### Backend modules (NestJS)

- auth
- users
- wallet
- payments
- gifts
- calls
- streaming
- chat
- notifications
- models
- levels
- analytics
- moderation
- fraud
- admin
- config
- plus supporting domains in plan: referrals, vip, events, campaigns, social, discovery, party, group-audio, pk, payouts, media, security

### Supporting services (workspace services/*)

- streaming service
- chat service
- payments service
- notifications service
- moderation service
- analytics service
- fraud service
- presence service

## 3) Infrastructure Architecture

- Runtime
  - API container (`packages/api`)
  - Web container (`apps/web`)
  - Mobile served via Expo dev/build pipelines
  - Redis container for cache and pub/sub
- Database
  - PostgreSQL with migrations managed by drizzle-kit
- Deployment
  - Docker Compose for local orchestration
  - CI/CD for lint, type-check, build, migration checks
- Monitoring
  - Prometheus scrape targets and Grafana dashboards
- Configuration
  - Environment variables and runtime config tables

## 4) Data Flow (Core)

- Auth flow
  1. Client calls auth endpoint
  2. API validates with Zod and creates/revokes auth sessions
  3. Tokens returned to client and used for protected/admin procedures

- Economy flow
  1. Client loads coin packages and pricing config
  2. Purchase request creates payment + webhook event
  3. Reconciliation updates wallet + immutable ledgers (`coin_transactions`, `diamond_transactions`)

- Gift flow
  1. Sender opens gift catalog from config and gifts table
  2. API debits sender coins and credits receiver diamonds atomically
  3. Realtime events publish gift animations and ranking updates

- Call/stream flow
  1. Session created with pricing and policy config
  2. Billing ticks accrue usage
  3. End-of-session settlement writes ledgers and analytics snapshots

- Admin config flow
  1. Admin writes versioned config records
  2. Config service publishes cache-invalidation events via Redis
  3. Runtime services re-read effective config without redeploy

## 5) Realtime Architecture

- Socket.io namespaces
  - chat events
  - DM events
  - call signaling
  - streaming/lobby state
  - notification push/in-app fanout
- Redis pub/sub channels
  - `chat:*`, `dm:*`, `call:*`, `stream:*`, `notify:*`, `config:*`
- Delivery guarantees
  - idempotency keys for replay safety
  - event persistence for critical domain events where required

## 6) Admin Control Platform

All business behavior is controlled by admin-managed data.

Required control areas:
- Dashboard
- User Management
- Model Verification
- Wallet & Economy Settings
- Coin Packages
- Gift Catalog
- Live Stream Moderation
- Events Management
- Leaderboards
- VIP Management
- Referral System
- Group Audio Rooms
- Party Rooms
- Campaign Management
- Analytics Dashboards
- System Settings Editor
- Feature Flags

Control-plane rules:
- No hard-coded business constants in runtime logic
- Published settings are versioned and auditable
- Rollback supported through version history

## 7) Domain Model Design (Phase 2)

### Core entities

- users 1:1 profiles
- users 1:1 wallets
- users 1:N coin_transactions
- users 1:N diamond_transactions
- users 1:N payments
- users 1:N notifications
- users N:N users via followers/user_blocks

### Economy entities

- gifts 1:N gift_transactions
- payments N:1 coin_packages
- wallets materialize user balances while ledgers stay immutable

### Creator/live entities

- users (creator) 1:N live_streams
- live_streams 1:N live_viewers
- call_sessions reference caller and callee users
- game_sessions reference participants and moves

### Engagement entities

- events 1:N event_participants
- leaderboards 1:N leaderboard_entries and leaderboard_snapshots
- vip_subscriptions N:1 users
- referrals link inviter and invitee users with reward history

### Social-room entities

- group_audio_rooms 1:N participants/hand raises/messages
- party_rooms 1:N members/seats/activities/chat

### Analytics/config entities

- analytics_events append-only event stream
- system_settings versioned key-value control plane
- feature_flags segmented runtime toggles
- configuration catalogs:
  - pricing_rules
  - gift_catalog
  - coin_packages
  - leaderboard_configs
  - event_configs
  - vip_tiers
  - referral_rules
  - group_audio_configs
  - party_room_configs

## 8) Required Indexing Strategy

- High-cardinality time-series indexes on `created_at`, `updated_at`, status windows
- Composite indexes for feed queries, active-session lookup, and leaderboard ranking
- Unique constraints for idempotency and external payment/provider identifiers
- Foreign keys on every cross-entity reference used by runtime joins

## 9) Reliability & Security Controls

- Idempotency keys for payment/gift/call settlement endpoints
- Rate limiting + abuse/fraud signals
- Structured admin audit logs for all control-plane mutations
- Health endpoints for API, DB, Redis, and realtime gateway
- Zero-downtime migration strategy using staged rollout and backward-compatible schema changes

## 10) Implementation Contract

This document is the architecture contract derived from `plan.md`.
All modules, domain entities, runtime configuration, realtime components, and admin controls listed above are mandatory and implemented as code artifacts in this repository.
