import { z } from "zod";

// ─── Auth ───
export const sendVerificationEmailSchema = z.object({
  email: z.string().email(),
  type: z.enum(["SIGNUP", "EMAIL_CHANGE", "PASSWORD_RESET"]),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
  code: z.string().min(4).max(8),
});

export const revokeSessionSchema = z.object({
  sessionId: z.string().uuid(),
});

// ─── User ───
export const blockUserSchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const unblockUserSchema = z.object({
  targetUserId: z.string().uuid(),
});

export const requestAccountDeletionSchema = z.object({
  reason: z.string().max(1000).optional(),
});

export const requestEmailChangeSchema = z.object({
  newEmail: z.string().email(),
});

export const submitModelReviewSchema = z.object({
  modelUserId: z.string().uuid(),
  callSessionId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(300).optional(),
});

export const getModelReviewsSchema = z.object({
  modelUserId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const getPresenceSchema = z.object({
  userId: z.string().uuid(),
});

export const getPresenceBulkSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(100),
});

// ─── Model ───
export const submitModelApplicationSchema = z.object({
  legalName: z.string().min(1).max(200),
  displayName: z.string().min(1).max(100),
  talentDescription: z.string().min(10).max(2000),
  talentCategories: z.array(z.string()).min(1),
  languages: z.array(z.string()).min(1),
  country: z.string(),
  city: z.string(),
  dob: z.coerce.date(),
  introVideoUrl: z.string().url(),
  scheduleJson: z.any().optional(),
  idDocFrontUrl: z.string().url(),
  idDocBackUrl: z.string().url(),
});

export const updateAvailabilitySchema = z.object({
  schedule: z.array(z.object({
    day: z.enum(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
    timezone: z.string(),
  })),
});

export const setOnlineOverrideSchema = z.object({
  isOnline: z.boolean(),
});

// ─── Call ───
export const requestModelCallSchema = z.object({
  modelUserId: z.string().uuid(),
  callType: z.enum(["AUDIO", "VIDEO"]),
});

export const acceptModelCallSchema = z.object({
  callSessionId: z.string().uuid(),
});

export const endModelCallSchema = z.object({
  callSessionId: z.string().uuid(),
  reason: z.enum(["NORMAL", "USER_HANGUP", "MODEL_HANGUP"]).optional(),
});

// ─── Chat ───
export const startChatSessionSchema = z.object({
  modelUserId: z.string().uuid(),
});

export const sendChatMessageSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  type: z.enum(["TEXT", "EMOJI"]).default("TEXT"),
});

export const sendVoiceNoteSchema = z.object({
  sessionId: z.string().uuid(),
  voiceUrl: z.string().url(),
  durationSeconds: z.number().int().min(1).max(300),
});

// ─── DM ───
export const sendDirectMessageSchema = z.object({
  recipientUserId: z.string().uuid(),
  content: z.string().min(1).max(2000),
  type: z.enum(["TEXT", "EMOJI", "VOICE_NOTE", "IMAGE"]).default("TEXT"),
  mediaUrl: z.string().url().optional(),
});

export const listConversationsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const getConversationMessagesSchema = z.object({
  conversationId: z.string().uuid(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});

export const archiveConversationSchema = z.object({
  conversationId: z.string().uuid(),
});

// ─── Gift ───
export const sendGiftSchema = z.object({
  giftId: z.string().uuid(),
  receiverUserId: z.string().uuid(),
  contextType: z.enum(["LIVE_STREAM", "VIDEO_CALL", "VOICE_CALL", "CHAT_CONVERSATION", "PK_BATTLE", "GROUP_AUDIO", "PARTY"]),
  contextId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
  comboGroupId: z.string().uuid().optional(),
});

export const previewSendGiftSchema = z.object({
  giftId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const getGiftLeaderboardSchema = z.object({
  contextType: z.enum(["LIVE_STREAM", "VIDEO_CALL", "VOICE_CALL", "CHAT_CONVERSATION", "PK_BATTLE", "GROUP_AUDIO", "PARTY"]),
  contextId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(10),
});

// ─── Wallet ───
export const getCoinPackagesSchema = z.object({
  platform: z.enum(["IOS", "ANDROID", "WEB"]).optional(),
});

export const requestWithdrawalSchema = z.object({
  amountDiamonds: z.number().int().min(1),
  payoutMethod: z.enum(["PAYPAL", "BANK_TRANSFER", "PAYONEER", "CRYPTO"]),
  payoutDetails: z.record(z.string(), z.string()),
});

// ─── Payment ───
export const verifyWebhookEventSchema = z.object({
  provider: z.enum(["STRIPE", "RAZORPAY", "APPLE_IAP", "GOOGLE_PLAY"]),
  payload: z.string(),
  signature: z.string(),
});

// ─── Discovery ───
export const searchModelsSchema = z.object({
  query: z.string().optional(),
  categories: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
  availability: z.enum(["ONLINE", "AVAILABLE_TODAY", "ALL"]).optional(),
  priceRange: z.object({ min: z.number(), max: z.number() }).optional(),
  minLevel: z.number().int().optional(),
  country: z.string().optional(),
  verifiedOnly: z.boolean().optional(),
  gender: z.array(z.string()).optional(),
  sortBy: z.enum(["POPULAR", "NEWEST", "TOP_RATED", "AVAILABLE"]).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const getModelCardSchema = z.object({
  modelUserId: z.string().uuid(),
});

// ─── Referral ───
export const generateInviteCodeSchema = z.object({
  channel: z.string().optional(),
});

// ─── VIP ───
export const subscribeVipSchema = z.object({
  tierId: z.string().uuid(),
  paymentMethod: z.enum(["STRIPE", "RAZORPAY", "APPLE_IAP", "GOOGLE_PLAY"]),
});

export const cancelVipSubscriptionSchema = z.object({
  subscriptionId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

// ─── Agency ───
export const applyAsAgencySchema = z.object({
  agencyName: z.string().min(2).max(100),
  contactEmail: z.string().email(),
  description: z.string().max(1000).optional(),
});

export const inviteHostSchema = z.object({
  hostUserId: z.string().uuid(),
});

// ─── Media ───
export const uploadWithScanSchema = z.object({
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().positive(),
});

export const getSignedUrlSchema = z.object({
  assetId: z.string().uuid(),
});

export const quarantineAssetSchema = z.object({
  assetId: z.string().uuid(),
  reason: z.string().max(500),
});

// ─── Notification ───
export const getNotificationCenterSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
  type: z.enum([
    "NEW_FOLLOWER", "LIVE_STARTED", "GIFT_RECEIVED", "DIAMOND_EARNED",
    "WITHDRAWAL_UPDATE", "MODEL_APPLICATION_UPDATE", "EVENT_REMINDER",
    "SECURITY_ALERT", "SYSTEM_ANNOUNCEMENT", "STREAK_REMINDER",
    "DM_RECEIVED", "CALL_MISSED", "LEVEL_UP", "REWARD_GRANTED",
  ]).optional(),
});

// ─── Game ───
export const startInCallGameSchema = z.object({
  callSessionId: z.string().uuid(),
  gameType: z.string(),
});

export const submitMoveSchema = z.object({
  sessionId: z.string().uuid(),
  move: z.object({
    type: z.string(),
    data: z.unknown(),
  }),
});

// ─── PK ───
export const requestPKBattleSchema = z.object({
  opponentHostId: z.string().uuid(),
});

export const acceptPKBattleSchema = z.object({
  pkSessionId: z.string().uuid(),
});

// ─── Group Audio ───
export const createGroupAudioRoomSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  roomType: z.enum(["FREE", "PAID", "VIP_ONLY", "INVITE_ONLY"]),
  coinsPerMinute: z.number().int().min(0).optional(),
  maxSpeakers: z.number().int().min(2).max(8).optional(),
  maxListeners: z.number().int().min(10).max(200).optional(),
  tags: z.array(z.string()).max(5).optional(),
  scheduledStartAt: z.string().datetime().optional(),
});

export const resolveHandRaiseSchema = z.object({
  handRaiseId: z.string().uuid(),
  action: z.enum(["ACCEPTED", "REJECTED"]),
});

export const promoteToSpeakerSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const demoteToListenerSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const muteParticipantSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const removeParticipantSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
});

export const updateTopicSchema = z.object({
  roomId: z.string().uuid(),
  topic: z.string().min(1).max(200),
});

export const inviteToRoomSchema = z.object({
  roomId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1).max(50),
});

export const sendReactionSchema = z.object({
  roomId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
});

// ─── Party ───
export const createPartyRoomSchema = z.object({
  roomName: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  roomType: z.enum(["PUBLIC", "PRIVATE", "VIP", "MODEL_HOSTED", "EVENT"]),
  password: z.string().min(4).max(20).optional(),
  maxSeats: z.number().int().min(4).max(12).optional(),
  maxAudience: z.number().int().min(10).max(500).optional(),
  seatLayoutType: z.enum(["CIRCLE", "GRID", "STAGE"]).optional(),
  entryFeeCoins: z.number().int().min(0).optional(),
  themeId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
  isPersistent: z.boolean().optional(),
});

export const joinRoomWithPasswordSchema = z.object({
  roomId: z.string().uuid(),
  password: z.string(),
});

export const claimSeatSchema = z.object({
  roomId: z.string().uuid(),
  seatNumber: z.number().int().min(1),
});

export const reserveSeatSchema = z.object({
  roomId: z.string().uuid(),
  seatNumber: z.number().int().min(1),
  forUserId: z.string().uuid(),
});

export const lockSeatSchema = z.object({
  roomId: z.string().uuid(),
  seatNumber: z.number().int().min(1),
  locked: z.boolean(),
});

export const startActivitySchema = z.object({
  roomId: z.string().uuid(),
  activityType: z.enum(["DICE_GAME", "LUCKY_DRAW", "GIFTING_WAR", "TRUTH_OR_DARE"]),
  config: z.record(z.string(), z.unknown()),
});

export const joinActivitySchema = z.object({
  activityId: z.string().uuid(),
  coinsContributed: z.number().int().min(0).optional(),
});

export const purchaseThemeSchema = z.object({
  themeId: z.string().uuid(),
});

export const sendPartyChatSchema = z.object({
  roomId: z.string().uuid(),
  message: z.string().min(1).max(500),
});

export const sendPartyReactionSchema = z.object({
  roomId: z.string().uuid(),
  emoji: z.string().min(1).max(10),
});

// ─── Security ───
export const createIncidentSchema = z.object({
  type: z.string(),
  severity: z.enum(["INFO", "WARNING", "HIGH", "CRITICAL"]),
  description: z.string().max(2000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ─── Config ───
export const upsertSystemSettingSchema = z.object({
  namespace: z.string(),
  key: z.string(),
  value: z.unknown(),
  environment: z.enum(["production", "staging", "development"]).optional(),
  region: z.string().optional(),
});

// ─── Feature Flag ───
export const createFeatureFlagSchema = z.object({
  key: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  type: z.enum(["BOOLEAN", "PERCENTAGE", "USER_LIST", "REGION"]),
  value: z.unknown(),
  isEnabled: z.boolean().default(false),
});

export const updateFeatureFlagSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["BOOLEAN", "PERCENTAGE", "USER_LIST", "REGION"]).optional(),
  value: z.unknown().optional(),
  isEnabled: z.boolean().optional(),
});
