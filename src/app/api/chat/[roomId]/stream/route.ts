// SSE ストリーミング: 新しいメッセージが入ったら即座にクライアントへ配信
// 実装: サーバー側で DB を短い間隔でポーリングし、差分を SSE イベントで送信
// (クライアントポーリングを SSE に置き換えることで接続数・無駄クエリを削減)
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300; // 5分で再接続させる

const POLL_MS = 800;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) {
    return new Response("unauthorized", { status: 401 });
  }

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: { match: { include: { postA: true, postB: true } } },
  });
  if (!room) return new Response("not_found", { status: 404 });
  const isParticipant =
    room.match.postA.userId === user.id || room.match.postB.userId === user.id;
  if (!isParticipant) return new Response("forbidden", { status: 403 });

  const encoder = new TextEncoder();
  let closed = false;

  // 初回: 最新の createdAt を起点にする (古いメッセージは初期ロードでクライアントが取得済み)
  let lastCreatedAt = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
          );
        } catch {
          closed = true;
        }
      };

      // コネクション確立通知
      send("ready", { now: lastCreatedAt.toISOString() });

      // 接続維持 & 新着チェック
      const tick = async () => {
        if (closed) return;
        try {
          const messages = await prisma.chatMessage.findMany({
            where: {
              chatRoomId: roomId,
              isDeleted: false,
              createdAt: { gt: lastCreatedAt },
            },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              senderUserId: true,
              content: true,
              moderationFlag: true,
              createdAt: true,
            },
          });
          if (messages.length > 0) {
            for (const m of messages) {
              send("message", {
                ...m,
                createdAt: m.createdAt.toISOString(),
              });
              lastCreatedAt = m.createdAt;
            }
          } else {
            // ハートビート (コネクション断対策、プロキシ対応)
            controller.enqueue(encoder.encode(`: ping\n\n`));
          }

          // ルームの状態変化もチェック (閉じられた / 通報された)
          const current = await prisma.chatRoom.findUnique({
            where: { id: roomId },
            select: { status: true },
          });
          if (current && current.status !== "ACTIVE") {
            send("room_status", { status: current.status });
            closed = true;
            controller.close();
            return;
          }
        } catch (e) {
          console.error("SSE tick error", e);
        }
        if (!closed) setTimeout(tick, POLL_MS);
      };
      setTimeout(tick, POLL_MS);

      // クライアント切断時のクリーンアップ
      req.signal.addEventListener("abort", () => {
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
