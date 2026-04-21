import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const STATUS_LABEL: Record<string, string> = {
  IN_CONVERSATION: "対話中",
  ANALYZED: "分析済み",
  CLOSED: "終了",
  BLOCKED: "対象外",
};

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <EmptyState
        message="まだ投稿がありません。"
        ctaHref="/new"
        ctaLabel="悩みを書きはじめる"
      />
    );
  }

  const posts = await prisma.post.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      initialText: true,
      status: true,
      categoryPrimary: true,
      coexistSubtype: true,
      longTermFlag: true,
      createdAt: true,
      completedAt: true,
    },
  });

  if (posts.length === 0) {
    return (
      <EmptyState
        message="まだ投稿がありません。"
        ctaHref="/new"
        ctaLabel="悩みを書きはじめる"
      />
    );
  }

  return (
    <div className="space-y-5 py-4">
      <div>
        <h1 className="text-2xl font-semibold">あなたの履歴</h1>
        <p className="text-sm text-muted">{posts.length} 件の悩み</p>
      </div>
      <ul className="space-y-2">
        {posts.map((p) => (
          <li key={p.id}>
            <Link
              href={
                p.status === "ANALYZED"
                  ? `/post/${p.id}/analysis`
                  : `/post/${p.id}`
              }
              className="block rounded-lg border border-gray-200 bg-white p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 flex-1 text-sm">
                  {p.initialText.slice(0, 100)}
                  {p.initialText.length > 100 && "..."}
                </p>
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-muted">
                  {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                <span>{p.createdAt.toLocaleDateString("ja-JP")}</span>
                {p.categoryPrimary && (
                  <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">
                    {p.categoryPrimary}
                  </span>
                )}
                {p.longTermFlag && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">
                    長期
                  </span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function EmptyState({
  message,
  ctaHref,
  ctaLabel,
}: {
  message: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="space-y-4 py-12 text-center">
      <p className="text-muted">{message}</p>
      <Link
        href={ctaHref}
        className="inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white"
      >
        {ctaLabel}
      </Link>
    </div>
  );
}
