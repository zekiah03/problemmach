import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { ChatView } from "@/components/ChatView";
import { ReportButton } from "@/components/ReportButton";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    include: {
      match: {
        include: {
          postA: { select: { userId: true } },
          postB: { select: { userId: true } },
        },
      },
      messages: {
        where: { isDeleted: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          senderUserId: true,
          content: true,
          moderationFlag: true,
          createdAt: true,
        },
      },
    },
  });
  if (!room) notFound();

  const isParticipant =
    room.match.postA.userId === user.id || room.match.postB.userId === user.id;
  if (!isParticipant) notFound();

  return (
    <div className="space-y-5 py-4">
      <div>
        <Link
          href={`/matches/${room.match.id}`}
          className="text-xs text-muted hover:text-ink"
        >
          ← マッチに戻る
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">対話</h1>
      </div>

      <section className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
        <p>
          相手は専門家ではありません。解決を約束するものではないことを互いに認識して進めてください。
          危険を感じたら、すぐに通報・このチャットから離れてください。
        </p>
        <div className="mt-2">
          <ReportButton targetType="MATCH" targetId={room.match.id} label="マッチ全体を通報" />
        </div>
      </section>

      <ChatView
        roomId={room.id}
        myUserId={user.id}
        initialMessages={room.messages.map((m) => ({
          ...m,
          createdAt: m.createdAt.toISOString(),
        }))}
        status={room.status}
      />
    </div>
  );
}
