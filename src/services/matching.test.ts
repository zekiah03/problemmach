import { describe, it, expect } from "vitest";
import { computeCompatibility } from "./matching";

const basePost = (overrides: Partial<Parameters<typeof computeCompatibility>[0]> = {}) => ({
  id: "a",
  userId: "u1",
  categoryPrimary: "DECISION" as string | null,
  categorySecondary: null as string | null,
  coexistSubtype: null as string | null,
  longTermFlag: false,
  completedAt: null as Date | null,
  user: { matchCondition: null },
  ...overrides,
});

describe("computeCompatibility", () => {
  it("returns MIRROR when primary categories match", () => {
    const a = basePost({ id: "a" });
    const b = basePost({ id: "b", userId: "u2" });
    const r = computeCompatibility(a, b);
    expect(r.matchType).toBe("MIRROR");
    expect(r.compatibilityScore).toBeGreaterThan(30);
  });

  it("returns EXPERIENCED when time gap >= 14 days and no mirror boost", () => {
    const now = new Date();
    const old = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const a = basePost({
      id: "a",
      categoryPrimary: "DECISION",
      completedAt: now,
    });
    const b = basePost({
      id: "b",
      userId: "u2",
      categoryPrimary: "RISK", // 別カテゴリ → mirror ボーナスなし
      completedAt: old,
    });
    const r = computeCompatibility(a, b);
    expect(r.matchType).toBe("EXPERIENCED");
  });

  it("adds semantic bonus for high similarity", () => {
    const a = basePost({ id: "a" });
    const b = basePost({ id: "b", userId: "u2" });
    const base = computeCompatibility(a, b, null).compatibilityScore;
    const boosted = computeCompatibility(a, b, 1.0).compatibilityScore;
    expect(boosted - base).toBe(20); // SEMANTIC_MAX_BONUS
  });

  it("no semantic bonus when similarity < 0.5", () => {
    const a = basePost({ id: "a" });
    const b = basePost({ id: "b", userId: "u2" });
    const base = computeCompatibility(a, b, null).compatibilityScore;
    const low = computeCompatibility(a, b, 0.3).compatibilityScore;
    expect(low).toBe(base);
  });

  it("partial semantic bonus scales linearly between 0.5 and 1.0", () => {
    const a = basePost({ id: "a" });
    const b = basePost({ id: "b", userId: "u2" });
    const base = computeCompatibility(a, b, null).compatibilityScore;
    const mid = computeCompatibility(a, b, 0.75).compatibilityScore;
    expect(mid - base).toBe(10); // (0.75-0.5)/0.5 * 20 = 10
  });

  it("caps compatibilityScore at 100", () => {
    const a = basePost({
      id: "a",
      categoryPrimary: "CONTROL",
      coexistSubtype: "LOSS",
      longTermFlag: true,
    });
    const b = basePost({
      id: "b",
      userId: "u2",
      categoryPrimary: "CONTROL",
      coexistSubtype: "LOSS",
      longTermFlag: true,
    });
    const r = computeCompatibility(a, b, 1.0);
    expect(r.compatibilityScore).toBeLessThanOrEqual(100);
  });
});
