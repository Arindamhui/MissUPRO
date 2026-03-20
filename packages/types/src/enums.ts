import { z } from "zod";

// ─── Error Codes ───
export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
  AUTH_MFA_REQUIRED: "AUTH_MFA_REQUIRED",
  AUTH_DEVICE_BLOCKED: "AUTH_DEVICE_BLOCKED",
  WALLET_INSUFFICIENT_BALANCE: "WALLET_INSUFFICIENT_BALANCE",
  WALLET_DEBIT_LIMIT_EXCEEDED: "WALLET_DEBIT_LIMIT_EXCEEDED",
  WALLET_RECONCILIATION_MISMATCH: "WALLET_RECONCILIATION_MISMATCH",
  PAYMENT_INTENT_FAILED: "PAYMENT_INTENT_FAILED",
  PAYMENT_WEBHOOK_SIGNATURE_INVALID: "PAYMENT_WEBHOOK_SIGNATURE_INVALID",
  PAYMENT_DUPLICATE_PURCHASE: "PAYMENT_DUPLICATE_PURCHASE",
  GIFT_NOT_ACTIVE: "GIFT_NOT_ACTIVE",
  GIFT_SELF_SEND_BLOCKED: "GIFT_SELF_SEND_BLOCKED",
  GIFT_COMBO_EXPIRED: "GIFT_COMBO_EXPIRED",
  CALL_MODEL_UNAVAILABLE: "CALL_MODEL_UNAVAILABLE",
  CALL_ALREADY_ACTIVE: "CALL_ALREADY_ACTIVE",
  CALL_BALANCE_TOO_LOW: "CALL_BALANCE_TOO_LOW",
  GAME_NOT_IN_CALL: "GAME_NOT_IN_CALL",
  GAME_INVALID_MOVE: "GAME_INVALID_MOVE",
  GAME_SESSION_ENDED: "GAME_SESSION_ENDED",
  MOD_USER_SUSPENDED: "MOD_USER_SUSPENDED",
  MOD_CONTENT_BLOCKED: "MOD_CONTENT_BLOCKED",
  MOD_STRIKE_LIMIT_REACHED: "MOD_STRIKE_LIMIT_REACHED",
  ADMIN_PERMISSION_DENIED: "ADMIN_PERMISSION_DENIED",
  ADMIN_DUAL_APPROVAL_REQUIRED: "ADMIN_DUAL_APPROVAL_REQUIRED",
  ADMIN_CONFIG_VALIDATION_FAILED: "ADMIN_CONFIG_VALIDATION_FAILED",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_FOUND: "NOT_FOUND",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ─── Pagination ───
export const paginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export interface PaginatedResult<T> {
  items: T[];
  nextCursor: string | null;
  totalCount?: number;
}

// ─── User Roles / Status ───
export type UserRole = "USER" | "HOST" | "MODEL" | "ADMIN";
export const PLATFORM_ROLES = ["USER", "MODEL_INDEPENDENT", "MODEL_AGENCY", "AGENCY", "ADMIN"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];
export const AUTH_PROVIDERS = ["EMAIL", "GOOGLE", "FACEBOOK", "PHONE_OTP", "WHATSAPP_OTP", "CUSTOM_OTP", "UNKNOWN"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];
export const ACCESS_RECORD_STATUSES = ["PENDING", "ACTIVE", "REJECTED", "SUSPENDED"] as const;
export type AccessRecordStatus = (typeof ACCESS_RECORD_STATUSES)[number];
export const MODEL_PROFILE_TYPES = ["INDEPENDENT", "AGENCY"] as const;
export type ModelProfileType = (typeof MODEL_PROFILE_TYPES)[number];
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BANNED" | "PENDING_VERIFICATION" | "DELETED";
export type PresenceState = "ONLINE" | "IDLE" | "BUSY" | "OFFLINE";

// ─── Call Types ───
export type CallType = "AUDIO" | "VIDEO";
export type CallSessionStatus = "REQUESTED" | "ACCEPTED" | "RINGING" | "ACTIVE" | "ENDED" | "CANCELLED" | "FAILED";
export type CallEndReason = "NORMAL" | "USER_HANGUP" | "MODEL_HANGUP" | "INSUFFICIENT_BALANCE" | "TIMEOUT" | "ERROR" | "ADMIN_FORCE_STOP";

// ─── Payment Types ───
export type PaymentProvider = "STRIPE" | "RAZORPAY" | "APPLE_IAP" | "GOOGLE_PLAY";
export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED" | "DISPUTED";
export type WithdrawalStatus = "PENDING" | "APPROVED" | "REJECTED" | "PROCESSING" | "COMPLETED" | "ON_HOLD";
export type PayoutMethod = "PAYPAL" | "BANK_TRANSFER" | "PAYONEER" | "CRYPTO";

// ─── Gift Types ───
export type GiftEffectTier = "MICRO" | "STANDARD" | "PREMIUM" | "LEGENDARY";
export type GiftContextType = "LIVE_STREAM" | "VIDEO_CALL" | "VOICE_CALL" | "CHAT_CONVERSATION" | "PK_BATTLE" | "GROUP_AUDIO" | "PARTY";
export type GiftDeliveryStatus = "QUEUED" | "PUBLISHED" | "ACK_PARTIAL" | "ACK_COMPLETE" | "EXPIRED" | "FAILED";

// ─── Live / Stream Types ───
export type LiveStreamStatus = "STARTING" | "LIVE" | "ENDED" | "FORCE_STOPPED";
export type LiveStreamType = "SOLO" | "MULTI_GUEST" | "PK_BATTLE";
export type LiveRoomType = "PUBLIC" | "PRIVATE" | "VIP_ONLY";
export type LiveRoomStatus = "IDLE" | "LIVE" | "SUSPENDED";
export type LiveStreamEndReason = "NORMAL" | "HOST_ENDED" | "ADMIN_FORCE_STOP" | "ERROR";

// ─── Model Types ───
export type ModelApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DemoVideoStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "ARCHIVED";
export type ModelLevelChangeReason = "AUTO_RECALC" | "EVENT_TRIGGERED" | "ADMIN_OVERRIDE" | "ADMIN_LEVEL_EDIT" | "LEVEL_DELETED";
export type PricingFormulaType = "FIXED" | "MULTIPLIER" | "LINEAR_INCREMENT";
export type AvailabilityDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

// ─── Chat / DM Types ───
export type DmMessageType = "TEXT" | "EMOJI" | "VOICE_NOTE" | "IMAGE" | "SYSTEM";
export type DmConversationStatus = "ACTIVE" | "BLOCKED" | "ARCHIVED";
export type ChatMessageType = "TEXT" | "EMOJI" | "SYSTEM" | "MODERATION";

// ─── PK Types ───
export type PkSessionStatus = "CREATED" | "MATCHING" | "ACTIVE" | "VOTING" | "ENDED" | "CANCELLED";
export type PkResultType = "WIN" | "DRAW" | "CANCELLED";

// ─── Notification Types ───
export type NotificationType =
  | "NEW_FOLLOWER" | "LIVE_STARTED" | "GIFT_RECEIVED" | "DIAMOND_EARNED"
  | "WITHDRAWAL_UPDATE" | "MODEL_APPLICATION_UPDATE" | "EVENT_REMINDER"
  | "SECURITY_ALERT" | "SYSTEM_ANNOUNCEMENT" | "STREAK_REMINDER"
  | "DM_RECEIVED" | "CALL_MISSED" | "LEVEL_UP" | "REWARD_GRANTED";
export type NotificationChannel = "IN_APP" | "PUSH" | "EMAIL" | "ALL";
export type NotificationDeliveryStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED";

// ─── Security Types ───
export type SecurityEventType =
  | "LOGIN_SUCCESS" | "LOGIN_FAILURE" | "MFA_CHALLENGE" | "MFA_FAILURE"
  | "SESSION_REVOKED" | "PASSWORD_CHANGED" | "EMAIL_CHANGED" | "SUSPICIOUS_LOGIN"
  | "RATE_LIMIT_HIT" | "BRUTE_FORCE_DETECTED" | "FRAUD_FLAG_CREATED" | "ADMIN_LOGIN"
  | "API_ABUSE_DETECTED" | "WEBHOOK_SIGNATURE_INVALID";
export type SecuritySeverity = "INFO" | "WARNING" | "HIGH" | "CRITICAL";

// ─── Admin Types ───
export type AdminActionType =
  | "USER_SUSPEND" | "USER_BAN" | "USER_RESTORE"
  | "MODEL_APPROVE" | "MODEL_REJECT"
  | "WITHDRAWAL_APPROVE" | "WITHDRAWAL_REJECT"
  | "GIFT_CREATE" | "GIFT_UPDATE"
  | "COIN_PACKAGE_CREATE" | "COIN_PACKAGE_UPDATE"
  | "LEVEL_CREATE" | "LEVEL_UPDATE"
  | "SETTING_UPDATE" | "THEME_ACTIVATE"
  | "BANNER_CREATE" | "PROMOTION_CREATE"
  | "STREAM_FORCE_STOP" | "PAYOUT_APPROVE"
  | "CONFIG_PUBLISH" | "CONFIG_ROLLBACK" | "MANUAL_ADJUSTMENT";
export type AdminTargetType =
  | "USER" | "MODEL" | "WITHDRAWAL" | "GIFT" | "COIN_PACKAGE"
  | "LEVEL" | "SETTING" | "THEME" | "BANNER" | "PROMOTION"
  | "LIVE_STREAM" | "PAYOUT" | "CONFIG";

// ─── Wallet / Transaction Types ───
export type CoinTransactionType =
  | "PURCHASE" | "GIFT_SENT" | "DAILY_REWARD" | "STREAK_REWARD"
  | "CALL_BILLING" | "ADMIN_ADJUSTMENT" | "REFUND" | "PROMO_BONUS"
  | "LEVEL_REWARD" | "REFERRAL_REWARD";
export type DiamondTransactionType = "GIFT_CREDIT" | "WITHDRAWAL_DEBIT" | "ADMIN_ADJUSTMENT" | "EVENT_REWARD";

// ─── Leaderboard Types ───
export type LeaderboardType = "DAILY_GIFTER" | "WEEKLY_GIFTER" | "DAILY_HOST_EARNINGS" | "WEEKLY_HOST_EARNINGS" | "EVENT_GIFTER" | "EVENT_HOST";
export type LeaderboardWindow = "DAILY" | "WEEKLY" | "MONTHLY" | "EVENT" | "ALL_TIME";
export type LeaderboardMetric = "GIFT_COIN_VALUE" | "DIAMOND_EARNINGS" | "VIEWER_COUNT" | "CALL_MINUTES";

// ─── CMS Types ───
export type BannerLinkType = "DEEP_LINK" | "EXTERNAL_URL" | "PROMOTION" | "MODEL_PROFILE";
export type BannerStatus = "ACTIVE" | "INACTIVE" | "SCHEDULED";
export type PromotionType = "COIN_BONUS" | "EVENT_CAMPAIGN" | "SEASONAL" | "REFERRAL_BOOST";
export type PromotionStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED";
export type PromotionTargetAudience = "ALL" | "NEW_USERS" | "RETURNING" | "SPECIFIC_REGION";
export type HomepageSectionType = "LIVE_CAROUSEL" | "FEATURED_MODELS" | "TRENDING_CREATORS" | "PROMO_SLIDER" | "CATEGORY_CHIPS" | "RECOMMENDED_STREAMS";
export type ThemeIconStyle = "DEFAULT" | "FESTIVAL" | "SEASONAL";
export type ThemeAssetType = "BACKGROUND" | "ICON" | "LOGO" | "SPLASH";

// ─── Feature Flags ───
export type FeatureFlagType = "BOOLEAN" | "PERCENTAGE" | "USER_LIST" | "REGION";

// ─── Campaign / Reward Types ───
export type CampaignRewardType = "COINS" | "DIAMONDS" | "BADGE" | "VIP_DAYS" | "GIFT_MULTIPLIER";
export type LevelRewardType = "BONUS_COINS" | "BADGE" | "SPECIAL_GIFT" | "VIP_TRIAL" | "PROFILE_FRAME";
export type CampaignType = "INACTIVITY_NUDGE" | "EVENT_ANNOUNCEMENT" | "PROMO_BLAST" | "FEATURE_LAUNCH" | "RE_ENGAGEMENT";

// ─── Fraud Types ───
export type FraudSignalType =
  | "DEVICE_FINGERPRINT_MATCH" | "IP_CLUSTER" | "VELOCITY_SPIKE"
  | "CIRCULAR_GIFTING" | "SELF_REFERRAL" | "PAYMENT_INSTRUMENT_OVERLAP"
  | "BEHAVIOR_ANOMALY" | "REPEATED_SHORT_CALLS" | "SCRIPTED_PATTERN";

// ─── Discovery Types ───
export type RecommendationSource = "FOLLOW_GRAPH" | "WATCH_HISTORY" | "TRENDING" | "REGION" | "COLD_START";
export type ImpressionSource = "HOME_FEED" | "EXPLORE" | "SEARCH" | "NOTIFICATION";

// ─── Group Audio Types ───
export type GroupAudioRoomStatus = "SCHEDULED" | "CREATED" | "LIVE" | "ENDING" | "ENDED" | "ARCHIVED";
export type GroupAudioRoomType = "FREE" | "PAID" | "VIP_ONLY" | "INVITE_ONLY";
export type GroupAudioRole = "HOST" | "CO_HOST" | "SPEAKER" | "LISTENER";
export type GroupAudioParticipantStatus = "ACTIVE" | "LEFT" | "REMOVED" | "DISCONNECTED";
export type HandRaiseStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";

// ─── Party Types ───
export type PartyRoomType = "PUBLIC" | "PRIVATE" | "VIP" | "MODEL_HOSTED" | "EVENT";
export type PartyRoomStatus = "CREATED" | "OPEN" | "ACTIVE" | "PAUSED" | "CLOSED" | "ARCHIVED";
export type SeatStatus = "EMPTY" | "OCCUPIED" | "LOCKED" | "RESERVED" | "BLOCKED";
export type SeatLayoutType = "CIRCLE" | "GRID" | "STAGE";
export type PartyMemberRole = "HOST" | "CO_HOST" | "SEATED" | "AUDIENCE";
export type PartyMemberStatus = "ACTIVE" | "LEFT" | "REMOVED" | "BANNED";
export type PartyActivityType = "DICE_GAME" | "LUCKY_DRAW" | "GIFTING_WAR" | "TRUTH_OR_DARE";
export type PartyActivityStatus = "CREATED" | "ACTIVE" | "ENDED" | "CANCELLED";
export type PartyActivityResult = "WON" | "LOST" | "PARTICIPATING";

// ─── System ───
export type SystemSettingsStatus = "DRAFT" | "PUBLISHED" | "ROLLED_BACK";
export type SystemSettingsNamespace =
  | "economy" | "rewards" | "levels" | "calls" | "chat"
  | "moderation" | "fraud" | "payments" | "app_ui" | "notifications"
  | "discovery" | "referral" | "games" | "auth" | "admin"
  | "reliability" | "cache" | "realtime" | "media" | "data"
  | "observability" | "dr" | "config";

// ─── Verification ───
export type VerificationType = "SIGNUP" | "EMAIL_CHANGE" | "PASSWORD_RESET";
export type VerificationStatus = "PENDING" | "VERIFIED" | "EXPIRED" | "USED";

// ─── Push Token ───
export type PushTokenPlatform = "IOS" | "ANDROID" | "WEB";
export type PushTokenStatus = "ACTIVE" | "EXPIRED" | "INVALID";

// ─── Service Identity ───
export type ServiceIdentityName =
  | "AUTH" | "WALLET" | "PAYMENT" | "GIFT" | "LIVE" | "CALL"
  | "GAME" | "CHAT" | "DISCOVERY" | "NOTIFICATION" | "MODERATION"
  | "FRAUD" | "CONFIG" | "MEDIA";
