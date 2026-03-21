import { Injectable, Logger } from "@nestjs/common";
import { TRPCError } from "@trpc/server";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const RATE_LIMIT_PROFILES: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, maxRequests: 10 },        // 10 per minute
  mutation: { windowMs: 60_000, maxRequests: 30 },     // 30 per minute
  query: { windowMs: 60_000, maxRequests: 120 },       // 120 per minute
  admin: { windowMs: 60_000, maxRequests: 60 },        // 60 per minute
  upload: { windowMs: 300_000, maxRequests: 20 },      // 20 per 5 minutes
  sensitive: { windowMs: 900_000, maxRequests: 5 },    // 5 per 15 minutes (password reset, etc.)
};

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly buckets = new Map<string, RateLimitBucket>();

  // Periodic cleanup to prevent memory leaks
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 300_000); // Every 5 min
  }

  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Check rate limit for a given profile + identifier.
   * Throws TRPC TOO_MANY_REQUESTS if exceeded.
   */
  check(profile: keyof typeof RATE_LIMIT_PROFILES, identifier: string): void {
    const config = RATE_LIMIT_PROFILES[profile];
    if (!config) return;

    const key = `${profile}:${identifier}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + config.windowMs });
      return;
    }

    bucket.count++;
    if (bucket.count > config.maxRequests) {
      const retryAfterMs = bucket.resetAt - now;
      this.logger.warn(
        `Rate limit exceeded: profile=${profile} identifier=${identifier} count=${bucket.count}`,
      );
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      });
    }
  }

  /**
   * Get remaining requests for a given profile + identifier.
   */
  getRemaining(profile: keyof typeof RATE_LIMIT_PROFILES, identifier: string): number {
    const config = RATE_LIMIT_PROFILES[profile];
    if (!config) return Infinity;

    const key = `${profile}:${identifier}`;
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      return config.maxRequests;
    }

    return Math.max(0, config.maxRequests - bucket.count);
  }

  private cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      this.logger.debug(`Rate limiter cleanup: removed ${cleaned} expired buckets`);
    }
  }
}
