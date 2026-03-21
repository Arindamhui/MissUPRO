import Redis from "ioredis";
import { getEnv } from "@missu/config";

const memoryCache = new Map<string, { value: string; expiresAt: number }>();
let redisClient: Redis | null = null;
let redisUnavailableUntil = 0;

function now() {
  return Date.now();
}

function getMemoryValue(key: string) {
  const record = memoryCache.get(key);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= now()) {
    memoryCache.delete(key);
    return null;
  }

  return record.value;
}

function setMemoryValue(key: string, value: string, ttlSeconds: number) {
  memoryCache.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
}

function markRedisUnavailable() {
  redisUnavailableUntil = now() + 30_000;

  if (redisClient) {
    redisClient.disconnect(false);
    redisClient = null;
  }
}

function canUseRedis() {
  return now() >= redisUnavailableUntil;
}

export function getRedis() {
  if (!canUseRedis()) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(getEnv().REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      enableOfflineQueue: false,
      retryStrategy: () => null,
      connectTimeout: 500,
      commandTimeout: 500,
      tls: getEnv().REDIS_URL.startsWith("rediss://") ? {} : undefined,
    });
    redisClient.on("error", () => {
      markRedisUnavailable();
    });
  }

  return redisClient;
}

async function withRedis<T>(operation: (client: Redis) => Promise<T>) {
  const client = getRedis();

  if (!client) {
    throw new Error("Redis unavailable");
  }

  try {
    if (client.status === "wait") {
      await client.connect();
    }

    return await operation(client);
  } catch (error) {
    markRedisUnavailable();
    throw error;
  }
}

export function userProfileCacheKey(userId: string) {
  return `user:profile:${userId}`;
}

export function agencyCacheKey(agencyId: string) {
  return `agency:${agencyId}`;
}

export function rateLimitCacheKey(scope: string, identifier: string) {
  return `ratelimit:${scope}:${identifier}`;
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await withRedis((client) => client.get(key));
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    const value = getMemoryValue(key);
    return value ? (JSON.parse(value) as T) : null;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds: number) {
  const payload = JSON.stringify(value);

  try {
    await withRedis((client) => client.set(key, payload, "EX", ttlSeconds));
  } catch {
    setMemoryValue(key, payload, ttlSeconds);
  }
}

export async function deleteCache(key: string) {
  try {
    await withRedis((client) => client.del(key));
  } catch {
    memoryCache.delete(key);
  }
}

export async function withCache<T>(key: string, ttlSeconds: number, resolver: () => Promise<T>) {
  const cached = await getCache<T>(key);

  if (cached !== null) {
    return cached;
  }

  const resolved = await resolver();
  await setCache(key, resolved, ttlSeconds);
  return resolved;
}

export async function checkRateLimit(identifier: string, maxRequests: number, windowSeconds: number) {
  const key = rateLimitCacheKey("api", identifier);
  const currentTime = now();
  const windowStart = currentTime - windowSeconds * 1000;

  try {
    const results = await withRedis(async (client) => {
      const pipeline = client.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, currentTime.toString(), `${currentTime}:${Math.random()}`);
      pipeline.zcard(key);
      pipeline.expire(key, windowSeconds);
      return pipeline.exec();
    });
    const count = Number(results?.[2]?.[1] ?? 0);

    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: currentTime + windowSeconds * 1000,
    };
  } catch {
    const raw = getMemoryValue(key);
    const values = raw ? (JSON.parse(raw) as number[]) : [];
    const filtered = values.filter((entry) => entry > windowStart);
    filtered.push(currentTime);
    setMemoryValue(key, JSON.stringify(filtered), windowSeconds);

    return {
      allowed: filtered.length <= maxRequests,
      remaining: Math.max(0, maxRequests - filtered.length),
      resetAt: currentTime + windowSeconds * 1000,
    };
  }
}