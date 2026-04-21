// シンプルなインメモリレート制限
// 単一ノード前提。スケール時は Redis 等に置き換える

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  limit: number; // 窓内の最大リクエスト数
  windowMs: number; // 窓の長さ (ミリ秒)
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);

  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { ok: true, remaining: options.limit - 1, retryAfterMs: 0 };
  }

  if (b.count >= options.limit) {
    return { ok: false, remaining: 0, retryAfterMs: b.resetAt - now };
  }

  b.count += 1;
  return { ok: true, remaining: options.limit - b.count, retryAfterMs: 0 };
}

// 定期的に古いエントリを掃除 (メモリリーク防止)
const CLEANUP_INTERVAL = 60_000;
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k);
    }
  }, CLEANUP_INTERVAL);
}

// LLM 呼び出し系の共通プリセット
export const LLM_LIMIT: RateLimitOptions = {
  limit: 20,
  windowMs: 60_000, // 1 分あたり 20 リクエスト
};
