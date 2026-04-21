import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { flagChatMessage } from "@/lib/chat-moderation";

const sendSchema = z.object({
  content: z.string().min(1).max(2000),
});

async function authorize(roomId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "unauthorized" as const };
  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { match: { include: { postA: true, postB: true } } },
  });
  if (!room) return { error: "not_found" as const };
  const isParticipant =
    room.match.postA.userId === user.id || room.match.postB.userId === user.id;
  if (!isParticipant) return { error: "forbidden" as const };
  if (room.status !== "ACTIVE") return { error: "room_not_active" as const };
  return { user, room };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  const result = await authorize(roomId);
  if ("error" in result) {
    const code = result.error === "unauthorized" ? 401 : result.error === "not_found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status: code });
  }
  const messages = await prisma.chatMessage.findMany({
    where: { chatRoomId: roomId, isDeleted: false },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderUserId: true,
      content: true,
      moderationFlag: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  const body = await req.json().catch(() => null);
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const result = await authorize(roomId);
  if ("error" in result) {
    const code = result.error === "unauthorized" ? 401 : result.error === "not_found" ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status: code });
  }
  const { user } = result;

  const flag = flagChatMessage(parsed.data.content);

  // 自動検知ログ (運営側でレビュー可能)
  if (flag) {
    await prisma.moderationEvent.create({
      data: {
        userId: user.id,
        eventType: `CHAT_${flag}`,
        detail: { roomId, contentLength: parsed.data.content.length },
      },
    });
  }

  const message = await prisma.chatMessage.create({
    data: {
      chatRoomId: roomId,
      senderUserId: user.id,
      content: parsed.data.content,
      moderationFlag: flag,
    },
    select: {
      id: true,
      senderUserId: true,
      content: true,
      moderationFlag: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ message });
}
