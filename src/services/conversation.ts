// 対話ターン生成サービス
import { prisma } from "@/lib/db";
import { getAnthropicForUser, MODEL_FAST } from "@/lib/anthropic";
import {
  buildConversationSystem,
  buildTurnContextMessage,
  type SlotState,
} from "@/lib/prompts/conversation";
import type { AITurnResponse } from "@/lib/types";
import { Persona, TimeSlot } from "@prisma/client";

const MAX_TURNS = 5;

export async function computeSlotState(postId: string): Promise<SlotState> {
  const turns = await prisma.conversationTurn.findMany({
    where: { postId, filledSlot: { not: null } },
    select: { filledSlot: true },
  });

  const filled = new Set(turns.map((t) => t.filledSlot));
  return {
    ORIGIN: filled.has("ORIGIN"),
    COURSE: filled.has("COURSE"),
    PRESENT: filled.has("PRESENT"),
    IDEAL: filled.has("IDEAL"),
    CONSTRAINT: filled.has("CONSTRAINT"),
  };
}

export async function generateAITurn(params: {
  postId: string;
  userId: string;
  persona: Persona;
  initialText: string;
  lastUserMessage?: string;
}): Promise<AITurnResponse> {
  const slotState = await computeSlotState(params.postId);
  const currentTurnCount = await prisma.conversationTurn.count({
    where: { postId: params.postId },
  });
  const nextTurnNumber = Math.floor(currentTurnCount / 2) + 1;

  const systemPrompt = buildConversationSystem(params.persona);
  const contextMessage = buildTurnContextMessage(
    params.initialText,
    slotState,
    nextTurnNumber,
    params.lastUserMessage,
  );

  const { client } = await getAnthropicForUser(params.userId);
  const res = await client.messages.create({
    model: MODEL_FAST,
    max_tokens: 800,
    system: systemPrompt,
    messages: [{ role: "user", content: contextMessage }],
  });

  const block = res.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";

  return parseAITurn(raw, nextTurnNumber, slotState);
}

function parseAITurn(raw: string, turnNumber: number, slotState: SlotState): AITurnResponse {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return fallbackTurn(slotState, turnNumber);
  }
  try {
    const j = JSON.parse(jsonMatch[0]);
    const targetSlot = normalizeSlot(j.target_slot, slotState);
    return {
      acknowledgment: String(j.acknowledgment ?? ""),
      cumulative_summary: String(j.cumulative_summary ?? ""),
      question: String(j.question ?? ""),
      target_slot: targetSlot,
      options: Array.isArray(j.options)
        ? j.options
            .filter((o: unknown): o is { value: string; label: string } =>
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

function normalizeSlot(raw: unknown, slotState: SlotState): TimeSlot {
  const v = String(raw ?? "").toUpperCase();
  const valid: TimeSlot[] = ["ORIGIN", "COURSE", "PRESENT", "IDEAL", "CONSTRAINT"];
  if ((valid as string[]).includes(v)) return v as TimeSlot;

  // フォールバック: 未埋めの最初のスロット
  const order: TimeSlot[] = ["ORIGIN", "COURSE", "PRESENT", "IDEAL", "CONSTRAINT"];
  for (const s of order) {
    if (!slotState[s]) return s;
  }
  return "PRESENT";
}

function enoughSlotsFilled(s: SlotState): boolean {
  // ORIGIN + PRESENT + IDEAL が埋まっていたら分析可
  return s.ORIGIN && s.PRESENT && s.IDEAL;
}

function fallbackTurn(slotState: SlotState, turnNumber: number): AITurnResponse {
  const target = normalizeSlot(null, slotState);
  return {
    acknowledgment: "そうなんですね。もう少し聞かせてください。",
    cumulative_summary: "",
    question: "今のお話、もう少し教えてもらえますか？",
    target_slot: target,
    options: [],
    ready_to_analyze: turnNumber >= MAX_TURNS || enoughSlotsFilled(slotState),
  };
}
