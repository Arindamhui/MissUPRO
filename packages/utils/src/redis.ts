import Redis from "ioredis";

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(process.env["REDIS_URL"]!, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 200, 5000);
      },
      enableReadyCheck: true,
      lazyConnect: true,
    });
  }
  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}

// ─── Cache Helpers ───

export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await getRedis().get(key);
  if (!raw) return null;
  return JSON.parse(raw) as T;
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  await getRedis().set(key, JSON.stringify(value), "EX", ttlSeconds);
}

export async function cacheDel(key: string): Promise<void> {
  await getRedis().del(key);
}

export async function cacheGetOrSet<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const value = await fetcher();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

// ─── Distributed Lock ───

export async function acquireLock(
  key: string,
  ttlMs: number,
): Promise<string | null> {
  const token = crypto.randomUUID();
  const result = await getRedis().set(
    `lock:${key}`,
    token,
    "PX",
    ttlMs,
    "NX",
  );
  return result === "OK" ? token : null;
}

export async function releaseLock(key: string, token: string): Promise<boolean> {
  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  const result = await getRedis().eval(script, 1, `lock:${key}`, token);
  return result === 1;
}

// ─── Rate Limiter (Sliding Window) ───

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedis();
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);
  pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
  pipeline.zcard(key);
  pipeline.pexpire(key, windowMs);

  const results = await pipeline.exec();
  const count = (results?.[2]?.[1] as number) ?? 0;
  const allowed = count <= maxRequests;

  return {
    allowed,
    remaining: Math.max(0, maxRequests - count),
    resetAt: now + windowMs,
  };
}

// ─── Presence ───

export async function setPresence(
  userId: string,
  status: string,
  ttlSeconds: number,
): Promise<void> {
  await getRedis().set(`presence:${userId}`, status, "EX", ttlSeconds);
}

export async function getPresence(userId: string): Promise<string | null> {
  return getRedis().get(`presence:${userId}`);
}

export async function getPresenceBulk(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const pipeline = getRedis().pipeline();
  for (const id of userIds) {
    pipeline.get(`presence:${id}`);
  }
  const results = await pipeline.exec();
  const map = new Map<string, string>();
  userIds.forEach((id, idx) => {
    const val = results?.[idx]?.[1] as string | null;
    if (val) map.set(id, val);
  });
  return map;
}
