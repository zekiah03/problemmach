import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";
import { runAnalysis } from "@/services/analysis";
import { checkRateLimit, LLM_LIMIT } from "@/lib/rate-limit";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
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

  const { analysis, picked } = await runAnalysis({
    postId: id,
    userId: user.id,
    persona: user.persona,
  });

  return NextResponse.json({
    analysis,
    templates: picked.map((p) => ({
      id: p.id,
      type: p.type,
      sub: p.sub,
      title: p.title,
      question: p.question,
      whyItFits: p.whyItFits,
    })),
  });
}
