import { describe, it, expect } from "vitest";
import { parseRiskResponse, parseAITurn, parseAnalysis, normalizeSlot } from "./parsers";
import type { SlotState } from "./prompts/conversation";

const emptySlots: SlotState = {
  ORIGIN: false,
  COURSE: false,
  PRESENT: false,
  IDEAL: false,
  CONSTRAINT: false,
};

describe("parseRiskResponse", () => {
  it("returns NONE on empty input", () => {
    expect(parseRiskResponse("")).toEqual({
      flag: "NONE",
      piiDetected: false,
      reasoning: "unparsed",
    });
  });

  it("parses valid JSON", () => {
    const r = parseRiskResponse(
      '{"flag":"SELF_HARM","pii_detected":false,"reasoning":"具体的計画あり"}',
    );
    expect(r.flag).toBe("SELF_HARM");
    expect(r.piiDetected).toBe(false);
    expect(r.reasoning).toBe("具体的計画あり");
  });

  it("normalizes case", () => {
    expect(parseRiskResponse('{"flag":"self_harm"}').flag).toBe("SELF_HARM");
  });

  it("falls back to NONE for unknown flag", () => {
    expect(parseRiskResponse('{"flag":"WHATEVER"}').flag).toBe("NONE");
  });

  it("handles JSON wrapped in extra text", () => {
    const r = parseRiskResponse(
      'すこし悩みましたが、結論はこちら:\n{"flag":"NONE","pii_detected":false}\n以上です',
    );
    expect(r.flag).toBe("NONE");
  });

  it("returns NONE on malformed JSON", () => {
    expect(parseRiskResponse("{flag: not valid").flag).toBe("NONE");
  });

  it("treats pii_detected truthy values as true", () => {
    expect(parseRiskResponse('{"flag":"NONE","pii_detected":true}').piiDetected).toBe(true);
  });
});

describe("parseAITurn", () => {
  it("parses minimal valid response", () => {
    const r = parseAITurn(
      '{"acknowledgment":"そう","cumulative_summary":"","question":"いつから?","target_slot":"ORIGIN","options":[]}',
      1,
      emptySlots,
    );
    expect(r.acknowledgment).toBe("そう");
    expect(r.target_slot).toBe("ORIGIN");
    expect(r.options).toEqual([]);
    expect(r.ready_to_analyze).toBe(false);
  });

  it("filters invalid option entries", () => {
    const raw = JSON.stringify({
      question: "?",
      target_slot: "PRESENT",
      options: [
        { value: "a", label: "A" },
        "invalid",
        { value: "b" }, // missing label
        { value: "c", label: "C" },
        { value: "d", label: "D" },
        { value: "e", label: "E" }, // 5番目、上限4でカット
      ],
    });
    const r = parseAITurn(raw, 1, emptySlots);
    // 6 entries: "invalid" は string で除外、b は label 欠落で除外 → a,c,d,e の 4 件
    // slice(0, 4) で 4 件残る
    expect(r.options.length).toBe(4);
    expect(r.options.map((o) => o.value)).toEqual(["a", "c", "d", "e"]);
  });

  it("ready_to_analyze becomes true when 3 key slots filled", () => {
    const filled: SlotState = {
      ORIGIN: true,
      COURSE: false,
      PRESENT: true,
      IDEAL: true,
      CONSTRAINT: false,
    };
    const r = parseAITurn('{"target_slot":"COURSE"}', 2, filled);
    expect(r.ready_to_analyze).toBe(true);
  });

  it("ready_to_analyze is true after MAX_TURNS=5", () => {
    const r = parseAITurn('{"target_slot":"COURSE"}', 5, emptySlots);
    expect(r.ready_to_analyze).toBe(true);
  });

  it("falls back gracefully on no JSON", () => {
    const r = parseAITurn("ごめんなさい、エラー", 1, emptySlots);
    expect(r.target_slot).toBe("ORIGIN"); // 最初の空スロット
    expect(r.acknowledgment).toContain("もう少し");
  });
});

describe("normalizeSlot", () => {
  it("returns valid slot as-is", () => {
    expect(normalizeSlot("PRESENT", emptySlots)).toBe("PRESENT");
  });

  it("returns first unfilled slot for invalid", () => {
    const partial: SlotState = {
      ORIGIN: true,
      COURSE: true,
      PRESENT: false,
      IDEAL: false,
      CONSTRAINT: false,
    };
    expect(normalizeSlot("INVALID", partial)).toBe("PRESENT");
  });

  it("defaults to PRESENT when all slots filled", () => {
    const all: SlotState = {
      ORIGIN: true,
      COURSE: true,
      PRESENT: true,
      IDEAL: true,
      CONSTRAINT: true,
    };
    expect(normalizeSlot("nothing", all)).toBe("PRESENT");
  });
});

describe("parseAnalysis", () => {
  const minimal = JSON.stringify({
    structure: { ideal: "X", reality: "Y", uncertainty: "Z" },
    category: { primary: "DECISION", secondary: null, confidence: 80 },
    time_info: { onset: "1ヶ月前", duration: "ACUTE", deadline: null },
    solution_type_scores: { info: 70, action: 30, dialog: 20, coexist: 0, acceptance: 10 },
    self_resolvable_score: 65,
    coexist_subtype: null,
    long_term_flag: false,
    match_recommend: false,
    match_reason: null,
  });

  it("parses a full analysis", () => {
    const a = parseAnalysis(minimal);
    expect(a.structure.ideal).toBe("X");
    expect(a.category.primary).toBe("DECISION");
    expect(a.solution_type_scores.info).toBe(70);
    expect(a.self_resolvable_score).toBe(65);
  });

  it("clamps scores out of range", () => {
    const raw = JSON.stringify({
      structure: { ideal: "", reality: "", uncertainty: "" },
      category: { primary: "RISK", confidence: 200 },
      solution_type_scores: { info: -50, action: 999, dialog: 0, coexist: 0, acceptance: 0 },
      self_resolvable_score: 1000,
    });
    const a = parseAnalysis(raw);
    expect(a.category.confidence).toBe(100);
    expect(a.solution_type_scores.info).toBe(0);
    expect(a.solution_type_scores.action).toBe(100);
    expect(a.self_resolvable_score).toBe(100);
  });

  it("defaults primary to DECISION when invalid", () => {
    const raw = JSON.stringify({
      structure: {},
      category: { primary: "INVALID" },
      time_info: {},
      solution_type_scores: {},
      self_resolvable_score: 50,
    });
    const a = parseAnalysis(raw);
    expect(a.category.primary).toBe("DECISION");
  });

  it("normalizes coexist_subtype", () => {
    const raw = JSON.stringify({
      structure: {},
      category: { primary: "CONTROL" },
      time_info: {},
      solution_type_scores: {},
      self_resolvable_score: 50,
      coexist_subtype: "loss",
      long_term_flag: true,
    });
    const a = parseAnalysis(raw);
    expect(a.coexist_subtype).toBe("LOSS");
    expect(a.long_term_flag).toBe(true);
  });

  it("throws on no JSON found", () => {
    expect(() => parseAnalysis("plain text")).toThrow("Analysis JSON not found");
  });
});
