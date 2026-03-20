# MissU Pro SaaS Auth And RBAC Architecture

## Intent

MissU Pro already had a large live-product schema with legacy roles such as `USER`, `HOST`, `MODEL`, and `ADMIN`.
This layer adds a stricter SaaS access contract without breaking those existing feature modules.

## Access Model

The new canonical access role is `users.platform_role`.

Supported values:

- `USER`
- `MODEL_INDEPENDENT`
- `MODEL_AGENCY`
- `AGENCY`
- `ADMIN`

Legacy compatibility remains in place:

- `users.role` is still populated for older feature modules.
- `users.auth_role` still gates the web portal middleware for admin and agency routes.

## Auth Providers

The authentication source is normalized into `users.auth_provider` and mirrored on model records where relevant.

Supported providers:

- `EMAIL`
- `GOOGLE`
- `FACEBOOK`
- `PHONE_OTP`
- `WHATSAPP_OTP`
- `CUSTOM_OTP`
- `UNKNOWN`

Additional provider metadata is stored in `users.auth_metadata_json`.

## Tenant Model

Agencies are first-class tenants.

Key fields:

- `agencies.agency_code`: shareable onboarding code for agency-based model registration
- `agencies.approval_status`: strict approval state
- `agencies.clerk_id`: owner identity mapping
- `agencies.deleted_at`: soft-delete support

Agency-based models can be linked through:

- `models.agency_id`
- `models.model_type = 'AGENCY'`
- `agency_hosts` membership rows

Independent models use:

- `models.model_type = 'INDEPENDENT'`

## Web Access Rules

Admin web access:

- Allowed only when the authenticated email exists in `admins.email`
- Signup remains blocked for admin users

Agency web access:

- Allowed only for agency operators or owners
- Agency-hosted models are no longer treated as agency web users

## Mobile Onboarding Rules

The mobile app now completes onboarding through a backend session contract.

Supported paths:

- `USER`
- `MODEL_INDEPENDENT`
- `MODEL_AGENCY`

Agency-model onboarding is strict:

- agency code is required
- agency must exist
- agency must already be approved

## Auditability

Cross-cutting access changes are recorded in `audit_logs`.

Current examples:

- agency signup completion
- agency approval / rejection
- agency model linking
- mobile onboarding completion

## Soft Delete Strategy

Soft-delete timestamps were added to core access tables:

- `users.deleted_at`
- `models.deleted_at`
- `agencies.deleted_at`
- `admins.deleted_at`

These fields allow moderation and tenant lifecycle policies to evolve without destructive deletes.