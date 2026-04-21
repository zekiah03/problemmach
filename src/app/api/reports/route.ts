import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const schema = z.object({
  targetType: z.enum(["POST", "MESSAGE", "USER", "MATCH"]),
  targetId: z.string().min(1).max(100),
  reason: z.enum([
    "SPAM",
    "HARASSMENT",
    "MONEY_REQUEST",
    "EXTERNAL_SOLICITATION",
    "SELF_HARM_CONCERN",
    "OTHER",
  ]),
  detail: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // 同一通報の重複防止 (同じ user/target で 24h 以内)
  const since = new Date();
  since.setHours(since.getHours() - 24);
  const existing = await prisma.report.findFirst({
    where: {
      reporterUserId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      createdAt: { gte: since },
    },
  });
  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await prisma.report.create({
    data: {
      reporterUserId: user.id,
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
      detail: parsed.data.detail,
    },
  });

  // メッセージ通報の場合、ChatRoom を REPORTED に
  if (parsed.data.targetType === "MESSAGE") {
    const msg = await prisma.chatMessage.findUnique({
      where: { id: parsed.data.targetId },
      select: { chatRoomId: true },
    });
    if (msg) {
      await prisma.chatRoom.update({
        where: { id: msg.chatRoomId },
        data: { status: "REPORTED" },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
