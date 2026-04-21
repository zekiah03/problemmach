import { getAnthropicForUser, MODEL_FAST } from "./anthropic";
import { RISK_JUDGE_SYSTEM } from "./prompts/risk";
import { parseRiskResponse, type RiskParseResult } from "./parsers";

export type RiskResult = RiskParseResult;

const MAX_TEXT_LENGTH = 4000;

// 2段階分析の1段目: リスク判定
export async function judgeRisk(userId: string, text: string): Promise<RiskResult> {
  if (!text || text.trim().length < 1) {
    return { flag: "NONE", piiDetected: false, reasoning: "empty" };
  }

  const truncated = text.slice(0, MAX_TEXT_LENGTH);
  const { client } = await getAnthropicForUser(userId);

  const res = await client.messages.create({
    model: MODEL_FAST,
    max_tokens: 300,
    system: RISK_JUDGE_SYSTEM,
    messages: [{ role: "user", content: truncated }],
  });

  const block = res.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";

  return parseRiskResponse(raw);
}

// 自傷検知時のユーザー向け応答 (日本の相談窓口)
export const SELF_HARM_RESPONSE = {
  empathy:
    "つらい気持ちを書いてくれて、ありがとうございます。今とても苦しい状態かもしれません。",
  message:
    "この悩みは、一人で抱えるにはとても重いものです。今すぐ話せる専門の窓口があります。",
  resources: [
    {
      name: "よりそいホットライン",
      description: "24時間対応。様々な悩みに寄り添います",
      phone: "0120-279-338",
    },
    {
      name: "いのちの電話",
      description: "死にたいほどつらい時の電話相談",
      phone: "0120-783-556",
    },
    {
      name: "#いのちSOS",
      description: "自殺防止相談",
      phone: "0120-061-338",
    },
    {
      name: "いのち支える相談窓口",
      description: "オンラインでのチャット相談も可能",
      url: "https://www.since2011.net/yorisoi/",
    },
  ],
};
