// 共通型定義

import type { Persona, TimeSlot } from "@prisma/client";

export type ConversationOption = {
  value: string;
  label: string;
};

export type AITurnResponse = {
  acknowledgment: string;
  cumulative_summary: string;
  question: string;
  target_slot: TimeSlot;
  options: ConversationOption[];
  ready_to_analyze: boolean;
};

export type AnalysisResult = {
  structure: { ideal: string; reality: string; uncertainty: string };
  category: {
    primary: "DECISION" | "CONTROL" | "IDENTITY" | "RISK";
    secondary: "DECISION" | "CONTROL" | "IDENTITY" | "RISK" | null;
    confidence: number;
  };
  time_info: {
    onset: string;
    duration: "ACUTE" | "CHRONIC" | "UNKNOWN";
    deadline: string | null;
  };
  solution_type_scores: {
    info: number;
    action: number;
    dialog: number;
    coexist: number;
    acceptance: number;
  };
  self_resolvable_score: number;
  coexist_subtype: "LOSS" | "CONSTRAINT" | "INEVITABLE" | "OTHER_PERSON" | null;
  long_term_flag: boolean;
  match_recommend: boolean;
  match_reason: string | null;
};

export function isPersona(v: unknown): v is Persona {
  return v === "FLAT_POLITE" || v === "FLAT_CASUAL" || v === "EXPERT" || v === "FRIEND";
}
