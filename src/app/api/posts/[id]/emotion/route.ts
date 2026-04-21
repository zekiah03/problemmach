import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";

const schema = z.object({
  text: z.string().min(1).max(1000),
  context: z.enum(["POST_ANALYSIS", "FOLLOW_UP_1W", "FOLLOW_UP_1M"]).default("POST_ANALYSIS"),
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

  const user = await getOrCreateCurrentUser();
  const post = await prisma.post.findUnique({ where: { id } });
  if (!post || post.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const score = await prisma.emotionScore.create({
    data: {
      postId: id,
      text: parsed.data.text,
      context: parsed.data.context,
    },
  });

  return NextResponse.json({ id: score.id });
}
