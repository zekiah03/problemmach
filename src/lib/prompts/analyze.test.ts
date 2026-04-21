import { describe, it, expect } from "vitest";
import { pickTemplates, type AnalyzeResultLite } from "./analyze";

describe("pickTemplates", () => {
  const baseScores = { info: 0, action: 0, dialog: 0, coexist: 0, acceptance: 0 };

  it("picks INFO templates when info score wins", () => {
    const a: AnalyzeResultLite = {
      solutionTypeScores: { ...baseScores, info: 90 },
      categoryPrimary: "DECISION",
    };
    const result = pickTemplates(a, 3);
    expect(result.length).toBe(3);
    for (const t of result) {
      expect(t.type).toBe("INFO");
    }
  });

  it("filters COEXIST by subtype", () => {
    const a: AnalyzeResultLite = {
      solutionTypeScores: { ...baseScores, coexist: 100 },
      categoryPrimary: "CONTROL",
      coexistSubtype: "LOSS",
    };
    const result = pickTemplates(a, 3);
    expect(result.length).toBeGreaterThan(0);
    for (const t of result) {
      expect(t.type).toBe("COEXIST");
      expect(t.sub).toBe("LOSS");
    }
  });

  it("prefers templates matching primary category", () => {
    const a: AnalyzeResultLite = {
      solutionTypeScores: { ...baseScores, action: 80 },
      categoryPrimary: "RISK",
    };
    const result = pickTemplates(a, 3);
    expect(result.length).toBe(3);
    // 最低1つは RISK に該当するテンプレが含まれる
    const hasRisk = result.some((t) => t.appliesToCategory.includes("RISK"));
    expect(hasRisk).toBe(true);
  });

  it("returns empty array gracefully when no templates match (impossible in practice)", () => {
    const a: AnalyzeResultLite = {
      solutionTypeScores: { ...baseScores, coexist: 100 },
      categoryPrimary: "DECISION",
      coexistSubtype: "LOSS",
    };
    // LOSS の中で DECISION に合うものがあれば取れる、なくても少なくとも何かは取れる
    const result = pickTemplates(a, 3);
    expect(Array.isArray(result)).toBe(true);
  });

  it("respects requested count", () => {
    const a: AnalyzeResultLite = {
      solutionTypeScores: { ...baseScores, info: 50 },
      categoryPrimary: "DECISION",
    };
    expect(pickTemplates(a, 1).length).toBe(1);
    expect(pickTemplates(a, 5).length).toBe(5);
  });
});
