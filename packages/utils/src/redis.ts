import Redis from "ioredis";

let _redis: Redis | null = null;
let redisUnavailableUntil = 0;
const inMemoryLocks = new Map<string, { token: string; expiresAt: number }>();
const inMemoryCache = new Map<string, { value: string; expiresAt: number }>();
const inMemoryPresence = new Map<string, { value: string; expiresAt: number }>();

function isRedisDisabled() {
  return process.env.DISABLE_REDIS === "1";
}

function now() {
  return Date.now();
}

function markRedisUnavailable() {
  redisUnavailableUntil = now() + 30_000;

  if (_redis) {
    _redis.disconnect(false);
    _redis = null;
  }
}

function canUseRedis() {
  return !isRedisDisabled() && Boolean(process.env["REDIS_URL"]) && now() >= redisUnavailableUntil;
}

function readMemoryValue(store: Map<string, { value: string; expiresAt: number }>, key: string) {
  const record = store.get(key);

  if (!record) {
    return null;
  }

  if (record.expiresAt <= now()) {
    store.delete(key);
    return null;
  }

  return record.value;
}

function writeMemoryValue(store: Map<string, { value: string; expiresAt: number }>, key: string, value: string, ttlMs: number) {
  store.set(key, { value, expiresAt: now() + ttlMs });
}

function acquireLocalLock(key: string, ttlMs: number): string | null {
  const lockKey = `lock:${key}`;
  const now = Date.now();
  const existing = inMemoryLocks.get(lockKey);
  if (existing && existing.expiresAt > now) {
    return null;
  }

  const token = crypto.randomUUID();
  inMemoryLocks.set(lockKey, { token, expiresAt: now + ttlMs });
  return token;
}

function releaseLocalLock(key: string, token: string): boolean {
  const lockKey = `lock:${key}`;
  const existing = inMemoryLocks.get(lockKey);
  if (!existing || existing.token !== token) {
    return false;
  }

  inMemoryLocks.delete(lockKey);
  return true;
}

export function getRedis(): Redis {
  if (isRedisDisabled()) {
    throw new Error("Redis unavailable");
  }

  if (!canUseRedis()) {
    throw new Error("Redis unavailable");
  }

  if (!_redis) {
    _redis = new Redis(process.env["REDIS_URL"]!, {
      maxRetriesPerRequest: 1,
      retryStrategy() {
        return null;
      },
      enableReadyCheck: false,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 500,
      commandTimeout: 500,
    });
    _redis.on("error", () => {
      markRedisUnavailable();
    });
  }
  return _redis;
}

async function withRedis<T>(operation: (client: Redis) => Promise<T>) {
  const client = getRedis();

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

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}

// ─── Cache Helpers ───

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await withRedis((client) => client.get(key));
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    const raw = readMemoryValue(inMemoryCache, key);
    return raw ? (JSON.parse(raw) as T) : null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
): Promise<void> {
  const payload = JSON.stringify(value);

  try {
    await withRedis((client) => client.set(key, payload, "EX", ttlSeconds));
  } catch {
    writeMemoryValue(inMemoryCache, key, payload, ttlSeconds * 1000);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await withRedis((client) => client.del(key));
  } catch {
    inMemoryCache.delete(key);
  }
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
  if (isRedisDisabled() || !process.env["REDIS_URL"]) {
    return acquireLocalLock(key, ttlMs);
  }

  const token = crypto.randomUUID();
  try {
    const result = await withRedis((client) => client.set(
      `lock:${key}`,
      token,
      "PX",
      ttlMs,
      "NX",
    ));
    return result === "OK" ? token : null;
  } catch {
    return acquireLocalLock(key, ttlMs);
  }
}

export async function releaseLock(key: string, token: string): Promise<boolean> {
  if (isRedisDisabled() || !process.env["REDIS_URL"]) {
    return releaseLocalLock(key, token);
  }

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;
  try {
    const result = await withRedis((client) => client.eval(script, 1, `lock:${key}`, token));
    return result === 1;
  } catch {
    return releaseLocalLock(key, token);
  }
}

// ─── Rate Limiter (Sliding Window) ───

export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = now - windowMs;

  try {
    const results = await withRedis(async (client) => {
      const pipeline = client.pipeline();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);
      pipeline.zcard(key);
      pipeline.pexpire(key, windowMs);
      return pipeline.exec();
    });

    const count = (results?.[2]?.[1] as number) ?? 0;
    const allowed = count <= maxRequests;

    return {
      allowed,
      remaining: Math.max(0, maxRequests - count),
      resetAt: now + windowMs,
    };
  } catch {
    const raw = readMemoryValue(inMemoryCache, key);
    const values = raw ? (JSON.parse(raw) as number[]) : [];
    const filtered = values.filter((entry) => entry > windowStart);
    filtered.push(now);
    writeMemoryValue(inMemoryCache, key, JSON.stringify(filtered), windowMs);

    return {
      allowed: filtered.length <= maxRequests,
      remaining: Math.max(0, maxRequests - filtered.length),
      resetAt: now + windowMs,
    };
  }
}

// ─── Presence ───

export async function setPresence(
  userId: string,
  status: string,
  ttlSeconds: number,
): Promise<void> {
  try {
    await withRedis((client) => client.set(`presence:${userId}`, status, "EX", ttlSeconds));
  } catch {
    writeMemoryValue(inMemoryPresence, `presence:${userId}`, status, ttlSeconds * 1000);
  }
}

export async function getPresence(userId: string): Promise<string | null> {
  try {
    return await withRedis((client) => client.get(`presence:${userId}`));
  } catch {
    return readMemoryValue(inMemoryPresence, `presence:${userId}`);
  }
}

export async function getPresenceBulk(
  userIds: string[],
): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const map = new Map<string, string>();

  try {
    const results = await withRedis(async (client) => {
      const pipeline = client.pipeline();
      for (const id of userIds) {
        pipeline.get(`presence:${id}`);
      }
      return pipeline.exec();
    });

    userIds.forEach((id, idx) => {
      const val = results?.[idx]?.[1] as string | null;
      if (val) map.set(id, val);
    });
  } catch {
    for (const id of userIds) {
      const value = readMemoryValue(inMemoryPresence, `presence:${id}`);
      if (value) {
        map.set(id, value);
      }
    }
  }

  return map;
}
