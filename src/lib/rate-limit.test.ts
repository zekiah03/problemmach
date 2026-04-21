import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("allows up to limit requests", () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      const r = checkRateLimit(key, { limit: 5, windowMs: 1000 });
      expect(r.ok).toBe(true);
    }
    const r = checkRateLimit(key, { limit: 5, windowMs: 1000 });
    expect(r.ok).toBe(false);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets after window expires", () => {
    vi.useFakeTimers();
    const t0 = new Date("2026-04-21T00:00:00Z");
    vi.setSystemTime(t0);

    const key = `test-${Math.random()}`;
    checkRateLimit(key, { limit: 2, windowMs: 1000 });
    checkRateLimit(key, { limit: 2, windowMs: 1000 });
    expect(checkRateLimit(key, { limit: 2, windowMs: 1000 }).ok).toBe(false);

    vi.setSystemTime(new Date(t0.getTime() + 1100));
    expect(checkRateLimit(key, { limit: 2, windowMs: 1000 }).ok).toBe(true);
  });

  it("separates keys", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    checkRateLimit(a, { limit: 1, windowMs: 1000 });
    expect(checkRateLimit(a, { limit: 1, windowMs: 1000 }).ok).toBe(false);
    expect(checkRateLimit(b, { limit: 1, windowMs: 1000 }).ok).toBe(true);
  });
});
