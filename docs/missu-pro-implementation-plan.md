# MissU Pro Implementation Plan

## Scope Delivered In This Slice

This implementation adds the first production-grade MissU Pro domain slice across the existing monorepo:

- public MissU user IDs in the `users` table
- canonical `hosts` and `host_applications` tables
- agency onboarding with `AG########` IDs via `agencies.agency_code`
- tRPC procedures for mobile, admin, and agency panels
- dedicated web routes for admin operations and agency panel workflows
- mobile host center with platform-host and agency-host application flows

The implementation is additive to the current platform so it does not require renaming legacy `model` concepts across the whole codebase in one migration.

## Folder Structure

### Existing packages extended

```text
packages/
  api/
    src/
      missu-pro/
        missu-pro.module.ts
        missu-pro.router.ts
        missu-pro.service.ts
  db/
    migrations/
      0017_missu_host_program.sql
    schema/
      hosts.ts
      enums.ts
      users.ts
      index.ts
```

### Web routes added

```text
apps/web/src/app/
  admin/
    missu-pro/page.tsx
  agency/
    missu-pro/page.tsx
  (public)/
    agencies/page.tsx
```

### Mobile routes added

```text
apps/mobile/src/app/
  (tabs)/
    host.tsx
```

### Existing mobile routes updated

```text
apps/mobile/src/app/
  (tabs)/_layout.tsx
  (tabs)/me.tsx
  (auth)/login.tsx
```

## Database Design

### `users`

Extended with:

- `public_user_id text unique`

Format:

- `U#########`
- example: `U959342446`

### `hosts`

Canonical approved-host table.

Columns:

- `id`
- `host_id`
- `user_id`
- `agency_id`
- `type` = `PLATFORM | AGENCY`
- `status` = `PENDING | APPROVED | REJECTED | SUSPENDED`
- `talent_details_json`
- `profile_info_json`
- `id_proof_urls_json`
- `source_application_id`
- `review_notes`
- `reviewed_by_admin_user_id`
- `approved_at`
- `rejected_at`
- `created_at`
- `updated_at`

Formats:

- platform host: `H#########`
- agency host: `AH########`

### `host_applications`

Approval queue for host onboarding.

Columns:

- `id`
- `user_id`
- `agency_id`
- `application_type`
- `status`
- `agency_code_snapshot`
- `talent_details_json`
- `profile_info_json`
- `id_proof_urls_json`
- `review_notes`
- `reviewed_by_admin_user_id`
- `submitted_at`
- `reviewed_at`
- `created_at`
- `updated_at`

### `agencies`

Existing table reused as the canonical agency registry.

Relevant MissU fields:

- `agency_name`
- `agency_code`
- `approval_status`
- `status`
- `metadata_json`

Format:

- `AG########`
- example: `AG56584585`

## Backend APIs

Router namespace: `trpc.missu.*`

### Protected procedures

- `getMyWorkspace`
  - returns user public ID, host state, latest host application, owned agency, and capability flags
- `lookupAgencyByCode`
  - validates agency IDs before agency-host submission
- `submitHostApplication`
  - supports direct platform hosts and agency-based hosts
- `registerAgency`
  - creates a pending agency registration and generates an agency code
- `getAgencyOverview`
  - agency roster plus basic analytics

### Admin procedures

- `getAdminOverview`
  - KPI summary plus recent queues
- `listHostApplications`
- `reviewHostApplication`
  - approves/rejects host requests
  - generates host IDs
  - updates user roles
  - syncs approved hosts into legacy creator/model records
- `listAgencies`
- `reviewAgency`
  - approves/rejects agency registrations
  - activates agency access roles on approval
- `listHosts`

## Auth Integration

### Clerk bootstrap

`packages/api/src/auth/auth.service.ts` now assigns a MissU public user ID during Clerk user creation and backfills one for older users missing it.

### Login methods supported by current stack

Mobile auth already supports the unified Clerk-based entry flow for:

- Google OAuth
- Facebook OAuth
- phone OTP
- WhatsApp-directed OTP flow via phone verification UI

### Agency code login alignment

The mobile login panel now validates:

- `AG########`
- legacy UUID agency IDs for backward compatibility

## UI Layouts

### Mobile

New host center tab:

- highlighted middle tab in bottom navigation
- shows MissU User ID
- shows host approval state
- lets users choose:
  - platform host
  - agency host
- validates AG code live
- submits ID proof, talent details, profile info

Profile surface updates:

- profile header shows MissU public ID
- prominent `Become a Host` / `Host Center` CTA
- shows approved host ID or current review state

### Web admin

New route: `/admin/missu-pro`

Contains:

- total users
- total approved hosts
- total approved agencies
- pending host applications
- pending agency approvals
- host approval queue actions
- agency approval queue actions
- approved host roster

### Web agency

New route: `/agency/missu-pro`

Contains:

- agency ID hero card
- agency status summary
- roster size
- approved hosts count
- pending onboarding count
- host roster table

### Public web

New route: `/agencies`

Contains:

- agency-focused landing page
- registration explanation
- operating flow
- links into signup and agency panel

## Business Logic Rules

- every authenticated user gets one MissU public user ID
- one user can apply to become a host
- approved platform hosts get `H#########`
- approved agency hosts get `AH########`
- agency-host applications require a valid approved agency code
- agency registration generates `AG########`
- host approval syncs the user into the existing creator/model compatibility layer
- admin approval is required before host activation and before agency activation

## Security Model

- all panel operations use Clerk-authenticated sessions
- admin actions require `adminProcedure`
- agency and mobile flows use protected procedures and server-side validation
- public IDs are generated server-side only
- host approval never trusts client-submitted IDs

## Rollout Steps

1. Apply the DB migration:
   - `npm run db:migrate`
2. Deploy API with the new `missu` router.
3. Deploy web app.
4. Ship mobile app with the host-center tab.
5. Seed allowed admin emails and ensure `admins` rows exist.
6. Run operational smoke tests:
   - user login creates `U#########`
   - agency registration creates pending `AG########`
   - admin approves agency
   - user submits direct host request
   - user submits agency host request with AG code
   - admin approves host and generated ID is visible in mobile/web

## Recommended Next Steps

1. Add media upload/presigned URL support for ID proof files instead of manual URLs.
2. Add server-side audit log entries for host and agency review actions.
3. Add admin route restrictions based on an explicit allowlist of Clerk emails plus `admins` rows.
4. Add analytics timeseries for agency panel revenue, host approval funnel, and activation conversion.
5. Add E2E coverage for:
   - Clerk bootstrap
   - agency approval
   - host approval
   - mobile AG code validation