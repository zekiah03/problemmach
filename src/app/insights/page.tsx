import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { InsightCard } from "@/components/InsightCard";

const FOLLOW_UP_DAYS = [
  { days: 7, label: "1週間前" },
  { days: 30, label: "1ヶ月前" },
];

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="space-y-4 py-12 text-center">
        <p className="text-muted">
          いくつか悩みを書くと、ここに「気づきの種」が現れることがあります。
        </p>
        <Link
          href="/new"
          className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white"
        >
          悩みを書きはじめる
        </Link>
      </div>
    );
  }

  const insights = await prisma.potentialInsight.findMany({
    where: { userId: user.id, status: { in: ["PENDING", "SHOWN"] } },
    orderBy: { confidence: "desc" },
    take: 10,
  });

  // 長期で寄り添う対象の Post (古い順、共存系)
  const longTermPosts = await prisma.post.findMany({
    where: {
      userId: user.id,
      longTermFlag: true,
    },
    orderBy: { completedAt: "asc" },
    select: {
      id: true,
      initialText: true,
      completedAt: true,
    },
    take: 5,
  });

  const followUps: { post: (typeof longTermPosts)[number]; label: string }[] = [];
  for (const p of longTermPosts) {
    if (!p.completedAt) continue;
    const daysSince = Math.floor(
      (Date.now() - p.completedAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    const fu = FOLLOW_UP_DAYS.find((f) => Math.abs(daysSince - f.days) <= 2);
    if (fu) followUps.push({ post: p, label: fu.label });
  }

  // 既読をマーク
  if (insights.some((i) => i.status === "PENDING")) {
    await prisma.potentialInsight.updateMany({
      where: {
        userId: user.id,
        status: "PENDING",
      },
      data: { status: "SHOWN", shownAt: new Date() },
    });
  }

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold">気づきの種</h1>
        <p className="text-sm text-muted">
          あなたが書いた悩みから見えてきた、いくつかの「問いかけ」です。
          答えを出す必要はありません。少し立ち止まる手がかりに。
        </p>
      </div>

      {insights.length === 0 && followUps.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-muted">
          いまのところ、特定のパターンは見えていません。
          悩みを書き続けると、傾向が浮かび上がってくることがあります。
        </div>
      )}

      {insights.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            問いかけ
          </h2>
          {insights.map((i) => {
            const detail = i.detail as { question: string; occurrences: number; totalPosts: number };
            return (
              <InsightCard
                key={i.id}
                id={i.id}
                question={detail.question}
                occurrences={detail.occurrences}
                totalPosts={detail.totalPosts}
              />
            );
          })}
        </section>
      )}

      {followUps.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            あの悩み、今どう感じていますか？
          </h2>
          <ul className="space-y-2">
            {followUps.map(({ post, label }) => (
              <li key={post.id}>
                <Link
                  href={`/post/${post.id}/analysis`}
                  className="block rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
                >
                  <p className="text-xs text-muted">{label}に書いた悩み</p>
                  <p className="mt-1 line-clamp-2 text-sm">
                    {post.initialText.slice(0, 80)}
                    {post.initialText.length > 80 && "..."}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
