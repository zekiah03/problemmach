// 本分析プロンプト (2段階の2段目)
// 顕在分析: 構造・類型・時間・解決タイプ・解決の型を JSON で返す
import { Persona } from "@prisma/client";
import { SAFETY_CONSTRAINTS } from "./system";
import { PERSONA_PROMPT } from "./personas";
import { templates } from "@/data/templates";

export const ANALYZE_PROMPT_VERSION = "p0-2026-04";

export function buildAnalyzeSystem(persona: Persona): string {
  return `
あなたは悩み分析エンジンの本分析ステージです。
対話ログからユーザーの悩みを構造化して返します。

${SAFETY_CONSTRAINTS}

${PERSONA_PROMPT[persona]}

# 出力する内容

## 1. 構造 (structure)
- ideal: 本人がなりたい状態
- reality: 現実
- uncertainty: 不確実・詰まっている点

## 2. 4類型 (category)
- DECISION: 判断できない (選択肢複数)
- CONTROL: コントロールできない (他者・環境・運)
- IDENTITY: 自分が分からない (価値観未定義)
- RISK: 損したくない (損失回避)

primary + secondary (該当があれば) + confidence (0-100)

## 3. 時間情報 (time_info)
- onset: 起点の推定 (文字列)
- duration: "ACUTE" (急性) | "CHRONIC" (慢性) | "UNKNOWN"
- deadline: 締切の有無・内容 (文字列 or null)

## 4. 解決タイプスコア (solution_type_scores)
各0-100。合計100にしなくて良い。
- info: 調べれば解決する度合い
- action: 計画立てて動けば解決する度合い
- dialog: 他者との対話で解ける度合い
- coexist: 解決せず共存する度合い (変えられない)
- acceptance: 感情として感じ切る必要度

## 5. 自己解決スコア (self_resolvable_score, 0-100)
本人だけで解決できる度合い。低いほど他者介入が有効。

## 6. 共存サブタイプ (coexist_subtype)
coexist スコアが高い時のみ。
"LOSS" | "CONSTRAINT" | "INEVITABLE" | "OTHER_PERSON" | null

## 7. 長期フラグ (long_term_flag)
coexist が優勢なら true。長期で寄り添う必要。

## 8. マッチ推奨 (match_recommend)
dialog スコア > 60 かつ self_resolvable_score < 50 なら true。
それ以外は false。
自傷・他害系は常に false (ただしこの段階には来ないはず)。

## 9. マッチ理由 (match_reason)
match_recommend が true の場合のみ。なぜマッチが有効かを短く。

# 出力形式 (必ずJSONのみ)

{
  "structure": { "ideal": "...", "reality": "...", "uncertainty": "..." },
  "category": {
    "primary": "DECISION" | "CONTROL" | "IDENTITY" | "RISK",
    "secondary": "..." | null,
    "confidence": 0-100
  },
  "time_info": { "onset": "...", "duration": "ACUTE"|"CHRONIC"|"UNKNOWN", "deadline": "..."|null },
  "solution_type_scores": { "info": 0-100, "action": 0-100, "dialog": 0-100, "coexist": 0-100, "acceptance": 0-100 },
  "self_resolvable_score": 0-100,
  "coexist_subtype": "LOSS"|"CONSTRAINT"|"INEVITABLE"|"OTHER_PERSON"|null,
  "long_term_flag": boolean,
  "match_recommend": boolean,
  "match_reason": "..."|null
}

本人の言葉を尊重してください。解釈を付け足しすぎない。
`.trim();
}

// 解決の型の選出 (分析結果から3つ選ぶ)
export type AnalyzeResultLite = {
  solutionTypeScores: {
    info: number;
    action: number;
    dialog: number;
    coexist: number;
    acceptance: number;
  };
  categoryPrimary: "DECISION" | "CONTROL" | "IDENTITY" | "RISK";
  categorySecondary?: "DECISION" | "CONTROL" | "IDENTITY" | "RISK" | null;
  coexistSubtype?: "LOSS" | "CONSTRAINT" | "INEVITABLE" | "OTHER_PERSON" | null;
};

export function pickTemplates(a: AnalyzeResultLite, count = 3) {
  const topType = (Object.entries(a.solutionTypeScores) as [
    keyof typeof a.solutionTypeScores,
    number,
  ][])
    .sort((x, y) => y[1] - x[1])[0][0];

  const typeKey = topType.toUpperCase() as
    | "INFO"
    | "ACTION"
    | "DIALOG"
    | "COEXIST"
    | "ACCEPTANCE";

  const candidates = templates.filter((t) => {
    if (t.type !== typeKey) return false;
    if (typeKey === "COEXIST" && a.coexistSubtype && t.sub !== a.coexistSubtype) return false;
    return true;
  });

  const scored = candidates.map((t) => {
    let score = 0;
    if (t.appliesToCategory.includes(a.categoryPrimary)) score += 2;
    if (a.categorySecondary && t.appliesToCategory.includes(a.categorySecondary)) score += 1;
    return { template: t, score };
  });

  // primary 類型に合う順、ID順 (安定ソート)
  scored.sort((x, y) => y.score - x.score || x.template.id.localeCompare(y.template.id));

  return scored.slice(0, count).map((s) => s.template);
}
