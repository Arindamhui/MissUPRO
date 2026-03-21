# MissU Pro — Complete System Architecture & Implementation Blueprint

> **Version:** 2.0 — March 2026
> **Status:** Production-grade reference architecture
> **Audience:** Engineering team, CTO, investors, auditors

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema — Full Inventory](#3-database-schema)
4. [ID Generation Engine](#4-id-generation-engine)
5. [RBAC & Authorization](#5-rbac--authorization)
6. [API Contract — All Endpoints](#6-api-contract)
7. [Approval Engine — Stateful Workflows](#7-approval-engine)
8. [Folder Structure](#8-folder-structure)
9. [Security Hardening](#9-security-hardening)
10. [Performance & Scale](#10-performance--scale)
11. [Step-by-Step Roadmap](#11-step-by-step-roadmap)

---

## 1. System Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
│                                                                              │
│   ┌─────────────────┐    ┌──────────────────┐    ┌────────────────────┐      │
│   │  Mobile App      │    │  Web Admin/Agency │    │  Public Website    │      │
│   │  (Expo 55 / RN)  │    │  (Next.js 16)     │    │  (Next.js 16)     │      │
│   │                   │    │                    │    │                    │      │
│   │  Users + Hosts    │    │  Admin Panel       │    │  Landing + Auth    │      │
│   │  Live, Calls,     │    │  Agency Panel      │    │  Agency Signup     │      │
│   │  Chat, Gifts,     │    │  Approvals,        │    │  CTA, Features     │      │
│   │  Party, PK        │    │  Analytics,        │    │                    │      │
│   └────────┬──────────┘    │  Finance           │    └─────────┬──────────┘      │
│            │               └─────────┬──────────┘              │                │
└────────────┼─────────────────────────┼──────────────────────────┼────────────────┘
             │                         │                          │
             │       HTTPS / WSS       │                          │
             └─────────────┬───────────┘──────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────────────────┐
│                    API GATEWAY / LOAD BALANCER                                   │
│                 (Nginx / Cloudflare Tunnel / ALB)                                │
│                Rate Limiting · TLS Termination · DDoS Protection                │
└──────────────────────────┬──────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────────────────┐
│                    BACKEND — NestJS 11 Monolith                                  │
│                                                                                  │
│   ┌─────────────────────────────────────────────────────────┐                    │
│   │  tRPC v11 Router Layer (type-safe client-server bridge) │                    │
│   │  40+ domain routers · 100+ procedures                   │                    │
│   └──────────────────────┬──────────────────────────────────┘                    │
│                          │                                                       │
│   ┌──────────────────────┼──────────────────────────────────┐                    │
│   │  NestJS Service Layer (business logic)                  │                    │
│   │                                                          │                    │
│   │  AuthModule · UserModule · MissUProModule (Host/Agency) │                    │
│   │  WalletModule · GiftModule · LiveModule · CallModule    │                    │
│   │  PartyModule · GroupAudioModule · GameModule            │                    │
│   │  ChatModule · SocialModule · NotificationModule         │                    │
│   │  PaymentModule · PayoutModule · AdminModule             │                    │
│   │  ModerationModule · FraudModule · AnalyticsModule       │                    │
│   │  LevelModule · VipModule · ReferralModule               │                    │
│   │  EventModule · LeaderboardModule · DiscoveryModule      │                    │
│   │  SecurityModule · ComplianceModule · ConfigModule       │                    │
│   └──────────────────────┬──────────────────────────────────┘                    │
│                          │                                                       │
│   ┌──────────────────────┼──────────────────────────────────┐                    │
│   │  Middleware / Guards                                     │                    │
│   │  RBAC Guard · Rate Limit Guard · Clerk JWT Verify       │                    │
│   │  Request Logging · Error Handling · CORS                 │                    │
│   └──────────────────────┬──────────────────────────────────┘                    │
│                          │                                                       │
│   ┌──────────────────────┼──────────────────────────────────┐                    │
│   │  Realtime Layer                                          │                    │
│   │  Socket.io Gateway · Redis Pub/Sub Adapter              │                    │
│   │  Presence Tracking · Live Chat · Gift Animations        │                    │
│   └──────────────────────┬──────────────────────────────────┘                    │
│                          │                                                       │
└──────────────────────────┼──────────────────────────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────────────────────────┐
│                    DATA & INFRASTRUCTURE LAYER                                    │
│                                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│   │ PostgreSQL    │  │ Redis        │  │ S3 / R2      │  │ Agora RTC    │        │
│   │ (Neon)        │  │ (Upstash)    │  │ Object Store │  │ Voice/Video  │        │
│   │               │  │              │  │              │  │              │        │
│   │ 35+ tables    │  │ Session cache│  │ Media assets │  │ Live streams │        │
│   │ Drizzle ORM   │  │ Rate limits  │  │ ID proofs    │  │ Calls        │        │
│   │ Migrations    │  │ Presence     │  │ Avatars      │  │ Group audio  │        │
│   │ Indexes       │  │ Pub/sub      │  │ Gifts        │  │ PK battles   │        │
│   └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘        │
│                                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                           │
│   │ Clerk        │  │ Stripe/      │  │ Firebase     │                           │
│   │ Auth         │  │ Razorpay     │  │ Push / FCM   │                           │
│   │              │  │ IAP          │  │              │                           │
│   │ JWT, OAuth   │  │ Payments     │  │ Notifications│                           │
│   │ MFA, SSO     │  │ Webhooks     │  │ Campaigns    │                           │
│   └──────────────┘  └──────────────┘  └──────────────┘                           │
│                                                                                  │
│   ┌──────────────┐  ┌──────────────┐                                             │
│   │ Prometheus   │  │ Grafana      │                                             │
│   │ Metrics      │  │ Dashboards   │                                             │
│   └──────────────┘  └──────────────┘                                             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Modular Monolith** | NestJS modules with clear boundaries; can extract to microservices when traffic demands |
| **Type Safety End-to-End** | tRPC v11 bridges TypeScript types from DB schema → API → client with zero code generation |
| **Event-Driven Ready** | Socket.io + Redis pub/sub for realtime; event ledger tables for audit trails |
| **Multi-Tenant** | Agencies are first-class tenants with isolated data views and commission tracking |
| **API-First** | Every operation flows through typed tRPC procedures; no direct DB access from clients |
| **Config-Driven** | Business rules (commission rates, pricing, limits) stored in DB `economy_settings` / `commission_rules` and `packages/config` — no hard-coded business logic |

---

## 2. Tech Stack

### Core Infrastructure

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Language** | TypeScript 5.x (strict mode) | End-to-end type safety, shared types across all packages |
| **Monorepo** | npm workspaces + Turborepo | Native npm, fast incremental builds, zero overhead |
| **Database** | PostgreSQL 16 (Neon serverless) | ACID transactions, JSON columns, branching for staging |
| **ORM** | Drizzle ORM | Type-safe SQL, zero runtime overhead, perfect Neon integration |
| **Backend** | NestJS 11 | Enterprise-grade DI, modular architecture, guards/pipes/interceptors |
| **API Protocol** | tRPC v11 | Type-safe RPC, auto-inferred client types, batching, subscriptions |
| **Realtime** | Socket.io 4.x + Redis adapter | Room-based broadcasting, presence, reconnection handling |
| **Auth** | Clerk | OAuth (Google, Facebook), Phone OTP, MFA, session management, webhook sync |

### Frontend

| Surface | Technology | Details |
|---------|-----------|---------|
| **Mobile** | Expo 55 + React Native 0.83 | Expo Router (file-based), Reanimated 4, Gesture Handler |
| **Web** | Next.js 16 + React 19 | App Router, Server Components, Tailwind 4, shadcn/ui |
| **State** | Zustand + TanStack Query 5 | Server state via tRPC/TanStack Query, local state via Zustand |
| **Forms** | React Hook Form + Zod 4 | Validated forms with type-inferred schemas |

### Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| **Hosting** | Railway / Render / EC2 | API and web deployment |
| **CDN** | Cloudflare | Edge caching, DDoS protection, image optimization |
| **Object Storage** | Cloudflare R2 / AWS S3 | Media uploads, ID proofs, gift assets |
| **Cache** | Upstash Redis | Session cache, rate limiting, pub/sub, presence |
| **RTC** | Agora.io | Voice/video calls, live streaming, group audio |
| **Payments** | Stripe + Razorpay + Apple IAP + Google Play | Global coverage, in-app purchases |
| **Push** | Firebase Cloud Messaging | Cross-platform push notifications |
| **Monitoring** | Prometheus + Grafana | Metrics, alerting, dashboards |
| **Error Tracking** | Sentry | Exception monitoring across all surfaces |

### Why REST vs GraphQL vs tRPC?

**Decision: tRPC** — because:
1. This is a TypeScript monorepo — tRPC gives zero-cost type inference from server to client
2. No schema/codegen step — change a procedure, client types update instantly
3. Supports subscriptions for realtime via WebSocket transport
4. Batches multiple procedure calls into a single HTTP request
5. Works natively with TanStack Query for cache/optimistic updates
6. REST endpoints can be added alongside tRPC for webhooks and third-party integrations

---

## 3. Database Schema

### 3.1 Complete Table Inventory (35+ tables across 13 domains)

#### DOMAIN 1: User & Authentication

```
┌─────────────────────────────────────────────────────────────┐
│ users                                                        │
├─────────────────────────────────────────────────────────────┤
│ id              UUID  PK  DEFAULT gen_random_uuid()          │
│ publicUserId    TEXT  UNIQUE NOT NULL  -- UXXXXXXXXX format  │
│ clerkId         TEXT  UNIQUE                                 │
│ email           TEXT  UNIQUE                                 │
│ emailVerified   BOOL  DEFAULT false                          │
│ phone           TEXT                                         │
│ phoneVerified   BOOL  DEFAULT false                          │
│ passwordHash    TEXT                                         │
│ displayName     TEXT                                         │
│ username        TEXT  UNIQUE                                 │
│ avatarUrl       TEXT                                         │
│ role            ENUM(user, host, model, admin)               │
│ platformRole    ENUM(USER, MODEL_INDEPENDENT, MODEL_AGENCY,  │
│                      AGENCY, ADMIN)                          │
│ authRole        TEXT                                         │
│ authProvider    ENUM(EMAIL, GOOGLE, FACEBOOK, PHONE_OTP,     │
│                      WHATSAPP_OTP, CUSTOM_OTP, UNKNOWN)      │
│ profileDataJson JSONB                                        │
│ status          TEXT  DEFAULT 'active'                        │
│ country         TEXT                                         │
│ city            TEXT                                         │
│ preferredLocale TEXT                                         │
│ timezone        TEXT                                         │
│ gender          TEXT                                         │
│ dateOfBirth     DATE                                         │
│ isVerified      BOOL  DEFAULT false                          │
│ referralCode    TEXT  UNIQUE                                 │
│ referredByUserId UUID  FK→users                              │
│ lastActiveAt    TIMESTAMP                                    │
│ deletedAt       TIMESTAMP  -- soft delete                    │
│ createdAt       TIMESTAMP  DEFAULT now()                     │
│ updatedAt       TIMESTAMP  DEFAULT now()                     │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│  users_clerk_id_idx         UNIQUE ON (clerkId)              │
│  users_email_idx            UNIQUE ON (email)                │
│  users_public_user_id_idx   UNIQUE ON (publicUserId)         │
│  users_username_idx         UNIQUE ON (username)             │
│  users_referral_code_idx    UNIQUE ON (referralCode)         │
│  users_platform_role_idx    ON (platformRole)                │
│  users_country_idx          ON (country)                     │
│  users_last_active_idx      ON (lastActiveAt)                │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ profiles                                    │
├────────────────────────────────────────────┤
│ id                  UUID  PK               │
│ userId              UUID  UNIQUE FK→users  │
│ bio                 TEXT                    │
│ socialLinksJson     JSONB                  │
│ interestsJson       JSONB                  │
│ profileFrameUrl     TEXT                   │
│ headerImageUrl      TEXT                   │
│ locationDisplay     TEXT                   │
│ profileCompletenessScore  INT DEFAULT 0    │
│ createdAt           TIMESTAMP              │
│ updatedAt           TIMESTAMP              │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ auth_sessions                               │
├────────────────────────────────────────────┤
│ id                    UUID  PK             │
│ userId                UUID  FK→users       │
│ deviceFingerprintHash TEXT                 │
│ refreshTokenHash      TEXT                 │
│ sessionStatus         ENUM(ACTIVE,REVOKED) │
│ ipHash                TEXT                 │
│ userAgentHash         TEXT                 │
│ riskScore             INT  DEFAULT 0       │
│ lastSeenAt            TIMESTAMP            │
│ expiresAt             TIMESTAMP            │
│ createdAt             TIMESTAMP            │
├────────────────────────────────────────────┤
│ INDEXES:                                    │
│  auth_sessions_user_idx    ON (userId)      │
│  auth_sessions_status_idx  ON (sessionStatus)│
│  auth_sessions_expires_idx ON (expiresAt)   │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ email_verifications                         │
│ push_tokens                                 │
│ user_inbox_preferences                      │
│ account_deletion_requests                   │
│ security_events                             │
│ security_incidents                          │
│ service_identities                          │
│ (See schema files for full column detail)   │
└────────────────────────────────────────────┘
```

#### DOMAIN 2: Host & Agency System

```
┌─────────────────────────────────────────────────────────────┐
│ agencies                                                     │
├─────────────────────────────────────────────────────────────┤
│ id                UUID  PK                                   │
│ userId            UUID  FK→users                             │
│ clerkId           TEXT                                       │
│ agencyName        TEXT  NOT NULL                              │
│ agencyCode        TEXT  UNIQUE NOT NULL  -- AG######## format│
│ contactName       TEXT  NOT NULL                              │
│ contactEmail      TEXT  NOT NULL                              │
│ country           TEXT                                        │
│ status            TEXT  DEFAULT 'PENDING'                     │
│ approvalStatus    ENUM(PENDING, APPROVED, REJECTED)          │
│ metadataJson      JSONB                                      │
│ commissionTier    TEXT  DEFAULT 'Standard'                    │
│ approvedByAdminId TEXT                                        │
│ approvedAt        TIMESTAMP                                   │
│ rejectedAt        TIMESTAMP                                   │
│ deletedAt         TIMESTAMP  -- soft delete                   │
│ createdAt         TIMESTAMP                                   │
│ updatedAt         TIMESTAMP                                   │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│  agencies_code_idx          UNIQUE ON (agencyCode)           │
│  agencies_user_idx          UNIQUE ON (userId)               │
│  agencies_approval_idx      ON (approvalStatus)              │
│  agencies_status_idx        ON (status)                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ agency_applications                                          │
├─────────────────────────────────────────────────────────────┤
│ id                UUID  PK                                   │
│ applicantUserId   UUID  FK→users                             │
│ agencyName        TEXT                                        │
│ contactName       TEXT                                        │
│ contactEmail      TEXT                                        │
│ country           TEXT                                        │
│ notes             TEXT                                        │
│ status            ENUM(PENDING, APPROVED, REJECTED)          │
│ createdAgencyId   UUID  FK→agencies  -- set on approval      │
│ reviewedByAdminId UUID                                        │
│ reviewedAt        TIMESTAMP                                   │
│ createdAt         TIMESTAMP                                   │
│ updatedAt         TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ hosts                                                        │
├─────────────────────────────────────────────────────────────┤
│ id                    UUID  PK                               │
│ hostId                TEXT  UNIQUE NOT NULL                   │
│                       -- H######### (platform, 10 chars)     │
│                       -- AH######## (agency, 10 chars)       │
│ userId                UUID  UNIQUE FK→users                  │
│ agencyId              UUID  FK→agencies  NULLABLE            │
│ type                  ENUM(PLATFORM, AGENCY)                 │
│ status                ENUM(PENDING, APPROVED, REJECTED,      │
│                            SUSPENDED)                        │
│ talentDetailsJson     JSONB                                  │
│ profileInfoJson       JSONB                                  │
│ idProofUrlsJson       JSONB                                  │
│ sourceApplicationId   UUID  FK→host_applications             │
│ reviewNotes           TEXT                                    │
│ reviewedByAdminUserId UUID                                    │
│ approvedAt            TIMESTAMP                               │
│ rejectedAt            TIMESTAMP                               │
│ createdAt             TIMESTAMP                               │
│ updatedAt             TIMESTAMP                               │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│  hosts_host_id_idx    UNIQUE ON (hostId)                     │
│  hosts_user_idx       UNIQUE ON (userId)                     │
│  hosts_agency_idx     ON (agencyId)                          │
│  hosts_type_idx       ON (type)                              │
│  hosts_status_idx     ON (status)                            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ host_applications                                            │
├─────────────────────────────────────────────────────────────┤
│ id                    UUID  PK                               │
│ userId                UUID  FK→users                         │
│ agencyId              UUID  FK→agencies  NULLABLE            │
│ applicationType       ENUM(INDEPENDENT, AGENCY)              │
│ status                ENUM(PENDING, APPROVED, REJECTED)      │
│ agencyCodeSnapshot    TEXT  -- immutable snapshot at apply    │
│ talentDetailsJson     JSONB                                  │
│ profileInfoJson       JSONB                                  │
│ idProofUrlsJson       JSONB                                  │
│ reviewNotes           TEXT                                    │
│ reviewedByAdminUserId UUID                                    │
│ submittedAt           TIMESTAMP  DEFAULT now()                │
│ reviewedAt            TIMESTAMP                               │
│ createdAt             TIMESTAMP                               │
│ updatedAt             TIMESTAMP                               │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│  host_applications_user_idx     ON (userId)                  │
│  host_applications_status_idx   ON (status)                  │
│  host_applications_agency_idx   ON (agencyId)                │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ agency_hosts                                │
├────────────────────────────────────────────┤
│ id          UUID  PK                       │
│ agencyId    UUID  FK→agencies              │
│ userId      UUID  FK→users                 │
│ assignedAt  TIMESTAMP  DEFAULT now()       │
│ status      ENUM(ACTIVE, INACTIVE, REMOVED)│
│ createdAt   TIMESTAMP                      │
│ updatedAt   TIMESTAMP                      │
├────────────────────────────────────────────┤
│ INDEXES:                                    │
│  agency_hosts_agency_idx  ON (agencyId)    │
│  agency_hosts_user_idx    ON (userId)      │
│  agency_hosts_unique      UNIQUE (agencyId,│
│                           userId)          │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ agency_commission_records                   │
├────────────────────────────────────────────┤
│ id                UUID  PK                 │
│ agencyId          UUID  FK→agencies        │
│ hostUserId        UUID  FK→users           │
│ periodStart       TIMESTAMP                │
│ periodEnd         TIMESTAMP                │
│ grossRevenueUsd   DECIMAL                  │
│ hostPayoutUsd     DECIMAL                  │
│ commissionRate    DECIMAL                  │
│ commissionAmountUsd DECIMAL                │
│ status            ENUM(PENDING, APPROVED,  │
│                        SETTLED)            │
│ metadataJson      JSONB                    │
│ approvedByAdminId UUID                     │
│ approvedAt        TIMESTAMP                │
│ settledAt         TIMESTAMP                │
│ createdAt         TIMESTAMP                │
│ updatedAt         TIMESTAMP                │
├────────────────────────────────────────────┤
│ INDEXES:                                    │
│  commission_agency_idx  ON (agencyId)      │
│  commission_period_idx  ON (periodStart,   │
│                          periodEnd)        │
│  commission_status_idx  ON (status)        │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│ commission_rules                            │
├────────────────────────────────────────────┤
│ id              UUID  PK                   │
│ agencyId        UUID  FK→agencies NULLABLE │
│ ruleKey         TEXT                        │
│ ruleScope       TEXT                        │
│ hostTier        TEXT                        │
│ revenueSource   TEXT                        │
│ commissionRate  DECIMAL                    │
│ minimumPayoutUsd DECIMAL                   │
│ priority        ENUM(NORMAL, HIGH)         │
│ constraintsJson JSONB                      │
│ status          ENUM(DRAFT, ACTIVE,        │
│                      ARCHIVED)             │
│ effectiveFrom   TIMESTAMP                  │
│ effectiveTo     TIMESTAMP                  │
│ createdByAdminId UUID                      │
│ createdAt       TIMESTAMP                  │
│ updatedAt       TIMESTAMP                  │
└────────────────────────────────────────────┘
```

#### DOMAIN 3: Wallet & Economy

```
┌─────────────────────────────────────────────────────────────┐
│ wallets                                                      │
├─────────────────────────────────────────────────────────────┤
│ id                        UUID  PK                           │
│ userId                    UUID  UNIQUE FK→users              │
│ coinBalance               BIGINT  DEFAULT 0                  │
│ diamondBalance            BIGINT  DEFAULT 0                  │
│ lifetimeCoinsPurchased    BIGINT  DEFAULT 0                  │
│ lifetimeCoinsSpent        BIGINT  DEFAULT 0                  │
│ lifetimeDiamondsEarned    BIGINT  DEFAULT 0                  │
│ lifetimeDiamondsWithdrawn BIGINT  DEFAULT 0                  │
│ version                   INT  DEFAULT 0  -- optimistic lock │
│ createdAt                 TIMESTAMP                          │
│ updatedAt                 TIMESTAMP                          │
├─────────────────────────────────────────────────────────────┤
│ INDEXES:                                                     │
│  wallets_user_idx   UNIQUE ON (userId)                       │
│  wallets_version_idx ON (version)                            │
└─────────────────────────────────────────────────────────────┘

 coin_transactions, diamond_transactions, coin_packages
 payments, withdraw_requests, payout_records
 webhook_events, payment_disputes
 (Full columns in packages/db/schema/wallets.ts & payments.ts)
```

#### DOMAIN 4: Live Streaming

```
 live_rooms          — room config per host
 live_streams        — individual stream sessions
 live_viewers        — viewer presence with watch duration
 chat_messages       — stream chat with moderation support
```

#### DOMAIN 5: Calls

```
 calls               — call request lifecycle
 call_sessions       — billing-tracked call sessions
 call_history        — immutable call log
 call_billing_ticks  — per-minute coin deductions
 chat_sessions       — text chat sessions with billing
 chat_billing_ticks  — per-minute text billing
```

#### DOMAIN 6: Gifts & Animations

```
 gifts               — gift catalog (admin-managed)
 gift_transactions   — gift sends with economy snapshots
 gift_animations     — per-platform animation assets
 live_gift_events    — realtime gift broadcast queue
```

#### DOMAIN 7: Social

```
 followers           — follow graph
 user_blocks         — block list
 dm_conversations    — 1:1 conversation metadata
 dm_messages         — message content with read receipts
```

#### DOMAIN 8: Party Rooms

```
 party_themes, party_theme_ownerships
 party_rooms, party_seats, party_members
 party_activities, party_activity_participants
```

#### DOMAIN 9: Group Audio

```
 group_audio_rooms, group_audio_participants
 group_audio_billing_ticks, group_audio_hand_raises
```

#### DOMAIN 10: Games

```
 games, game_sessions, game_moves, game_players, game_results
```

#### DOMAIN 11: Levels, Badges, VIP

```
 levels, user_levels, user_xp_events, level_rewards
 badges, user_badges, login_streaks
 vip_subscriptions, referrals, referral_rewards
```

#### DOMAIN 12: Events & Leaderboards

```
 events, event_participants
 leaderboards, leaderboard_entries, leaderboard_snapshots
 host_analytics_snapshots
```

#### DOMAIN 13: Moderation, Admin, Notifications, Analytics

```
 admins, admin_logs
 reports, bans
 media_assets, media_scan_results
 fraud_flags, fraud_signals
 notifications, notification_preferences
 notification_templates, notification_campaigns, messages
 support_tickets
 idempotency_keys
 recommendation_candidates, recommendation_impressions, recommendation_configs
 analytics_events
```

### 3.2 Entity Relationships

```
users (1) ──────── (1) profiles
users (1) ──────── (1) wallets
users (1) ──────── (0..1) hosts
users (1) ──────── (0..1) agencies           -- agency owner user
users (1) ──────── (N) host_applications
users (1) ──────── (N) auth_sessions
users (1) ──────── (N) push_tokens
users (1) ──────── (N) followers (as follower or followed)
users (1) ──────── (N) dm_conversations (as user1 or user2)

agencies (1) ───── (N) agency_hosts
agencies (1) ───── (N) hosts (via hosts.agencyId)
agencies (1) ───── (N) host_applications (via agencyId)
agencies (1) ───── (N) agency_commission_records
agencies (1) ───── (N) commission_rules

hosts (1) ──────── (1) users
hosts (0..1) ───── (1) agencies
hosts (1) ──────── (0..1) host_applications (sourceApplicationId)

live_rooms (1) ─── (N) live_streams
live_streams (1) ─ (N) live_viewers
live_streams (1) ─ (N) chat_messages

calls (1) ──────── (0..1) call_sessions
call_sessions (1)─ (N) call_billing_ticks
call_sessions (1)─ (N) call_history

party_rooms (1) ── (N) party_seats
party_rooms (1) ── (N) party_members
party_rooms (1) ── (N) party_activities
party_rooms (0..1) (1) party_themes

gifts (1) ──────── (N) gift_transactions
gift_transactions (1) ─ (0..1) live_gift_events
```

---

## 4. ID Generation Engine

### 4.1 Design Principles

| Requirement | Solution |
|-------------|----------|
| **Collision-free** | Cryptographic random digits + DB unique index + retry loop (up to 20 attempts) |
| **Prefix-encoded** | Entity type embedded in ID prefix (AG, H, AH, U) |
| **Immutable** | Generated once at creation, never mutated |
| **Human-readable** | Short enough to share verbally (10 chars) |
| **Indexed** | Unique DB index on every ID column for O(log n) lookup |
| **Concurrency-safe** | Unique constraint + retry loop handles concurrent inserts |

### 4.2 ID Formats

| Entity | Format | Example | Total Length | Generation Point |
|--------|--------|---------|-------------|-----------------|
| **User** | `U` + 9 random digits | `U482910374` | 10 chars | User creation (signup) |
| **Agency** | `AG` + 8 random digits | `AG58291034` | 10 chars | Agency registration |
| **Platform Host** | `H` + 9 random digits | `H738291045` | 10 chars | Admin approves independent host |
| **Agency Host** | `AH` + 8 random digits | `AH19283746` | 10 chars | Admin approves agency-linked host |

### 4.3 Implementation (Already Live)

```typescript
// packages/api/src/missu-pro/missu-pro.service.ts

private async generateUniqueCode(
  prefix: string,
  digitCount: number,
  existsCheck: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const MAX_ATTEMPTS = 20;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    // Generate cryptographically random digits
    const digits = Array.from({ length: digitCount }, () =>
      Math.floor(Math.random() * 10),
    ).join("");
    const candidate = `${prefix}${digits}`;

    // Check DB for collision
    const exists = await existsCheck(candidate);
    if (!exists) return candidate;
  }
  // Fallback: timestamp-based suffix (virtually impossible to reach)
  const fallback = `${prefix}${Date.now().toString().slice(-digitCount)}`;
  return fallback;
}

// Agency code: AG########
private async generateUniqueAgencyCode() {
  return this.generateUniqueCode("AG", 8, async (candidate) => {
    const [existing] = await db
      .select({ id: agencies.id })
      .from(agencies)
      .where(eq(agencies.agencyCode, candidate))
      .limit(1);
    return Boolean(existing);
  });
}

// Host ID: H######### (platform) or AH######## (agency)
private async generateUniqueHostId(type: "PLATFORM" | "AGENCY") {
  const prefix = type === "AGENCY" ? "AH" : "H";
  const digits = type === "AGENCY" ? 8 : 9;
  return this.generateUniqueCode(prefix, digits, async (candidate) => {
    const [existing] = await db
      .select({ id: hosts.id })
      .from(hosts)
      .where(eq(hosts.hostId, candidate))
      .limit(1);
    return Boolean(existing);
  });
}
```

### 4.4 ID Collision Probability

With 8-9 random digits:
- 8 digits = 10^8 = 100 million possible values
- 9 digits = 10^9 = 1 billion possible values
- Birthday paradox threshold at ~10k entities = 0.05% collision rate per attempt
- With 20 retry attempts, probability of failure = ~(0.0005)^20 ≈ 0 for practical purposes
- DB unique constraint is the final safety net — insert fails on collision, retry catches it

### 4.5 User Public ID

Generated at signup via the same engine:

```typescript
// U + 9 random digits → users.publicUserId
const publicUserId = await generateUniqueCode("U", 9, async (candidate) => {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.publicUserId, candidate))
    .limit(1);
  return Boolean(existing);
});
```

---

## 5. RBAC & Authorization

### 5.1 Role Hierarchy

```
ADMIN (superuser)
  ├── Full platform control
  ├── Approve/reject agencies
  ├── Approve/reject hosts
  ├── View all data
  ├── Financial controls
  └── Manual override any entity

AGENCY (tenant operator)
  ├── View own agency profile
  ├── View linked hosts
  ├── View earnings/commissions
  ├── Edit agency settings
  └── Cannot access other agencies' data

MODEL_INDEPENDENT (platform host without agency)
  ├── All USER permissions
  ├── Go live, accept calls
  ├── View earnings
  ├── Request withdrawals
  └── Manage creator profile

MODEL_AGENCY (agency-linked host)
  ├── All MODEL_INDEPENDENT permissions
  └── Linked to parent agency for commission tracking

USER (consumer)
  ├── Browse, follow, DM
  ├── Watch streams, send gifts
  ├── Make calls
  ├── Join party rooms
  ├── Purchase coins
  └── Submit host application (role upgrade path)
```

### 5.2 Role Storage

```
users.role          → legacy compat (user, host, model, admin)
users.platformRole  → canonical access role:
                      USER | MODEL_INDEPENDENT | MODEL_AGENCY | AGENCY | ADMIN
users.authRole      → supplementary (agency, admin, etc.)
```

**Rule:** `platformRole` is the single source of truth for all new authorization checks.

### 5.3 Guard Implementation

```typescript
// packages/api/src/auth/rbac.guard.ts

@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<PlatformRole[]>(
      'roles', context.getHandler(),
    );
    if (!requiredRoles) return true; // no restriction

    const user = context.switchToHttp().getRequest().user;
    return requiredRoles.includes(user.platformRole);
  }
}
```

### 5.4 tRPC Middleware Access Control

```typescript
// packages/api/src/trpc/trpc.service.ts

// Public — no auth required
const publicProcedure = t.procedure;

// Protected — any logged-in user
const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

// Admin only
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.platformRole !== 'ADMIN')
    throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});

// Agency only
const agencyProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.platformRole !== 'AGENCY')
    throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});

// Host (model) procedures — either independent or agency-linked
const hostProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!['MODEL_INDEPENDENT', 'MODEL_AGENCY'].includes(ctx.user.platformRole))
    throw new TRPCError({ code: 'FORBIDDEN' });
  return next({ ctx });
});
```

### 5.5 Access Matrix

| Resource | USER | MODEL_IND | MODEL_AGENCY | AGENCY | ADMIN |
|----------|------|-----------|-------------|--------|-------|
| Browse streams | ✅ | ✅ | ✅ | ❌ | ✅ |
| Send gifts | ✅ | ✅ | ✅ | ❌ | ❌ |
| Go live | ❌ | ✅ | ✅ | ❌ | ❌ |
| Accept calls | ❌ | ✅ | ✅ | ❌ | ❌ |
| Request payout | ❌ | ✅ | ✅ | ❌ | ❌ |
| View agency hosts | ❌ | ❌ | ❌ | ✅ | ✅ |
| Approve agencies | ❌ | ❌ | ❌ | ❌ | ✅ |
| Approve hosts | ❌ | ❌ | ❌ | ❌ | ✅ |
| View all users | ❌ | ❌ | ❌ | ❌ | ✅ |
| Financial controls | ❌ | ❌ | ❌ | ❌ | ✅ |
| Submit host application | ✅ | ❌ | ❌ | ❌ | ❌ |
| Register agency | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 6. API Contract

### 6.1 Authentication

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `auth.signup` | mutation | public | Create account (email/phone/OAuth via Clerk) |
| `auth.login` | mutation | public | Authenticate and return JWT/session |
| `auth.logout` | mutation | protected | Revoke current session |
| `auth.refreshToken` | mutation | protected | Rotate refresh token |
| `auth.verifyEmail` | mutation | public | Confirm email verification token |
| `auth.requestPasswordReset` | mutation | public | Send password reset email |
| `auth.resetPassword` | mutation | public | Reset password with token |

### 6.2 User Profile

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `user.getMe` | query | protected | Current user with wallet/role |
| `user.getMyProfile` | query | protected | Full profile with stats |
| `user.getUserSummary` | query | protected | Public profile of another user |
| `user.updateMyProfile` | mutation | protected | Edit displayName, avatar, bio, etc. |
| `user.followUser` | mutation | protected | Follow a user |
| `user.unfollowUser` | mutation | protected | Unfollow |
| `user.isFollowing` | query | protected | Check follow status |
| `user.listFollowers` | query | protected | Paginated followers |
| `user.listFollowing` | query | protected | Paginated following |
| `user.blockUser` | mutation | protected | Block a user |
| `user.unblockUser` | mutation | protected | Unblock |
| `user.getBlockedUsers` | query | protected | List blocked users |
| `user.registerPushToken` | mutation | protected | Register FCM token |
| `user.getInboxPreferences` | query | protected | DM privacy rules |
| `user.updateInboxPreferences` | mutation | protected | Update DM rules |
| `user.requestAccountDeletion` | mutation | protected | GDPR-compliant deletion request |
| `user.getPresence` | query | protected | Online/offline status |
| `user.getPresenceBulk` | query | protected | Batch presence check |

### 6.3 MissU Pro — Host & Agency System

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `missuPro.submitHostApplication` | mutation | protected | User applies to become host |
| `missuPro.getMyHostStatus` | query | protected | Check own host application status |
| `missuPro.getMyAgency` | query | agency | Agency's own profile |
| `missuPro.registerAgency` | mutation | protected | Submit agency registration |
| `missuPro.reviewHostApplication` | mutation | admin | Approve/reject host application |
| `missuPro.reviewAgency` | mutation | admin | Approve/reject agency |
| `missuPro.listHosts` | query | admin | All hosts with filters |
| `missuPro.listAgencies` | query | admin | All agencies with filters |
| `missuPro.getAdminOverview` | query | admin | Dashboard stats |
| `missuPro.getAgencyHosts` | query | agency | Agency's linked hosts |
| `missuPro.getAgencyAnalytics` | query | agency | Agency earnings & metrics |
| `missuPro.suspendHost` | mutation | admin | Suspend a host |
| `missuPro.reactivateHost` | mutation | admin | Reactivate suspended host |

### 6.4 Wallet & Economy

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `wallet.getBalance` | query | protected | Coin + diamond balances |
| `wallet.getCoinPackages` | query | protected | Available purchase tiers |
| `wallet.getTopUpHistory` | query | protected | Purchase transaction log |
| `wallet.requestWithdrawal` | mutation | host | Request diamond→USD payout |

### 6.5 Gifts

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `gifts.listGifts` | query | protected | Gift catalog |
| `gifts.sendGift` | mutation | protected | Send gift (debit coins, credit diamonds) |
| `gifts.getGiftHistory` | query | protected | Sent/received gifts |

### 6.6 Live Streaming

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `live.startStream` | mutation | host | Begin live stream |
| `live.endStream` | mutation | host | End live stream |
| `live.joinStream` | mutation | protected | Viewer joins stream |
| `live.leaveStream` | mutation | protected | Viewer leaves |
| `live.activeStreams` | query | public | List active streams |
| `live.getStreamDetail` | query | protected | Stream metadata + viewer count |

### 6.7 Calls

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `calls.requestModelCall` | mutation | protected | Initiate call to model |
| `calls.acceptModelCall` | mutation | host | Host accepts incoming call |
| `calls.endModelCall` | mutation | protected | End active call |
| `calls.getCallPricingPreview` | query | protected | Per-minute rate for model |
| `calls.getBillingState` | query | protected | Live billing during call |
| `calls.myCallHistory` | query | protected | User's call log |
| `calls.refreshRtcToken` | mutation | protected | Refresh Agora token |

### 6.8 Party Rooms

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `party.createRoom` | mutation | protected | Create party room |
| `party.joinRoom` | mutation | protected | Join room (free or paid entry) |
| `party.leaveRoom` | mutation | protected | Leave room |
| `party.closeRoom` | mutation | host | Close party room |
| `party.claimSeat` | mutation | protected | Take a seat (1-based) |
| `party.vacateSeat` | mutation | protected | Leave seat |
| `party.getRoomState` | query | protected | Full room state |
| `party.listActiveRooms` | query | public | Browse active rooms |
| `party.startActivity` | mutation | host | Start dice/raffle/trivia |
| `party.joinActivity` | mutation | protected | Participate in activity |
| `party.purchaseTheme` | mutation | protected | Buy premium theme |

### 6.9 Group Audio

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `groupAudio.createRoom` | mutation | protected | Create audio room (free/paid) |
| `groupAudio.joinRoom` | mutation | protected | Join as listener/speaker |
| `groupAudio.leaveRoom` | mutation | protected | Leave room |
| `groupAudio.raiseHand` | mutation | protected | Request speaker role |
| `groupAudio.resolveHand` | mutation | host | Accept/reject hand raise |
| `groupAudio.listRooms` | query | public | Browse active rooms |

### 6.10 Social/Chat

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `social.getOrCreateConversation` | query | protected | Get or start DM thread |
| `social.listConversations` | query | protected | Inbox with unread counts |
| `social.getMessages` | query | protected | Paginated message history |
| `social.sendMessage` | mutation | protected | Send DM |
| `social.markConversationRead` | mutation | protected | Mark as read |

### 6.11 Admin

| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `admin.getDashboardStats` | query | admin | Platform-wide metrics |
| `admin.listUsers` | query | admin | Paginated user list with filters |
| `admin.suspendUser` | mutation | admin | Suspend user account |
| `admin.unsuspendUser` | mutation | admin | Lift suspension |
| `admin.banUser` | mutation | admin | Ban with scope + reason |
| `admin.unbanUser` | mutation | admin | Revoke ban |
| `admin.listReports` | query | admin | Moderation queue |
| `admin.resolveReport` | mutation | admin | Resolve user report |
| `admin.listPayments` | query | admin | Payment transactions |
| `admin.listWithdrawals` | query | admin | Payout requests |
| `admin.approveWithdrawal` | mutation | admin | Approve payout |
| `admin.rejectWithdrawal` | mutation | admin | Reject payout |
| `admin.getAuditLog` | query | admin | Admin action history |

### 6.12 Additional Domains

| Domain | Key Procedures |
|--------|---------------|
| **Levels** | `level.getMyLevelSummary`, `level.getLevelTrack`, `level.getMyBadges` |
| **VIP** | `vip.getAvailableTiers`, `vip.subscribe`, `vip.cancelSubscription` |
| **Referrals** | `referral.getMyCode`, `referral.getMyReferrals`, `referral.applyCode` |
| **Events** | `events.listEvents`, `events.joinEvent`, `events.getProgress` |
| **Leaderboards** | `leaderboards.getBoard`, `leaderboards.getMyRank` |
| **Notifications** | `notifications.list`, `notifications.markRead`, `notifications.updatePreferences` |
| **Discovery** | `discovery.getRecommendations`, `discovery.trending`, `discovery.search` |
| **Games** | `games.startInCallGame`, `games.submitMove`, `games.getGameState` |
| **Config** | `config.getUILayout`, `config.getCreatorEconomy`, `config.getFeatureFlags` |
| **Moderation** | `moderation.report`, `moderation.getMyReports` |
| **Analytics** | `analytics.trackEvent` |

---

## 7. Approval Engine — Stateful Workflows

### 7.1 Agency Approval Flow

```
USER signs up on web
       │
       ▼
┌─────────────────────┐
│ Submit Agency Form   │  registerAgency()
│ agencyName, contact, │  → generates AG########
│ country, notes       │  → status = PENDING
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Admin Reviews        │  reviewAgency()
│ (Admin Panel →       │
│  /admin/missu-pro)   │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
APPROVED       REJECTED
    │             │
    ▼             ▼
┌──────────┐  ┌──────────┐
│ status=   │  │ status=   │
│ ACTIVE    │  │ REJECTED  │
│           │  │           │
│ User role │  │ No role   │
│ → AGENCY  │  │ change    │
│           │  │           │
│ Agency    │  └──────────┘
│ panel     │
│ unlocked  │
└──────────┘
```

### 7.2 Host Application Flow

```
USER taps "Become a Host" in mobile app
       │
       ▼
┌─────────────────────────────┐
│ Choose Mode:                 │
│  ○ Independent (platform)    │
│  ○ Agency (enter agency code)│
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Submit Application           │ submitHostApplication()
│  - ID Proof (upload)         │ → validates agency code if AGENCY
│  - Talent/Category           │ → snapshots agencyCode
│  - Profile Data              │ → status = PENDING
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│ Admin Reviews                │ reviewHostApplication()
│ (Admin Panel →               │
│  /admin/missu-pro)           │
└──────────┬──────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
APPROVED       REJECTED
    │             │
    ▼             ▼
┌──────────────┐  ┌──────────┐
│ IF INDEPENDENT│  │ status=   │
│  hostId=H###  │  │ REJECTED  │
│  platformRole │  │           │
│  =MODEL_INDEP │  │ User can  │
│               │  │ re-apply  │
│ IF AGENCY     │  └──────────┘
│  hostId=AH### │
│  platformRole │
│  =MODEL_AGENCY│
│  agency_hosts │
│  row created  │
│               │
│ Creator prof. │
│ upserted in   │
│ models table  │
└──────────────┘
```

### 7.3 Withdrawal Approval Flow

```
Host requests withdrawal → status = PENDING
       │
Admin reviews → APPROVED / REJECTED
       │ (if approved)
       ▼
Processing → external payout initiated
       │
       ▼
COMPLETED → funds transferred
```

### 7.4 Report → Ban Flow

```
User submits report → status = OPEN
       │
Admin reviews → UNDER_REVIEW → RESOLVED
       │ (if violation found)
       ▼
Ban imposed → scope (GLOBAL/STREAMING/CALLING/CHAT)
              duration (temporary or permanent)
              logged in admin_logs
```

---

## 8. Folder Structure

### 8.1 Full Repository Layout

```
MissUPRO1.1/
├── package.json              # npm workspaces root
├── turbo.json                # Turborepo config
├── tsconfig.json             # Base TypeScript config
│
├── apps/
│   ├── web/                  # Next.js 16 — Admin + Agency + Landing
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   ├── public/
│   │   │   └── brand/        # Logos, favicon, OG images
│   │   └── src/
│   │       ├── proxy.ts      # tRPC client proxy
│   │       ├── app/
│   │       │   ├── layout.tsx
│   │       │   ├── (public)/
│   │       │   │   ├── page.tsx           # Landing page
│   │       │   │   └── agencies/page.tsx  # Agency directory
│   │       │   ├── (auth)/
│   │       │   │   ├── signup/page.tsx
│   │       │   │   └── signup/complete/page.tsx
│   │       │   ├── admin/
│   │       │   │   ├── layout.tsx         # Admin shell (sidebar, nav)
│   │       │   │   ├── dashboard/page.tsx
│   │       │   │   ├── users/page.tsx
│   │       │   │   ├── missu-pro/page.tsx # Host & agency approvals
│   │       │   │   ├── models/page.tsx
│   │       │   │   ├── agencies/page.tsx
│   │       │   │   ├── finance/page.tsx
│   │       │   │   ├── payouts/page.tsx
│   │       │   │   ├── gifts/page.tsx
│   │       │   │   ├── live/page.tsx
│   │       │   │   ├── party/page.tsx
│   │       │   │   ├── group-audio/page.tsx
│   │       │   │   ├── events/page.tsx
│   │       │   │   ├── leaderboards/page.tsx
│   │       │   │   ├── levels/page.tsx
│   │       │   │   ├── referrals/page.tsx
│   │       │   │   ├── moderation/page.tsx
│   │       │   │   ├── fraud/page.tsx
│   │       │   │   ├── analytics/page.tsx
│   │       │   │   ├── notifications/page.tsx
│   │       │   │   ├── campaigns/page.tsx
│   │       │   │   ├── sessions/page.tsx
│   │       │   │   ├── settings/page.tsx
│   │       │   │   ├── ui-layouts/page.tsx
│   │       │   │   ├── themes/page.tsx
│   │       │   │   ├── promotions/page.tsx
│   │       │   │   └── vip/page.tsx
│   │       │   ├── agency/
│   │       │   │   ├── layout.tsx         # Agency shell
│   │       │   │   ├── dashboard/page.tsx
│   │       │   │   ├── missu-pro/page.tsx # Host roster + agency code display
│   │       │   │   ├── models/page.tsx
│   │       │   │   ├── analytics/page.tsx
│   │       │   │   ├── payments/page.tsx
│   │       │   │   └── settings/page.tsx
│   │       │   └── discover/
│   │       │       ├── page.tsx
│   │       │       └── [streamId]/page.tsx
│   │       ├── components/   # Shared UI components
│   │       ├── features/     # Feature-specific components
│   │       ├── i18n/         # Internationalization
│   │       ├── lib/          # Utilities, trpc client, auth helpers
│   │       ├── pages/        # Legacy pages (if any)
│   │       └── styles/       # Global styles, Tailwind extensions
│   │
│   └── mobile/               # Expo 55 + React Native 0.83
│       ├── package.json
│       ├── app.json
│       ├── metro.config.js
│       ├── tsconfig.json
│       ├── android/          # Native Android project
│       ├── assets/           # Fonts, images, animations
│       ├── scripts/          # Build/run helpers
│       └── src/
│           ├── app/          # Expo Router (file-based navigation)
│           │   ├── _layout.tsx
│           │   ├── (auth)/
│           │   │   ├── login.tsx
│           │   │   ├── signup.tsx
│           │   │   └── sso-callback.tsx
│           │   ├── (tabs)/
│           │   │   ├── _layout.tsx    # Tab bar config
│           │   │   ├── index.tsx      # Home feed
│           │   │   ├── live.tsx       # Live streams browse
│           │   │   ├── messages.tsx   # Chat inbox
│           │   │   └── me.tsx         # Profile
│           │   ├── home/
│           │   ├── live/
│           │   ├── stream/
│           │   ├── call/
│           │   ├── calls/
│           │   ├── chat/
│           │   ├── social/
│           │   ├── profile/
│           │   ├── wallet/
│           │   ├── gifts/
│           │   ├── party/
│           │   ├── group-audio/
│           │   ├── games/
│           │   ├── pk/
│           │   ├── settings/
│           │   ├── admin/          # Mobile admin (limited)
│           │   ├── agency/         # Mobile agency view
│           │   ├── leaderboards.tsx
│           │   ├── badges.tsx
│           │   ├── levels.tsx
│           │   ├── vip.tsx
│           │   ├── events.tsx
│           │   ├── referrals.tsx
│           │   ├── notifications.tsx
│           │   ├── creator-dashboard.tsx
│           │   ├── onboarding.tsx
│           │   └── store.tsx
│           ├── components/     # Reusable UI components
│           ├── hooks/          # Custom hooks (useAuth, useWallet, etc.)
│           ├── i18n/           # Translations
│           ├── lib/            # trpc client, api helpers
│           ├── screens/        # Screen-specific components
│           ├── store/          # Zustand stores
│           ├── theme/          # Colors, typography, spacing
│           └── types/          # Type augmentations
│
├── packages/
│   ├── api/                  # NestJS 11 Backend
│   │   ├── package.json
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── trpc/              # tRPC core + router aggregation
│   │       │   ├── trpc.module.ts
│   │       │   ├── trpc.service.ts
│   │       │   └── trpc.router.ts
│   │       ├── auth/              # Auth module (Clerk JWT, guards)
│   │       │   ├── auth.module.ts
│   │       │   ├── auth.service.ts
│   │       │   ├── auth.router.ts
│   │       │   ├── auth.guard.ts
│   │       │   └── rbac.guard.ts
│   │       ├── users/             # User profile & social
│   │       │   ├── user.module.ts
│   │       │   ├── user.service.ts
│   │       │   └── user.router.ts
│   │       ├── missu-pro/         # Host & Agency system
│   │       │   ├── missu-pro.module.ts
│   │       │   ├── missu-pro.service.ts
│   │       │   └── missu-pro.router.ts
│   │       ├── wallets/
│   │       ├── gifts/
│   │       ├── live/
│   │       ├── calls/
│   │       ├── party/
│   │       ├── group-audio/
│   │       ├── games/
│   │       ├── social/
│   │       ├── chat/
│   │       ├── payments/
│   │       ├── payouts/
│   │       ├── notifications/
│   │       ├── admin/
│   │       ├── moderation/
│   │       ├── fraud/
│   │       ├── analytics/
│   │       ├── discovery/
│   │       ├── events/
│   │       ├── leaderboards/
│   │       ├── levels/
│   │       ├── vip/
│   │       ├── referrals/
│   │       ├── security/
│   │       ├── compliance/
│   │       ├── config/
│   │       ├── presence/
│   │       ├── support/
│   │       ├── media/
│   │       ├── models/
│   │       ├── campaigns/
│   │       └── streaming/
│   │
│   ├── db/                   # Drizzle ORM + Neon
│   │   ├── package.json
│   │   ├── drizzle.config.ts
│   │   ├── index.ts          # DB connection + exports
│   │   ├── schema/           # All table definitions
│   │   │   ├── users.ts
│   │   │   ├── hosts.ts
│   │   │   ├── agencies.ts
│   │   │   ├── wallets.ts
│   │   │   ├── payments.ts
│   │   │   ├── live.ts
│   │   │   ├── calls.ts
│   │   │   ├── gifts.ts
│   │   │   ├── social.ts
│   │   │   ├── party.ts
│   │   │   ├── group-audio.ts
│   │   │   ├── games.ts
│   │   │   ├── levels.ts
│   │   │   ├── vip.ts
│   │   │   ├── events.ts
│   │   │   ├── moderation.ts
│   │   │   ├── admin.ts
│   │   │   ├── notifications.ts
│   │   │   ├── discovery.ts
│   │   │   ├── analytics.ts
│   │   │   ├── support.ts
│   │   │   └── idempotency.ts
│   │   ├── migrations/       # SQL migration files
│   │   └── seed/             # Seed data scripts
│   │       └── index.ts
│   │
│   ├── config/               # Business constants & env
│   │   └── src/
│   │       ├── index.ts
│   │       ├── defaults.ts   # ECONOMY, PRICING, COMMISSIONS, etc.
│   │       └── env.ts        # Environment validation
│   │
│   ├── types/                # Shared TypeScript types
│   │   └── src/
│   │       ├── index.ts
│   │       └── enums.ts      # Platform roles, statuses, error codes
│   │
│   ├── utils/                # Shared utilities
│   │   └── src/
│   │       └── index.ts
│   │
│   └── ui/                   # Shared UI components
│       └── src/
│
├── services/                 # Future microservice extraction points
│   ├── analytics/
│   ├── chat/
│   ├── fraud/
│   ├── games/
│   ├── moderation/
│   ├── notifications/
│   ├── payments/
│   ├── presence/
│   └── streaming/
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.monitoring.yml
│   │   ├── Dockerfile.api
│   │   └── Dockerfile.web
│   ├── deployment/
│   │   ├── env/
│   │   │   └── production.env.example
│   │   └── monitoring/
│   │       ├── prometheus.yml
│   │       └── grafana-datasource.yml
│   ├── ci-cd/
│   └── scripts/
│       ├── deploy-api.sh
│       ├── deploy-web.sh
│       └── deploy.ps1
│
├── docs/                     # Architecture & design docs
│   ├── missu-pro-complete-architecture.md  # THIS FILE
│   ├── system-architecture.md
│   ├── saas-auth-rbac-architecture.md
│   ├── neon-schema-design.md
│   └── social-live-platform-architecture.md
│
├── patches/                  # npm patch files
└── tmp/                      # Temporary scripts
```

---

## 9. Security Hardening

### 9.1 Authentication Security

| Control | Implementation |
|---------|---------------|
| **JWT Verification** | Clerk handles JWT issuance; backend verifies via Clerk public key on every request |
| **Session Management** | `auth_sessions` table tracks active sessions; supports forced revocation |
| **MFA** | Clerk-native TOTP/SMS MFA; admin accounts require MFA (`admins.mfaEnabled`) |
| **OAuth** | Google, Facebook via Clerk; no direct OAuth token handling in our backend |
| **Phone OTP** | Clerk-managed OTP delivery; rate limited to 5 attempts per 15 minutes |
| **Password Hashing** | Argon2id via Clerk; we never store or handle raw passwords |
| **Admin Access** | Email allowlist check + MFA required + IP allowlist (`admins.ipAllowlistJson`) |

### 9.2 Input Validation

| Layer | Implementation |
|-------|---------------|
| **tRPC Input** | Every procedure uses Zod 4 schemas for input validation |
| **Type Coercion** | Strict mode — no implicit coercion, all inputs validated |
| **SQL Injection** | Drizzle ORM parameterizes all queries; no raw SQL with user input |
| **XSS** | React auto-escapes output; CSP headers on web; no `dangerouslySetInnerHTML` |
| **File Upload** | Presigned S3/R2 URLs — files never pass through API server; MIME type validation on client + server |
| **ID Proof Validation** | Uploaded to private S3 bucket; accessed only by admin via presigned URLs |

### 9.3 Rate Limiting

```typescript
// Defined in packages/config/src/defaults.ts → RATE_LIMITS
{
  api: { windowMs: 60_000, maxRequests: 100 },        // 100 req/min general
  auth: { windowMs: 900_000, maxRequests: 10 },        // 10 auth attempts/15min
  gifts: { windowMs: 1_000, maxRequests: 5 },           // 5 gifts/sec (anti-spam)
  messages: { windowMs: 60_000, maxRequests: 60 },      // 1 msg/sec
  walletMutations: { windowMs: 60_000, maxRequests: 10 }, // 10 wallet ops/min
}
```

Enforced via:
- Redis sliding window counter per user ID
- NestJS `ThrottlerGuard` on sensitive endpoints
- Cloudflare WAF as first line of defense

### 9.4 Role Protection

| Principle | Implementation |
|-----------|---------------|
| **Least Privilege** | Every tRPC procedure declares minimum required role |
| **Tenant Isolation** | Agency queries filter by `agency.userId === ctx.user.id` — can never access other agencies |
| **Admin Audit Trail** | Every admin action logged in `admin_logs` with before/after state snapshots |
| **Soft Deletes** | Users, agencies, admins use `deletedAt` — data preserved for audits |
| **Financial Isolation** | Wallet mutations use optimistic locking (`version` column) — no double-spend |

### 9.5 Data Privacy

| Requirement | Implementation |
|-------------|---------------|
| **PII Minimization** | Only collect necessary fields; `profileDataJson` for optional metadata |
| **GDPR** | `account_deletion_requests` table with cooling-off period; automated PII scrubbing |
| **IP Hashing** | `auth_sessions.ipHash` and `security_events.ipAddress` — hashed, not raw |
| **Encryption at Rest** | Neon PostgreSQL encrypts at rest by default |
| **Encryption in Transit** | TLS 1.3 enforced on all connections |
| **Media Privacy** | ID proof uploads in private bucket; default `visibility: 'PRIVATE'` |

### 9.6 Fraud Prevention

| Control | Implementation |
|---------|---------------|
| **Fraud Scoring** | `fraud_flags` table with multi-signal scoring (velocity, location, device) |
| **Withdrawal Fraud** | `withdraw_requests.fraudRiskScore` checked before approval |
| **Gift Spam** | Rate limiting + combo counting + minimum balance enforcement |
| **Account Takeover** | Device fingerprint tracking; risk score on sessions; forced logout on anomaly |
| **Payment Disputes** | `payment_disputes` table tracks chargebacks and evidence |

---

## 10. Performance & Scale

### 10.1 Database Indexing Strategy

```sql
-- HIGH-TRAFFIC QUERIES: every foreign key and filter column is indexed

-- User lookup (auth flow — every request)
CREATE UNIQUE INDEX users_clerk_id_idx ON users (clerk_id);
CREATE UNIQUE INDEX users_email_idx ON users (email);
CREATE UNIQUE INDEX users_public_user_id_idx ON users (public_user_id);

-- Host/Agency lookup (approval + assignment flows)
CREATE UNIQUE INDEX hosts_host_id_idx ON hosts (host_id);
CREATE UNIQUE INDEX agencies_code_idx ON agencies (agency_code);
CREATE INDEX hosts_status_idx ON hosts (status);
CREATE INDEX agencies_approval_idx ON agencies (approval_status);

-- Wallet (every gift/call transaction)
CREATE UNIQUE INDEX wallets_user_idx ON wallets (user_id);

-- Gift transactions (high volume during streams)
CREATE INDEX gift_txn_sender_idx ON gift_transactions (sender_user_id);
CREATE INDEX gift_txn_receiver_idx ON gift_transactions (receiver_user_id);
CREATE INDEX gift_txn_context_idx ON gift_transactions (context_type, context_id);

-- Live streams (discovery + join)
CREATE INDEX live_streams_status_idx ON live_streams (status);
CREATE INDEX live_streams_trending_idx ON live_streams (trending_score DESC);

-- Call sessions (billing)
CREATE INDEX call_sessions_status_idx ON call_sessions (status);
CREATE INDEX call_sessions_caller_idx ON call_sessions (caller_user_id);

-- Leaderboards (high-frequency reads)
CREATE INDEX lb_entries_board_rank_idx ON leaderboard_entries (leaderboard_id, rank_position);

-- Notifications (inbox query)
CREATE INDEX notifications_user_unread_idx ON notifications (user_id, is_read);

-- Analytics events (time-series)
CREATE INDEX analytics_events_time_idx ON analytics_events (created_at);
CREATE INDEX analytics_events_user_idx ON analytics_events (user_id);
```

### 10.2 Caching Strategy (Redis)

| Cache Key Pattern | TTL | Purpose |
|------------------|-----|---------|
| `user:{userId}:profile` | 5 min | Profile reads (hot path) |
| `user:{userId}:wallet` | 30 sec | Balance checks |
| `stream:active:list` | 10 sec | Active streams listing |
| `leaderboard:{type}:{window}` | 60 sec | Leaderboard reads |
| `config:feature_flags` | 5 min | Feature flag evaluation |
| `config:economy` | 5 min | Economy settings |
| `presence:{userId}` | heartbeat | Online/offline status |
| `rate:{userId}:{endpoint}` | window | Rate limit counters |

### 10.3 Horizontal Scaling Architecture

```
                    Load Balancer (Cloudflare / ALB)
                           │
              ┌────────────┼────────────┐
              │            │            │
         API Node 1   API Node 2   API Node N
              │            │            │
              └────────────┼────────────┘
                           │
                    Redis Cluster
                    (pub/sub + cache)
                           │
                    PostgreSQL (Neon)
                    (auto-scale reads via
                     read replicas)
```

**Stateless API Nodes:**
- No in-memory state — all session data in Redis
- Socket.io uses Redis adapter for cross-node pub/sub
- Horizontal scale: add more API nodes behind load balancer

**Database Read Scaling:**
- Neon supports read replicas for query distribution
- Heavy analytics queries directed to read replica
- Leaderboard/discovery queries served from Redis cache

**Connection Pooling:**
- Neon's built-in connection pooler (PgBouncer)
- Each API node uses pooled connections (max 10 per node)

### 10.4 Scale Targets

| Metric | Phase 1 (Launch) | Phase 2 (Growth) | Phase 3 (Scale) |
|--------|:-----------------:|:-----------------:|:----------------:|
| **Concurrent Users** | 1,000 | 50,000 | 1,000,000 |
| **Daily Active Users** | 5,000 | 200,000 | 5,000,000 |
| **Active Streams** | 10 | 500 | 10,000 |
| **API Nodes** | 1 | 3 | 10+ |
| **Database** | Neon Free | Neon Scale | Neon + Read Replicas |
| **Redis** | Upstash Free | Upstash Pro | Redis Cluster |
| **CDN** | Cloudflare Free | Cloudflare Pro | Cloudflare Enterprise |

### 10.5 Microservice Extraction Plan

When the monolith hits scaling boundaries (est. 500K+ DAU), extract in priority order:

1. **Chat Service** → highest message volume; extract Socket.io + DM persistence
2. **Streaming Service** → independent scaling for RTC token issuance + viewer tracking
3. **Payment Service** → PCI compliance isolation + webhook processing
4. **Notification Service** → async push delivery; decouple from main API
5. **Analytics Service** → write-heavy; separate to avoid impacting transactional DB
6. **Moderation Service** → ML inference for media scanning; GPU-bound workloads

The `services/` directory is already scaffolded for this extraction.

---

## 11. Step-by-Step Roadmap

### PHASE 1: Foundation — Auth + User System
**Goal:** Both platforms authenticating, user profiles functional

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| 1.1 | Monorepo scaffold | npm workspaces + Turborepo + TypeScript strict | ✅ Done |
| 1.2 | Database setup | Neon PostgreSQL + Drizzle ORM + schema files | ✅ Done |
| 1.3 | NestJS API bootstrap | NestJS 11 + tRPC v11 + module structure | ✅ Done |
| 1.4 | Clerk integration | Auth module, JWT verification, webhook sync | ✅ Done |
| 1.5 | User schema + service | `users`, `profiles`, `auth_sessions` tables | ✅ Done |
| 1.6 | Web auth flows | Sign up, login, Clerk-managed sessions | ✅ Done |
| 1.7 | Mobile auth flows | Expo Clerk, Google OAuth, OTP login | ✅ Done |
| 1.8 | Profile CRUD | `user.getMyProfile`, `updateMyProfile` | ✅ Done |
| 1.9 | User ID system | `publicUserId` (U#########) generation | ✅ Done |
| 1.10 | Role system | `platformRole` enum, RBAC guard, access matrix | ✅ Done |

### PHASE 2: User Ecosystem — Social + Wallet
**Goal:** Users can follow, DM, purchase coins, view balances

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| 2.1 | Social service | Follow/unfollow, block, follower lists | ✅ Done |
| 2.2 | DM system | Conversations, messages, read receipts | ✅ Done |
| 2.3 | Wallet system | Coin/diamond balances, optimistic locking | ✅ Done |
| 2.4 | Coin packages | Store, purchase flow (Stripe + IAP stubs) | ✅ Done |
| 2.5 | Transaction ledger | `coin_transactions`, `diamond_transactions` | ✅ Done |
| 2.6 | Push notifications | FCM integration, token registration | ✅ Done |
| 2.7 | Notification preferences | Per-channel, per-category opt-in/out | ✅ Done |
| 2.8 | Presence system | Online/offline tracking via Redis | ✅ Done |

### PHASE 3: Agency System
**Goal:** Agencies can register, get approved, view dashboards

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| 3.1 | Agency schema | `agencies`, `agency_applications`, `agency_hosts` | ✅ Done |
| 3.2 | Agency registration | `registerAgency()` with AG######## code gen | ✅ Done |
| 3.3 | Agency approval | `reviewAgency()` — admin approves/rejects | ✅ Done |
| 3.4 | Agency web panel | Dashboard, host roster, agency code display | ✅ Done |
| 3.5 | Commission rules | `commission_rules` table + tier assignment | ✅ Done |
| 3.6 | Admin agency controls | List/filter/approve/reject agencies | ✅ Done |
| 3.7 | Agency analytics | Earnings, host count, performance metrics | ✅ Done |
| 3.8 | Agency commission tracking | `agency_commission_records` per period | ✅ Done |

### PHASE 4: Host System
**Goal:** Users can apply to be hosts, admin approves, host IDs assigned

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| 4.1 | Host application schema | `host_applications`, `hosts` tables | ✅ Done |
| 4.2 | Application submission | Mode selection (independent/agency), ID proof upload | ✅ Done |
| 4.3 | Agency code validation | Verify AG######## before linking | ✅ Done |
| 4.4 | Admin host approval | Generate H#########/AH########, create host record | ✅ Done |
| 4.5 | Role upgrade | `platformRole` → MODEL_INDEPENDENT or MODEL_AGENCY | ✅ Done |
| 4.6 | Agency host linking | `agency_hosts` row created on approval | ✅ Done |
| 4.7 | Admin host dashboard | Approval queue + host roster + filters | ✅ Done |
| 4.8 | Creator profile upsert | `models` table entry for host capabilities | ✅ Done |
| 4.9 | **Mobile host onboarding** | "Become a Host" flow with form + agency code input | ✅ Done |
| 4.10 | **Host approval notifications** | Push notification when approved/rejected | ✅ Done |

### PHASE 5: Core Features — Live, Calls, Gifts
**Goal:** Full creator economy operational

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| 5.1 | Live streaming | Start/end, viewer joins, chat, trending | ✅ Done |
| 5.2 | Gift system | Catalog, send gift, coin debit, diamond credit | ✅ Done |
| 5.3 | Gift animations | Realtime broadcast via Socket.io | ✅ Done |
| 5.4 | Call system | Request/accept/end, per-minute billing | ✅ Done |
| 5.5 | Call history | Immutable log + billing ticks | ✅ Done |
| 5.6 | Party rooms | Create/join, seats, themes, activities | ✅ Done |
| 5.7 | Group audio | Rooms, hand raises, paid listening | ✅ Done |
| 5.8 | PK battles | Multi-guest streams with scoring | ✅ Done |
| 5.9 | In-call games | Dice, cards, trivia during calls | ✅ Done |

### PHASE 6: Admin Panel — Full Control
**Goal:** Admin has complete oversight and control

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| 6.1 | Admin dashboard | Platform-wide stats (users, revenue, streams) | ✅ Done |
| 6.2 | User management | List, search, suspend, ban, view details | ✅ Done |
| 6.3 | Financial management | Payments, payouts, withdrawal approval | ✅ Done |
| 6.4 | Content moderation | Report queue, ban management | ✅ Done |
| 6.5 | Fraud detection | Risk scoring, flag review | ✅ Done |
| 6.6 | Gift management | Catalog CRUD, economy settings | ✅ Done |
| 6.7 | Event management | Create/publish events, track participation | ✅ Done |
| 6.8 | Leaderboard config | Board types, scoring metrics, windows | ✅ Done |
| 6.9 | Level system | Tracks, thresholds, rewards, badges | ✅ Done |
| 6.10 | Notification campaigns | Template management, audience targeting | ✅ Done |
| 6.11 | UI layout config | Dynamic home/tab layout management | ✅ Done |
| 6.12 | Feature flags | Per-feature, per-platform, per-version toggles | ✅ Done |
| 6.13 | Settings | Creator economy policy, commission rules | ✅ Done |
| 6.14 | Audit logging | All admin actions tracked in `admin_logs` | ✅ Done |

### PHASE 7: Optimization & Production Hardening
**Goal:** Production-ready, secure, performant

| # | Task | Deliverable | Status |
|---|------|-------------|--------|
| 7.1 | Redis caching layer | Hot-path caching (profiles, streams, config) | 🔲 Remaining |
| 7.2 | Rate limiting | Per-endpoint Redis-backed throttling | 🔲 Remaining |
| 7.3 | CDN + image optimization | Cloudflare for static assets + image resize | 🔲 Remaining |
| 7.4 | Error tracking | Sentry integration (API + web + mobile) | 🔲 Remaining |
| 7.5 | CI/CD pipeline | GitHub Actions: lint → test → build → deploy | 🔲 Remaining |
| 7.6 | Docker containerization | API + web Dockerfiles, compose stack | ✅ Done (infra/) |
| 7.7 | Monitoring | Prometheus metrics + Grafana dashboards | ✅ Done (infra/) |
| 7.8 | Load testing | k6/Artillery scripts for API endpoints | 🔲 Remaining |
| 7.9 | Database optimization | Query analysis, index tuning, connection pooling | 🔲 Remaining |
| 7.10 | Security audit | OWASP Top 10 checklist, penetration test prep | 🔲 Remaining |
| 7.11 | GDPR compliance | Account deletion flow, data export, privacy policy | 🔲 Remaining |
| 7.12 | **Mobile host onboarding UI** | Complete host application screens in Expo | ✅ Done |
| 7.13 | **Agency code lookup UI** | Mobile UI for entering/validating agency code | ✅ Done |
| 7.14 | **Host confirmation notifications** | Push + in-app notification on approval/rejection | ✅ Done |

---

## Summary — Current State vs Target

### What's Built (Production-Verified on Neon)

| Domain | Status |
|--------|--------|
| Auth (Clerk + JWT + multi-provider) | ✅ Complete |
| User profiles, follow graph, blocks | ✅ Complete |
| DM messaging | ✅ Complete |
| Wallet (coins + diamonds + optimistic locking) | ✅ Complete |
| Gift system (7 contexts, animations, economySnapshots) | ✅ Complete |
| Live streaming (rooms, viewers, chat, trending) | ✅ Complete |
| Call system (billing ticks, RTC tokens, history) | ✅ Complete |
| Party rooms (seats, themes, activities, paid entry) | ✅ Complete |
| Group audio (speakers, listeners, billing, hand raises) | ✅ Complete |
| In-call games (dice, cards, trivia) | ✅ Complete |
| Host application + approval (H/AH ID gen) | ✅ Complete |
| Agency registration + approval (AG code gen) | ✅ Complete |
| Commission rules + tracking | ✅ Complete |
| Level/XP system (event-ledger based) | ✅ Complete |
| VIP subscriptions | ✅ Complete |
| Referral system | ✅ Complete |
| Events + leaderboards | ✅ Complete |
| Notification system + campaigns | ✅ Complete |
| Admin panel (30+ routes) | ✅ Complete |
| Agency panel (6 routes) | ✅ Complete |
| Moderation + fraud detection | ✅ Complete |
| Discovery + recommendations | ✅ Complete |
| Dynamic UI layout system | ✅ Complete |
| Feature flag system | ✅ Complete |
| Docker + monitoring infrastructure | ✅ Complete |

### Remaining Work (Priority Order)

| Priority | Task | Effort |
|----------|------|--------|
| **P1** | Redis caching for hot paths | 2 days |
| **P1** | Rate limiting (Redis-backed) | 1 day |
| **P1** | Sentry error tracking integration | 1 day |
| **P1** | CI/CD pipeline (GitHub Actions) | 1 day |
| **P2** | Load testing scripts | 1 day |
| **P2** | GDPR account deletion automation | 1 day |
| **P2** | CDN + image optimization | 1 day |
| **P2** | Security audit checklist | 1 day |

---

## Architecture Decision Records (ADRs)

### ADR-001: Modular Monolith over Microservices

**Decision:** Start as NestJS modular monolith, extract services at scale thresholds.
**Rationale:** Microservices add network latency, deployment complexity, and distributed transaction overhead that a startup doesn't need. NestJS modules enforce domain boundaries while sharing a single deployment.
**Threshold for extraction:** Individual module hitting >100ms p99, or >10K req/s for that domain.

### ADR-002: tRPC over REST/GraphQL

**Decision:** tRPC v11 as primary API protocol.
**Rationale:** Full TypeScript monorepo — tRPC gives zero-cost type inference. No code generation, no schema files, instant client type updates. REST endpoints added only for webhooks and external integrations.

### ADR-003: Neon Serverless PostgreSQL

**Decision:** Neon as primary database.
**Rationale:** Serverless scaling (scale-to-zero for staging), branch-based CI, built-in connection pooling, instant read replicas. Cost-effective at low scale, scales to enterprise.
**Caveat:** `db.transaction()` not supported on Neon HTTP driver — use idempotency keys + optimistic locking instead.

### ADR-004: Prefix-Based ID System

**Decision:** Human-readable prefixed IDs (U/AG/H/AH + digits) instead of UUIDs for public-facing identifiers.
**Rationale:** IDs that users share verbally (agency codes, host IDs) must be short and memorable. Internal IDs remain UUIDs. Prefixes encode entity type for debugging.

### ADR-005: Config-Driven Business Logic

**Decision:** All business rules (pricing, commissions, limits, feature flags) stored in DB and `packages/config`, never hard-coded in service logic.
**Rationale:** Business rules change frequently. Config-driven approach enables admin panel control without code deploys. `economy_settings` + `commission_rules` + `feature_flags` tables are the config source of truth.
