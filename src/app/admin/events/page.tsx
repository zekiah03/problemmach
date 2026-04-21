import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { isAdmin } from "@/lib/admin";

export default async function AdminEventsPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) notFound();

  const events = await prisma.moderationEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5 py-4">
      <div>
        <p className="text-xs text-muted">運営</p>
        <h1 className="text-2xl font-semibold">自動検知ログ</h1>
        <p className="mt-1 text-xs text-muted">
          チャットメッセージのパターン検知結果 (URL / 金銭 / 外部誘導 / 電話) の履歴。
          直接の対処アクションはありません (通報が来た場合のみ対処)。
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-md border border-gray-200 bg-white p-5 text-center text-sm text-muted">
          まだ検知イベントはありません
        </p>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li
              key={e.id}
              className="rounded-md border border-gray-200 bg-white p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
                  {e.eventType}
                </span>
                <span className="text-muted">
                  {e.createdAt.toLocaleString("ja-JP")}
                </span>
                {e.userId && (
                  <code className="ml-auto text-[10px] text-muted">
                    user: {e.userId}
                  </code>
                )}
              </div>
              <pre className="mt-2 overflow-auto rounded bg-gray-50 p-2 text-[11px] text-muted">
                {JSON.stringify(e.detail, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-4 text-xs text-muted">
        <Link href="/admin/reports" className="underline">
          ← 通報レビューに戻る
        </Link>
      </div>
    </div>
  );
}
