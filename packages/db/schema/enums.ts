import { pgEnum } from "drizzle-orm/pg-core";

// === User ===
export const userRoleEnum = pgEnum("user_role", ["USER", "HOST", "MODEL", "ADMIN"]);
export const userStatusEnum = pgEnum("user_status", ["ACTIVE", "SUSPENDED", "BANNED", "PENDING_VERIFICATION", "DELETED"]);
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]);

// === Auth ===
export const sessionStatusEnum = pgEnum("session_status", ["ACTIVE", "REVOKED", "EXPIRED", "STEP_UP_REQUIRED"]);
export const verificationTypeEnum = pgEnum("verification_type", ["SIGNUP", "EMAIL_CHANGE", "PASSWORD_RESET"]);
export const verificationStatusEnum = pgEnum("verification_status", ["PENDING", "VERIFIED", "EXPIRED", "USED"]);

// === Security ===
export const securityEventTypeEnum = pgEnum("security_event_type", [
  "LOGIN_SUCCESS", "LOGIN_FAILURE", "MFA_CHALLENGE", "MFA_FAILURE",
  "SESSION_REVOKED", "PASSWORD_CHANGED", "EMAIL_CHANGED", "SUSPICIOUS_LOGIN",
  "RATE_LIMIT_HIT", "BRUTE_FORCE_DETECTED", "FRAUD_FLAG_CREATED",
  "ADMIN_LOGIN", "API_ABUSE_DETECTED", "WEBHOOK_SIGNATURE_INVALID",
]);
export const severityEnum = pgEnum("severity", ["INFO", "WARNING", "HIGH", "CRITICAL"]);
export const incidentSeverityEnum = pgEnum("incident_severity", ["SEV1", "SEV2", "SEV3", "SEV4"]);
export const incidentStatusEnum = pgEnum("incident_status", ["OPEN", "MITIGATING", "RESOLVED", "POSTMORTEM_PENDING", "CLOSED"]);
export const serviceNameEnum = pgEnum("service_name", [
  "AUTH", "WALLET", "PAYMENT", "GIFT", "LIVE", "CALL", "GAME",
  "CHAT", "DISCOVERY", "NOTIFICATION", "MODERATION", "FRAUD", "CONFIG", "MEDIA",
]);
export const serviceStatusEnum = pgEnum("service_identity_status", ["ACTIVE", "ROTATED", "REVOKED"]);

// === Wallet & Finance ===
export const coinTransactionTypeEnum = pgEnum("coin_transaction_type", [
  "PURCHASE", "GIFT_SENT", "DAILY_REWARD", "STREAK_REWARD", "CALL_BILLING",
  "ADMIN_ADJUSTMENT", "REFUND", "PROMO_BONUS", "LEVEL_REWARD", "REFERRAL_REWARD",
]);
export const diamondTransactionTypeEnum = pgEnum("diamond_transaction_type", [
  "GIFT_CREDIT", "WITHDRAWAL_DEBIT", "ADMIN_ADJUSTMENT", "EVENT_REWARD",
]);
export const paymentProviderEnum = pgEnum("payment_provider", ["STRIPE", "RAZORPAY", "APPLE_IAP", "GOOGLE_PLAY"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "COMPLETED", "FAILED", "REFUNDED", "DISPUTED"]);
export const payoutMethodEnum = pgEnum("payout_method", ["PAYPAL", "BANK_TRANSFER", "PAYONEER", "CRYPTO"]);
export const withdrawStatusEnum = pgEnum("withdraw_status", [
  "PENDING", "APPROVED", "REJECTED", "PROCESSING", "COMPLETED", "ON_HOLD",
]);
export const payoutStatusEnum = pgEnum("payout_status", ["PENDING", "PROCESSING", "COMPLETED", "FAILED"]);

// === Gifts ===
export const effectTierEnum = pgEnum("effect_tier", ["MICRO", "STANDARD", "PREMIUM", "LEGENDARY"]);
export const giftContextTypeEnum = pgEnum("gift_context_type", [
  "LIVE_STREAM", "VIDEO_CALL", "VOICE_CALL", "CHAT_CONVERSATION", "PK_BATTLE", "GROUP_AUDIO", "PARTY",
]);
export const deliveryStatusEnum = pgEnum("delivery_status", [
  "QUEUED", "PUBLISHED", "ACK_PARTIAL", "ACK_COMPLETE", "EXPIRED", "FAILED",
]);

// === Live ===
export const roomTypeEnum = pgEnum("room_type", ["PUBLIC", "PRIVATE", "VIP_ONLY"]);
export const roomStatusEnum = pgEnum("room_status", ["IDLE", "LIVE", "SUSPENDED"]);
export const streamTypeEnum = pgEnum("stream_type", ["SOLO", "MULTI_GUEST", "PK_BATTLE"]);
export const streamStatusEnum = pgEnum("stream_status", ["STARTING", "LIVE", "ENDED", "FORCE_STOPPED"]);
export const streamEndReasonEnum = pgEnum("stream_end_reason", ["NORMAL", "HOST_ENDED", "ADMIN_FORCE_STOP", "ERROR"]);
export const chatMessageTypeEnum = pgEnum("chat_message_type", ["TEXT", "EMOJI", "SYSTEM", "MODERATION"]);

// === Calls ===
export const callTypeEnum = pgEnum("call_type", ["AUDIO", "VIDEO"]);
export const callStatusEnum = pgEnum("call_status", ["REQUESTED", "ACTIVE", "ENDED", "FAILED"]);
export const callEndReasonEnum = pgEnum("call_end_reason", [
  "NORMAL", "INSUFFICIENT_BALANCE", "USER_HANGUP", "MODEL_HANGUP", "TIMEOUT", "ERROR",
]);
export const chatSessionTypeEnum = pgEnum("chat_session_type", ["FREE", "PAID"]);
export const chatSessionStatusEnum = pgEnum("chat_session_status", ["ACTIVE", "ENDED", "EXPIRED"]);

// === Games ===
export const gameTypeEnum = pgEnum("game_type", ["CHESS", "LUDO", "CARROM", "SUDOKU"]);
export const gameStatusEnum = pgEnum("game_status", ["CREATED", "ACTIVE", "PAUSED", "ENDED"]);
export const gameResultTypeEnum = pgEnum("game_result_type", ["WIN", "LOSS", "DRAW", "ABANDONED"]);

// === Models ===
export const modelApplicationStatusEnum = pgEnum("model_application_status", ["PENDING", "APPROVED", "REJECTED"]);
export const demoVideoStatusEnum = pgEnum("demo_video_status", ["PENDING_REVIEW", "APPROVED", "REJECTED", "ARCHIVED"]);
export const dayOfWeekEnum = pgEnum("day_of_week", ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);
export const levelTrackEnum = pgEnum("level_track", ["USER", "MODEL"]);
export const levelStatusEnum = pgEnum("level_status", ["ACTIVE", "INACTIVE"]);
export const levelChangeReasonEnum = pgEnum("level_change_reason", [
  "AUTO_RECALC", "EVENT_TRIGGERED", "ADMIN_OVERRIDE", "ADMIN_LEVEL_EDIT", "LEVEL_DELETED",
]);
export const formulaTypeEnum = pgEnum("formula_type", ["FIXED", "MULTIPLIER", "LINEAR_INCREMENT"]);

// === Notifications ===
export const notificationTypeEnum = pgEnum("notification_type", [
  "NEW_FOLLOWER", "LIVE_STARTED", "GIFT_RECEIVED", "DIAMOND_EARNED",
  "WITHDRAWAL_UPDATE", "MODEL_APPLICATION_UPDATE", "EVENT_REMINDER",
  "SECURITY_ALERT", "SYSTEM_ANNOUNCEMENT", "STREAK_REMINDER",
  "DM_RECEIVED", "CALL_MISSED", "LEVEL_UP", "REWARD_GRANTED",
]);
export const notificationChannelEnum = pgEnum("notification_channel", ["IN_APP", "PUSH", "EMAIL"]);
export const notificationDeliveryStatusEnum = pgEnum("notification_delivery_status", ["PENDING", "SENT", "DELIVERED", "FAILED"]);
export const notificationCategoryEnum = pgEnum("notification_category", ["GIFTS", "FOLLOWS", "EVENTS", "SECURITY", "MARKETING"]);
export const pushPlatformEnum = pgEnum("push_platform", ["IOS", "ANDROID", "WEB"]);
export const pushTokenStatusEnum = pgEnum("push_token_status", ["ACTIVE", "EXPIRED", "INVALID"]);

// === Messages ===
export const senderTypeEnum = pgEnum("sender_type", ["SYSTEM", "ADMIN", "USER"]);
export const systemMessageTypeEnum = pgEnum("system_message_type", [
  "SYSTEM_NOTICE", "ADMIN_BROADCAST", "POLICY_UPDATE", "WELCOME", "CUSTOM",
]);

// === Admin ===
export const adminActionEnum = pgEnum("admin_action", [
  "USER_SUSPEND", "USER_BAN", "USER_RESTORE", "MODEL_APPROVE", "MODEL_REJECT",
  "WITHDRAWAL_APPROVE", "WITHDRAWAL_REJECT", "GIFT_CREATE", "GIFT_UPDATE",
  "COIN_PACKAGE_CREATE", "COIN_PACKAGE_UPDATE", "LEVEL_CREATE", "LEVEL_UPDATE",
  "SETTING_UPDATE", "THEME_ACTIVATE", "BANNER_CREATE", "PROMOTION_CREATE",
  "STREAM_FORCE_STOP", "PAYOUT_APPROVE", "CONFIG_PUBLISH", "CONFIG_ROLLBACK",
  "MANUAL_ADJUSTMENT",
]);
export const adminTargetTypeEnum = pgEnum("admin_target_type", [
  "USER", "MODEL", "WITHDRAWAL", "GIFT", "COIN_PACKAGE", "LEVEL", "SETTING",
  "THEME", "BANNER", "PROMOTION", "LIVE_STREAM", "PAYOUT", "CONFIG",
]);

// === System ===
export const settingStatusEnum = pgEnum("setting_status", ["DRAFT", "PUBLISHED", "ROLLED_BACK"]);
export const featureFlagTypeEnum = pgEnum("feature_flag_type", ["BOOLEAN", "PERCENTAGE", "USER_LIST", "REGION"]);
export const layoutPlatformEnum = pgEnum("layout_platform", ["MOBILE", "WEB", "ALL"]);
export const homepageSectionTypeEnum = pgEnum("homepage_section_type", [
  "LIVE_CAROUSEL", "FEATURED_MODELS", "TRENDING_CREATORS",
  "PROMO_SLIDER", "CATEGORY_CHIPS", "RECOMMENDED_STREAMS",
]);

// === Discovery ===
export const candidateTypeEnum = pgEnum("candidate_type", ["STREAM", "MODEL", "EVENT"]);
export const recommendationSourceEnum = pgEnum("recommendation_source", [
  "FOLLOW_GRAPH", "WATCH_HISTORY", "TRENDING", "REGION", "COLD_START",
]);
export const impressionSourceEnum = pgEnum("impression_source", ["HOME_FEED", "EXPLORE", "SEARCH", "NOTIFICATION"]);

// === Media ===
export const mediaVisibilityEnum = pgEnum("media_visibility", ["PRIVATE", "PUBLIC", "QUARANTINED"]);
export const scanStatusEnum = pgEnum("scan_status", ["PENDING", "PASSED", "FAILED"]);

// === DM ===
export const dmConversationStatusEnum = pgEnum("dm_conversation_status", ["ACTIVE", "BLOCKED", "ARCHIVED"]);
export const dmMessageTypeEnum = pgEnum("dm_message_type", ["TEXT", "EMOJI", "VOICE_NOTE", "IMAGE", "SYSTEM"]);

// === PK ===
export const pkStatusEnum = pgEnum("pk_status", ["CREATED", "MATCHING", "ACTIVE", "VOTING", "ENDED", "CANCELLED"]);
export const pkResultTypeEnum = pgEnum("pk_result_type", ["WIN", "DRAW", "CANCELLED"]);

// === VIP ===
export const vipStatusEnum = pgEnum("vip_status", ["ACTIVE", "PAST_DUE", "CANCELLED", "EXPIRED"]);

// === Referrals ===
export const referralStatusEnum = pgEnum("referral_status", ["PENDING", "QUALIFIED", "REWARDED", "REJECTED"]);
export const referralRewardTypeEnum = pgEnum("referral_reward_type", ["COINS", "BADGE", "VIP_DAYS"]);
export const referralRewardStatusEnum = pgEnum("referral_reward_status", ["PENDING", "APPROVED", "REJECTED"]);

// === Fraud ===
export const fraudEntityTypeEnum = pgEnum("fraud_entity_type", [
  "USER", "TRANSACTION", "WITHDRAWAL", "REFERRAL", "CALL_SESSION", "GIFT_TRANSACTION",
]);
export const fraudSignalTypeEnum = pgEnum("fraud_signal_type", [
  "DEVICE_FINGERPRINT_MATCH", "IP_CLUSTER", "VELOCITY_SPIKE", "CIRCULAR_GIFTING",
  "SELF_REFERRAL", "PAYMENT_INSTRUMENT_OVERLAP", "BEHAVIOR_ANOMALY",
  "REPEATED_SHORT_CALLS", "SCRIPTED_PATTERN",
]);
export const fraudFlagEntityTypeEnum = pgEnum("fraud_flag_entity_type", [
  "USER", "TRANSACTION", "WITHDRAWAL", "REFERRAL",
]);
export const fraudRiskLevelEnum = pgEnum("fraud_risk_level", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export const fraudFlagStatusEnum = pgEnum("fraud_flag_status", ["OPEN", "UNDER_REVIEW", "RESOLVED", "FALSE_POSITIVE"]);

// === Campaigns ===
export const campaignRewardTypeEnum = pgEnum("campaign_reward_type", [
  "COINS", "DIAMONDS", "BADGE", "VIP_DAYS", "GIFT_MULTIPLIER",
]);
export const campaignRewardStatusEnum = pgEnum("campaign_reward_status", ["PENDING", "GRANTED", "FAILED", "EXPIRED"]);
export const notificationCampaignTypeEnum = pgEnum("notification_campaign_type", [
  "INACTIVITY_NUDGE", "EVENT_ANNOUNCEMENT", "PROMO_BLAST", "FEATURE_LAUNCH", "RE_ENGAGEMENT",
]);
export const notificationCampaignStatusEnum = pgEnum("notification_campaign_status", [
  "DRAFT", "SCHEDULED", "SENDING", "COMPLETED", "CANCELLED",
]);
export const scheduleTypeEnum = pgEnum("schedule_type", ["IMMEDIATE", "SCHEDULED", "RECURRING"]);
export const notificationAllChannelEnum = pgEnum("notification_all_channel", ["PUSH", "IN_APP", "EMAIL", "ALL"]);

// === CMS ===
export const bannerLinkTypeEnum = pgEnum("banner_link_type", ["DEEP_LINK", "EXTERNAL_URL", "PROMOTION", "MODEL_PROFILE"]);
export const bannerStatusEnum = pgEnum("banner_status", ["ACTIVE", "INACTIVE", "SCHEDULED"]);
export const iconStyleEnum = pgEnum("icon_style", ["DEFAULT", "FESTIVAL", "SEASONAL"]);
export const themeAssetTypeEnum = pgEnum("theme_asset_type", ["BACKGROUND", "ICON", "LOGO", "SPLASH"]);
export const promotionTypeEnum = pgEnum("promotion_type", ["COIN_BONUS", "EVENT_CAMPAIGN", "SEASONAL", "REFERRAL_BOOST"]);
export const promotionStatusEnum = pgEnum("promotion_status", ["DRAFT", "SCHEDULED", "ACTIVE", "ENDED", "CANCELLED"]);
export const promotionAudienceEnum = pgEnum("promotion_audience", ["ALL", "NEW_USERS", "RETURNING", "SPECIFIC_REGION"]);
export const promotionRewardTypeEnum = pgEnum("promotion_reward_type", ["BONUS_COINS", "GIFT_MULTIPLIER", "REFERRAL_BONUS"]);
export const levelRewardTypeEnum = pgEnum("level_reward_type", [
  "BONUS_COINS", "BADGE", "SPECIAL_GIFT", "VIP_TRIAL", "PROFILE_FRAME",
]);

// === Idempotency ===
export const idempotencyStatusEnum = pgEnum("idempotency_status", ["IN_PROGRESS", "COMPLETED", "FAILED"]);

// === Account Deletion ===
export const accountDeletionStatusEnum = pgEnum("account_deletion_status", [
  "REQUESTED", "COOLING_OFF", "CANCELLED", "COMPLETED", "LEGAL_HOLD",
]);

// === Group Audio ===
export const groupAudioRoomTypeEnum = pgEnum("group_audio_room_type", ["FREE", "PAID", "VIP_ONLY", "INVITE_ONLY"]);
export const groupAudioRoomStatusEnum = pgEnum("group_audio_room_status", [
  "SCHEDULED", "CREATED", "LIVE", "ENDING", "ENDED", "ARCHIVED",
]);
export const groupAudioParticipantRoleEnum = pgEnum("group_audio_participant_role", ["HOST", "CO_HOST", "SPEAKER", "LISTENER"]);
export const groupAudioParticipantStatusEnum = pgEnum("group_audio_participant_status", ["ACTIVE", "LEFT", "REMOVED", "DISCONNECTED"]);
export const handRaiseStatusEnum = pgEnum("hand_raise_status", ["PENDING", "ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED"]);

// === Party ===
export const partyRoomTypeEnum = pgEnum("party_room_type", ["PUBLIC", "PRIVATE", "VIP", "MODEL_HOSTED", "EVENT"]);
export const partyRoomStatusEnum = pgEnum("party_room_status", [
  "CREATED", "OPEN", "ACTIVE", "PAUSED", "CLOSED", "ARCHIVED",
]);
export const seatStatusEnum = pgEnum("seat_status", ["EMPTY", "OCCUPIED", "LOCKED", "RESERVED", "BLOCKED"]);
export const seatLayoutTypeEnum = pgEnum("seat_layout_type", ["CIRCLE", "GRID", "STAGE"]);
export const partyMemberRoleEnum = pgEnum("party_member_role", ["HOST", "CO_HOST", "SEATED", "AUDIENCE"]);
export const partyMemberStatusEnum = pgEnum("party_member_status", ["ACTIVE", "LEFT", "REMOVED", "KICKED", "BANNED", "DISCONNECTED"]);
export const partyThemeStatusEnum = pgEnum("party_theme_status", ["ACTIVE", "INACTIVE", "ARCHIVED"]);
export const partyActivityTypeEnum = pgEnum("party_activity_type", ["DICE_GAME", "LUCKY_DRAW", "GIFTING_WAR", "TRUTH_OR_DARE"]);
export const partyActivityStatusEnum = pgEnum("party_activity_status", ["CREATED", "ACTIVE", "ENDED", "CANCELLED"]);
export const partyActivityResultEnum = pgEnum("party_activity_result", ["WON", "LOST", "PARTICIPATING"]);

// === Agency ===
export const agencyHostStatusEnum = pgEnum("agency_host_status", ["ACTIVE", "REMOVED"]);
