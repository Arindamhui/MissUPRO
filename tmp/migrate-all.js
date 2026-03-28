// Comprehensive migration: Add all missing enums, columns, and tables
require("dotenv").config({ path: "../../.env" });
const { neon } = require("@neondatabase/serverless");
const sql = neon(process.env.DATABASE_URL);

async function run() {
  console.log("Starting comprehensive migration...\n");
  const errors = [];
  
  async function exec(label, query) {
    try {
      await sql(query);
      console.log("[OK] " + label);
    } catch (e) {
      if (e.message.includes("already exists") || e.message.includes("duplicate")) {
        console.log("[SKIP] " + label + " (already exists)");
      } else {
        console.error("[FAIL] " + label + ": " + e.message);
        errors.push(label + ": " + e.message);
      }
    }
  }

  // ═══════════════════════════════════════════
  // STEP 1: Missing Enums
  // ═══════════════════════════════════════════
  console.log("--- STEP 1: Creating missing enums ---");

  // Enums needed by existing tables (users, admins, wallets, audit, support)
  await exec("kyc_status enum", `CREATE TYPE kyc_status AS ENUM ('NOT_STARTED','PENDING','DOCUMENTS_SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','EXPIRED','SUSPENDED')`);
  await exec("admin_level enum", `CREATE TYPE admin_level AS ENUM ('SUPER_ADMIN','SENIOR_ADMIN','ADMIN','MODERATOR','SUPPORT','VIEWER')`);
  await exec("admin_permission_scope enum", `CREATE TYPE admin_permission_scope AS ENUM ('GLOBAL','COUNTRY','AGENCY','FEATURE')`);
  
  // Financial enums
  await exec("revenue_source enum", `CREATE TYPE revenue_source AS ENUM ('COIN_PURCHASE','CALL_FEE','GIFT_COMMISSION','LIVE_COMMISSION','GROUP_AUDIO_FEE','PARTY_FEE','GAME_FEE','VIP_SUBSCRIPTION','PK_BATTLE_FEE','ENTRY_FEE','WITHDRAWAL_FEE','OTHER')`);
  await exec("earning_source enum", `CREATE TYPE earning_source AS ENUM ('CALL_AUDIO','CALL_VIDEO','GIFT_LIVE','GIFT_CALL','GIFT_CHAT','GIFT_PK','GIFT_PARTY','GIFT_GROUP_AUDIO','PK_REWARD','GROUP_AUDIO_HOST','PARTY_HOST','GAME_REWARD','REFERRAL_BONUS','EVENT_REWARD','LEVEL_REWARD','BONUS')`);
  await exec("settlement_period enum", `CREATE TYPE settlement_period AS ENUM ('DAILY','WEEKLY','BIWEEKLY','MONTHLY')`);
  await exec("agency_settlement_status enum", `CREATE TYPE agency_settlement_status AS ENUM ('PENDING','APPROVED','PROCESSING','COMPLETED','FAILED','ON_HOLD')`);
  await exec("withdrawal_action enum", `CREATE TYPE withdrawal_action AS ENUM ('REQUESTED','AUTO_FRAUD_CHECK','ADMIN_REVIEW_START','APPROVED','REJECTED','PROCESSING','COMPLETED','FAILED','ON_HOLD','ESCALATED')`);
  
  // Device & currency enums
  await exec("device_trust_level enum", `CREATE TYPE device_trust_level AS ENUM ('TRUSTED','NORMAL','SUSPICIOUS','BLOCKED')`);
  await exec("currency_status enum", `CREATE TYPE currency_status AS ENUM ('ACTIVE','DISABLED')`);
  await exec("exchange_rate_source enum", `CREATE TYPE exchange_rate_source AS ENUM ('MANUAL','API_FEED','PROVIDER_RATE')`);
  
  // KYC enums
  await exec("kyc_document_type enum", `CREATE TYPE kyc_document_type AS ENUM ('PASSPORT','NATIONAL_ID','DRIVERS_LICENSE','RESIDENCE_PERMIT','SELFIE_WITH_ID','ADDRESS_PROOF','BANK_STATEMENT')`);
  await exec("kyc_document_status enum", `CREATE TYPE kyc_document_status AS ENUM ('UPLOADED','UNDER_REVIEW','APPROVED','REJECTED','EXPIRED')`);

  // Refund enums
  await exec("refund_status enum", `CREATE TYPE refund_status AS ENUM ('REQUESTED','APPROVED','REJECTED','PROCESSING','COMPLETED','FAILED')`);
  await exec("refund_reason enum", `CREATE TYPE refund_reason AS ENUM ('USER_REQUEST','DUPLICATE_CHARGE','SERVICE_NOT_DELIVERED','FRAUD','DISPUTE_LOST','ADMIN_INITIATED','IAP_REVOKED','OTHER')`);
  await exec("refund_method enum", `CREATE TYPE refund_method AS ENUM ('ORIGINAL_PAYMENT','WALLET_CREDIT','MANUAL')`);

  // Subscription & invoice enums
  await exec("subscription_plan_interval enum", `CREATE TYPE subscription_plan_interval AS ENUM ('WEEKLY','MONTHLY','QUARTERLY','YEARLY')`);
  await exec("invoice_status enum", `CREATE TYPE invoice_status AS ENUM ('DRAFT','OPEN','PAID','VOID','UNCOLLECTIBLE','PAST_DUE')`);
  await exec("iap_platform enum", `CREATE TYPE iap_platform AS ENUM ('APPLE','GOOGLE')`);
  await exec("iap_receipt_status enum", `CREATE TYPE iap_receipt_status AS ENUM ('VALID','INVALID','EXPIRED','REVOKED','PENDING_VERIFICATION')`);

  // Localization, jobs, logs, CMS enums
  await exec("locale_status enum", `CREATE TYPE locale_status AS ENUM ('ACTIVE','DRAFT','DISABLED')`);
  await exec("job_status enum", `CREATE TYPE job_status AS ENUM ('PENDING','RUNNING','COMPLETED','FAILED','RETRYING','DEAD')`);
  await exec("job_priority enum", `CREATE TYPE job_priority AS ENUM ('LOW','NORMAL','HIGH','CRITICAL')`);
  await exec("log_level enum", `CREATE TYPE log_level AS ENUM ('DEBUG','INFO','WARN','ERROR','FATAL')`);
  await exec("email_delivery_status enum", `CREATE TYPE email_delivery_status AS ENUM ('QUEUED','SENT','DELIVERED','BOUNCED','FAILED','SPAM_REPORTED')`);
  await exec("cms_page_status enum", `CREATE TYPE cms_page_status AS ENUM ('DRAFT','PUBLISHED','ARCHIVED')`);
  await exec("faq_category enum", `CREATE TYPE faq_category AS ENUM ('GENERAL','ACCOUNT','PAYMENTS','STREAMING','CALLS','GIFTS','GAMES','AGENCY','VIP','SAFETY','TECHNICAL')`);
  await exec("consent_type enum", `CREATE TYPE consent_type AS ENUM ('TERMS_OF_SERVICE','PRIVACY_POLICY','MARKETING_EMAIL','MARKETING_PUSH','DATA_PROCESSING','COOKIES','AGE_VERIFICATION')`);
  await exec("consent_action enum", `CREATE TYPE consent_action AS ENUM ('GRANTED','REVOKED')`);
  await exec("payout_account_type enum", `CREATE TYPE payout_account_type AS ENUM ('BANK_ACCOUNT','PAYPAL','PAYONEER','CRYPTO_WALLET','UPI')`);
  await exec("payout_account_status enum", `CREATE TYPE payout_account_status AS ENUM ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','REMOVED')`);

  // Other missing enums from original schema
  await exec("payout_method enum", `CREATE TYPE payout_method AS ENUM ('PAYPAL','BANK_TRANSFER','PAYONEER','CRYPTO')`);
  await exec("agency_host_status enum", `CREATE TYPE agency_host_status AS ENUM ('ACTIVE','REMOVED')`);
  await exec("fraud_risk_level enum", `CREATE TYPE fraud_risk_level AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL')`);
  await exec("fraud_flag_status enum", `CREATE TYPE fraud_flag_status AS ENUM ('OPEN','UNDER_REVIEW','RESOLVED','FALSE_POSITIVE')`);
  await exec("fraud_flag_entity_type enum", `CREATE TYPE fraud_flag_entity_type AS ENUM ('USER','TRANSACTION','WITHDRAWAL','REFERRAL')`);
  await exec("fraud_signal_type enum", `CREATE TYPE fraud_signal_type AS ENUM ('DEVICE_FINGERPRINT_MATCH','IP_CLUSTER','VELOCITY_SPIKE','CIRCULAR_GIFTING','SELF_REFERRAL','PAYMENT_INSTRUMENT_OVERLAP','BEHAVIOR_ANOMALY','REPEATED_SHORT_CALLS','SCRIPTED_PATTERN')`);
  await exec("fraud_entity_type enum", `CREATE TYPE fraud_entity_type AS ENUM ('USER','TRANSACTION','WITHDRAWAL','REFERRAL','CALL_SESSION','GIFT_TRANSACTION')`);
  await exec("service_name enum", `CREATE TYPE service_name AS ENUM ('AUTH','WALLET','PAYMENT','GIFT','LIVE','CALL','GAME','CHAT','DISCOVERY','NOTIFICATION','MODERATION','FRAUD','CONFIG','MEDIA')`);
  await exec("incident_severity enum", `CREATE TYPE incident_severity AS ENUM ('SEV1','SEV2','SEV3','SEV4')`);
  await exec("incident_status enum", `CREATE TYPE incident_status AS ENUM ('OPEN','MITIGATING','RESOLVED','POSTMORTEM_PENDING','CLOSED')`);
  await exec("service_identity_status enum", `CREATE TYPE service_identity_status AS ENUM ('ACTIVE','ROTATED','REVOKED')`);
  await exec("security_event_type_ext", `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'security_event_type') THEN CREATE TYPE security_event_type AS ENUM ('LOGIN_SUCCESS','LOGIN_FAILURE','MFA_CHALLENGE','MFA_FAILURE','SESSION_REVOKED','PASSWORD_CHANGED','EMAIL_CHANGED','SUSPICIOUS_LOGIN','RATE_LIMIT_HIT','BRUTE_FORCE_DETECTED','FRAUD_FLAG_CREATED','ADMIN_LOGIN','API_ABUSE_DETECTED','WEBHOOK_SIGNATURE_INVALID'); END IF; END $$`);

  // ═══════════════════════════════════════════
  // STEP 2: Missing columns on existing tables
  // ═══════════════════════════════════════════
  console.log("\n--- STEP 2: Adding missing columns ---");

  // Users: kyc_status
  await exec("users.kyc_status", `ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status kyc_status DEFAULT 'NOT_STARTED' NOT NULL`);

  // Admins: admin_level, access_scope, access_scope_value, permissions_json, public_admin_id
  await exec("admins.public_admin_id", `ALTER TABLE admins ADD COLUMN IF NOT EXISTS public_admin_id text`);
  await exec("admins.admin_level", `ALTER TABLE admins ADD COLUMN IF NOT EXISTS admin_level admin_level DEFAULT 'MODERATOR' NOT NULL`);
  await exec("admins.access_scope", `ALTER TABLE admins ADD COLUMN IF NOT EXISTS access_scope admin_permission_scope DEFAULT 'GLOBAL' NOT NULL`);
  await exec("admins.access_scope_value", `ALTER TABLE admins ADD COLUMN IF NOT EXISTS access_scope_value text`);
  await exec("admins.permissions_json", `ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions_json jsonb`);

  // Wallets: withdrawable_balance, locked_balance, total_earned, total_spent, total_withdrawn, currency
  await exec("wallets.withdrawable_balance", `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS withdrawable_balance numeric(14,2) DEFAULT '0' NOT NULL`);
  await exec("wallets.locked_balance", `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS locked_balance numeric(14,2) DEFAULT '0' NOT NULL`);
  await exec("wallets.total_earned", `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS total_earned numeric(14,2) DEFAULT '0' NOT NULL`);
  await exec("wallets.total_spent", `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS total_spent numeric(14,2) DEFAULT '0' NOT NULL`);
  await exec("wallets.total_withdrawn", `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS total_withdrawn numeric(14,2) DEFAULT '0' NOT NULL`);
  await exec("wallets.currency", `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD' NOT NULL`);

  // Audit logs: ip_address, user_agent, device_fingerprint_hash
  await exec("audit_logs.ip_address", `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address text`);
  await exec("audit_logs.user_agent", `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent text`);
  await exec("audit_logs.device_fingerprint_hash", `ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS device_fingerprint_hash text`);

  // ═══════════════════════════════════════════
  // STEP 3: Missing indexes on existing tables
  // ═══════════════════════════════════════════
  console.log("\n--- STEP 3: Adding missing indexes ---");
  
  await exec("admins_public_admin_id_idx", `CREATE UNIQUE INDEX IF NOT EXISTS admins_public_admin_id_idx ON admins(public_admin_id)`);
  await exec("admins_level_active_idx", `CREATE INDEX IF NOT EXISTS admins_level_active_idx ON admins(admin_level, is_active)`);
  await exec("admins_scope_idx", `CREATE INDEX IF NOT EXISTS admins_scope_idx ON admins(access_scope, access_scope_value)`);

  // ═══════════════════════════════════════════
  // STEP 4: New tables (from previous sessions)
  // ═══════════════════════════════════════════
  console.log("\n--- STEP 4: Creating new tables ---");

  // admin_roles
  await exec("admin_roles table", `CREATE TABLE IF NOT EXISTS admin_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name text NOT NULL,
    role_key text NOT NULL,
    description text NOT NULL,
    permissions_json jsonb NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by_admin_id uuid REFERENCES admins(id),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("admin_roles_key_idx", `CREATE UNIQUE INDEX IF NOT EXISTS admin_roles_key_idx ON admin_roles(role_key)`);

  // admin_role_assignments
  await exec("admin_role_assignments table", `CREATE TABLE IF NOT EXISTS admin_role_assignments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid NOT NULL REFERENCES admins(id),
    role_id uuid NOT NULL REFERENCES admin_roles(id),
    granted_by_admin_id uuid REFERENCES admins(id),
    granted_at timestamp DEFAULT now() NOT NULL,
    expires_at timestamp,
    revoked_at timestamp,
    revoked_by_admin_id uuid REFERENCES admins(id)
  )`);
  await exec("admin_role_assignments_admin_role_idx", `CREATE UNIQUE INDEX IF NOT EXISTS admin_role_assignments_admin_role_idx ON admin_role_assignments(admin_id, role_id)`);

  // kyc_verifications
  await exec("kyc_verifications table", `CREATE TABLE IF NOT EXISTS kyc_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    status kyc_status DEFAULT 'NOT_STARTED' NOT NULL,
    level text DEFAULT 'BASIC' NOT NULL,
    country text,
    submitted_at timestamp,
    reviewed_at timestamp,
    reviewed_by_admin_id uuid REFERENCES admins(id),
    rejection_reason text,
    expires_at timestamp,
    metadata_json jsonb,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // kyc_documents
  await exec("kyc_documents table", `CREATE TABLE IF NOT EXISTS kyc_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id uuid NOT NULL REFERENCES kyc_verifications(id),
    document_type kyc_document_type NOT NULL,
    storage_key_encrypted text NOT NULL,
    original_filename text,
    file_hash text NOT NULL,
    status kyc_document_status DEFAULT 'UPLOADED' NOT NULL,
    reviewed_by_admin_id uuid REFERENCES admins(id),
    rejection_reason text,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // platform_revenue
  await exec("platform_revenue table", `CREATE TABLE IF NOT EXISTS platform_revenue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source revenue_source NOT NULL,
    reference_type text NOT NULL,
    reference_id uuid NOT NULL,
    user_id uuid REFERENCES users(id),
    gross_amount numeric(14,2) NOT NULL,
    platform_fee numeric(14,2) NOT NULL,
    host_share numeric(14,2) DEFAULT '0' NOT NULL,
    agency_share numeric(14,2) DEFAULT '0' NOT NULL,
    currency text DEFAULT 'USD' NOT NULL,
    idempotency_key text NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("platform_revenue_idempotency_idx", `CREATE UNIQUE INDEX IF NOT EXISTS platform_revenue_idempotency_idx ON platform_revenue(idempotency_key)`);

  // supported_currencies
  await exec("supported_currencies table", `CREATE TABLE IF NOT EXISTS supported_currencies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    status currency_status DEFAULT 'ACTIVE' NOT NULL,
    decimal_places integer DEFAULT 2 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("supported_currencies_code_idx", `CREATE UNIQUE INDEX IF NOT EXISTS supported_currencies_code_idx ON supported_currencies(code)`);

  // exchange_rates
  await exec("exchange_rates table", `CREATE TABLE IF NOT EXISTS exchange_rates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    base_currency text NOT NULL,
    target_currency text NOT NULL,
    rate numeric(18,8) NOT NULL,
    source exchange_rate_source DEFAULT 'MANUAL' NOT NULL,
    effective_from timestamp NOT NULL,
    effective_until timestamp,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // user_devices
  await exec("user_devices table", `CREATE TABLE IF NOT EXISTS user_devices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    device_fingerprint_hash text NOT NULL,
    device_type text,
    os_name text,
    os_version text,
    app_version text,
    push_token text,
    trust_level device_trust_level DEFAULT 'NORMAL' NOT NULL,
    is_current boolean DEFAULT true NOT NULL,
    last_seen_at timestamp DEFAULT now() NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // withdrawal_logs
  await exec("withdrawal_logs table", `CREATE TABLE IF NOT EXISTS withdrawal_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    withdraw_request_id uuid NOT NULL REFERENCES withdraw_requests(id),
    action withdrawal_action NOT NULL,
    performed_by_user_id uuid REFERENCES users(id),
    performed_by_admin_id uuid REFERENCES admins(id),
    note text,
    ip_address text,
    metadata_json jsonb,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // withdrawal_limits
  await exec("withdrawal_limits table", `CREATE TABLE IF NOT EXISTS withdrawal_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL,
    country text,
    kyc_level text,
    min_amount numeric(14,2) NOT NULL,
    max_amount_daily numeric(14,2) NOT NULL,
    max_amount_monthly numeric(14,2) NOT NULL,
    cooldown_hours integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // refunds
  await exec("refunds table", `CREATE TABLE IF NOT EXISTS refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES payments(id),
    user_id uuid NOT NULL REFERENCES users(id),
    reason refund_reason NOT NULL,
    reason_details text,
    refund_method refund_method DEFAULT 'ORIGINAL_PAYMENT' NOT NULL,
    amount_usd numeric(10,2) NOT NULL,
    coins_deducted integer DEFAULT 0 NOT NULL,
    provider payment_provider NOT NULL,
    provider_refund_id text,
    status refund_status DEFAULT 'REQUESTED' NOT NULL,
    requested_by_user_id uuid REFERENCES users(id),
    reviewed_by_admin_id uuid REFERENCES admins(id),
    review_note text,
    idempotency_key text NOT NULL,
    metadata_json jsonb,
    requested_at timestamp DEFAULT now() NOT NULL,
    reviewed_at timestamp,
    processed_at timestamp,
    completed_at timestamp,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("refunds_idempotency_idx", `CREATE UNIQUE INDEX IF NOT EXISTS refunds_idempotency_idx ON refunds(idempotency_key)`);

  // subscription_plans
  await exec("subscription_plans table", `CREATE TABLE IF NOT EXISTS subscription_plans (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    tier text NOT NULL,
    interval subscription_plan_interval NOT NULL,
    price_usd numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD' NOT NULL,
    coin_bonus_per_period integer DEFAULT 0 NOT NULL,
    features_json jsonb,
    stripe_product_id text,
    stripe_price_id text,
    apple_product_id text,
    google_product_id text,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    trial_days integer DEFAULT 0 NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // invoices
  await exec("invoices table", `CREATE TABLE IF NOT EXISTS invoices (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    invoice_number text NOT NULL,
    subscription_plan_id uuid REFERENCES subscription_plans(id),
    provider payment_provider NOT NULL,
    provider_invoice_id text,
    amount_due numeric(10,2) NOT NULL,
    amount_paid numeric(10,2) DEFAULT '0' NOT NULL,
    currency text DEFAULT 'USD' NOT NULL,
    status invoice_status DEFAULT 'DRAFT' NOT NULL,
    period_start timestamp NOT NULL,
    period_end timestamp NOT NULL,
    line_items_json jsonb,
    paid_at timestamp,
    due_at timestamp,
    voided_at timestamp,
    metadata_json jsonb,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("invoices_number_idx", `CREATE UNIQUE INDEX IF NOT EXISTS invoices_number_idx ON invoices(invoice_number)`);

  // iap_receipts
  await exec("iap_receipts table", `CREATE TABLE IF NOT EXISTS iap_receipts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    platform iap_platform NOT NULL,
    product_id text NOT NULL,
    transaction_id text NOT NULL,
    original_transaction_id text,
    receipt_data text NOT NULL,
    status iap_receipt_status DEFAULT 'PENDING_VERIFICATION' NOT NULL,
    purchase_date timestamp NOT NULL,
    expires_date timestamp,
    is_trial_period boolean DEFAULT false NOT NULL,
    is_sandbox boolean DEFAULT false NOT NULL,
    verified_at timestamp,
    revoked_at timestamp,
    metadata_json jsonb,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("iap_receipts_txn_idx", `CREATE UNIQUE INDEX IF NOT EXISTS iap_receipts_transaction_platform_idx ON iap_receipts(platform, transaction_id)`);

  // supported_locales
  await exec("supported_locales table", `CREATE TABLE IF NOT EXISTS supported_locales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL,
    name text NOT NULL,
    native_name text NOT NULL,
    direction text DEFAULT 'ltr' NOT NULL,
    status locale_status DEFAULT 'DRAFT' NOT NULL,
    completion_percent integer DEFAULT 0 NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("supported_locales_code_idx", `CREATE UNIQUE INDEX IF NOT EXISTS supported_locales_code_idx ON supported_locales(code)`);

  // translations
  await exec("translations table", `CREATE TABLE IF NOT EXISTS translations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    locale_code text NOT NULL,
    namespace text DEFAULT 'common' NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    updated_by_admin_id uuid REFERENCES users(id),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("translations_locale_ns_key_idx", `CREATE UNIQUE INDEX IF NOT EXISTS translations_locale_ns_key_idx ON translations(locale_code, namespace, key)`);

  // background_jobs
  await exec("background_jobs table", `CREATE TABLE IF NOT EXISTS background_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    queue text NOT NULL,
    job_type text NOT NULL,
    payload_json jsonb NOT NULL,
    status job_status DEFAULT 'PENDING' NOT NULL,
    priority job_priority DEFAULT 'NORMAL' NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    last_error text,
    scheduled_at timestamp DEFAULT now() NOT NULL,
    started_at timestamp,
    completed_at timestamp,
    next_retry_at timestamp,
    locked_by text,
    locked_at timestamp,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // dead_letter_queue
  await exec("dead_letter_queue table", `CREATE TABLE IF NOT EXISTS dead_letter_queue (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    original_job_id uuid,
    queue text NOT NULL,
    job_type text NOT NULL,
    payload_json jsonb NOT NULL,
    last_error text,
    total_attempts integer NOT NULL,
    failed_at timestamp DEFAULT now() NOT NULL,
    resolved_at timestamp,
    resolved_by text,
    resolution_note text,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // scheduled_tasks
  await exec("scheduled_tasks table", `CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    task_name text NOT NULL,
    cron_expression text NOT NULL,
    queue text DEFAULT 'default' NOT NULL,
    payload_json jsonb,
    is_enabled integer DEFAULT 1 NOT NULL,
    last_run_at timestamp,
    last_run_status text,
    next_run_at timestamp,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // api_request_logs
  await exec("api_request_logs table", `CREATE TABLE IF NOT EXISTS api_request_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    method text NOT NULL,
    path text NOT NULL,
    status_code integer NOT NULL,
    duration_ms integer NOT NULL,
    user_id uuid,
    ip_address text,
    user_agent text,
    request_body_size integer,
    response_body_size integer,
    error_code text,
    trace_id text,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // system_error_logs
  await exec("system_error_logs table", `CREATE TABLE IF NOT EXISTS system_error_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    level log_level DEFAULT 'ERROR' NOT NULL,
    service service_name NOT NULL,
    error_code text,
    message text NOT NULL,
    stack_trace text,
    context jsonb,
    user_id uuid,
    trace_id text,
    hostname text,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // email_delivery_logs
  await exec("email_delivery_logs table", `CREATE TABLE IF NOT EXISTS email_delivery_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id),
    to_email text NOT NULL,
    template_key text NOT NULL,
    subject text NOT NULL,
    provider text NOT NULL,
    provider_message_id text,
    status email_delivery_status DEFAULT 'QUEUED' NOT NULL,
    failure_reason text,
    sent_at timestamp,
    delivered_at timestamp,
    bounced_at timestamp,
    metadata_json jsonb,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // webhook_delivery_logs
  await exec("webhook_delivery_logs table", `CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    target_url text NOT NULL,
    event_type text NOT NULL,
    payload_json jsonb NOT NULL,
    http_status integer,
    response_body text,
    attempt integer DEFAULT 1 NOT NULL,
    max_attempts integer DEFAULT 3 NOT NULL,
    duration_ms integer,
    status text DEFAULT 'PENDING' NOT NULL,
    next_retry_at timestamp,
    sent_at timestamp,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // cms_pages
  await exec("cms_pages table", `CREATE TABLE IF NOT EXISTS cms_pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    locale text DEFAULT 'en' NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    meta_title text,
    meta_description text,
    status cms_page_status DEFAULT 'DRAFT' NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    published_at timestamp,
    published_by_admin_id uuid REFERENCES users(id),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("cms_pages_slug_locale_idx", `CREATE UNIQUE INDEX IF NOT EXISTS cms_pages_slug_locale_idx ON cms_pages(slug, locale)`);

  // faq_entries
  await exec("faq_entries table", `CREATE TABLE IF NOT EXISTS faq_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category faq_category NOT NULL,
    locale text DEFAULT 'en' NOT NULL,
    question text NOT NULL,
    answer text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    helpful_count integer DEFAULT 0 NOT NULL,
    not_helpful_count integer DEFAULT 0 NOT NULL,
    updated_by_admin_id uuid REFERENCES users(id),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // announcements
  await exec("announcements table", `CREATE TABLE IF NOT EXISTS announcements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    body text NOT NULL,
    target_audience text DEFAULT 'ALL' NOT NULL,
    target_regions_json jsonb,
    deep_link text,
    image_url text,
    priority integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    starts_at timestamp NOT NULL,
    ends_at timestamp,
    created_by_admin_id uuid REFERENCES users(id),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // user_settings
  await exec("user_settings table", `CREATE TABLE IF NOT EXISTS user_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    setting_key text NOT NULL,
    setting_value jsonb NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("user_settings_user_key_idx", `CREATE UNIQUE INDEX IF NOT EXISTS user_settings_user_key_idx ON user_settings(user_id, setting_key)`);

  // user_consents
  await exec("user_consents table", `CREATE TABLE IF NOT EXISTS user_consents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    consent_type consent_type NOT NULL,
    action consent_action NOT NULL,
    version text NOT NULL,
    ip_address text,
    user_agent text,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // payout_accounts
  await exec("payout_accounts table", `CREATE TABLE IF NOT EXISTS payout_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id),
    account_type payout_account_type NOT NULL,
    account_label text,
    account_holder_name text NOT NULL,
    encrypted_details_json text NOT NULL,
    details_mask_json jsonb,
    country text,
    currency text,
    status payout_account_status DEFAULT 'PENDING_VERIFICATION' NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    verified_at timestamp,
    removed_at timestamp,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // stream_recordings
  await exec("stream_recordings table", `CREATE TABLE IF NOT EXISTS stream_recordings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id uuid NOT NULL,
    host_user_id uuid NOT NULL REFERENCES users(id),
    storage_key text NOT NULL,
    storage_provider text DEFAULT 'R2' NOT NULL,
    duration_seconds jsonb,
    file_size_bytes jsonb,
    format text DEFAULT 'mp4' NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    expires_at timestamp,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // maintenance_windows
  await exec("maintenance_windows table", `CREATE TABLE IF NOT EXISTS maintenance_windows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text,
    affected_services jsonb,
    starts_at timestamp NOT NULL,
    ends_at timestamp NOT NULL,
    is_active boolean DEFAULT false NOT NULL,
    created_by_admin_id uuid REFERENCES users(id),
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);

  // rate_limit_rules
  await exec("rate_limit_rules table", `CREATE TABLE IF NOT EXISTS rate_limit_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name text NOT NULL,
    endpoint text NOT NULL,
    window_seconds jsonb NOT NULL,
    max_requests jsonb NOT NULL,
    scope text DEFAULT 'USER' NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL,
    updated_at timestamp DEFAULT now() NOT NULL
  )`);
  await exec("rate_limit_rules_name_idx", `CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_rules_name_idx ON rate_limit_rules(rule_name)`);

  // Support ticket replies (if missing)
  await exec("support_ticket_replies table", `CREATE TABLE IF NOT EXISTS support_ticket_replies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES support_tickets(id),
    sender_user_id uuid REFERENCES users(id),
    sender_admin_id uuid REFERENCES admins(id),
    sender_type text NOT NULL,
    body text NOT NULL,
    attachment_urls_json jsonb,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp DEFAULT now() NOT NULL
  )`);

  // Support tickets enhancements
  await exec("support_tickets.ticket_number", `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS ticket_number text`);
  await exec("support_tickets.assigned_admin_id", `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS assigned_admin_id uuid REFERENCES admins(id)`);
  await exec("support_tickets.satisfaction_rating", `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS satisfaction_rating text`);
  await exec("support_tickets.first_response_at", `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS first_response_at timestamp`);
  await exec("support_tickets.closed_at", `ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS closed_at timestamp`);

  // ═══════════════════════════════════════════
  // DONE
  // ═══════════════════════════════════════════
  console.log("\n=== MIGRATION COMPLETE ===");
  if (errors.length > 0) {
    console.log("Errors encountered:");
    errors.forEach(e => console.log("  - " + e));
  } else {
    console.log("ALL operations succeeded!");
  }
}

run().catch(e => console.error("FATAL:", e));
