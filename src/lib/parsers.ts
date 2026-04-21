// LLM JSON 出力のパース。services 層から分離してテスト可能に
import type { TimeSlot, RiskFlag } from "@prisma/client";
import type { AITurnResponse, AnalysisResult } from "./types";
import type { SlotState } from "./prompts/conversation";

const VALID_SLOTS: TimeSlot[] = ["ORIGIN", "COURSE", "PRESENT", "IDEAL", "CONSTRAINT"];
const VALID_RISKS: RiskFlag[] = [
  "NONE",
  "SELF_HARM",
  "HARM_OTHERS",
  "ILLEGAL",
  "MEDICAL",
  "PII_DETECTED",
];

// --- Risk ---

export type RiskParseResult = {
  flag: RiskFlag;
  piiDetected: boolean;
  reasoning: string;
};

export function parseRiskResponse(raw: string): RiskParseResult {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return { flag: "NONE", piiDetected: false, reasoning: "unparsed" };
  try {
    const j = JSON.parse(m[0]);
    return {
      flag: normalizeRisk(j.flag),
      piiDetected: Boolean(j.pii_detected),
      reasoning: String(j.reasoning ?? ""),
    };
  } catch {
    return { flag: "NONE", piiDetected: false, reasoning: "parse_error" };
  }
}

function normalizeRisk(raw: unknown): RiskFlag {
  const v = String(raw ?? "").toUpperCase();
  return (VALID_RISKS as string[]).includes(v) ? (v as RiskFlag) : "NONE";
}

// --- AI Turn ---

const MAX_TURNS = 5;

export function parseAITurn(
  raw: string,
  turnNumber: number,
  slotState: SlotState,
): AITurnResponse {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return fallbackTurn(slotState, turnNumber);
  try {
    const j = JSON.parse(m[0]);
    return {
      acknowledgment: String(j.acknowledgment ?? ""),
      cumulative_summary: String(j.cumulative_summary ?? ""),
      question: String(j.question ?? ""),
      target_slot: normalizeSlot(j.target_slot, slotState),
      options: Array.isArray(j.options)
        ? j.options
            .filter(
              (o: unknown): o is { value: string; label: string } =>
                typeof o === "object" && o !== null && "value" in o && "label" in o,
            )
            .slice(0, 4)
        : [],
      ready_to_analyze:
        Boolean(j.ready_to_analyze) ||
        turnNumber >= MAX_TURNS ||
        enoughSlotsFilled(slotState),
    };
  } catch {
    return fallbackTurn(slotState, turnNumber);
  }
}

export function normalizeSlot(raw: unknown, slotState: SlotState): TimeSlot {
  const v = String(raw ?? "").toUpperCase();
  if ((VALID_SLOTS as string[]).includes(v)) return v as TimeSlot;
  for (const s of VALID_SLOTS) {
    if (!slotState[s]) return s;
  }
  return "PRESENT";
}

function enoughSlotsFilled(s: SlotState): boolean {
  return s.ORIGIN && s.PRESENT && s.IDEAL;
}

function fallbackTurn(slotState: SlotState, turnNumber: number): AITurnResponse {
  return {
    acknowledgment: "そうなんですね。もう少し聞かせてください。",
    cumulative_summary: "",
    question: "今のお話、もう少し教えてもらえますか？",
    target_slot: normalizeSlot(null, slotState),
    options: [],
    ready_to_analyze: turnNumber >= MAX_TURNS || enoughSlotsFilled(slotState),
  };
}

// --- Analysis ---

export function parseAnalysis(raw: string): AnalysisResult {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Analysis JSON not found");
  const j = JSON.parse(m[0]);

  return {
    structure: {
      ideal: String(j.structure?.ideal ?? ""),
      reality: String(j.structure?.reality ?? ""),
      uncertainty: String(j.structure?.uncertainty ?? ""),
    },
    category: {
      primary: normalizeCategory(j.category?.primary) ?? "DECISION",
      secondary: normalizeCategory(j.category?.secondary),
      confidence: clamp(Number(j.category?.confidence ?? 50), 0, 100),
    },
    time_info: {
      onset: String(j.time_info?.onset ?? ""),
      duration: normalizeDuration(j.time_info?.duration),
      deadline: j.time_info?.deadline ? String(j.time_info.deadline) : null,
    },
    solution_type_scores: {
      info: clamp(Number(j.solution_type_scores?.info ?? 0), 0, 100),
      action: clamp(Number(j.solution_type_scores?.action ?? 0), 0, 100),
      dialog: clamp(Number(j.solution_type_scores?.dialog ?? 0), 0, 100),
      coexist: clamp(Number(j.solution_type_scores?.coexist ?? 0), 0, 100),
      acceptance: clamp(Number(j.solution_type_scores?.acceptance ?? 0), 0, 100),
    },
    self_resolvable_score: clamp(Number(j.self_resolvable_score ?? 50), 0, 100),
    coexist_subtype: normalizeCoexistSub(j.coexist_subtype),
    long_term_flag: Boolean(j.long_term_flag),
    match_recommend: Boolean(j.match_recommend),
    match_reason: j.match_reason ? String(j.match_reason) : null,
  };
}

function normalizeCategory(
  v: unknown,
): "DECISION" | "CONTROL" | "IDENTITY" | "RISK" | null {
  const s = String(v ?? "").toUpperCase();
  if (s === "DECISION" || s === "CONTROL" || s === "IDENTITY" || s === "RISK") return s;
  return null;
}

function normalizeDuration(v: unknown): "ACUTE" | "CHRONIC" | "UNKNOWN" {
  const s = String(v ?? "").toUpperCase();
  if (s === "ACUTE" || s === "CHRONIC") return s;
  return "UNKNOWN";
}

function normalizeCoexistSub(
  v: unknown,
): "LOSS" | "CONSTRAINT" | "INEVITABLE" | "OTHER_PERSON" | null {
  const s = String(v ?? "").toUpperCase();
  if (s === "LOSS" || s === "CONSTRAINT" || s === "INEVITABLE" || s === "OTHER_PERSON")
    return s;
  return null;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}
