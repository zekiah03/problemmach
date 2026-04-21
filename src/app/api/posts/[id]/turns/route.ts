import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";
import { generateAITurn } from "@/services/conversation";
import { checkRateLimit, LLM_LIMIT } from "@/lib/rate-limit";

const schema = z.object({
  selectedOption: z.string().optional(),
  text: z.string().max(2000).optional(),
});

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  if (!parsed.data.selectedOption && !parsed.data.text) {
    return NextResponse.json({ error: "empty_response" }, { status: 400 });
  }

  const user = await getOrCreateCurrentUser();

  const rl = checkRateLimit(`llm:${user.id}`, LLM_LIMIT);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      { status: 429, headers: { "Retry-After": Math.ceil(rl.retryAfterMs / 1000).toString() } },
    );
  }

  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (post.status !== "IN_CONVERSATION") {
    return NextResponse.json({ error: "post_not_in_conversation" }, { status: 400 });
  }

  const lastTurn = await prisma.conversationTurn.findFirst({
    where: { postId: id },
    orderBy: { turnNumber: "desc" },
  });
  const nextUserTurn = (lastTurn?.turnNumber ?? 0) + 1;
  const nextAITurn = nextUserTurn + 1;

  // ユーザー発言を保存
  const userContent = [parsed.data.selectedOption, parsed.data.text].filter(Boolean).join(" / ");
  await prisma.conversationTurn.create({
    data: {
      postId: id,
      turnNumber: nextUserTurn,
      role: "USER",
      content: userContent,
      selectedOption: parsed.data.selectedOption,
    },
  });

  // 次のAIターン生成
  const aiTurn = await generateAITurn({
    postId: id,
    userId: user.id,
    persona: user.persona,
    initialText: post.initialText,
    lastUserMessage: userContent,
  });

  await prisma.conversationTurn.create({
    data: {
      postId: id,
      turnNumber: nextAITurn,
      role: "AI",
      content: buildAIContent(aiTurn),
      questionOptions: aiTurn.options,
      filledSlot: aiTurn.target_slot,
    },
  });

  return NextResponse.json({ aiTurn });
}

function buildAIContent(t: {
  acknowledgment: string;
  cumulative_summary: string;
  question: string;
}): string {
  const parts = [t.acknowledgment];
  if (t.cumulative_summary) parts.push(t.cumulative_summary);
  parts.push(t.question);
  return parts.filter(Boolean).join("\n\n");
}
