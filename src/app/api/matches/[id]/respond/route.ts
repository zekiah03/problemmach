// マッチへの応答 (accept / decline)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const schema = z.object({
  action: z.enum(["accept", "decline"]),
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

  const match = await prisma.match.findUnique({
    where: { id },
    include: { postA: true, postB: true },
  });
  if (!match) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // どちら側のユーザーか判定
  const isA = match.postA.userId === user.id;
  const isB = match.postB.userId === user.id;
  if (!isA && !isB) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (parsed.data.action === "decline") {
    await prisma.match.update({
      where: { id },
      data: { status: "DECLINED" },
    });
    return NextResponse.json({ status: "DECLINED" });
  }

  // accept
  const updated = await prisma.match.update({
    where: { id },
    data: isA ? { acceptedByA: true } : { acceptedByB: true },
  });

  // 両方 accept なら MUTUAL に昇格
  if (updated.acceptedByA && updated.acceptedByB) {
    await prisma.match.update({
      where: { id },
      data: { status: "MUTUAL" },
    });
    // チャットルーム作成 (Phase 3 で UI 提供)
    await prisma.chatRoom.upsert({
      where: { matchId: id },
      create: { matchId: id },
      update: {},
    });
    return NextResponse.json({ status: "MUTUAL" });
  }

  return NextResponse.json({
    status: isA ? "ACCEPTED_A" : "ACCEPTED_B",
  });
}
