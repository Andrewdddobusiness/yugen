export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimitEntry = {
  count: number;
  resetAtMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAtMs: number;
  retryAfterSeconds: number;
};

const getStore = (): Map<string, RateLimitEntry> => {
  const globalAny = globalThis as any;
  if (!globalAny.__yugen_rate_limit_store) {
    globalAny.__yugen_rate_limit_store = new Map<string, RateLimitEntry>();
  }
  return globalAny.__yugen_rate_limit_store as Map<string, RateLimitEntry>;
};

const cleanupExpired = (store: Map<string, RateLimitEntry>, nowMs: number) => {
  if (store.size < 5000) return;
  for (const [key, entry] of store.entries()) {
    if (entry.resetAtMs <= nowMs) store.delete(key);
  }
};

export const rateLimit = (key: string, config: RateLimitConfig): RateLimitResult => {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return {
      allowed: false,
      limit: config.max,
      remaining: 0,
      resetAtMs: Date.now() + config.windowMs,
      retryAfterSeconds: Math.ceil(config.windowMs / 1000),
    };
  }

  const nowMs = Date.now();
  const store = getStore();
  cleanupExpired(store, nowMs);

  const existing = store.get(normalizedKey);
  if (!existing || existing.resetAtMs <= nowMs) {
    const resetAtMs = nowMs + config.windowMs;
    store.set(normalizedKey, { count: 1, resetAtMs });
    return {
      allowed: true,
      limit: config.max,
      remaining: Math.max(0, config.max - 1),
      resetAtMs,
      retryAfterSeconds: 0,
    };
  }

  const nextCount = existing.count + 1;
  existing.count = nextCount;
  store.set(normalizedKey, existing);

  const allowed = nextCount <= config.max;
  const remaining = Math.max(0, config.max - nextCount);
  const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil((existing.resetAtMs - nowMs) / 1000));

  return {
    allowed,
    limit: config.max,
    remaining,
    resetAtMs: existing.resetAtMs,
    retryAfterSeconds,
  };
};

export const rateLimitHeaders = (result: RateLimitResult) => ({
  "X-RateLimit-Limit": String(result.limit),
  "X-RateLimit-Remaining": String(result.remaining),
  "X-RateLimit-Reset": String(Math.floor(result.resetAtMs / 1000)),
  ...(result.allowed ? {} : { "Retry-After": String(result.retryAfterSeconds) }),
});

