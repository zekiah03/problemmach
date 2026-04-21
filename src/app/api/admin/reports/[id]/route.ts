// 通報のステータス更新 (admin 専用)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { isAdmin } from "@/lib/admin";

const schema = z.object({
  action: z.enum(["reviewed", "actioned", "dismiss"]),
  note: z.string().max(500).optional(),
});

const STATUS_MAP = {
  reviewed: "REVIEWED",
  actioned: "ACTIONED",
  dismiss: "DISMISSED",
} as const;

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
  if (!isAdmin(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.report.update({
    where: { id },
    data: {
      status: STATUS_MAP[parsed.data.action],
      reviewedBy: user!.id,
      reviewedAt: new Date(),
    },
  });

  // ACTIONED の場合、該当メッセージを論理削除 / チャットルームを CLOSED に
  if (parsed.data.action === "actioned") {
    if (report.targetType === "MESSAGE") {
      await prisma.chatMessage.updateMany({
        where: { id: report.targetId },
        data: { isDeleted: true },
      });
      const msg = await prisma.chatMessage.findUnique({
        where: { id: report.targetId },
        select: { chatRoomId: true },
      });
      if (msg) {
        await prisma.chatRoom.update({
          where: { id: msg.chatRoomId },
          data: { status: "CLOSED", closedAt: new Date() },
        });
      }
    } else if (report.targetType === "MATCH") {
      const chat = await prisma.chatRoom.findUnique({
        where: { matchId: report.targetId },
      });
      if (chat) {
        await prisma.chatRoom.update({
          where: { id: chat.id },
          data: { status: "CLOSED", closedAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
