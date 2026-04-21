import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getGuestUserReadOnly } from "@/lib/guest";
import { ConversationView } from "@/components/ConversationView";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getGuestUserReadOnly();
  if (!user) notFound();
  const post = await prisma.post.findUnique({
    where: { id },
    include: { turns: { orderBy: { turnNumber: "asc" } } },
  });
  if (!post || post.userId !== user.id) notFound();
  if (post.status === "ANALYZED") redirect(`/post/${id}/analysis`);

  const displayTurns = post.turns
    .filter((t) => t.turnNumber > 0) // 初回投稿本文はチャット欄に出さない
    .map((t) => ({
      id: t.id,
      turnNumber: t.turnNumber,
      role: t.role,
      content: t.content,
      questionOptions: (t.questionOptions as { value: string; label: string }[] | null) ?? null,
      filledSlot: t.filledSlot,
    }));

  return (
    <div className="space-y-5 py-4">
      <section className="rounded-md border border-gray-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          あなたが書いた悩み
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm">{post.initialText}</p>
      </section>
      <ConversationView postId={post.id} initialTurns={displayTurns} />
    </div>
  );
}
