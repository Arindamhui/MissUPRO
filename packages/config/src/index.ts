export { getEnv, envSchema, type Env } from "./env";
export * from "./defaults";

import { getEnv } from "./env";
import {
  ECONOMY, CALL_PRICING, CALL_PAYOUT, LEVEL_PRICING, CHAT_PRICING,
  USER_LEVEL_THRESHOLDS, VIP_TIERS, AGENCY_COMMISSION_TIERS,
  REWARDS, REFERRAL_TIERS, MODERATION, RECOMMENDATION_WEIGHTS,
  RATE_LIMITS, GROUP_AUDIO, PARTY,
} from "./defaults";

/** Convenience: lazy env singleton */
export const env = new Proxy({} as ReturnType<typeof getEnv>, {
  get(_target, prop, receiver) {
    return Reflect.get(getEnv(), prop, receiver);
  },
});

/** Aggregated defaults namespace used by services */
export const DEFAULTS = {
  ECONOMY,
  CALL_PRICING,
  CALL_PAYOUT,
  LEVEL_PRICING,
  CHAT_PRICING,
  USER_LEVEL_THRESHOLDS,
  VIP_TIERS,
  AGENCY_COMMISSION_TIERS,
  REWARDS,
  REFERRAL_TIERS,
  MODERATION,
  RECOMMENDATION_WEIGHTS,
  RATE_LIMITS,
  GROUP_AUDIO,
  PARTY,
} as const;
