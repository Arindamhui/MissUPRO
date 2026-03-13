// ─── Economy Defaults ───
export const ECONOMY = {
  USD_TO_COINS: 100,
  COINS_TO_DIAMONDS_RATIO: 1,
  DIAMOND_VALUE_USD_PER_100: 0.25,
  PLATFORM_COMMISSION_BPS: 7500,
  PAYMENT_FEE_RATE: 0.05,
  MODEL_PAYOUT_PERCENT: 25,
} as const;

// ─── Call Pricing Defaults ───
export const CALL_PRICING = {
  AUDIO_COINS_PER_MINUTE: 30,
  VIDEO_COINS_PER_MINUTE: 50,
  TICK_INTERVAL_SECONDS: 60,
  LOW_BALANCE_WARNING_MULTIPLIER: 2,
  MAX_SESSION_MINUTES: 180,
  ROUNDING_POLICY: "CEIL" as const,
  IDLE_DETECTION_SECONDS: 300,
  MIN_BILLABLE_SECONDS: 15,
  MAX_DAILY_MODEL_MINUTES: 480,
  REPEATED_SHORT_CALL_THRESHOLD: 10,
  SAME_PAIR_DAILY_LIMIT: 120,
} as const;

// ─── Call Payout Defaults ───
export const CALL_PAYOUT = {
  AUDIO_RATE_PER_MINUTE: 0.10,
  VIDEO_RATE_PER_MINUTE: 0.20,
  MINIMUM_WITHDRAWAL_USD: 10.00,
  WEEKLY_CYCLE_ENABLED: true,
  WEEKLY_CYCLE_DAY: "MONDAY" as const,
  MANUAL_APPROVAL_REQUIRED: true,
} as const;

// ─── Level-Based Call Pricing ───
export const LEVEL_PRICING = {
  LEVEL_BASED_ENABLED: true,
  FORMULA_TYPE: "FIXED" as const,
  BASE_VIDEO_PRICE: 40,
  BASE_AUDIO_PRICE: 20,
  LEVEL_MULTIPLIER: 1.5,
  LEVEL_INCREMENT_VIDEO: 20,
  LEVEL_INCREMENT_AUDIO: 10,
  PRICE_CAP_VIDEO: 500,
  PRICE_CAP_AUDIO: 250,
  NO_LEVEL_FALLBACK_VIDEO: 40,
  NO_LEVEL_FALLBACK_AUDIO: 20,
  SHOW_RATE_BEFORE_CALL: true,
  SHOW_LEVEL_BADGE_ON_RATE: true,
} as const;

// ─── Chat Pricing ───
export const CHAT_PRICING = {
  FREE_ENABLED: true,
  FREE_MINUTES_PER_DAY: 5,
  PAID_COINS_PER_MINUTE: 10,
} as const;

// ─── User Level Thresholds ───
export const USER_LEVEL_THRESHOLDS = [
  { level: 1, name: "Bronze", coinsSpent: 100 },
  { level: 2, name: "Silver", coinsSpent: 500 },
  { level: 3, name: "Gold", coinsSpent: 2000 },
  { level: 4, name: "Platinum", coinsSpent: 5000 },
  { level: 5, name: "Diamond", coinsSpent: 15000 },
  { level: 6, name: "Crown", coinsSpent: 50000 },
] as const;

// ─── VIP Tiers ───
export const VIP_TIERS = [
  { name: "Bronze", pricePerMonth: 4.99, coinBonusPercent: 5 },
  { name: "Silver", pricePerMonth: 9.99, coinBonusPercent: 10 },
  { name: "Gold", pricePerMonth: 19.99, coinBonusPercent: 15 },
  { name: "Diamond", pricePerMonth: 49.99, coinBonusPercent: 20 },
] as const;

// ─── Agency Commission Tiers ───
export const AGENCY_COMMISSION_TIERS = [
  { name: "Standard", platformPercent: 35, agencyPercent: 5 },
  { name: "Level1", platformPercent: 33, agencyPercent: 7 },
  { name: "Level2", platformPercent: 31, agencyPercent: 9 },
  { name: "Top", platformPercent: 30, agencyPercent: 10 },
] as const;

// ─── Engagement / Rewards ───
export const REWARDS = {
  DAILY_LOGIN_COINS: 10,
  DAILY_LOGIN_XP: 10,
  SEVEN_DAY_STREAK_COINS: 50,
  STREAK_BONUS_XP: 50,
  MAX_BONUS_COINS_PER_LEVEL: 1000,
} as const;

// ─── Referral Tiers ───
export const REFERRAL_TIERS = [
  { usersReferred: 1, rewardCoins: 20, referrerReward: 100, referredReward: 50 },
  { usersReferred: 10, rewardCoins: 100, referrerReward: 200, referredReward: 100 },
  { usersReferred: 50, rewardType: "VIP_BADGE" as const, referrerReward: 500, referredReward: 200 },
] as const;

// ─── Moderation ───
export const MODERATION = {
  STRIKES: [
    { strike: 1, action: "WARNING" },
    { strike: 2, action: "24H_MUTE" },
    { strike: 3, action: "7D_BAN" },
    { strike: 4, action: "PERMANENT_BAN" },
  ],
  MAX_MESSAGE_LENGTH: 2000,
} as const;

// ─── Discovery ───
export const RECOMMENDATION_WEIGHTS = {
  VIEWER_COUNT: 0.30,
  GIFT_VOLUME: 0.25,
  WATCH_TIME: 0.15,
  FOLLOW: 0.10,
  HISTORY: 0.10,
  LOCATION: 0.10,
} as const;

// ─── Rate Limits ───
export const RATE_LIMITS = {
  AUTH: { requests: 10, windowSeconds: 60 },
  PROFILE_READS: { requests: 120, windowSeconds: 60 },
  CHAT_SEND: { requests: 30, windowSeconds: 60 },
  GIFT_SEND: { requests: 60, windowSeconds: 60 },
  COIN_PURCHASE: { requests: 5, windowSeconds: 60 },
  WITHDRAWAL: { requests: 3, windowSeconds: 3600 },
  ADMIN_API: { requests: 300, windowSeconds: 60 },
  WEBHOOK: { requests: 500, windowSeconds: 60 },
  ADMIN_LOGIN: { maxAttempts: 5, lockoutSeconds: 900 },
  VERIFICATION_EMAILS: { requests: 5, windowSeconds: 3600 },
  VERIFICATION_ATTEMPTS: { maxPerToken: 10 },
} as const;

// ─── Group Audio ───
export const GROUP_AUDIO = {
  MAX_SPEAKERS_PER_ROOM: 8,
  MAX_LISTENERS_PER_ROOM: 200,
  MAX_CO_HOSTS_PER_ROOM: 2,
  DEFAULT_COINS_PER_MINUTE: 15,
  MIN_COINS_PER_MINUTE: 5,
  MAX_COINS_PER_MINUTE: 100,
  COST_PER_MINUTE_PER_SPEAKER: 15,
  LOW_BALANCE_WARNING_THRESHOLD_MINUTES: 2,
  ZERO_BALANCE_BEHAVIOR: "DISCONNECT" as const,
  MAX_ROOMS_PER_USER: 1,
  MAX_DURATION_MINUTES: 240,
  HAND_RAISE_AUTO_EXPIRE_SECONDS: 120,
  SCHEDULED_MAX_ADVANCE_DAYS: 7,
  MAX_INVITES: 50,
} as const;

// ─── Party ───
export const PARTY = {
  DEFAULT_SEATS: 8,
  MAX_MEMBERS: 20,
  MAX_SEATS_PER_ROOM: 8,
  MAX_AUDIENCE_PER_ROOM: 500,
  MAX_ROOMS_PER_USER: 1,
  ENTRY_FEE_MIN_COINS: 10,
  ENTRY_FEE_MAX_COINS: 1000,
  DISCONNECT_GRACE_MINUTES: 5,
  VIP_SEAT_PRIORITY_ENABLED: true,
  DICE_GAME_MIN_ENTRY_COINS: 10,
  DICE_GAME_MAX_ENTRY_COINS: 500,
  DICE_GAME_PLATFORM_FEE_PERCENT: 10,
  LUCKY_DRAW_TICKET_PRICE_COINS: 5,
  LUCKY_DRAW_PLATFORM_FEE_PERCENT: 10,
  GIFTING_WAR_DURATION_SECONDS: 180,
  MAX_DURATION_MINUTES: 480,
  CHAT_SLOW_MODE_SECONDS: 0,
  REPORT_THRESHOLD_FOR_REVIEW: 3,
} as const;

// ─── PK Battles ───
export const PK = {
  BATTLE_DURATION_SECONDS: 300,
  VOTING_DURATION_SECONDS: 30,
  MAX_CONCURRENT_PER_HOST: 1,
  SELF_GIFT_BLOCKED: true,
} as const;

// ─── Review System ───
export const REVIEWS = {
  MIN_CALL_DURATION_SECONDS: 60,
  PROMPT_DELAY_SECONDS: 5,
  MAX_TEXT_LENGTH: 300,
  AFFECTS_DISCOVERY_RANKING: true,
} as const;

// ─── Presence ───
export const PRESENCE = {
  TTL_SECONDS: 120,
  IDLE_TIMEOUT_SECONDS: 300,
  DISCONNECT_GRACE_SECONDS: 15,
  BROADCAST_TO_FOLLOWERS: true,
} as const;

// ─── Health Check ───
export const HEALTH = {
  DB_TIMEOUT_MS: 3000,
  REDIS_TIMEOUT_MS: 2000,
  R2_TIMEOUT_MS: 5000,
} as const;

// ─── Auth ───
export const AUTH = {
  ACCESS_TTL_SECONDS: 900,
  REFRESH_TTL_SECONDS: 604800,
  MAX_CONCURRENT_SESSIONS: 5,
  EMAIL_VERIFICATION_EXPIRY_HOURS: 24,
  RESEND_COOLDOWN_SECONDS: 60,
} as const;

// ─── Cache ───
export const CACHE = {
  L1_MAX_ITEMS: 1000,
  L2_DEFAULT_TTL_SECONDS: 300,
  INVALIDATION_BROADCAST_ENABLED: true,
} as const;

// ─── Config Polling ───
export const CONFIG = {
  POLL_INTERVAL_SECONDS: 300,
  FEATURE_FLAGS_REFRESH_INTERVAL_SECONDS: 300,
  FEATURE_FLAGS_CACHE_TTL_SECONDS: 60,
} as const;

// ─── Analytics ───
export const ANALYTICS = {
  ENGAGEMENT_REFRESH_INTERVAL_SECONDS: 300,
  REVENUE_REFRESH_INTERVAL_SECONDS: 300,
  RETENTION_COHORT_WINDOW_DAYS: 30,
} as const;

// ─── DM ───
export const DM = {
  VOICE_NOTE_MAX_DURATION_SECONDS: 120,
  IMAGE_MAX_SIZE_MB: 5,
  RETENTION_DAYS: 365,
  MAX_MESSAGES_PER_MINUTE: 30,
} as const;

// ─── Promotions ───
export const PROMOTIONS = {
  MAX_ACTIVE_CAMPAIGNS: 10,
  DEFAULT_BUDGET_CAP: 50000,
} as const;

// ─── Levels ───
export const LEVELS = {
  USER_RECALCULATION_INTERVAL_HOURS: 24,
  MODEL_RECALCULATION_INTERVAL_HOURS: 6,
  MODEL_QUALIFICATION_MODE: "ALL" as const,
  MAX_LEVEL: 100,
  ALLOW_DOWNGRADE: false,
  NOTIFY_ON_UPGRADE: true,
  NOTIFY_ON_DOWNGRADE: false,
} as const;

// ─── Blocking ───
export const BLOCKING = {
  MAX_BLOCKS_PER_USER: 500,
  COOLDOWN_SECONDS: 3600,
} as const;

// ─── Account Deletion ───
export const ACCOUNT_DELETION = {
  COOLING_OFF_DAYS: 30,
} as const;
