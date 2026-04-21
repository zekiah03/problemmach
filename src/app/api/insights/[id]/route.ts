// 気づきの応答 (見た / 受け入れた / 却下した)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const schema = z.object({
  action: z.enum(["seen", "accept", "dismiss"]),
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
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const insight = await prisma.potentialInsight.findUnique({ where: { id } });
  if (!insight || insight.userId !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const statusMap = {
    seen: "SHOWN",
    accept: "ACCEPTED",
    dismiss: "DISMISSED",
  } as const;

  await prisma.potentialInsight.update({
    where: { id },
    data: {
      status: statusMap[parsed.data.action],
      shownAt: insight.shownAt ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
