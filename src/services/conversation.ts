// 対話ターン生成サービス
import { prisma } from "@/lib/db";
import { getAnthropicForUser, MODEL_FAST } from "@/lib/anthropic";
import {
  buildConversationSystem,
  buildTurnContextMessage,
  type SlotState,
} from "@/lib/prompts/conversation";
import { parseAITurn } from "@/lib/parsers";
import type { AITurnResponse } from "@/lib/types";
import { Persona } from "@prisma/client";

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
