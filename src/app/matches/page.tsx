import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const TYPE_LABEL: Record<string, string> = {
  MIRROR: "同じ悩みを持つ人",
  EXPERIENCED: "似た悩みを乗り越えた人",
};

const STATUS_LABEL: Record<string, string> = {
  SUGGESTED: "提案中",
  ACCEPTED_A: "あなたが承認済み",
  ACCEPTED_B: "相手が承認済み",
  MUTUAL: "相互承認 (チャット可)",
  DECLINED: "辞退",
  EXPIRED: "期限切れ",
};

export default async function MatchesPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Empty
        message="ログインまたは投稿を作成すると、相補マッチの候補が表示されます。"
      />
    );
  }

  // 自分の投稿に紐づくマッチを集める
  const matches = await prisma.match.findMany({
    where: {
      OR: [
        { postA: { userId: user.id } },
        { postB: { userId: user.id } },
      ],
      status: { notIn: ["EXPIRED", "DECLINED"] },
    },
    include: {
      postA: { select: { id: true, userId: true, initialText: true, categoryPrimary: true } },
      postB: { select: { id: true, userId: true, initialText: true, categoryPrimary: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  if (matches.length === 0) {
    return (
      <Empty message="まだマッチ候補はありません。マッチが提案されるには、対話型と判定された悩みを書いてみてください。" />
    );
  }

  return (
    <div className="space-y-5 py-4">
      <div>
        <h1 className="text-2xl font-semibold">マッチ候補</h1>
        <p className="text-sm text-muted">
          似た悩みを抱える、または乗り越えた人の候補です。
        </p>
      </div>

      <ul className="space-y-2">
        {matches.map((m) => {
          const myPost = m.postA.userId === user.id ? m.postA : m.postB;
          const partnerPost = m.postA.userId === user.id ? m.postB : m.postA;
          return (
            <li key={m.id}>
              <Link
                href={`/matches/${m.id}`}
                className="block rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
              >
                <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">
                    {TYPE_LABEL[m.matchType]}
                  </span>
                  <span>適合度 {m.compatibilityScore} / 現実性 {m.realnessScore}</span>
                  <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5">
                    {STATUS_LABEL[m.status]}
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted">
                  あなたの悩み:{" "}
                  {myPost.initialText.slice(0, 60)}
                  {myPost.initialText.length > 60 && "..."}
                </p>
                <p className="mt-1 line-clamp-2 text-sm">
                  相手の悩み:{" "}
                  {partnerPost.initialText.slice(0, 60)}
                  {partnerPost.initialText.length > 60 && "..."}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Empty({ message }: { message: string }) {
  return (
    <div className="space-y-4 py-12 text-center">
      <p className="text-muted">{message}</p>
      <Link
        href="/new"
        className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white"
      >
        悩みを書きはじめる
      </Link>
    </div>
  );
}
