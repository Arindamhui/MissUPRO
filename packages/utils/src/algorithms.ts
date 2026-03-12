import { createHash } from "node:crypto";

/**
 * Trending score formula:
 * score = (gift_volume_1h × 2) + viewer_joins_1h + active_viewer_count
 */
export function calculateTrendingScore(
  giftVolume1h: number,
  viewerJoins1h: number,
  activeViewerCount: number,
): number {
  return giftVolume1h * 2 + viewerJoins1h + activeViewerCount;
}

/**
 * Recommendation score: weighted sum with configurable weights
 */
export function calculateRecommendationScore(
  factors: {
    viewerCount: number;
    giftVolume: number;
    watchTime: number;
    follow: number;
    history: number;
    location: number;
  },
  weights: {
    viewerCount: number;
    giftVolume: number;
    watchTime: number;
    follow: number;
    history: number;
    location: number;
  },
): number {
  return (
    factors.viewerCount * weights.viewerCount +
    factors.giftVolume * weights.giftVolume +
    factors.watchTime * weights.watchTime +
    factors.follow * weights.follow +
    factors.history * weights.history +
    factors.location * weights.location
  );
}

/**
 * Deterministic hash for percentage-based feature flag rollout.
 */
export function hashUserId(userId: string, flagKey: string): number {
  const hash = createHash("sha256")
    .update(`${userId}:${flagKey}`)
    .digest("hex");
  const numericValue = parseInt(hash.substring(0, 8), 16);
  return numericValue % 100;
}

/**
 * Calculate call price based on model level with formula support.
 */
export function calculateCallPrice(
  callType: "AUDIO" | "VIDEO",
  modelLevel: number | null,
  config: {
    levelBasedEnabled: boolean;
    formulaType: "FIXED" | "MULTIPLIER" | "LINEAR_INCREMENT";
    baseVideoPrice: number;
    baseAudioPrice: number;
    levelMultiplier: number;
    levelIncrementVideo: number;
    levelIncrementAudio: number;
    priceCapVideo: number;
    priceCapAudio: number;
    noLevelFallbackVideo: number;
    noLevelFallbackAudio: number;
    globalAudioRate: number;
    globalVideoRate: number;
    levelPrices?: Record<number, { audio: number; video: number }>;
  },
  modelPriceOverride?: number | null,
): number {
  // Priority 1: model-specific price override
  if (modelPriceOverride != null) {
    return modelPriceOverride;
  }

  // Priority 2: level-based pricing
  if (config.levelBasedEnabled && modelLevel != null) {
    const priceCap = callType === "VIDEO" ? config.priceCapVideo : config.priceCapAudio;

    if (config.formulaType === "FIXED" && config.levelPrices) {
      const levelPrice = config.levelPrices[modelLevel];
      if (levelPrice) {
        return Math.min(callType === "VIDEO" ? levelPrice.video : levelPrice.audio, priceCap);
      }
    }

    if (config.formulaType === "MULTIPLIER") {
      const basePrice = callType === "VIDEO" ? config.baseVideoPrice : config.baseAudioPrice;
      const price = Math.round(basePrice * Math.pow(config.levelMultiplier, modelLevel - 1));
      return Math.min(price, priceCap);
    }

    if (config.formulaType === "LINEAR_INCREMENT") {
      const basePrice = callType === "VIDEO" ? config.baseVideoPrice : config.baseAudioPrice;
      const increment = callType === "VIDEO" ? config.levelIncrementVideo : config.levelIncrementAudio;
      const price = basePrice + increment * (modelLevel - 1);
      return Math.min(price, priceCap);
    }

    // Fallback for unknown formula
    return callType === "VIDEO" ? config.noLevelFallbackVideo : config.noLevelFallbackAudio;
  }

  // Priority 3: global flat rate
  return callType === "VIDEO" ? config.globalVideoRate : config.globalAudioRate;
}

/**
 * Validate that level thresholds are strictly increasing.
 */
export function validateLevelRequirements(
  levels: Array<{ level: number; threshold: number }>,
): boolean {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.threshold <= sorted[i - 1]!.threshold) {
      return false;
    }
  }
  return true;
}

/**
 * Resolve system config value with 3-tier fallback:
 * exact match → region fallback → global default
 */
export function resolveConfigValue<T>(
  configs: Array<{
    key: string;
    environment: string | null;
    region: string | null;
    value: T;
  }>,
  key: string,
  environment: string,
  region?: string,
): T | undefined {
  // Exact match: key + env + region
  if (region) {
    const exact = configs.find(
      (c) => c.key === key && c.environment === environment && c.region === region,
    );
    if (exact) return exact.value;
  }

  // Region fallback: key + env, no region
  const envMatch = configs.find(
    (c) => c.key === key && c.environment === environment && c.region == null,
  );
  if (envMatch) return envMatch.value;

  // Global fallback: key only, no env/region
  const global = configs.find(
    (c) => c.key === key && c.environment == null && c.region == null,
  );
  return global?.value;
}

/**
 * Generate a cursor for offset-based pagination.
 */
export function encodeCursor(offset: number): string {
  return Buffer.from(String(offset)).toString("base64url");
}

export function decodeCursor(cursor: string): number {
  const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
  return parseInt(decoded, 10) || 0;
}

/**
 * Generate a deterministic idempotency key.
 */
export function generateIdempotencyKey(...parts: string[]): string {
  return createHash("sha256")
    .update(parts.join(":"))
    .digest("hex");
}

/**
 * Generate idempotency key for financial operations.
 */
export function generateIdempotencyKey(
  userId: string,
  operation: string,
  ...params: string[]
): string {
  return createHash("sha256")
    .update([userId, operation, ...params].join(":"))
    .digest("hex");
}

/**
 * Calculate model level from their stats vs level rules.
 */
export function calculateModelLevel(
  stats: { totalDiamonds: number; totalVideoMinutes: number; totalAudioMinutes: number },
  levelRules: Array<{
    level: number;
    minDiamonds: number;
    minVideoMinutes: number;
    minAudioMinutes: number;
  }>,
  qualificationMode: "ALL" | "ANY",
): number {
  const sorted = [...levelRules].sort((a, b) => b.level - a.level);

  for (const rule of sorted) {
    if (qualificationMode === "ALL") {
      if (
        stats.totalDiamonds >= rule.minDiamonds &&
        stats.totalVideoMinutes >= rule.minVideoMinutes &&
        stats.totalAudioMinutes >= rule.minAudioMinutes
      ) {
        return rule.level;
      }
    } else {
      if (
        stats.totalDiamonds >= rule.minDiamonds ||
        stats.totalVideoMinutes >= rule.minVideoMinutes ||
        stats.totalAudioMinutes >= rule.minAudioMinutes
      ) {
        return rule.level;
      }
    }
  }

  return 0;
}
