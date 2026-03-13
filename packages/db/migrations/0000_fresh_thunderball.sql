CREATE TYPE "public"."account_deletion_status" AS ENUM('REQUESTED', 'COOLING_OFF', 'CANCELLED', 'COMPLETED', 'LEGAL_HOLD');--> statement-breakpoint
CREATE TYPE "public"."admin_action" AS ENUM('USER_SUSPEND', 'USER_BAN', 'USER_RESTORE', 'MODEL_APPROVE', 'MODEL_REJECT', 'WITHDRAWAL_APPROVE', 'WITHDRAWAL_REJECT', 'GIFT_CREATE', 'GIFT_UPDATE', 'COIN_PACKAGE_CREATE', 'COIN_PACKAGE_UPDATE', 'LEVEL_CREATE', 'LEVEL_UPDATE', 'SETTING_UPDATE', 'THEME_ACTIVATE', 'BANNER_CREATE', 'PROMOTION_CREATE', 'STREAM_FORCE_STOP', 'PAYOUT_APPROVE', 'CONFIG_PUBLISH', 'CONFIG_ROLLBACK', 'MANUAL_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."admin_target_type" AS ENUM('USER', 'MODEL', 'WITHDRAWAL', 'GIFT', 'COIN_PACKAGE', 'LEVEL', 'SETTING', 'THEME', 'BANNER', 'PROMOTION', 'LIVE_STREAM', 'PAYOUT', 'CONFIG');--> statement-breakpoint
CREATE TYPE "public"."agency_host_status" AS ENUM('ACTIVE', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."banner_link_type" AS ENUM('DEEP_LINK', 'EXTERNAL_URL', 'PROMOTION', 'MODEL_PROFILE');--> statement-breakpoint
CREATE TYPE "public"."banner_status" AS ENUM('ACTIVE', 'INACTIVE', 'SCHEDULED');--> statement-breakpoint
CREATE TYPE "public"."call_end_reason" AS ENUM('NORMAL', 'INSUFFICIENT_BALANCE', 'USER_HANGUP', 'MODEL_HANGUP', 'TIMEOUT', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."call_status" AS ENUM('REQUESTED', 'ACTIVE', 'ENDED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."call_type" AS ENUM('AUDIO', 'VIDEO');--> statement-breakpoint
CREATE TYPE "public"."campaign_reward_status" AS ENUM('PENDING', 'GRANTED', 'FAILED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."campaign_reward_type" AS ENUM('COINS', 'DIAMONDS', 'BADGE', 'VIP_DAYS', 'GIFT_MULTIPLIER');--> statement-breakpoint
CREATE TYPE "public"."candidate_type" AS ENUM('STREAM', 'MODEL', 'EVENT');--> statement-breakpoint
CREATE TYPE "public"."chat_message_type" AS ENUM('TEXT', 'EMOJI', 'SYSTEM', 'MODERATION');--> statement-breakpoint
CREATE TYPE "public"."chat_session_status" AS ENUM('ACTIVE', 'ENDED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."chat_session_type" AS ENUM('FREE', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."coin_transaction_type" AS ENUM('PURCHASE', 'GIFT_SENT', 'DAILY_REWARD', 'STREAK_REWARD', 'CALL_BILLING', 'ADMIN_ADJUSTMENT', 'REFUND', 'PROMO_BONUS', 'LEVEL_REWARD', 'REFERRAL_REWARD');--> statement-breakpoint
CREATE TYPE "public"."day_of_week" AS ENUM('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('QUEUED', 'PUBLISHED', 'ACK_PARTIAL', 'ACK_COMPLETE', 'EXPIRED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."demo_video_status" AS ENUM('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."diamond_transaction_type" AS ENUM('GIFT_CREDIT', 'WITHDRAWAL_DEBIT', 'ADMIN_ADJUSTMENT', 'EVENT_REWARD');--> statement-breakpoint
CREATE TYPE "public"."dm_conversation_status" AS ENUM('ACTIVE', 'BLOCKED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."dm_message_type" AS ENUM('TEXT', 'EMOJI', 'VOICE_NOTE', 'IMAGE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."effect_tier" AS ENUM('MICRO', 'STANDARD', 'PREMIUM', 'LEGENDARY');--> statement-breakpoint
CREATE TYPE "public"."feature_flag_type" AS ENUM('BOOLEAN', 'PERCENTAGE', 'USER_LIST', 'REGION');--> statement-breakpoint
CREATE TYPE "public"."formula_type" AS ENUM('FIXED', 'MULTIPLIER', 'LINEAR_INCREMENT');--> statement-breakpoint
CREATE TYPE "public"."fraud_entity_type" AS ENUM('USER', 'TRANSACTION', 'WITHDRAWAL', 'REFERRAL', 'CALL_SESSION', 'GIFT_TRANSACTION');--> statement-breakpoint
CREATE TYPE "public"."fraud_flag_entity_type" AS ENUM('USER', 'TRANSACTION', 'WITHDRAWAL', 'REFERRAL');--> statement-breakpoint
CREATE TYPE "public"."fraud_flag_status" AS ENUM('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'FALSE_POSITIVE');--> statement-breakpoint
CREATE TYPE "public"."fraud_risk_level" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."fraud_signal_type" AS ENUM('DEVICE_FINGERPRINT_MATCH', 'IP_CLUSTER', 'VELOCITY_SPIKE', 'CIRCULAR_GIFTING', 'SELF_REFERRAL', 'PAYMENT_INSTRUMENT_OVERLAP', 'BEHAVIOR_ANOMALY', 'REPEATED_SHORT_CALLS', 'SCRIPTED_PATTERN');--> statement-breakpoint
CREATE TYPE "public"."game_result_type" AS ENUM('WIN', 'LOSS', 'DRAW', 'ABANDONED');--> statement-breakpoint
CREATE TYPE "public"."game_status" AS ENUM('CREATED', 'ACTIVE', 'PAUSED', 'ENDED');--> statement-breakpoint
CREATE TYPE "public"."game_type" AS ENUM('CHESS', 'LUDO', 'CARROM', 'SUDOKU');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');--> statement-breakpoint
CREATE TYPE "public"."gift_context_type" AS ENUM('LIVE_STREAM', 'VIDEO_CALL', 'VOICE_CALL', 'CHAT_CONVERSATION', 'PK_BATTLE', 'GROUP_AUDIO', 'PARTY');--> statement-breakpoint
CREATE TYPE "public"."group_audio_participant_role" AS ENUM('HOST', 'CO_HOST', 'SPEAKER', 'LISTENER');--> statement-breakpoint
CREATE TYPE "public"."group_audio_participant_status" AS ENUM('ACTIVE', 'LEFT', 'REMOVED', 'DISCONNECTED');--> statement-breakpoint
CREATE TYPE "public"."group_audio_room_status" AS ENUM('SCHEDULED', 'CREATED', 'LIVE', 'ENDING', 'ENDED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."group_audio_room_type" AS ENUM('FREE', 'PAID', 'VIP_ONLY', 'INVITE_ONLY');--> statement-breakpoint
CREATE TYPE "public"."hand_raise_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."homepage_section_type" AS ENUM('LIVE_CAROUSEL', 'FEATURED_MODELS', 'TRENDING_CREATORS', 'PROMO_SLIDER', 'CATEGORY_CHIPS', 'RECOMMENDED_STREAMS');--> statement-breakpoint
CREATE TYPE "public"."icon_style" AS ENUM('DEFAULT', 'FESTIVAL', 'SEASONAL');--> statement-breakpoint
CREATE TYPE "public"."idempotency_status" AS ENUM('IN_PROGRESS', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."impression_source" AS ENUM('HOME_FEED', 'EXPLORE', 'SEARCH', 'NOTIFICATION');--> statement-breakpoint
CREATE TYPE "public"."incident_severity" AS ENUM('SEV1', 'SEV2', 'SEV3', 'SEV4');--> statement-breakpoint
CREATE TYPE "public"."incident_status" AS ENUM('OPEN', 'MITIGATING', 'RESOLVED', 'POSTMORTEM_PENDING', 'CLOSED');--> statement-breakpoint
CREATE TYPE "public"."layout_platform" AS ENUM('MOBILE', 'WEB', 'ALL');--> statement-breakpoint
CREATE TYPE "public"."level_change_reason" AS ENUM('AUTO_RECALC', 'EVENT_TRIGGERED', 'ADMIN_OVERRIDE', 'ADMIN_LEVEL_EDIT', 'LEVEL_DELETED');--> statement-breakpoint
CREATE TYPE "public"."level_reward_type" AS ENUM('BONUS_COINS', 'BADGE', 'SPECIAL_GIFT', 'VIP_TRIAL', 'PROFILE_FRAME');--> statement-breakpoint
CREATE TYPE "public"."level_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."level_track" AS ENUM('USER', 'MODEL');--> statement-breakpoint
CREATE TYPE "public"."media_visibility" AS ENUM('PRIVATE', 'PUBLIC', 'QUARANTINED');--> statement-breakpoint
CREATE TYPE "public"."model_application_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."notification_all_channel" AS ENUM('PUSH', 'IN_APP', 'EMAIL', 'ALL');--> statement-breakpoint
CREATE TYPE "public"."notification_campaign_status" AS ENUM('DRAFT', 'SCHEDULED', 'SENDING', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."notification_campaign_type" AS ENUM('INACTIVITY_NUDGE', 'EVENT_ANNOUNCEMENT', 'PROMO_BLAST', 'FEATURE_LAUNCH', 'RE_ENGAGEMENT');--> statement-breakpoint
CREATE TYPE "public"."notification_category" AS ENUM('GIFTS', 'FOLLOWS', 'EVENTS', 'SECURITY', 'MARKETING');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('IN_APP', 'PUSH', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."notification_delivery_status" AS ENUM('PENDING', 'SENT', 'DELIVERED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('NEW_FOLLOWER', 'LIVE_STARTED', 'GIFT_RECEIVED', 'DIAMOND_EARNED', 'WITHDRAWAL_UPDATE', 'MODEL_APPLICATION_UPDATE', 'EVENT_REMINDER', 'SECURITY_ALERT', 'SYSTEM_ANNOUNCEMENT', 'STREAK_REMINDER', 'DM_RECEIVED', 'CALL_MISSED', 'LEVEL_UP', 'REWARD_GRANTED');--> statement-breakpoint
CREATE TYPE "public"."party_activity_result" AS ENUM('WON', 'LOST', 'PARTICIPATING');--> statement-breakpoint
CREATE TYPE "public"."party_activity_status" AS ENUM('CREATED', 'ACTIVE', 'ENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."party_activity_type" AS ENUM('DICE_GAME', 'LUCKY_DRAW', 'GIFTING_WAR', 'TRUTH_OR_DARE');--> statement-breakpoint
CREATE TYPE "public"."party_member_role" AS ENUM('HOST', 'CO_HOST', 'SEATED', 'AUDIENCE');--> statement-breakpoint
CREATE TYPE "public"."party_member_status" AS ENUM('ACTIVE', 'LEFT', 'REMOVED', 'KICKED', 'BANNED', 'DISCONNECTED');--> statement-breakpoint
CREATE TYPE "public"."party_room_status" AS ENUM('CREATED', 'OPEN', 'ACTIVE', 'PAUSED', 'CLOSED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."party_room_type" AS ENUM('PUBLIC', 'PRIVATE', 'VIP', 'MODEL_HOSTED', 'EVENT');--> statement-breakpoint
CREATE TYPE "public"."party_theme_status" AS ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."payment_provider" AS ENUM('STRIPE', 'RAZORPAY', 'APPLE_IAP', 'GOOGLE_PLAY');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."payout_method" AS ENUM('PAYPAL', 'BANK_TRANSFER', 'PAYONEER', 'CRYPTO');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."pk_result_type" AS ENUM('WIN', 'DRAW', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."pk_status" AS ENUM('CREATED', 'MATCHING', 'ACTIVE', 'VOTING', 'ENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."promotion_audience" AS ENUM('ALL', 'NEW_USERS', 'RETURNING', 'SPECIFIC_REGION');--> statement-breakpoint
CREATE TYPE "public"."promotion_reward_type" AS ENUM('BONUS_COINS', 'GIFT_MULTIPLIER', 'REFERRAL_BONUS');--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('DRAFT', 'SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('COIN_BONUS', 'EVENT_CAMPAIGN', 'SEASONAL', 'REFERRAL_BOOST');--> statement-breakpoint
CREATE TYPE "public"."push_platform" AS ENUM('IOS', 'ANDROID', 'WEB');--> statement-breakpoint
CREATE TYPE "public"."push_token_status" AS ENUM('ACTIVE', 'EXPIRED', 'INVALID');--> statement-breakpoint
CREATE TYPE "public"."recommendation_source" AS ENUM('FOLLOW_GRAPH', 'WATCH_HISTORY', 'TRENDING', 'REGION', 'COLD_START');--> statement-breakpoint
CREATE TYPE "public"."referral_reward_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."referral_reward_type" AS ENUM('COINS', 'BADGE', 'VIP_DAYS');--> statement-breakpoint
CREATE TYPE "public"."referral_status" AS ENUM('PENDING', 'QUALIFIED', 'REWARDED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."room_status" AS ENUM('IDLE', 'LIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."room_type" AS ENUM('PUBLIC', 'PRIVATE', 'VIP_ONLY');--> statement-breakpoint
CREATE TYPE "public"."scan_status" AS ENUM('PENDING', 'PASSED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."schedule_type" AS ENUM('IMMEDIATE', 'SCHEDULED', 'RECURRING');--> statement-breakpoint
CREATE TYPE "public"."seat_layout_type" AS ENUM('CIRCLE', 'GRID', 'STAGE');--> statement-breakpoint
CREATE TYPE "public"."seat_status" AS ENUM('EMPTY', 'OCCUPIED', 'LOCKED', 'RESERVED', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."security_event_type" AS ENUM('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'MFA_CHALLENGE', 'MFA_FAILURE', 'SESSION_REVOKED', 'PASSWORD_CHANGED', 'EMAIL_CHANGED', 'SUSPICIOUS_LOGIN', 'RATE_LIMIT_HIT', 'BRUTE_FORCE_DETECTED', 'FRAUD_FLAG_CREATED', 'ADMIN_LOGIN', 'API_ABUSE_DETECTED', 'WEBHOOK_SIGNATURE_INVALID');--> statement-breakpoint
CREATE TYPE "public"."sender_type" AS ENUM('SYSTEM', 'ADMIN', 'USER');--> statement-breakpoint
CREATE TYPE "public"."service_name" AS ENUM('AUTH', 'WALLET', 'PAYMENT', 'GIFT', 'LIVE', 'CALL', 'GAME', 'CHAT', 'DISCOVERY', 'NOTIFICATION', 'MODERATION', 'FRAUD', 'CONFIG', 'MEDIA');--> statement-breakpoint
CREATE TYPE "public"."service_identity_status" AS ENUM('ACTIVE', 'ROTATED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('ACTIVE', 'REVOKED', 'EXPIRED', 'STEP_UP_REQUIRED');--> statement-breakpoint
CREATE TYPE "public"."setting_status" AS ENUM('DRAFT', 'PUBLISHED', 'ROLLED_BACK');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('INFO', 'WARNING', 'HIGH', 'CRITICAL');--> statement-breakpoint
CREATE TYPE "public"."stream_end_reason" AS ENUM('NORMAL', 'HOST_ENDED', 'ADMIN_FORCE_STOP', 'ERROR');--> statement-breakpoint
CREATE TYPE "public"."stream_status" AS ENUM('STARTING', 'LIVE', 'ENDED', 'FORCE_STOPPED');--> statement-breakpoint
CREATE TYPE "public"."stream_type" AS ENUM('SOLO', 'MULTI_GUEST', 'PK_BATTLE');--> statement-breakpoint
CREATE TYPE "public"."system_message_type" AS ENUM('SYSTEM_NOTICE', 'ADMIN_BROADCAST', 'POLICY_UPDATE', 'WELCOME', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."theme_asset_type" AS ENUM('BACKGROUND', 'ICON', 'LOGO', 'SPLASH');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('USER', 'HOST', 'MODEL', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('ACTIVE', 'SUSPENDED', 'BANNED', 'PENDING_VERIFICATION', 'DELETED');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('PENDING', 'VERIFIED', 'EXPIRED', 'USED');--> statement-breakpoint
CREATE TYPE "public"."verification_type" AS ENUM('SIGNUP', 'EMAIL_CHANGE', 'PASSWORD_RESET');--> statement-breakpoint
CREATE TYPE "public"."vip_status" AS ENUM('ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."withdraw_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED', 'ON_HOLD');--> statement-breakpoint
CREATE TABLE "account_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "account_deletion_status" DEFAULT 'REQUESTED' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"cooling_off_expires_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"processed_by_admin_id" uuid,
	"reason" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"verification_token_hash" text NOT NULL,
	"verification_type" "verification_type" NOT NULL,
	"status" "verification_status" DEFAULT 'PENDING' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "followers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"follower_user_id" uuid NOT NULL,
	"followed_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bio" text,
	"social_links_json" jsonb,
	"interests_json" jsonb,
	"profile_frame_url" text,
	"header_image_url" text,
	"location_display" text,
	"profile_completeness_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text NOT NULL,
	"platform" "push_platform" NOT NULL,
	"token" text NOT NULL,
	"token_status" "push_token_status" DEFAULT 'ACTIVE' NOT NULL,
	"app_version" text NOT NULL,
	"last_refreshed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"blocker_user_id" uuid NOT NULL,
	"blocked_user_id" uuid NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"phone" text,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"password_hash" text,
	"display_name" text NOT NULL,
	"username" text NOT NULL,
	"avatar_url" text,
	"role" "user_role" DEFAULT 'USER' NOT NULL,
	"status" "user_status" DEFAULT 'ACTIVE' NOT NULL,
	"country" text NOT NULL,
	"city" text,
	"preferred_locale" text DEFAULT 'en' NOT NULL,
	"preferred_timezone" text DEFAULT 'UTC' NOT NULL,
	"gender" "gender",
	"date_of_birth" date,
	"is_verified" boolean DEFAULT false NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by_user_id" uuid,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_fingerprint_hash" text NOT NULL,
	"refresh_token_hash" text NOT NULL,
	"session_status" "session_status" DEFAULT 'ACTIVE' NOT NULL,
	"ip_hash" text NOT NULL,
	"user_agent_hash" text NOT NULL,
	"risk_score" integer DEFAULT 0 NOT NULL,
	"last_seen_at" timestamp,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" "security_event_type" NOT NULL,
	"actor_user_id" uuid,
	"ip_address" text NOT NULL,
	"user_agent" text,
	"geo_location_json" jsonb,
	"device_fingerprint_hash" text,
	"severity" "severity" NOT NULL,
	"details_json" jsonb,
	"related_entity_type" text,
	"related_entity_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"incident_type" text NOT NULL,
	"severity" "incident_severity" NOT NULL,
	"status" "incident_status" DEFAULT 'OPEN' NOT NULL,
	"source_event_id" uuid,
	"owner_admin_id" uuid NOT NULL,
	"started_at" timestamp NOT NULL,
	"resolved_at" timestamp,
	"postmortem_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_name" "service_name" NOT NULL,
	"public_key_hash" text NOT NULL,
	"certificate_fingerprint" text,
	"allowed_endpoints_json" jsonb NOT NULL,
	"status" "service_identity_status" DEFAULT 'ACTIVE' NOT NULL,
	"issued_at" timestamp NOT NULL,
	"expires_at" timestamp NOT NULL,
	"rotated_at" timestamp,
	"revoked_at" timestamp,
	"revocation_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coin_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"coin_amount" integer NOT NULL,
	"bonus_coins" integer DEFAULT 0 NOT NULL,
	"price_usd" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"apple_product_id" text,
	"google_product_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"region_scope" jsonb,
	"start_at" timestamp,
	"end_at" timestamp,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coin_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_type" "coin_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"description" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diamond_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"transaction_type" "diamond_transaction_type" NOT NULL,
	"amount" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_type" text,
	"reference_id" uuid,
	"description" text,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"coin_balance" integer DEFAULT 0 NOT NULL,
	"diamond_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_coins_purchased" integer DEFAULT 0 NOT NULL,
	"lifetime_coins_spent" integer DEFAULT 0 NOT NULL,
	"lifetime_diamonds_earned" integer DEFAULT 0 NOT NULL,
	"lifetime_diamonds_withdrawn" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "wallets_coin_balance_check" CHECK ("wallets"."coin_balance" >= 0),
	CONSTRAINT "wallets_diamond_balance_check" CHECK ("wallets"."diamond_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"coin_package_id" uuid NOT NULL,
	"amount_usd" numeric(10, 2) NOT NULL,
	"coins_credited" integer NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_payment_id" text,
	"provider_transaction_id" text,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"failure_reason" text,
	"refund_amount" numeric(10, 2),
	"refunded_at" timestamp,
	"idempotency_key" text NOT NULL,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_user_id" uuid NOT NULL,
	"withdraw_request_id" uuid NOT NULL,
	"audio_minutes_paid" integer NOT NULL,
	"video_minutes_paid" integer NOT NULL,
	"audio_rate_snapshot" numeric(10, 4) NOT NULL,
	"video_rate_snapshot" numeric(10, 4) NOT NULL,
	"audio_earnings" numeric(12, 2) NOT NULL,
	"video_earnings" numeric(12, 2) NOT NULL,
	"diamond_earnings" numeric(12, 2) NOT NULL,
	"total_payout_amount" numeric(12, 2) NOT NULL,
	"currency" text NOT NULL,
	"payout_method" text NOT NULL,
	"status" "payout_status" DEFAULT 'PENDING' NOT NULL,
	"approved_by_admin_id" uuid NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" "payment_provider" NOT NULL,
	"provider_event_id" text NOT NULL,
	"signature_valid" boolean NOT NULL,
	"payload_hash" text NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processing_status" text,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "withdraw_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_user_id" uuid NOT NULL,
	"audio_minutes_snapshot" integer NOT NULL,
	"video_minutes_snapshot" integer NOT NULL,
	"audio_rate_snapshot" numeric(10, 4) NOT NULL,
	"video_rate_snapshot" numeric(10, 4) NOT NULL,
	"call_earnings_snapshot" numeric(12, 2) NOT NULL,
	"diamond_balance_snapshot" integer NOT NULL,
	"diamond_earnings_snapshot" numeric(12, 2) NOT NULL,
	"total_payout_amount" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"payout_method" "payout_method" NOT NULL,
	"payout_details_json" jsonb NOT NULL,
	"status" "withdraw_status" DEFAULT 'PENDING' NOT NULL,
	"rejection_reason" text,
	"approved_by_admin_id" uuid,
	"approved_at" timestamp,
	"completed_at" timestamp,
	"fraud_risk_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_animations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_id" uuid NOT NULL,
	"animation_url" text NOT NULL,
	"preview_thumbnail_url" text NOT NULL,
	"duration_ms" integer NOT NULL,
	"effect_tier" text NOT NULL,
	"platform" text DEFAULT 'ALL' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"receiver_user_id" uuid NOT NULL,
	"gift_id" uuid NOT NULL,
	"coin_cost" integer NOT NULL,
	"diamond_credit" integer NOT NULL,
	"context_type" "gift_context_type" NOT NULL,
	"context_id" uuid,
	"economy_profile_key_snapshot" text NOT NULL,
	"platform_commission_bps_snapshot" integer NOT NULL,
	"diamond_value_usd_per_100_snapshot" numeric(10, 4) NOT NULL,
	"sender_display_name_snapshot" text NOT NULL,
	"combo_count" integer DEFAULT 1 NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_code" text NOT NULL,
	"name" text NOT NULL,
	"icon_url" text NOT NULL,
	"coin_price" integer NOT NULL,
	"diamond_credit" integer NOT NULL,
	"effect_tier" "effect_tier" NOT NULL,
	"category" text,
	"supported_contexts_json" jsonb NOT NULL,
	"sound_effect_url" text,
	"economy_profile_key" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_limited_time" boolean DEFAULT false NOT NULL,
	"season_tag" text,
	"region_scope" text,
	"start_at" timestamp,
	"end_at" timestamp,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_gift_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gift_transaction_id" uuid NOT NULL,
	"live_stream_id" uuid NOT NULL,
	"room_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"receiver_user_id" uuid NOT NULL,
	"display_message" text NOT NULL,
	"animation_key" text NOT NULL,
	"sound_effect_key" text,
	"combo_group_id" text,
	"combo_count_snapshot" integer DEFAULT 1 NOT NULL,
	"broadcast_event_id" text NOT NULL,
	"delivery_status" "delivery_status" DEFAULT 'QUEUED' NOT NULL,
	"viewer_count_snapshot" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp,
	"expires_at" timestamp,
	"metadata_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"message_type" "chat_message_type" DEFAULT 'TEXT' NOT NULL,
	"content_text" text NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"room_name" text NOT NULL,
	"room_type" "room_type" DEFAULT 'PUBLIC' NOT NULL,
	"category" text NOT NULL,
	"status" "room_status" DEFAULT 'IDLE' NOT NULL,
	"total_sessions" integer DEFAULT 0 NOT NULL,
	"total_watch_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"host_user_id" uuid NOT NULL,
	"stream_title" text,
	"stream_type" "stream_type" DEFAULT 'SOLO' NOT NULL,
	"status" "stream_status" DEFAULT 'STARTING' NOT NULL,
	"rtc_channel_id" text NOT NULL,
	"viewer_count_peak" integer DEFAULT 0 NOT NULL,
	"viewer_count_current" integer DEFAULT 0 NOT NULL,
	"gift_revenue_coins" integer DEFAULT 0 NOT NULL,
	"trending_score" numeric(12, 4) DEFAULT '0' NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"end_reason" "stream_end_reason",
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_viewers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"watch_duration_seconds" integer DEFAULT 0 NOT NULL,
	"gift_coins_sent" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_billing_ticks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_session_id" uuid NOT NULL,
	"tick_number" integer NOT NULL,
	"coins_deducted" integer NOT NULL,
	"user_balance_after" integer NOT NULL,
	"tick_timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caller_user_id" uuid NOT NULL,
	"model_user_id" uuid NOT NULL,
	"call_type" "call_type" NOT NULL,
	"status" "call_status" DEFAULT 'REQUESTED' NOT NULL,
	"coins_per_minute_snapshot" integer NOT NULL,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"billable_minutes" integer DEFAULT 0 NOT NULL,
	"total_coins_spent" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"end_reason" "call_end_reason",
	"minutes_credited_to_model" boolean DEFAULT false NOT NULL,
	"model_level_snapshot" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_billing_ticks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_session_id" uuid NOT NULL,
	"tick_number" integer NOT NULL,
	"coins_deducted" integer NOT NULL,
	"user_balance_after" integer NOT NULL,
	"tick_timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"model_user_id" uuid NOT NULL,
	"session_type" "chat_session_type" NOT NULL,
	"status" "chat_session_status" DEFAULT 'ACTIVE' NOT NULL,
	"free_minutes_used" integer DEFAULT 0 NOT NULL,
	"paid_minutes_used" integer DEFAULT 0 NOT NULL,
	"total_coins_spent" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_moves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"move_sequence" integer NOT NULL,
	"move_payload_json" jsonb NOT NULL,
	"move_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role_or_seat" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "game_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_session_id" uuid NOT NULL,
	"winner_user_id" uuid,
	"result_type" "game_result_type" NOT NULL,
	"duration_seconds" integer NOT NULL,
	"reward_payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_session_id" uuid NOT NULL,
	"game_type" "game_type" NOT NULL,
	"status" "game_status" DEFAULT 'CREATED' NOT NULL,
	"state_json" jsonb,
	"started_at" timestamp,
	"ended_at" timestamp,
	"end_reason" text
);
--> statement-breakpoint
CREATE TABLE "games" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_type" "game_type" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"default_timer_seconds" integer NOT NULL,
	"max_duration_seconds" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_pricing_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_name" text NOT NULL,
	"formula_type" "formula_type" NOT NULL,
	"base_video_price" integer NOT NULL,
	"base_audio_price" integer NOT NULL,
	"level_multiplier" numeric(5, 2),
	"level_increment_video" integer,
	"level_increment_audio" integer,
	"price_cap_video" integer NOT NULL,
	"price_cap_audio" integer NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"legal_name" text NOT NULL,
	"display_name" text NOT NULL,
	"dob" date NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"talent_categories_json" jsonb NOT NULL,
	"talent_description" text NOT NULL,
	"languages_json" jsonb NOT NULL,
	"schedule_json" jsonb NOT NULL,
	"intro_video_url" text NOT NULL,
	"id_doc_front_url" text NOT NULL,
	"id_doc_back_url" text NOT NULL,
	"status" "model_application_status" DEFAULT 'PENDING' NOT NULL,
	"reviewed_by_admin_id" uuid,
	"rejection_reason" text,
	"submitted_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "model_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_user_id" uuid NOT NULL,
	"day_of_week" "day_of_week" NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"timezone" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_call_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_user_id" uuid NOT NULL,
	"audio_minutes_total" integer DEFAULT 0 NOT NULL,
	"video_minutes_total" integer DEFAULT 0 NOT NULL,
	"audio_minutes_pending" integer DEFAULT 0 NOT NULL,
	"video_minutes_pending" integer DEFAULT 0 NOT NULL,
	"audio_minutes_paid" integer DEFAULT 0 NOT NULL,
	"video_minutes_paid" integer DEFAULT 0 NOT NULL,
	"group_audio_minutes_total" integer DEFAULT 0 NOT NULL,
	"group_audio_minutes_pending" integer DEFAULT 0 NOT NULL,
	"group_audio_minutes_paid" integer DEFAULT 0 NOT NULL,
	"last_call_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_demo_videos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_user_id" uuid NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text NOT NULL,
	"title" text,
	"duration_seconds" integer NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" "demo_video_status" DEFAULT 'PENDING_REVIEW' NOT NULL,
	"reviewed_by_admin_id" uuid,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_level_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_user_id" uuid NOT NULL,
	"old_level" integer NOT NULL,
	"new_level" integer NOT NULL,
	"change_reason" "level_change_reason" NOT NULL,
	"changed_by_admin_id" uuid,
	"stats_snapshot_json" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_level_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level_number" integer NOT NULL,
	"level_name" text NOT NULL,
	"diamonds_required" integer DEFAULT 0 NOT NULL,
	"video_minutes_required" integer DEFAULT 0 NOT NULL,
	"audio_minutes_required" integer DEFAULT 0 NOT NULL,
	"video_call_price" integer NOT NULL,
	"audio_call_price" integer NOT NULL,
	"badge_icon_url" text,
	"badge_color_hex" text,
	"priority_boost" integer DEFAULT 0 NOT NULL,
	"homepage_eligible" boolean DEFAULT false NOT NULL,
	"priority_support" boolean DEFAULT false NOT NULL,
	"revenue_share_bonus_pct" numeric(5, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"model_user_id" uuid NOT NULL,
	"call_session_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"is_visible" boolean DEFAULT true NOT NULL,
	"reported" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_user_id" uuid NOT NULL,
	"current_level" integer DEFAULT 1 NOT NULL,
	"total_diamonds" integer DEFAULT 0 NOT NULL,
	"total_video_minutes" integer DEFAULT 0 NOT NULL,
	"total_audio_minutes" integer DEFAULT 0 NOT NULL,
	"total_calls_completed" integer DEFAULT 0 NOT NULL,
	"total_gifts_received" integer DEFAULT 0 NOT NULL,
	"level_updated_at" timestamp,
	"level_override" integer,
	"level_override_reason" text,
	"level_override_by_admin_id" uuid,
	"price_override_video" integer,
	"price_override_audio" integer,
	"price_override_reason" text,
	"price_override_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"talent_categories_json" jsonb NOT NULL,
	"talent_description" text NOT NULL,
	"languages_json" jsonb NOT NULL,
	"about_text" text,
	"demo_video_count" integer DEFAULT 0 NOT NULL,
	"call_rate_audio_coins" integer NOT NULL,
	"call_rate_video_coins" integer NOT NULL,
	"is_online" boolean DEFAULT false NOT NULL,
	"last_online_at" timestamp,
	"total_followers" integer DEFAULT 0 NOT NULL,
	"total_streams" integer DEFAULT 0 NOT NULL,
	"total_call_minutes" integer DEFAULT 0 NOT NULL,
	"response_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"quality_score" numeric(5, 2) DEFAULT '0' NOT NULL,
	"approved_at" timestamp,
	"approved_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"badge_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text NOT NULL,
	"category" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "level_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level_id" uuid NOT NULL,
	"reward_type" text NOT NULL,
	"reward_value" text NOT NULL,
	"reward_name" text NOT NULL,
	"description" text NOT NULL,
	"auto_grant" boolean DEFAULT false NOT NULL,
	"status" "level_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"level_number" integer NOT NULL,
	"level_name" text NOT NULL,
	"level_track" "level_track" NOT NULL,
	"threshold_value" integer NOT NULL,
	"icon_url" text,
	"status" "level_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_streaks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"current_streak_days" integer DEFAULT 0 NOT NULL,
	"last_login_date" date NOT NULL,
	"last_daily_reward_at" timestamp,
	"last_streak_reward_at" timestamp,
	"region_code" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"awarded_at" timestamp DEFAULT now() NOT NULL,
	"source" text NOT NULL,
	"source_reference_id" uuid
);
--> statement-breakpoint
CREATE TABLE "user_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"level_track" "level_track" NOT NULL,
	"current_level_id" uuid NOT NULL,
	"current_progress_value" integer DEFAULT 0 NOT NULL,
	"level_up_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_type" "sender_type" NOT NULL,
	"sender_id" uuid,
	"recipient_user_id" uuid NOT NULL,
	"message_type" "system_message_type" NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"deep_link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"campaign_type" "notification_campaign_type" NOT NULL,
	"template_id" uuid NOT NULL,
	"segment_rule_json" jsonb NOT NULL,
	"channel" "notification_all_channel" NOT NULL,
	"schedule_type" "schedule_type" NOT NULL,
	"scheduled_at" timestamp,
	"recurring_cron" text,
	"status" "notification_campaign_status" DEFAULT 'DRAFT' NOT NULL,
	"total_recipients" integer,
	"delivered_count" integer,
	"opened_count" integer,
	"budget_cap_recipients" integer,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"category" "notification_category" NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"quiet_hours_timezone" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" text NOT NULL,
	"locale" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"title_template" text NOT NULL,
	"body_template" text NOT NULL,
	"variables_json" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"updated_by_admin_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"icon_url" text,
	"deep_link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"metadata_json" jsonb,
	"channel" "notification_channel" NOT NULL,
	"delivery_status" "notification_delivery_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" uuid NOT NULL,
	"action" "admin_action" NOT NULL,
	"target_type" "admin_target_type" NOT NULL,
	"target_id" text NOT NULL,
	"before_state_json" jsonb,
	"after_state_json" jsonb,
	"reason" text NOT NULL,
	"ip_address" text NOT NULL,
	"user_agent" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"admin_name" text NOT NULL,
	"mfa_enabled" boolean DEFAULT true NOT NULL,
	"mfa_secret_encrypted" text,
	"last_login_at" timestamp,
	"last_login_ip" text,
	"login_attempts_failed" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"ip_allowlist_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feature_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"flag_key" text NOT NULL,
	"flag_type" "feature_flag_type" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"percentage_value" integer,
	"user_ids_json" jsonb,
	"region_codes_json" jsonb,
	"description" text NOT NULL,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_type" "homepage_section_type" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"config_json" jsonb NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"namespace" text NOT NULL,
	"key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"environment" text NOT NULL,
	"region_code" text,
	"segment_code" text,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "setting_status" DEFAULT 'DRAFT' NOT NULL,
	"effective_from" timestamp NOT NULL,
	"effective_to" timestamp,
	"change_reason" text NOT NULL,
	"updated_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ui_layout_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"layout_name" text NOT NULL,
	"platform" "layout_platform" NOT NULL,
	"region_code" text,
	"sections_json" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "setting_status" DEFAULT 'DRAFT' NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"fallback_layout_id" uuid,
	"published_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"candidate_type" "candidate_type" NOT NULL,
	"candidate_id" uuid NOT NULL,
	"score" numeric(10, 6) NOT NULL,
	"scoring_version" integer NOT NULL,
	"source" "recommendation_source" NOT NULL,
	"is_served" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_value" text NOT NULL,
	"weights_json" text NOT NULL,
	"trending_window_minutes" integer NOT NULL,
	"featured_boost_multiplier" numeric(5, 2) NOT NULL,
	"status" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"effective_from" timestamp,
	"effective_to" timestamp,
	"updated_by_admin_id" uuid,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_impressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"candidate_type" "candidate_type" NOT NULL,
	"candidate_id" uuid NOT NULL,
	"impression_source" "impression_source" NOT NULL,
	"position" integer NOT NULL,
	"was_clicked" boolean DEFAULT false NOT NULL,
	"clicked_at" timestamp,
	"watch_duration_seconds" integer,
	"scoring_version" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fraud_flags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "fraud_flag_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" "fraud_risk_level" NOT NULL,
	"signals_json" jsonb,
	"action_taken" text,
	"status" "fraud_flag_status" DEFAULT 'OPEN' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "fraud_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "fraud_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"signal_type" "fraud_signal_type" NOT NULL,
	"signal_value" numeric(5, 4) NOT NULL,
	"weight" numeric(5, 4) NOT NULL,
	"details_json" jsonb NOT NULL,
	"fraud_flag_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_user_id" uuid NOT NULL,
	"asset_type" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"visibility" "media_visibility" DEFAULT 'PRIVATE' NOT NULL,
	"checksum_sha256" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_scan_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_asset_id" uuid NOT NULL,
	"scanner_name" text NOT NULL,
	"scan_status" "scan_status" DEFAULT 'PENDING' NOT NULL,
	"risk_labels_json" jsonb,
	"scanned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id_1" uuid NOT NULL,
	"user_id_2" uuid NOT NULL,
	"status" "dm_conversation_status" DEFAULT 'ACTIVE' NOT NULL,
	"last_message_at" timestamp,
	"unread_count_user_1" integer DEFAULT 0 NOT NULL,
	"unread_count_user_2" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dm_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"sender_user_id" uuid NOT NULL,
	"message_type" "dm_message_type" DEFAULT 'TEXT' NOT NULL,
	"content_text" text,
	"media_url" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text DEFAULT 'ENROLLED' NOT NULL,
	"progress_json" jsonb,
	"score" numeric(12, 4) DEFAULT '0',
	"rank" integer,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"rules_json" jsonb,
	"reward_pool_json" jsonb,
	"eligibility_criteria_json" jsonb,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "host_analytics_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"total_diamonds_earned" integer DEFAULT 0 NOT NULL,
	"total_streams" integer DEFAULT 0 NOT NULL,
	"total_watch_minutes" integer DEFAULT 0 NOT NULL,
	"unique_viewers" integer DEFAULT 0 NOT NULL,
	"total_gifts_received" integer DEFAULT 0 NOT NULL,
	"top_gift_type" text,
	"follower_delta" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leaderboard_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"rank_position" integer NOT NULL,
	"score_value" numeric(14, 4) NOT NULL,
	"score_delta" numeric(14, 4) DEFAULT '0',
	"snapshot_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboard_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leaderboard_id" uuid NOT NULL,
	"snapshot_date" date NOT NULL,
	"entries_json" jsonb NOT NULL,
	"total_participants" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leaderboards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"leaderboard_type" text NOT NULL,
	"title" text NOT NULL,
	"scoring_metric" text NOT NULL,
	"window_type" text NOT NULL,
	"window_start" timestamp,
	"window_end" timestamp,
	"max_entries" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"refresh_interval_seconds" integer NOT NULL,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_id" uuid NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"reward_type" "referral_reward_type" NOT NULL,
	"reward_value_json" jsonb NOT NULL,
	"ledger_txn_id" uuid,
	"status" "referral_reward_status" DEFAULT 'PENDING' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"inviter_user_id" uuid NOT NULL,
	"invitee_user_id" uuid NOT NULL,
	"referral_code" text NOT NULL,
	"attribution_source" text NOT NULL,
	"status" "referral_status" DEFAULT 'PENDING' NOT NULL,
	"qualified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vip_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" text NOT NULL,
	"stripe_subscription_id" text,
	"status" "vip_status" DEFAULT 'ACTIVE' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancelled_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"contact_email" text NOT NULL,
	"country" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"commission_tier" text,
	"approved_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agency_hosts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agency_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"status" "agency_host_status" DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"image_url" text NOT NULL,
	"link_type" "banner_link_type" NOT NULL,
	"link_target" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "banner_status" DEFAULT 'INACTIVE' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"enrollment_status" text DEFAULT 'ENROLLED' NOT NULL,
	"progress_json" jsonb,
	"reward_status" text,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_type" "campaign_reward_type" NOT NULL,
	"reward_value_json" jsonb NOT NULL,
	"ledger_txn_id" uuid,
	"status" "campaign_reward_status" DEFAULT 'PENDING' NOT NULL,
	"granted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_type" text NOT NULL,
	"name" text NOT NULL,
	"segment_rule_json" jsonb,
	"reward_rule_json" jsonb,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"budget_limit_json" jsonb,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotion_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"promotion_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_type" "promotion_reward_type" NOT NULL,
	"reward_value" numeric(12, 2) NOT NULL,
	"granted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"promotion_type" "promotion_type" NOT NULL,
	"status" "promotion_status" DEFAULT 'DRAFT' NOT NULL,
	"target_audience" "promotion_audience" NOT NULL,
	"target_region" text,
	"banner_image_url" text,
	"max_budget" numeric(12, 2),
	"budget_used" numeric(12, 2) DEFAULT '0',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reward_rules_json" jsonb,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "theme_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" uuid NOT NULL,
	"asset_type" "theme_asset_type" NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"primary_color" text NOT NULL,
	"secondary_color" text NOT NULL,
	"background_color" text NOT NULL,
	"card_background_color" text NOT NULL,
	"text_primary_color" text NOT NULL,
	"text_secondary_color" text NOT NULL,
	"accent_gradient_start" text NOT NULL,
	"accent_gradient_end" text NOT NULL,
	"background_image_url" text,
	"icon_style" "icon_style" DEFAULT 'DEFAULT' NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"scheduled_start" timestamp,
	"scheduled_end" timestamp,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_name" text NOT NULL,
	"user_id" uuid,
	"anonymous_id" text,
	"session_id" text,
	"platform" text,
	"app_version" text,
	"region" text,
	"payload_json" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text NOT NULL,
	"operation_scope" text NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"request_hash" text NOT NULL,
	"response_snapshot_json" jsonb,
	"status" "idempotency_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pk_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pk_session_id" uuid NOT NULL,
	"host_user_id" uuid NOT NULL,
	"gifter_user_id" uuid NOT NULL,
	"gift_id" uuid NOT NULL,
	"coin_value" integer NOT NULL,
	"scored_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pk_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_a_user_id" uuid NOT NULL,
	"host_b_user_id" uuid NOT NULL,
	"status" "pk_status" DEFAULT 'CREATED' NOT NULL,
	"battle_duration_seconds" integer NOT NULL,
	"host_a_score" integer DEFAULT 0 NOT NULL,
	"host_b_score" integer DEFAULT 0 NOT NULL,
	"winner_user_id" uuid,
	"result_type" "pk_result_type",
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_by_admin_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_audio_billing_ticks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"participant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"tick_number" integer NOT NULL,
	"coins_deducted" integer NOT NULL,
	"user_balance_after" integer NOT NULL,
	"tick_timestamp" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_audio_hand_raises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"status" "hand_raise_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp,
	"resolved_by_user_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_audio_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "group_audio_participant_role" DEFAULT 'LISTENER' NOT NULL,
	"status" "group_audio_participant_status" DEFAULT 'ACTIVE' NOT NULL,
	"is_muted" boolean DEFAULT false NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"total_coins_spent" integer DEFAULT 0 NOT NULL,
	"billable_minutes" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_audio_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"topic_tags_json" jsonb,
	"room_type" "group_audio_room_type" DEFAULT 'FREE' NOT NULL,
	"status" "group_audio_room_status" DEFAULT 'CREATED' NOT NULL,
	"max_speakers" integer DEFAULT 8 NOT NULL,
	"max_listeners" integer DEFAULT 200 NOT NULL,
	"coins_per_minute" integer,
	"scheduled_start_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"total_participants_count" integer DEFAULT 0 NOT NULL,
	"peak_listener_count" integer DEFAULT 0 NOT NULL,
	"is_recording_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"activity_type" "party_activity_type" NOT NULL,
	"status" "party_activity_status" DEFAULT 'CREATED' NOT NULL,
	"config_json" jsonb NOT NULL,
	"pot_total_coins" integer DEFAULT 0 NOT NULL,
	"platform_fee_coins" integer DEFAULT 0 NOT NULL,
	"winner_user_id" uuid,
	"prize_coins" integer DEFAULT 0 NOT NULL,
	"participant_count" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_activity_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"activity_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"coins_contributed" integer DEFAULT 0 NOT NULL,
	"result" "party_activity_result" DEFAULT 'PARTICIPATING' NOT NULL,
	"dice_roll_value" integer,
	"raffle_ticket_count" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "party_member_role" DEFAULT 'AUDIENCE' NOT NULL,
	"status" "party_member_status" DEFAULT 'ACTIVE' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"total_coins_spent" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"host_user_id" uuid NOT NULL,
	"room_name" text NOT NULL,
	"description" text,
	"room_type" "party_room_type" DEFAULT 'PUBLIC' NOT NULL,
	"status" "party_room_status" DEFAULT 'CREATED' NOT NULL,
	"password_hash" text,
	"max_seats" integer DEFAULT 8 NOT NULL,
	"max_audience" integer DEFAULT 500 NOT NULL,
	"seat_layout_type" "seat_layout_type" DEFAULT 'CIRCLE' NOT NULL,
	"entry_fee_coins" integer,
	"theme_id" uuid,
	"is_persistent" boolean DEFAULT false NOT NULL,
	"event_id" uuid,
	"total_unique_visitors" integer DEFAULT 0 NOT NULL,
	"peak_occupancy" integer DEFAULT 0 NOT NULL,
	"total_gifts_value_coins" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp,
	"ended_at" timestamp,
	"total_duration_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"seat_number" integer NOT NULL,
	"status" "seat_status" DEFAULT 'EMPTY' NOT NULL,
	"occupant_user_id" uuid,
	"reserved_for_user_id" uuid,
	"is_muted" boolean DEFAULT false NOT NULL,
	"is_vip_reserved" boolean DEFAULT false NOT NULL,
	"occupied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "party_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_name" text NOT NULL,
	"description" text NOT NULL,
	"background_asset_url" text NOT NULL,
	"seat_frame_asset_url" text NOT NULL,
	"ambient_sound_url" text,
	"color_scheme_json" jsonb NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"coin_price" integer,
	"status" "party_theme_status" DEFAULT 'ACTIVE' NOT NULL,
	"season_tag" text,
	"created_by_admin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_follower_user_id_users_id_fk" FOREIGN KEY ("follower_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followers" ADD CONSTRAINT "followers_followed_user_id_users_id_fk" FOREIGN KEY ("followed_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocker_user_id_users_id_fk" FOREIGN KEY ("blocker_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blocked_user_id_users_id_fk" FOREIGN KEY ("blocked_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_incidents" ADD CONSTRAINT "security_incidents_source_event_id_security_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."security_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_packages" ADD CONSTRAINT "coin_packages_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coin_transactions" ADD CONSTRAINT "coin_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diamond_transactions" ADD CONSTRAINT "diamond_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_coin_package_id_coin_packages_id_fk" FOREIGN KEY ("coin_package_id") REFERENCES "public"."coin_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_records" ADD CONSTRAINT "payout_records_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_records" ADD CONSTRAINT "payout_records_withdraw_request_id_withdraw_requests_id_fk" FOREIGN KEY ("withdraw_request_id") REFERENCES "public"."withdraw_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdraw_requests" ADD CONSTRAINT "withdraw_requests_approved_by_admin_id_users_id_fk" FOREIGN KEY ("approved_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_animations" ADD CONSTRAINT "gift_animations_gift_id_gifts_id_fk" FOREIGN KEY ("gift_id") REFERENCES "public"."gifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_receiver_user_id_users_id_fk" FOREIGN KEY ("receiver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_transactions" ADD CONSTRAINT "gift_transactions_gift_id_gifts_id_fk" FOREIGN KEY ("gift_id") REFERENCES "public"."gifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_gift_events" ADD CONSTRAINT "live_gift_events_gift_transaction_id_gift_transactions_id_fk" FOREIGN KEY ("gift_transaction_id") REFERENCES "public"."gift_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_gift_events" ADD CONSTRAINT "live_gift_events_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_gift_events" ADD CONSTRAINT "live_gift_events_receiver_user_id_users_id_fk" FOREIGN KEY ("receiver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_stream_id_live_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."live_streams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_rooms" ADD CONSTRAINT "live_rooms_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_room_id_live_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."live_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_streams" ADD CONSTRAINT "live_streams_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_viewers" ADD CONSTRAINT "live_viewers_stream_id_live_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."live_streams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_viewers" ADD CONSTRAINT "live_viewers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_billing_ticks" ADD CONSTRAINT "call_billing_ticks_call_session_id_call_sessions_id_fk" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_caller_user_id_users_id_fk" FOREIGN KEY ("caller_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_sessions" ADD CONSTRAINT "call_sessions_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_billing_ticks" ADD CONSTRAINT "chat_billing_ticks_chat_session_id_chat_sessions_id_fk" FOREIGN KEY ("chat_session_id") REFERENCES "public"."chat_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_game_session_id_game_sessions_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_moves" ADD CONSTRAINT "game_moves_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_game_session_id_game_sessions_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_players" ADD CONSTRAINT "game_players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_results" ADD CONSTRAINT "game_results_game_session_id_game_sessions_id_fk" FOREIGN KEY ("game_session_id") REFERENCES "public"."game_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD CONSTRAINT "game_sessions_call_session_id_call_sessions_id_fk" FOREIGN KEY ("call_session_id") REFERENCES "public"."call_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "call_pricing_rules" ADD CONSTRAINT "call_pricing_rules_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_applications" ADD CONSTRAINT "model_applications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_applications" ADD CONSTRAINT "model_applications_reviewed_by_admin_id_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_availability" ADD CONSTRAINT "model_availability_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_call_stats" ADD CONSTRAINT "model_call_stats_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_demo_videos" ADD CONSTRAINT "model_demo_videos_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_demo_videos" ADD CONSTRAINT "model_demo_videos_reviewed_by_admin_id_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_level_history" ADD CONSTRAINT "model_level_history_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_level_rules" ADD CONSTRAINT "model_level_rules_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_reviews" ADD CONSTRAINT "model_reviews_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_reviews" ADD CONSTRAINT "model_reviews_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_stats" ADD CONSTRAINT "model_stats_model_user_id_users_id_fk" FOREIGN KEY ("model_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_approved_by_admin_id_users_id_fk" FOREIGN KEY ("approved_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "level_rewards" ADD CONSTRAINT "level_rewards_level_id_levels_id_fk" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "levels" ADD CONSTRAINT "levels_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "login_streaks" ADD CONSTRAINT "login_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_current_level_id_levels_id_fk" FOREIGN KEY ("current_level_id") REFERENCES "public"."levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_campaigns" ADD CONSTRAINT "notification_campaigns_template_id_notification_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."notification_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_campaigns" ADD CONSTRAINT "notification_campaigns_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_sections" ADD CONSTRAINT "homepage_sections_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ui_layout_configs" ADD CONSTRAINT "ui_layout_configs_published_by_admin_id_users_id_fk" FOREIGN KEY ("published_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_candidates" ADD CONSTRAINT "recommendation_candidates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_configs" ADD CONSTRAINT "recommendation_configs_updated_by_admin_id_users_id_fk" FOREIGN KEY ("updated_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recommendation_impressions" ADD CONSTRAINT "recommendation_impressions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fraud_signals" ADD CONSTRAINT "fraud_signals_fraud_flag_id_fraud_flags_id_fk" FOREIGN KEY ("fraud_flag_id") REFERENCES "public"."fraud_flags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_scan_results" ADD CONSTRAINT "media_scan_results_media_asset_id_media_assets_id_fk" FOREIGN KEY ("media_asset_id") REFERENCES "public"."media_assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_user_id_1_users_id_fk" FOREIGN KEY ("user_id_1") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_user_id_2_users_id_fk" FOREIGN KEY ("user_id_2") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_conversation_id_dm_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_messages" ADD CONSTRAINT "dm_messages_sender_user_id_users_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_participants" ADD CONSTRAINT "event_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_admin_id_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "host_analytics_snapshots" ADD CONSTRAINT "host_analytics_snapshots_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_leaderboard_id_leaderboards_id_fk" FOREIGN KEY ("leaderboard_id") REFERENCES "public"."leaderboards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_snapshots" ADD CONSTRAINT "leaderboard_snapshots_leaderboard_id_leaderboards_id_fk" FOREIGN KEY ("leaderboard_id") REFERENCES "public"."leaderboards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_rewards" ADD CONSTRAINT "referral_rewards_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviter_user_id_users_id_fk" FOREIGN KEY ("inviter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vip_subscriptions" ADD CONSTRAINT "vip_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agencies" ADD CONSTRAINT "agencies_approved_by_admin_id_admins_id_fk" FOREIGN KEY ("approved_by_admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_hosts" ADD CONSTRAINT "agency_hosts_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agency_hosts" ADD CONSTRAINT "agency_hosts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banners" ADD CONSTRAINT "banners_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_participants" ADD CONSTRAINT "campaign_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_participant_id_campaign_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."campaign_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_rewards" ADD CONSTRAINT "campaign_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_rewards" ADD CONSTRAINT "promotion_rewards_promotion_id_promotions_id_fk" FOREIGN KEY ("promotion_id") REFERENCES "public"."promotions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_rewards" ADD CONSTRAINT "promotion_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_assets" ADD CONSTRAINT "theme_assets_theme_id_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "themes" ADD CONSTRAINT "themes_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pk_scores" ADD CONSTRAINT "pk_scores_pk_session_id_pk_sessions_id_fk" FOREIGN KEY ("pk_session_id") REFERENCES "public"."pk_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pk_scores" ADD CONSTRAINT "pk_scores_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pk_scores" ADD CONSTRAINT "pk_scores_gifter_user_id_users_id_fk" FOREIGN KEY ("gifter_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pk_scores" ADD CONSTRAINT "pk_scores_gift_id_gifts_id_fk" FOREIGN KEY ("gift_id") REFERENCES "public"."gifts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pk_sessions" ADD CONSTRAINT "pk_sessions_host_a_user_id_users_id_fk" FOREIGN KEY ("host_a_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pk_sessions" ADD CONSTRAINT "pk_sessions_host_b_user_id_users_id_fk" FOREIGN KEY ("host_b_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_billing_ticks" ADD CONSTRAINT "group_audio_billing_ticks_room_id_group_audio_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."group_audio_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_billing_ticks" ADD CONSTRAINT "group_audio_billing_ticks_participant_id_group_audio_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."group_audio_participants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_billing_ticks" ADD CONSTRAINT "group_audio_billing_ticks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_hand_raises" ADD CONSTRAINT "group_audio_hand_raises_room_id_group_audio_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."group_audio_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_hand_raises" ADD CONSTRAINT "group_audio_hand_raises_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_hand_raises" ADD CONSTRAINT "group_audio_hand_raises_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_participants" ADD CONSTRAINT "group_audio_participants_room_id_group_audio_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."group_audio_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_participants" ADD CONSTRAINT "group_audio_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_audio_rooms" ADD CONSTRAINT "group_audio_rooms_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_activities" ADD CONSTRAINT "party_activities_room_id_party_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."party_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_activities" ADD CONSTRAINT "party_activities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_activity_participants" ADD CONSTRAINT "party_activity_participants_activity_id_party_activities_id_fk" FOREIGN KEY ("activity_id") REFERENCES "public"."party_activities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_activity_participants" ADD CONSTRAINT "party_activity_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_room_id_party_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."party_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_members" ADD CONSTRAINT "party_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_rooms" ADD CONSTRAINT "party_rooms_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_rooms" ADD CONSTRAINT "party_rooms_theme_id_party_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."party_themes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_rooms" ADD CONSTRAINT "party_rooms_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_seats" ADD CONSTRAINT "party_seats_room_id_party_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."party_rooms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_seats" ADD CONSTRAINT "party_seats_occupant_user_id_users_id_fk" FOREIGN KEY ("occupant_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_seats" ADD CONSTRAINT "party_seats_reserved_for_user_id_users_id_fk" FOREIGN KEY ("reserved_for_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "party_themes" ADD CONSTRAINT "party_themes_created_by_admin_id_users_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "email_verifications_token_idx" ON "email_verifications" USING btree ("verification_token_hash");--> statement-breakpoint
CREATE INDEX "email_verifications_user_type_status_idx" ON "email_verifications" USING btree ("user_id","verification_type","status");--> statement-breakpoint
CREATE INDEX "email_verifications_expires_at_idx" ON "email_verifications" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "followers_pair_idx" ON "followers" USING btree ("follower_user_id","followed_user_id");--> statement-breakpoint
CREATE INDEX "followers_follower_created_idx" ON "followers" USING btree ("follower_user_id","created_at");--> statement-breakpoint
CREATE INDEX "followers_followed_created_idx" ON "followers" USING btree ("followed_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "push_tokens_token_idx" ON "push_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "push_tokens_user_platform_idx" ON "push_tokens" USING btree ("user_id","platform");--> statement-breakpoint
CREATE INDEX "push_tokens_status_refresh_idx" ON "push_tokens" USING btree ("token_status","last_refreshed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_blocks_pair_idx" ON "user_blocks" USING btree ("blocker_user_id","blocked_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_code_idx" ON "users" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "users_role_status_country_idx" ON "users" USING btree ("role","status","country");--> statement-breakpoint
CREATE INDEX "users_last_active_at_idx" ON "users" USING btree ("last_active_at");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_status_idx" ON "auth_sessions" USING btree ("session_status");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "security_events_actor_created_idx" ON "security_events" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "security_events_type_severity_idx" ON "security_events" USING btree ("event_type","severity","created_at");--> statement-breakpoint
CREATE INDEX "security_events_ip_created_idx" ON "security_events" USING btree ("ip_address","created_at");--> statement-breakpoint
CREATE INDEX "security_events_severity_created_idx" ON "security_events" USING btree ("severity","created_at");--> statement-breakpoint
CREATE INDEX "security_incidents_status_severity_idx" ON "security_incidents" USING btree ("status","severity");--> statement-breakpoint
CREATE UNIQUE INDEX "service_identities_key_hash_idx" ON "service_identities" USING btree ("public_key_hash");--> statement-breakpoint
CREATE INDEX "service_identities_name_status_idx" ON "service_identities" USING btree ("service_name","status");--> statement-breakpoint
CREATE INDEX "service_identities_expires_status_idx" ON "service_identities" USING btree ("expires_at","status");--> statement-breakpoint
CREATE INDEX "coin_packages_active_order_idx" ON "coin_packages" USING btree ("is_active","display_order");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_packages_apple_idx" ON "coin_packages" USING btree ("apple_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_packages_google_idx" ON "coin_packages" USING btree ("google_product_id");--> statement-breakpoint
CREATE INDEX "coin_tx_user_created_idx" ON "coin_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "coin_tx_idempotency_idx" ON "coin_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "coin_tx_ref_idx" ON "coin_transactions" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "coin_tx_type_created_idx" ON "coin_transactions" USING btree ("transaction_type","created_at");--> statement-breakpoint
CREATE INDEX "diamond_tx_user_created_idx" ON "diamond_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "diamond_tx_idempotency_idx" ON "diamond_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "diamond_tx_ref_idx" ON "diamond_transactions" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_user_id_idx" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "payments_user_created_idx" ON "payments" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_idx" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "payments_status_created_idx" ON "payments" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_idx" ON "payments" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "payout_model_status_idx" ON "payout_records" USING btree ("model_user_id","status");--> statement-breakpoint
CREATE INDEX "payout_withdraw_idx" ON "payout_records" USING btree ("withdraw_request_id");--> statement-breakpoint
CREATE INDEX "webhook_provider_event_idx" ON "webhook_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "withdraw_model_status_created_idx" ON "withdraw_requests" USING btree ("model_user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "withdraw_status_created_idx" ON "withdraw_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "withdraw_fraud_status_idx" ON "withdraw_requests" USING btree ("fraud_risk_score","status");--> statement-breakpoint
CREATE INDEX "gift_animations_gift_idx" ON "gift_animations" USING btree ("gift_id");--> statement-breakpoint
CREATE INDEX "gift_tx_sender_created_idx" ON "gift_transactions" USING btree ("sender_user_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_tx_receiver_created_idx" ON "gift_transactions" USING btree ("receiver_user_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_tx_gift_created_idx" ON "gift_transactions" USING btree ("gift_id","created_at");--> statement-breakpoint
CREATE INDEX "gift_tx_context_idx" ON "gift_transactions" USING btree ("context_type","context_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "gift_tx_idempotency_idx" ON "gift_transactions" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "gifts_code_idx" ON "gifts" USING btree ("gift_code");--> statement-breakpoint
CREATE INDEX "gifts_active_order_idx" ON "gifts" USING btree ("is_active","display_order");--> statement-breakpoint
CREATE INDEX "gifts_active_time_idx" ON "gifts" USING btree ("is_active","start_at","end_at");--> statement-breakpoint
CREATE INDEX "gifts_season_active_idx" ON "gifts" USING btree ("season_tag","is_active");--> statement-breakpoint
CREATE INDEX "live_gift_events_stream_created_idx" ON "live_gift_events" USING btree ("live_stream_id","created_at");--> statement-breakpoint
CREATE INDEX "live_gift_events_delivery_created_idx" ON "live_gift_events" USING btree ("delivery_status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "live_gift_events_broadcast_idx" ON "live_gift_events" USING btree ("broadcast_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "live_gift_events_tx_idx" ON "live_gift_events" USING btree ("gift_transaction_id");--> statement-breakpoint
CREATE INDEX "chat_messages_stream_created_idx" ON "chat_messages" USING btree ("stream_id","created_at");--> statement-breakpoint
CREATE INDEX "chat_messages_sender_created_idx" ON "chat_messages" USING btree ("sender_user_id","created_at");--> statement-breakpoint
CREATE INDEX "live_rooms_host_status_idx" ON "live_rooms" USING btree ("host_user_id","status");--> statement-breakpoint
CREATE INDEX "live_rooms_status_category_idx" ON "live_rooms" USING btree ("status","category");--> statement-breakpoint
CREATE INDEX "live_streams_status_trending_idx" ON "live_streams" USING btree ("status","trending_score");--> statement-breakpoint
CREATE INDEX "live_streams_host_status_started_idx" ON "live_streams" USING btree ("host_user_id","status","started_at");--> statement-breakpoint
CREATE INDEX "live_streams_room_started_idx" ON "live_streams" USING btree ("room_id","started_at");--> statement-breakpoint
CREATE INDEX "live_viewers_stream_joined_idx" ON "live_viewers" USING btree ("stream_id","joined_at");--> statement-breakpoint
CREATE INDEX "live_viewers_user_joined_idx" ON "live_viewers" USING btree ("user_id","joined_at");--> statement-breakpoint
CREATE INDEX "live_viewers_stream_user_idx" ON "live_viewers" USING btree ("stream_id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "call_billing_ticks_session_tick_idx" ON "call_billing_ticks" USING btree ("call_session_id","tick_number");--> statement-breakpoint
CREATE INDEX "call_sessions_caller_status_idx" ON "call_sessions" USING btree ("caller_user_id","status");--> statement-breakpoint
CREATE INDEX "call_sessions_model_status_idx" ON "call_sessions" USING btree ("model_user_id","status");--> statement-breakpoint
CREATE INDEX "call_sessions_status_started_idx" ON "call_sessions" USING btree ("status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_billing_ticks_session_tick_idx" ON "chat_billing_ticks" USING btree ("chat_session_id","tick_number");--> statement-breakpoint
CREATE INDEX "chat_sessions_user_model_status_idx" ON "chat_sessions" USING btree ("user_id","model_user_id","status");--> statement-breakpoint
CREATE INDEX "chat_sessions_model_status_started_idx" ON "chat_sessions" USING btree ("model_user_id","status","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "game_moves_session_seq_idx" ON "game_moves" USING btree ("game_session_id","move_sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "game_players_session_user_idx" ON "game_players" USING btree ("game_session_id","user_id");--> statement-breakpoint
CREATE INDEX "game_results_session_idx" ON "game_results" USING btree ("game_session_id");--> statement-breakpoint
CREATE INDEX "game_sessions_call_status_idx" ON "game_sessions" USING btree ("call_session_id","status","started_at");--> statement-breakpoint
CREATE INDEX "call_pricing_rules_active_effective_idx" ON "call_pricing_rules" USING btree ("is_active","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "call_pricing_rules_formula_idx" ON "call_pricing_rules" USING btree ("formula_type");--> statement-breakpoint
CREATE INDEX "model_applications_user_status_idx" ON "model_applications" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "model_applications_status_submitted_idx" ON "model_applications" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "model_availability_model_day_idx" ON "model_availability" USING btree ("model_user_id","day_of_week","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "model_call_stats_model_idx" ON "model_call_stats" USING btree ("model_user_id");--> statement-breakpoint
CREATE INDEX "model_demo_videos_model_status_order_idx" ON "model_demo_videos" USING btree ("model_user_id","status","display_order");--> statement-breakpoint
CREATE INDEX "model_demo_videos_status_created_idx" ON "model_demo_videos" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "model_level_history_model_created_idx" ON "model_level_history" USING btree ("model_user_id","created_at");--> statement-breakpoint
CREATE INDEX "model_level_history_reason_created_idx" ON "model_level_history" USING btree ("change_reason","created_at");--> statement-breakpoint
CREATE INDEX "model_level_history_new_level_created_idx" ON "model_level_history" USING btree ("new_level","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "model_level_rules_level_idx" ON "model_level_rules" USING btree ("level_number");--> statement-breakpoint
CREATE INDEX "model_level_rules_active_level_idx" ON "model_level_rules" USING btree ("is_active","level_number");--> statement-breakpoint
CREATE INDEX "model_reviews_model_created_idx" ON "model_reviews" USING btree ("model_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "model_reviews_call_session_idx" ON "model_reviews" USING btree ("call_session_id");--> statement-breakpoint
CREATE INDEX "model_reviews_reviewer_created_idx" ON "model_reviews" USING btree ("reviewer_user_id","created_at");--> statement-breakpoint
CREATE INDEX "model_reviews_rating_model_idx" ON "model_reviews" USING btree ("rating","model_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "model_stats_model_idx" ON "model_stats" USING btree ("model_user_id");--> statement-breakpoint
CREATE INDEX "model_stats_level_idx" ON "model_stats" USING btree ("current_level");--> statement-breakpoint
CREATE INDEX "model_stats_diamonds_idx" ON "model_stats" USING btree ("total_diamonds");--> statement-breakpoint
CREATE INDEX "model_stats_level_updated_idx" ON "model_stats" USING btree ("level_updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "models_user_id_idx" ON "models" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "models_online_quality_idx" ON "models" USING btree ("is_online","quality_score");--> statement-breakpoint
CREATE UNIQUE INDEX "badges_key_idx" ON "badges" USING btree ("badge_key");--> statement-breakpoint
CREATE INDEX "level_rewards_level_status_idx" ON "level_rewards" USING btree ("level_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "levels_track_number_idx" ON "levels" USING btree ("level_track","level_number");--> statement-breakpoint
CREATE INDEX "levels_track_status_threshold_idx" ON "levels" USING btree ("level_track","status","threshold_value");--> statement-breakpoint
CREATE UNIQUE INDEX "login_streaks_user_idx" ON "login_streaks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_badges_user_badge_idx" ON "user_badges" USING btree ("user_id","badge_id");--> statement-breakpoint
CREATE INDEX "user_badges_user_idx" ON "user_badges" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_levels_user_track_idx" ON "user_levels" USING btree ("user_id","level_track");--> statement-breakpoint
CREATE INDEX "user_levels_level_idx" ON "user_levels" USING btree ("current_level_id");--> statement-breakpoint
CREATE INDEX "messages_recipient_read_created_idx" ON "messages" USING btree ("recipient_user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "messages_type_created_idx" ON "messages" USING btree ("message_type","created_at");--> statement-breakpoint
CREATE INDEX "notification_campaigns_status_scheduled_idx" ON "notification_campaigns" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "notification_campaigns_type_status_idx" ON "notification_campaigns" USING btree ("campaign_type","status");--> statement-breakpoint
CREATE INDEX "notification_campaigns_admin_created_idx" ON "notification_campaigns" USING btree ("created_by_admin_id","created_at");--> statement-breakpoint
CREATE INDEX "notification_prefs_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_templates_key_locale_channel_version_idx" ON "notification_templates" USING btree ("template_key","locale","channel","version");--> statement-breakpoint
CREATE INDEX "notifications_user_read_created_idx" ON "notifications" USING btree ("user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_type_created_idx" ON "notifications" USING btree ("user_id","notification_type","created_at");--> statement-breakpoint
CREATE INDEX "notifications_delivery_created_idx" ON "notifications" USING btree ("delivery_status","created_at");--> statement-breakpoint
CREATE INDEX "admin_logs_admin_created_idx" ON "admin_logs" USING btree ("admin_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_logs_target_created_idx" ON "admin_logs" USING btree ("target_type","target_id","created_at");--> statement-breakpoint
CREATE INDEX "admin_logs_action_created_idx" ON "admin_logs" USING btree ("action","created_at");--> statement-breakpoint
CREATE INDEX "admin_logs_created_idx" ON "admin_logs" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "admins_user_id_idx" ON "admins" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "feature_flags_key_idx" ON "feature_flags" USING btree ("flag_key");--> statement-breakpoint
CREATE INDEX "feature_flags_enabled_idx" ON "feature_flags" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "homepage_sections_status_position_idx" ON "homepage_sections" USING btree ("status","position");--> statement-breakpoint
CREATE UNIQUE INDEX "system_settings_composite_idx" ON "system_settings" USING btree ("namespace","key","environment","region_code","segment_code","version");--> statement-breakpoint
CREATE INDEX "system_settings_lookup_idx" ON "system_settings" USING btree ("namespace","key","environment","region_code","segment_code","status","effective_from");--> statement-breakpoint
CREATE INDEX "system_settings_version_idx" ON "system_settings" USING btree ("namespace","key","version");--> statement-breakpoint
CREATE INDEX "system_settings_admin_updated_idx" ON "system_settings" USING btree ("updated_by_admin_id","updated_at");--> statement-breakpoint
CREATE INDEX "system_settings_status_effective_idx" ON "system_settings" USING btree ("status","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "ui_layout_configs_lookup_idx" ON "ui_layout_configs" USING btree ("layout_name","platform","region_code","status","version");--> statement-breakpoint
CREATE INDEX "ui_layout_configs_status_effective_idx" ON "ui_layout_configs" USING btree ("status","effective_from","effective_to");--> statement-breakpoint
CREATE INDEX "rec_candidates_user_type_score_idx" ON "recommendation_candidates" USING btree ("user_id","candidate_type","score");--> statement-breakpoint
CREATE INDEX "rec_candidates_expires_idx" ON "recommendation_candidates" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rec_candidates_type_candidate_idx" ON "recommendation_candidates" USING btree ("candidate_type","candidate_id");--> statement-breakpoint
CREATE INDEX "rec_configs_scope_status_idx" ON "recommendation_configs" USING btree ("scope_type","scope_value","status");--> statement-breakpoint
CREATE INDEX "rec_impressions_user_created_idx" ON "recommendation_impressions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "rec_impressions_type_candidate_created_idx" ON "recommendation_impressions" USING btree ("candidate_type","candidate_id","created_at");--> statement-breakpoint
CREATE INDEX "rec_impressions_version_clicked_idx" ON "recommendation_impressions" USING btree ("scoring_version","was_clicked");--> statement-breakpoint
CREATE INDEX "fraud_flags_entity_status_score_idx" ON "fraud_flags" USING btree ("entity_type","entity_id","status","risk_score");--> statement-breakpoint
CREATE INDEX "fraud_signals_entity_created_idx" ON "fraud_signals" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "fraud_signals_type_created_idx" ON "fraud_signals" USING btree ("signal_type","created_at");--> statement-breakpoint
CREATE INDEX "fraud_signals_flag_idx" ON "fraud_signals" USING btree ("fraud_flag_id");--> statement-breakpoint
CREATE INDEX "media_assets_owner_idx" ON "media_assets" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "media_assets_storage_key_idx" ON "media_assets" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "media_scan_results_asset_idx" ON "media_scan_results" USING btree ("media_asset_id");--> statement-breakpoint
CREATE INDEX "media_scan_results_status_idx" ON "media_scan_results" USING btree ("scan_status");--> statement-breakpoint
CREATE UNIQUE INDEX "dm_conversations_users_idx" ON "dm_conversations" USING btree ("user_id_1","user_id_2");--> statement-breakpoint
CREATE INDEX "dm_conversations_user2_user1_idx" ON "dm_conversations" USING btree ("user_id_2","user_id_1");--> statement-breakpoint
CREATE INDEX "dm_messages_conversation_created_idx" ON "dm_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "dm_messages_sender_created_idx" ON "dm_messages" USING btree ("sender_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_participants_event_user_idx" ON "event_participants" USING btree ("event_id","user_id");--> statement-breakpoint
CREATE INDEX "event_participants_event_score_idx" ON "event_participants" USING btree ("event_id","score");--> statement-breakpoint
CREATE INDEX "events_status_start_idx" ON "events" USING btree ("status","start_at");--> statement-breakpoint
CREATE INDEX "events_type_status_idx" ON "events" USING btree ("event_type","status");--> statement-breakpoint
CREATE INDEX "host_analytics_host_date_idx" ON "host_analytics_snapshots" USING btree ("host_user_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "leaderboard_entries_board_rank_idx" ON "leaderboard_entries" USING btree ("leaderboard_id","rank_position");--> statement-breakpoint
CREATE UNIQUE INDEX "leaderboard_entries_board_user_idx" ON "leaderboard_entries" USING btree ("leaderboard_id","user_id");--> statement-breakpoint
CREATE INDEX "leaderboard_entries_user_board_idx" ON "leaderboard_entries" USING btree ("user_id","leaderboard_id");--> statement-breakpoint
CREATE INDEX "leaderboard_snapshots_board_date_idx" ON "leaderboard_snapshots" USING btree ("leaderboard_id","snapshot_date");--> statement-breakpoint
CREATE INDEX "leaderboards_type_status_idx" ON "leaderboards" USING btree ("leaderboard_type","status");--> statement-breakpoint
CREATE INDEX "leaderboards_window_idx" ON "leaderboards" USING btree ("window_type","window_start","window_end");--> statement-breakpoint
CREATE INDEX "referral_rewards_referral_idx" ON "referral_rewards" USING btree ("referral_id");--> statement-breakpoint
CREATE INDEX "referral_rewards_inviter_status_idx" ON "referral_rewards" USING btree ("inviter_user_id","status");--> statement-breakpoint
CREATE INDEX "referrals_inviter_status_created_idx" ON "referrals" USING btree ("inviter_user_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_invitee_idx" ON "referrals" USING btree ("invitee_user_id");--> statement-breakpoint
CREATE INDEX "vip_subscriptions_user_status_idx" ON "vip_subscriptions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "vip_subscriptions_status_period_idx" ON "vip_subscriptions" USING btree ("status","current_period_end");--> statement-breakpoint
CREATE INDEX "agencies_status_idx" ON "agencies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agencies_country_idx" ON "agencies" USING btree ("country");--> statement-breakpoint
CREATE UNIQUE INDEX "agency_hosts_agency_user_idx" ON "agency_hosts" USING btree ("agency_id","user_id");--> statement-breakpoint
CREATE INDEX "agency_hosts_user_idx" ON "agency_hosts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "banners_status_position_idx" ON "banners" USING btree ("status","position");--> statement-breakpoint
CREATE INDEX "banners_start_end_idx" ON "banners" USING btree ("start_date","end_date");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_participants_campaign_user_idx" ON "campaign_participants" USING btree ("campaign_id","user_id");--> statement-breakpoint
CREATE INDEX "campaign_rewards_campaign_user_idx" ON "campaign_rewards" USING btree ("campaign_id","user_id");--> statement-breakpoint
CREATE INDEX "campaign_rewards_user_status_idx" ON "campaign_rewards" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE INDEX "campaign_rewards_campaign_status_idx" ON "campaign_rewards" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "campaigns_status_start_end_idx" ON "campaigns" USING btree ("status","start_at","end_at");--> statement-breakpoint
CREATE UNIQUE INDEX "promotion_rewards_promo_user_idx" ON "promotion_rewards" USING btree ("promotion_id","user_id");--> statement-breakpoint
CREATE INDEX "promotions_status_start_end_idx" ON "promotions" USING btree ("status","start_date","end_date");--> statement-breakpoint
CREATE INDEX "theme_assets_theme_idx" ON "theme_assets" USING btree ("theme_id");--> statement-breakpoint
CREATE INDEX "themes_active_idx" ON "themes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "analytics_events_user_created_idx" ON "analytics_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_name_created_idx" ON "analytics_events" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE INDEX "analytics_events_session_idx" ON "analytics_events" USING btree ("session_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_keys_key_idx" ON "idempotency_keys" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idempotency_keys_actor_idx" ON "idempotency_keys" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pk_scores_session_host_idx" ON "pk_scores" USING btree ("pk_session_id","host_user_id");--> statement-breakpoint
CREATE INDEX "pk_sessions_status_started_idx" ON "pk_sessions" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "pk_sessions_host_a_status_idx" ON "pk_sessions" USING btree ("host_a_user_id","status");--> statement-breakpoint
CREATE INDEX "pk_sessions_host_b_status_idx" ON "pk_sessions" USING btree ("host_b_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "group_audio_billing_room_participant_tick_idx" ON "group_audio_billing_ticks" USING btree ("room_id","participant_id","tick_number");--> statement-breakpoint
CREATE INDEX "group_audio_billing_user_timestamp_idx" ON "group_audio_billing_ticks" USING btree ("user_id","tick_timestamp");--> statement-breakpoint
CREATE INDEX "group_audio_hand_raises_room_status_idx" ON "group_audio_hand_raises" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "group_audio_hand_raises_user_room_idx" ON "group_audio_hand_raises" USING btree ("user_id","room_id");--> statement-breakpoint
CREATE INDEX "group_audio_participants_room_status_idx" ON "group_audio_participants" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "group_audio_participants_user_status_idx" ON "group_audio_participants" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "group_audio_participants_room_role_idx" ON "group_audio_participants" USING btree ("room_id","role");--> statement-breakpoint
CREATE INDEX "group_audio_rooms_status_started_idx" ON "group_audio_rooms" USING btree ("status","started_at");--> statement-breakpoint
CREATE INDEX "group_audio_rooms_host_status_idx" ON "group_audio_rooms" USING btree ("host_user_id","status");--> statement-breakpoint
CREATE INDEX "group_audio_rooms_type_status_idx" ON "group_audio_rooms" USING btree ("room_type","status");--> statement-breakpoint
CREATE INDEX "group_audio_rooms_scheduled_idx" ON "group_audio_rooms" USING btree ("scheduled_start_at");--> statement-breakpoint
CREATE INDEX "party_activities_room_status_idx" ON "party_activities" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "party_activities_type_status_idx" ON "party_activities" USING btree ("activity_type","status");--> statement-breakpoint
CREATE UNIQUE INDEX "party_activity_participants_activity_user_idx" ON "party_activity_participants" USING btree ("activity_id","user_id");--> statement-breakpoint
CREATE INDEX "party_activity_participants_activity_result_idx" ON "party_activity_participants" USING btree ("activity_id","result");--> statement-breakpoint
CREATE INDEX "party_members_room_status_idx" ON "party_members" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "party_members_user_status_idx" ON "party_members" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "party_rooms_status_type_idx" ON "party_rooms" USING btree ("status","room_type");--> statement-breakpoint
CREATE INDEX "party_rooms_host_status_idx" ON "party_rooms" USING btree ("host_user_id","status");--> statement-breakpoint
CREATE INDEX "party_rooms_persistent_status_idx" ON "party_rooms" USING btree ("is_persistent","status");--> statement-breakpoint
CREATE INDEX "party_rooms_event_idx" ON "party_rooms" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "party_seats_room_seat_idx" ON "party_seats" USING btree ("room_id","seat_number");--> statement-breakpoint
CREATE INDEX "party_seats_room_status_idx" ON "party_seats" USING btree ("room_id","status");--> statement-breakpoint
CREATE INDEX "party_seats_occupant_idx" ON "party_seats" USING btree ("occupant_user_id");--> statement-breakpoint
CREATE INDEX "party_themes_status_idx" ON "party_themes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "party_themes_season_status_idx" ON "party_themes" USING btree ("season_tag","status");