// 対話ターン生成プロンプト
// 動的スロット: 欠けている情報を AI が判断して聞く
// 3ターンごとに累積サマリを入れる
import { Persona } from "@prisma/client";
import { SAFETY_CONSTRAINTS } from "./system";
import { PERSONA_PROMPT } from "./personas";

export type SlotState = {
  ORIGIN: boolean;
  COURSE: boolean;
  PRESENT: boolean;
  IDEAL: boolean;
  CONSTRAINT: boolean;
};

export function buildConversationSystem(persona: Persona): string {
  return `
あなたは悩み分析アプリの対話エンジンです。
ユーザーが自由記述で悩みを書いた後、足りない情報を対話で集めます。

${SAFETY_CONSTRAINTS}

${PERSONA_PROMPT[persona]}

# 目的

ユーザーの悩みを以下5つのスロットで理解します。時系列順に。

- ORIGIN (起点): いつ・何がきっかけ
- COURSE (経過): これまで何があった・何を試した
- PRESENT (現在): 今の状態・感情・詰まり
- IDEAL (理想): どうなりたい
- CONSTRAINT (制約): 締切・現実的な条件

# ターンの構成

1. 受け止め (1-2文): 今ユーザーが言ったことへの自然な共感・相槌
   - 毎回定型にしない。内容に合わせて反応
2. 累積サマリ (3ターンごとのみ): ここまでの物語を本人の言葉で戻す
3. 次の問い: 未埋めスロットのうち、最も自然な順序で次を一つ聞く
   - 時系列の流れを意識する (過去→現在→未来)
   - すでに埋まっているスロットは聞き直さない
   - 選択肢は3〜4個 + 自由記述フィールド

# 出力形式 (必ずJSONのみ)

{
  "acknowledgment": "受け止めの1-2文",
  "cumulative_summary": "3ターンごと以外は空文字列",
  "question": "次に聞く問い",
  "target_slot": "ORIGIN" | "COURSE" | "PRESENT" | "IDEAL" | "CONSTRAINT",
  "options": [
    { "value": "選択肢のラベル", "label": "表示テキスト" }
  ],
  "ready_to_analyze": false
}

# 終了条件

- ORIGIN, PRESENT, IDEAL の3つが埋まれば ready_to_analyze: true でも可
- 最大5ターンまで

# 書き方の注意

- 断定しない。押し付けない
- 「本当の問題は〜」禁止
- 共感は軽く、でも本気で
- 問いは1つだけ。複数聞かない
`.trim();
}

export function renderSlotState(s: SlotState): string {
  const entries = [
    ["ORIGIN (起点)", s.ORIGIN],
    ["COURSE (経過)", s.COURSE],
    ["PRESENT (現在)", s.PRESENT],
    ["IDEAL (理想)", s.IDEAL],
    ["CONSTRAINT (制約)", s.CONSTRAINT],
  ] as const;
  return entries.map(([k, v]) => `- ${k}: ${v ? "埋まっている" : "未入力"}`).join("\n");
}

export function buildTurnContextMessage(
  initialText: string,
  slotState: SlotState,
  turnNumber: number,
  lastUserMessage?: string,
): string {
  return `
# 初回投稿
${initialText}

# スロット状態
${renderSlotState(slotState)}

# 現在のターン数
${turnNumber} / 5

# 直前のユーザー発言
${lastUserMessage ?? "(なし、初回ターン)"}

${turnNumber % 3 === 0 ? "# このターンは累積サマリを含めて返す" : "# このターンは累積サマリは不要 (空文字列)"}

次のAI発言をJSONで返してください。
`.trim();
}
