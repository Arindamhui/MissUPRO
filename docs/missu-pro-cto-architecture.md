 # MissU Pro — Production Architecture Blueprint

**Author:** CTO Architecture Office  
**Date:** March 2026  
**Status:** Active — Phase 6 (Hardening)

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                        │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐              │
│  │ Mobile App   │   │  Web Admin   │   │  Agency Panel    │              │
│  │ (Expo/RN)    │   │ (Next.js)    │   │ (Next.js)        │              │
│  │ Users+Hosts  │   │ Superadmin   │   │ Agency Owners    │              │
│  └──────┬───────┘   └──────┬───────┘   └────────┬─────────┘              │
│         │                  │                     │                        │
└─────────┼──────────────────┼─────────────────────┼────────────────────────┘
          │                  │                     │
          ▼                  ▼                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        API GATEWAY / EDGE                                │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │  Rate Limiter  │  CORS  │  JWT Verify  │  Request Logger          │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (NestJS + tRPC)                   │
│                                                                          │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Auth   │ │ MissuPro│ │   Admin     │ │ Agencies │ │  Users   │    │
│  │ Module  │ │ Module  │ │   Module    │ │  Module  │ │  Module  │    │
│  └─────────┘ └─────────┘ └─────────────┘ └──────────┘ └──────────┘    │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Calls  │ │  Live   │ │   Gifts    │ │  Wallet  │ │ Payments │    │
│  │ Module  │ │ Module  │ │   Module    │ │  Module  │ │  Module  │    │
│  └─────────┘ └─────────┘ └─────────────┘ └──────────┘ └──────────┘    │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐    │
│  │  Games  │ │  Party  │ │ GroupAudio │ │   PK     │ │  Events  │    │
│  │ Module  │ │ Module  │ │   Module    │ │  Module  │ │  Module  │    │
│  └─────────┘ └─────────┘ └─────────────┘ └──────────┘ └──────────┘    │
│  ┌─────────┐ ┌─────────┐ ┌─────────────┐ ┌──────────┐                  │
│  │  DM/Chat│ │Discovery│ │ Moderation │ │  Fraud   │                  │
│  │ Module  │ │ Module  │ │   Module    │ │  Module  │                  │
│  └─────────┘ └─────────┘ └─────────────┘ └──────────┘                  │
│                                                                          │
│  ═══════════════════ CROSS-CUTTING CONCERNS ═══════════════════════════  │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ RBAC Guards │ Rate Limiter │ Audit Logger │ Approval Engine       │  │
│  │ ID Engine   │ Notification │ Error Handler│ Input Sanitizer       │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────┬──────────────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          ▼                     ▼                     ▼
┌──────────────┐ ┌────────────────────┐ ┌──────────────────────┐
│  PostgreSQL  │ │      Redis         │ │    Object Storage    │
│  (Neon DB)   │ │  Sessions/Cache    │ │    (S3 / R2)         │
│  35+ tables  │ │  Pub/Sub, Queues   │ │  Media, ID proofs    │
└──────────────┘ └────────────────────┘ └──────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL SERVICES                                    │
│  ┌──────────┐ ┌───────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐       │
│  │  Stripe  │ │ Razorpay  │ │ Agora  │ │ Sentry  │ │  FCM/APNs│       │
│  └──────────┘ └───────────┘ └────────┘ └─────────┘ └──────────┘       │
│  ┌──────────┐ ┌───────────┐ ┌────────┐                                  │
│  │Apple IAP │ │Google Play│ │ Google │                                  │
│  │  Billing │ │  Billing  │ │ OAuth  │                                  │
│  └──────────┘ └───────────┘ └────────┘                                  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Separation of Concerns** | Each NestJS module owns one domain (auth, hosts, agencies, wallet) |
| **Append-only Ledgers** | Coin/diamond transactions, XP events, admin logs — immutable |
| **Idempotency** | All mutation endpoints accept idempotency keys for safe retries |
| **DB-level Integrity** | Foreign keys, unique indices, enum constraints at Postgres level |
| **Zero-trust Auth** | JWT verified on every request, session validated, role checked |
| **Event-driven Ready** | Notification service decoupled; webhook event tracking for payments |

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Monorepo** | Turborepo + npm workspaces | Fast builds, shared packages, single dependency tree |
| **API** | NestJS + tRPC v11 | Type-safe RPC, dependency injection, modular architecture |
| **Database** | PostgreSQL (Neon) + Drizzle ORM | Serverless Postgres, type-safe schema-first ORM |
| **Mobile** | Expo SDK 55 + React Native | Cross-platform (iOS/Android), OTA updates, Expo Router |
| **Web** | Next.js + Tailwind CSS | SSR/SSG, admin panel, SEO for landing page |
| **Auth** | Custom JWT (HS256) + Google OAuth + OTP | Full control, no vendor lock-in, session management |
| **Realtime** | Socket.IO + Redis Adapter | WebSocket for chat, live streams, presence |
| **Payments** | Stripe + Razorpay + Apple IAP + Google Play | Multi-gateway, global coverage |
| **RTC** | Agora | Voice/video calls, live streaming |
| **Cache** | ioredis | Session cache, rate limiting, pub/sub |
| **Storage** | AWS S3 | Media uploads, ID proofs, demo videos |
| **Monitoring** | Sentry | Error tracking, performance monitoring |
| **Validation** | Zod v4 | Runtime type checking at API boundaries |
| **Language** | TypeScript 5.9 | End-to-end type safety across all packages |

---

## 3. Database Schema

### 3.1 Core Identity Tables

#### `users` — All platform participants
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | uuid | PK, auto | Internal identifier |
| public_user_id | text | UNIQUE, indexed | `U#########` — externally visible |
| email | text | UNIQUE | Canonical identity |
| username | text | UNIQUE | Display handle |
| clerk_id | text | UNIQUE, nullable | Legacy Clerk compat |
| phone | text | UNIQUE, nullable | Phone auth |
| password_hash | text | nullable | bcrypt(10) |
| display_name | text | | |
| avatar_url | text | nullable | |
| role | enum | USER/HOST/MODEL/ADMIN | Primary role |
| platform_role | enum | USER/MODEL_INDEPENDENT/MODEL_AGENCY/AGENCY/ADMIN | Granular role |
| auth_role | enum | admin/agency/null | Web panel access |
| auth_provider | enum | EMAIL/GOOGLE/PHONE_OTP/... | Primary auth method |
| status | enum | ACTIVE/SUSPENDED/BANNED/... | Account lifecycle |
| referral_code | text | UNIQUE | `4-byte hex, uppercase` |
| referred_by_user_id | uuid | FK→users | Attribution |
| country, city | text | | Geolocation |
| gender | enum | | |
| date_of_birth | date | nullable | Age verification |
| email_verified | boolean | default false | |
| phone_verified | boolean | default false | |
| is_verified | boolean | default false | Blue-check equivalent |
| preferred_locale | text | default 'en' | i18n |
| preferred_timezone | text | | |
| last_active_at | timestamp | | |
| deleted_at | timestamp | nullable | Soft delete |
| created_at | timestamp | auto | |
| updated_at | timestamp | auto | |

**Indices:** `(email)`, `(username)`, `(public_user_id)`, `(phone)`, `(referral_code)`, `(clerk_id)`, `(role, status)`

#### `profiles` — Extended user data
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK→users, UNIQUE |
| bio | text | Max 500 chars |
| social_links_json | jsonb | {instagram, tiktok, ...} |
| interests_json | jsonb | Array of interest tags |
| completeness_score | int | 0-100 |

#### `admins` — Admin-specific records
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK→users, UNIQUE |
| email | text | UNIQUE — must be in allowlist |
| admin_name | text | |
| is_active | boolean | |
| mfa_enabled | boolean | |
| mfa_secret_encrypted | text | AES-encrypted TOTP secret |
| last_login_at | timestamp | |
| last_login_ip | text | |
| login_attempts_failed | int | Brute-force protection |
| locked_until | timestamp | Auto-lock after N failures |
| ip_allowlist_json | jsonb | Restrict admin access by IP |

### 3.2 Host System Tables

#### `host_applications` — Application queue
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK→users |
| agency_id | uuid | FK→agencies, nullable |
| application_type | enum | PLATFORM / AGENCY |
| status | enum | PENDING / APPROVED / REJECTED |
| agency_code_snapshot | text | Snapshot of agency code at submit time |
| talent_details_json | jsonb | Categories, skills, experience |
| profile_info_json | jsonb | Bio, languages, tagline |
| id_proof_urls_json | jsonb | Array of S3 URLs (1-4) |
| review_notes | text | Admin notes |
| reviewed_by_admin_user_id | uuid | FK→users |
| submitted_at | timestamp | |
| reviewed_at | timestamp | |

**Indices:** `(status, submitted_at)`, `(user_id, status, submitted_at)`, `(agency_id, status, submitted_at)`

#### `hosts` — Approved host registry
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| host_id | text | **UNIQUE** — `H#########` or `AH########` |
| user_id | uuid | FK→users, **UNIQUE** (1 user = 1 host max) |
| agency_id | uuid | FK→agencies, nullable |
| type | enum | PLATFORM / AGENCY |
| status | enum | PENDING / APPROVED / REJECTED / SUSPENDED |
| talent_details_json | jsonb | |
| profile_info_json | jsonb | |
| id_proof_urls_json | jsonb | |
| source_application_id | uuid | FK→host_applications |
| review_notes | text | |
| reviewed_by_admin_user_id | uuid | FK→users |
| approved_at | timestamp | |
| rejected_at | timestamp | |

**Indices:** `UNIQUE(host_id)`, `UNIQUE(user_id)`, `(agency_id, status, created_at)`, `(type, status, created_at)`

### 3.3 Agency System Tables

#### `agencies` — Agency registry
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK→users — agency owner |
| agency_name | text | |
| agency_code | text | **UNIQUE** — `AG########` (8 digits) |
| contact_name | text | |
| contact_email | text | |
| country | text | |
| status | text | PENDING/ACTIVE/REJECTED |
| approval_status | text | PENDING/APPROVED/REJECTED |
| metadata_json | jsonb | Website, whatsapp, notes |
| commission_tier | text | Default tier |
| approved_by_admin_id | uuid | FK→admins |
| approved_at | timestamp | |
| rejected_at | timestamp | |
| deleted_at | timestamp | Soft delete |

**Indices:** `UNIQUE(agency_code)`, `(approval_status, created_at)`, `(user_id)`

#### `agency_hosts` — Host roster (many-to-many)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| agency_id | uuid | FK→agencies |
| user_id | uuid | FK→users |
| status | text | ACTIVE / REMOVED |
| assigned_at | timestamp | |

**Indices:** `UNIQUE(agency_id, user_id)`, `(agency_id, status)`

#### `agency_applications` — Agency creation applications
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| applicant_user_id | uuid | FK→users |
| agency_name, contact_name, contact_email, country | text | |
| status | enum | PENDING / APPROVED / REJECTED |
| created_agency_id | uuid | FK→agencies (post-approval) |
| reviewed_by_admin_id | uuid | FK→admins |
| notes | text | |

#### `agency_commission_records` — Revenue tracking
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| agency_id | uuid | FK→agencies |
| host_user_id | uuid | FK→users |
| period_start, period_end | timestamp | Billing period |
| gross_revenue_usd | decimal(12,2) | |
| host_payout_usd | decimal(12,2) | |
| commission_amount_usd | decimal(12,2) | |
| commission_rate | decimal(5,4) | e.g. 0.2000 = 20% |
| status | enum | PENDING/APPROVED/SETTLED |

#### `commission_rules` — Tiered commission policies
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| agency_id | uuid | nullable (null = global default) |
| rule_key | text | UNIQUE with agency_id + effective_from |
| rule_scope, host_tier, revenue_source | text | |
| commission_rate | decimal(5,4) | |
| minimum_payout_usd | decimal(10,2) | |
| priority | int | Higher = takes precedence |
| status | enum | DRAFT/ACTIVE/ARCHIVED |
| effective_from, effective_to | timestamp | |

### 3.4 Model/Creator Tables

#### `models` — Creator profiles (synced from hosts)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK→users, UNIQUE |
| agency_id | uuid | FK→agencies, nullable |
| model_type | enum | INDEPENDENT / AGENCY |
| registration_status | enum | PENDING/ACTIVE/REJECTED/SUSPENDED |
| talent_categories_json | jsonb | Array of category strings |
| talent_description | text | |
| languages_json | jsonb | |
| call_rate_audio_coins | int | Per-minute rate |
| call_rate_video_coins | int | |
| is_online | boolean | |
| last_online_at | timestamp | |
| response_rate | decimal(5,2) | 0.00-100.00 |
| quality_score | decimal(5,2) | |
| approved_at | timestamp | |
| approved_by_admin_id | uuid | FK→admins |

### 3.5 Relationship Map

```
users ─────┬── 1:1 ──→ profiles
            ├── 1:1 ──→ hosts           (a user can be max 1 host)
            ├── 1:1 ──→ models          (synced from host approval)
            ├── 1:N ──→ host_applications
            ├── 1:1 ──→ admins          (if admin)
            ├── 1:1 ──→ agencies        (if agency owner)
            ├── 1:1 ──→ wallets
            └── 1:N ──→ auth_sessions

agencies ──┬── 1:N ──→ agency_hosts     (roster)
            ├── 1:N ──→ hosts            (hosts under agency)
            ├── 1:N ──→ host_applications (applications to this agency)
            ├── 1:N ──→ agency_commission_records
            └── 1:N ──→ commission_rules

hosts ─────┬── N:1 ──→ users
            ├── N:1 ──→ agencies         (nullable, only for AGENCY type)
            └── N:1 ──→ host_applications (source_application_id)

host_applications ─── N:1 ──→ users
                   ─── N:1 ──→ agencies (nullable)

admin_logs ─── N:1 ──→ admins (immutable audit trail)
```

---

## 4. API Endpoints

### 4.1 Authentication (`auth.*`)

| Procedure | Access | Method | Description |
|-----------|--------|--------|-------------|
| `auth.signUpWithEmail` | Public | mutation | Email + password signup → creates session |
| `auth.signInWithEmail` | Public | mutation | Email login → JWT token |
| `auth.signInWithGoogle` | Public | mutation | Google OAuth ID token → JWT |
| `auth.sendVerificationEmail` | Protected | mutation | Send email verification link |
| `auth.verifyEmail` | Public | mutation | Verify email token |
| `auth.resendVerification` | Protected | mutation | Resend verification email |
| `auth.revokeSession` | Protected | mutation | Logout current session |
| `auth.listMySessions` | Protected | query | List active sessions |
| `auth.getMobileSession` | Protected | query | Resolve mobile panel (user/model/agency) |
| `auth.completeMobileOnboarding` | Protected | mutation | Complete mobile onboarding |
| `auth.completeAgencySignup` | Protected | mutation | Complete agency profile |
| `auth.loginAsAgencyModel` | Protected | mutation | Model logs in through agency |

### 4.2 MissU Pro — Host & Agency System (`missuPro.*`)

| Procedure | Access | Method | Description |
|-----------|--------|--------|-------------|
| `missuPro.getMyWorkspace` | Protected | query | Get user's host/agency/application overview |
| `missuPro.lookupAgencyByCode` | Protected | query | Validate agency code exists & is approved |
| `missuPro.submitHostApplication` | Protected | mutation | Submit PLATFORM or AGENCY host application |
| `missuPro.registerAgency` | Protected | mutation | Register new agency (status=PENDING) |
| `missuPro.getAgencyOverview` | Protected | query | Agency owner's dashboard with roster |
| `missuPro.getAdminOverview` | Admin | query | KPIs: users, hosts, agencies, pending counts |
| `missuPro.listHostApplications` | Admin | query | Filter by status, paginated |
| `missuPro.reviewHostApplication` | Admin | mutation | Approve/Reject with reason |
| `missuPro.listAgencies` | Admin | query | Filter by approval status |
| `missuPro.reviewAgency` | Admin | mutation | Approve/Reject agency |
| `missuPro.listHosts` | Admin | query | Filter by status/type |
| `missuPro.suspendHost` | Admin | mutation | **NEW** Suspend active host |
| `missuPro.reactivateHost` | Admin | mutation | **NEW** Reactivate suspended host |
| `missuPro.removeHostFromAgency` | Agency | mutation | **NEW** Remove host from agency roster |
| `missuPro.transferHost` | Admin | mutation | **NEW** Transfer host between agencies |

### 4.3 Agency System (`agency.*`)

| Procedure | Access | Method | Description |
|-----------|--------|--------|-------------|
| `agency.submitApplication` | Protected | mutation | Apply to create agency |
| `agency.listMyApplications` | Protected | query | User's agency applications |
| `agency.applyAsAgency` | Protected | mutation | Quick-create agency |
| `agency.listPublicSquads` | Public | query | Browse agencies (POPULAR/RANK) |
| `agency.getMySquadOverview` | Agency | query | Agency dashboard |
| `agency.joinSquad` | Agency | mutation | Request to join agency |
| `agency.acceptInvite` | Agency | mutation | Accept agency invite |
| `agency.removeHost` | Agency | mutation | Remove host from roster |
| `agency.inviteHost` | Agency | mutation | Invite user to agency |
| `agency.getHostRoster` | Agency | query | Paginated host list |
| `agency.getCommissionSummary` | Agency | query | Revenue breakdown |
| `agency.getAgencyDashboard` | Agency | query | Full dashboard |

### 4.4 Admin System (`admin.*`)

| Procedure | Access | Description |
|-----------|--------|-------------|
| `admin.getDashboardStats` | Admin | Aggregate KPIs |
| `admin.listUsers` | Admin | Search/paginate all users |
| `admin.getUserDetail` | Admin | Full user profile + wallet |
| `admin.updateUserStatus` | Admin | Suspend/ban/restore user |
| `admin.updateUserRole` | Admin | Change user role |
| `admin.listModelApplications` | Admin | Model app queue |
| `admin.approveModelApplication` | Admin | Approve model |
| `admin.rejectModelApplication` | Admin | Reject model with reason |
| `admin.listModels` | Admin | Active models with stats |
| `admin.getFinancialOverview` | Admin | Revenue, payouts, disputes |
| `admin.listWithdrawRequests` | Admin | Pending withdrawals |
| `admin.processWithdrawRequest` | Admin | Approve/reject withdrawal |
| `admin.listGifts` | Admin | Gift catalog |
| `admin.createGift` / `admin.updateGift` | Admin | Manage gifts |
| `admin.listAgencies` | Admin | All agencies |
| `admin.approveAgency` | Admin | Approve agency |
| `admin.listFraudFlags` | Admin | Fraud investigations |
| `admin.listReports` | Admin | User reports |
| `admin.imposeBan` / `admin.revokeBan` | Admin | Ban management |
| `admin.getSystemSettings` | Admin | Config management |
| `admin.listFeatureFlags` | Admin | Feature toggles |
| `admin.clearCache` | Admin | Cache invalidation |

*(100+ total admin procedures — see full list in admin.router.ts)*

### 4.5 Why REST via tRPC (not GraphQL)

| Factor | tRPC (chosen) | GraphQL | REST |
|--------|---------------|---------|------|
| **Type safety** | End-to-end (TS→TS) | Codegen required | Manual |
| **Bundle size** | Zero runtime | Heavy client lib | Zero |
| **Learning curve** | Low (just TS) | High (SDL, resolvers) | Low |
| **Overfetching** | Controlled via router design | Solved natively | Common |
| **Subscriptions** | Socket.IO already in use | Built-in but complex | Not native |
| **Mobile compat** | Works with React Query | Apollo adds 150KB | Works |

**Decision:** tRPC gives us end-to-end type safety across monorepo without schema duplication, codegen steps, or runtime overhead. Real-time is handled separately via Socket.IO.

---

## 5. ID Generation Logic

### Design Requirements
- **Collision-free** under concurrent writes
- **Prefix-based** for visual identification of entity type
- **Numeric suffix** for human readability
- **Indexed** with unique constraints at DB level
- **Immutable** once assigned

### Implementation

```
User ID:    U + 9 digits  → U123456789    (1 billion namespace)
Agency ID:  AG + 8 digits → AG12345678    (100 million namespace)
Host ID:    H + 9 digits  → H123456789    (platform, 1 billion)
            AH + 8 digits → AH12345678    (agency, 100 million)
```

### Algorithm (Cryptographic Random + DB Retry)

```typescript
// packages/api/src/common/id-generation.service.ts
async generateUniqueCode(prefix, digits, existsCheck): string {
  for (attempt = 0; attempt < 20; attempt++) {
    candidate = prefix + cryptoRandomDigits(digits);
    if (!await existsCheck(candidate)) return candidate;
  }
  // Fallback: timestamp-based deterministic ID
  return prefix + timestampDigits(digits);
}

cryptoRandomDigits(length): string {
  // Uses crypto.randomBytes() → extract decimal digits only
  // Ensures uniform distribution across 10^length space
}
```

### Safety Guarantees

| Layer | Protection |
|-------|-----------|
| **Application** | 20 retry attempts with crypto-random candidates |
| **Database** | UNIQUE index on `hosts.host_id`, `agencies.agency_code`, `users.public_user_id` |
| **Concurrency** | If two writers generate same ID, DB unique constraint will reject one → retry |
| **Fallback** | Timestamp-based ID ensures generation never fails |
| **Namespace** | 10^9 for users/hosts, 10^8 for agencies — sufficient for millions |

---

## 6. RBAC Logic

### Role Hierarchy

```
ADMIN (superuser)
  └── Can control everything: users, hosts, agencies, config, finance

AGENCY (agency owner)
  └── Can manage own hosts, view commission, edit agency profile

HOST (MODEL_INDEPENDENT | MODEL_AGENCY)
  └── Can provide services (calls, streams, chat), view earnings

USER (default)
  └── Can consume services, purchase coins, send gifts
```

### Implementation Layers

**Layer 1 — JWT Token Claims:**
```json
{
  "sub": "user-uuid",
  "sid": "session-uuid",
  "email": "user@example.com",
  "platformRole": "AGENCY",
  "authProvider": "EMAIL"
}
```

**Layer 2 — tRPC Middleware Chain:**
```
publicProcedure  → No auth required (landing pages, email verify)
protectedProcedure → isAuthed middleware → requires valid JWT + active session
adminProcedure   → isAdmin middleware → requires authRole="admin" OR platformRole="ADMIN"
agencyProcedure  → isAgency middleware → requires authRole="agency" OR platformRole="AGENCY"
hostProcedure    → isHost middleware → requires role="HOST" or platformRole contains "MODEL"
```

**Layer 3 — Database-level:**
```sql
-- Users table enforces role enum at column level
role user_role NOT NULL DEFAULT 'USER'
-- CHECK constraint equivalent via pgEnum
```

**Layer 4 — Admin IP Allowlist:**
```typescript
// Admin accounts store ip_allowlist_json
// Login checks request IP against allowlist
// Failed attempts increment counter → auto-lock after 5
```

### Role Transition Matrix

| From → To | Trigger | Reversible |
|-----------|---------|-----------|
| USER → HOST | Admin approves host application | Yes (suspend) |
| USER → AGENCY | Admin approves agency | Yes (reject) |
| HOST → SUSPENDED | Admin suspends host | Yes (reactivate) |
| AGENCY → REJECTED | Admin rejects agency | No (must reapply) |
| Any → BANNED | Admin bans account | Yes (admin restore) |

---

## 7. Folder Structure

### Monorepo Layout

```
MissUPRO1.1/
├── package.json                    # Root workspace config
├── turbo.json                      # Build orchestration
├── tsconfig.json                   # Base TS config
│
├── apps/
│   ├── web/                        # Next.js — Admin + Agency + Landing
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (public)/       # Landing page, public routes
│   │   │   │   │   ├── page.tsx    # Hero, Features, CTA, Footer
│   │   │   │   │   └── agencies/   # Agency discovery
│   │   │   │   ├── admin/          # Admin panel (protected)
│   │   │   │   │   ├── page.tsx    # Dashboard with KPIs
│   │   │   │   │   ├── users/      # User management
│   │   │   │   │   ├── models/     # Model management
│   │   │   │   │   ├── missu-pro/  # Host/Agency approval queues
│   │   │   │   │   ├── finance/    # Revenue, payouts, disputes
│   │   │   │   │   ├── analytics/  # Charts, metrics
│   │   │   │   │   └── ...
│   │   │   │   ├── agency/         # Agency panel (protected)
│   │   │   │   │   ├── page.tsx    # Agency dashboard
│   │   │   │   │   ├── missu-pro/  # Host roster management
│   │   │   │   │   └── finance/    # Commission tracking
│   │   │   │   └── auth/
│   │   │   │       ├── login/      # Admin/Agency login
│   │   │   │       └── signup/     # Agency signup
│   │   │   ├── components/
│   │   │   │   ├── admin/          # Admin-specific components
│   │   │   │   ├── agency/         # Agency-specific components
│   │   │   │   ├── common/         # Shared components
│   │   │   │   └── ui/             # Design system primitives
│   │   │   ├── lib/                # tRPC client, auth helpers
│   │   │   └── styles/             # Tailwind + global CSS
│   │   └── tailwind.config.js
│   │
│   └── mobile/                     # Expo (React Native)
│       ├── src/
│       │   ├── app/                # Expo Router (file-based routing)
│       │   │   ├── (auth)/
│       │   │   │   ├── login.tsx   # Phone OTP + Google OAuth
│       │   │   │   └── signup.tsx
│       │   │   └── (tabs)/
│       │   │       ├── index.tsx   # Home feed
│       │   │       ├── explore.tsx # Discovery
│       │   │       ├── live.tsx    # Live streams
│       │   │       ├── messages.tsx# DM inbox
│       │   │       ├── me.tsx      # Profile
│       │   │       └── host.tsx    # Host center (MissU Pro)
│       │   ├── components/
│       │   │   ├── LiveRoom/       # Streaming components
│       │   │   ├── CallScreen/     # Voice/video call UI
│       │   │   ├── GiftPanel/      # Gift sending animations
│       │   │   ├── PartyRoom/      # Party room UI
│       │   │   └── common/         # Shared components
│       │   ├── hooks/              # Custom hooks
│       │   ├── lib/                # tRPC client, auth storage
│       │   ├── screens/            # Full screen components
│       │   ├── store/              # Zustand state management
│       │   └── theme/              # Colors, typography
│       └── app.json                # Expo config
│
├── packages/
│   ├── api/                        # NestJS Backend
│   │   └── src/
│   │       ├── auth/               # Auth module (JWT, Google, OTP)
│   │       │   ├── auth.module.ts
│   │       │   ├── auth.controller.ts
│   │       │   ├── auth.router.ts  # tRPC procedures
│   │       │   └── auth.service.ts # Core auth logic
│   │       ├── missu-pro/          # Host + Agency core
│   │       │   ├── missu-pro.module.ts
│   │       │   ├── missu-pro.router.ts
│   │       │   └── missu-pro.service.ts
│   │       ├── admin/              # Admin panel backend
│   │       ├── agencies/           # Agency management
│   │       ├── users/              # User management
│   │       ├── wallet/             # Coin/diamond ledger
│   │       ├── payments/           # Multi-gateway payments
│   │       ├── gifts/              # Gift system
│   │       ├── calls/              # Voice/video calls
│   │       ├── live/               # Live streaming
│   │       ├── games/              # In-call games
│   │       ├── party/              # Party rooms
│   │       ├── group-audio/        # Group audio rooms
│   │       ├── pk/                 # PK battles
│   │       ├── chat/               # DM messaging
│   │       ├── discovery/          # Recommendations + search
│   │       ├── notifications/      # Push + in-app + email
│   │       ├── moderation/         # Reports + bans
│   │       ├── fraud/              # Risk scoring
│   │       ├── trpc/               # tRPC infrastructure
│   │       │   ├── trpc.context.ts # Request context (userId, roles)
│   │       │   ├── trpc.service.ts # Middleware + procedure chains
│   │       │   └── trpc.router.ts  # Root router (merges all)
│   │       └── common/             # Shared services
│   │           ├── id-generation.service.ts  # ID engine
│   │           ├── approval.service.ts       # Approval workflow
│   │           ├── rate-limiter.service.ts    # Rate limiting
│   │           └── audit.service.ts          # Audit logging
│   │
│   ├── db/                         # Database package
│   │   ├── schema/                 # 30+ schema files
│   │   │   ├── enums.ts            # All pg enums
│   │   │   ├── users.ts            # users, profiles, followers
│   │   │   ├── hosts.ts            # host_applications, hosts
│   │   │   ├── agencies.ts         # agencies, agency_hosts, commissions
│   │   │   ├── admin.ts            # admins, admin_logs
│   │   │   ├── models.ts           # models, applications, stats
│   │   │   ├── wallet.ts           # wallets, transactions
│   │   │   ├── gifts.ts            # gifts, gift_transactions
│   │   │   ├── live.ts             # live_rooms, streams, viewers
│   │   │   ├── calls.ts            # calls, sessions, billing
│   │   │   ├── games.ts            # games, sessions, moves
│   │   │   └── ...
│   │   ├── migrations/             # Drizzle migrations
│   │   ├── seed/                   # Dev/test seed data
│   │   ├── drizzle.config.ts
│   │   └── index.ts                # DB client export
│   │
│   ├── types/                      # Shared TypeScript types
│   │   └── src/
│   │       ├── enums.ts            # TS enum mirrors
│   │       ├── api.ts              # API response types
│   │       └── index.ts
│   │
│   ├── utils/                      # Shared utilities
│   │   └── src/
│   │       ├── algorithms.ts       # Scoring, pricing, ID helpers
│   │       ├── money.ts            # Currency formatting
│   │       └── index.ts
│   │
│   ├── config/                     # Environment config
│   └── ui/                         # Shared React components
│
├── services/                       # Standalone services (future microservices)
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
├── infra/                          # Infrastructure
│   ├── docker/                     # Docker configs
│   ├── ci-cd/                      # CI/CD pipelines
│   ├── deployment/                 # Deploy scripts + monitoring
│   └── scripts/                    # Deploy automation
│
└── docs/                           # Architecture docs
    ├── missu-pro-cto-architecture.md  # THIS FILE
    ├── system-architecture.md
    ├── neon-schema-design.md
    └── saas-auth-rbac-architecture.md
```

---

## 8. Development Roadmap

### Phase 1: Foundation (COMPLETE ✅)
| Task | Status | Deliverable |
|------|--------|-------------|
| Monorepo setup (Turborepo + npm) | ✅ | Build pipeline |
| PostgreSQL schema (35+ tables) | ✅ | Drizzle migrations |
| Auth (JWT + Google OAuth + Email) | ✅ | Login/signup flows |
| User profiles + follow system | ✅ | User module |
| Wallet + append-only coin ledger | ✅ | Wallet module |
| Admin auth with audit logging | ✅ | Admin module |
| Mobile auth screens | ✅ | Expo screens |
| Push notification tokens | ✅ | FCM/APNs |

### Phase 2: Economy (COMPLETE ✅)
| Task | Status | Deliverable |
|------|--------|-------------|
| Coin packages (4 gateways) | ✅ | Stripe/Razorpay/IAP |
| Gift system (catalog, send, diamonds) | ✅ | Gift module |
| Model applications + verification | ✅ | Model queue |
| Daily rewards + login streaks | ✅ | Engagement hooks |
| Payment reconciliation + webhooks | ✅ | Financial integrity |

### Phase 3: Communication (COMPLETE ✅)
| Task | Status | Deliverable |
|------|--------|-------------|
| Live streaming (Agora) | ✅ | Live module |
| Voice/video calls + per-min billing | ✅ | Call module |
| Live room chat | ✅ | Socket.IO chat |
| Direct messaging (1:1 DM) | ✅ | Chat module |
| Model availability scheduling | ✅ | Schedule system |
| Notifications (push + in-app + email) | ✅ | Notification module |

### Phase 4: Creator Systems (COMPLETE ✅)
| Task | Status | Deliverable |
|------|--------|-------------|
| Model levels (tiered pricing) | ✅ | Level engine |
| Dynamic call pricing (3 formulas) | ✅ | Pricing module |
| Payout system (withdraw → settle) | ✅ | Payout pipeline |
| Creator analytics dashboard | ✅ | Analytics views |
| User level system (spend-based) | ✅ | XP engine |
| Level badges + auto-rewards | ✅ | Gamification |

### Phase 5: Engagement (COMPLETE ✅)
| Task | Status | Deliverable |
|------|--------|-------------|
| Games (Chess, Ludo, Carrom, Sudoku) | ✅ | Game engine |
| Events + leaderboards | ✅ | Competition system |
| VIP membership tiers | ✅ | Subscription module |
| Referral system with rewards | ✅ | Referral module |
| PK battles (2-host compete) | ✅ | PK module |
| Group audio rooms | ✅ | GroupAudio module |
| Party rooms with seats + activities | ✅ | Party module |
| Search + discovery + server-driven UI | ✅ | Discovery module |

### Phase 6: Hardening + MissU Pro (IN PROGRESS 🔄)
| Task | Status | Deliverable |
|------|--------|-------------|
| Fraud detection (scoring, flags) | ✅ | Fraud module |
| Moderation (reports, bans) | ✅ | Moderation module |
| Agency system (registration, commission) | ✅ | Agency module |
| Host application flow | ✅ | MissU Pro module |
| ID generation engine (U/AG/H/AH) | ✅ | ID service |
| **HOST-role guard (isHost middleware)** | 🔄 | RBAC enhancement |
| **Rate limiting at tRPC level** | 🔄 | Security hardening |
| **Approval engine (reusable service)** | 🔄 | Cross-module |
| **Host suspension/reactivation** | 🔄 | Lifecycle management |
| **Agency host transfer** | 🔄 | Agency operations |
| **Audit logging for all host actions** | 🔄 | Compliance |
| CI/CD pipeline | ⏳ | GitHub Actions |
| Observability (Sentry + logs) | ⏳ | Monitoring |
| Performance optimization | ⏳ | Caching, queries |
| Load testing | ⏳ | k6 / Artillery |

---

## 9. Security Checklist

| Category | Implementation |
|----------|---------------|
| **Input Validation** | Zod schemas on every tRPC input — `.trim()`, `.min()`, `.max()`, `.url()`, `.email()` |
| **Authentication** | JWT HS256 with 7-day expiry, session table validation, refresh token hashing |
| **Authorization** | 4-tier RBAC: middleware → procedure → service → DB constraints |
| **Rate Limiting** | Redis-backed rate limiter on auth endpoints, admin actions, mutations |
| **Password Storage** | bcrypt with cost factor 10 |
| **XSS Prevention** | React auto-escapes, CSP headers, no `dangerouslySetInnerHTML` |
| **SQL Injection** | Drizzle ORM parameterized queries — no raw SQL with user input |
| **CSRF** | Token-based auth (no cookies for API), SameSite for web sessions |
| **Data Privacy** | Account deletion pipeline, GDPR export, soft deletes |
| **Admin Security** | IP allowlist, MFA support, auto-lock after 5 failed logins |
| **Audit Trail** | Immutable `admin_logs` table with before/after state JSON |
| **Webhook Security** | Signature validation (Stripe, Razorpay), idempotent processing |
| **Secrets** | JWT secret ≥16 chars enforced, env-only (never in code) |
| **File Upload** | S3 presigned URLs, file type validation, CSAM scanning |

---

## 10. Performance & Scale Strategy

| Strategy | Implementation |
|----------|---------------|
| **DB Indexing** | Composite indices on all filter+sort columns (status+created_at, etc.) |
| **Connection Pooling** | Neon serverless driver with built-in pooling |
| **Caching** | Redis for sessions, presence, rate limits, leaderboard snapshots |
| **Query Optimization** | Cursor-based pagination (no OFFSET), selective column SELECTs |
| **Horizontal Ready** | Stateless API (JWT, no server sessions), Redis adapter for Socket.IO |
| **Read Replicas** | Neon supports read replicas for analytics queries |
| **CDN** | S3 + CloudFront for media assets |
| **Async Processing** | Notification campaigns, audit writes, analytics events |
| **Batch Operations** | Commission settlement, leaderboard snapshots run on schedule |
| **Monitoring** | Sentry performance, structured logging, health checks |
