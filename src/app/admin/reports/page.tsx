import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { isAdmin } from "@/lib/admin";
import { ReportRow } from "@/components/ReportRow";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "PENDING" } = await searchParams;
  const user = await getCurrentUser();
  if (!isAdmin(user)) notFound();

  const reports = await prisma.report.findMany({
    where: {
      status: status as "PENDING" | "REVIEWED" | "ACTIONED" | "DISMISSED",
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // targetPreview を並列取得
  const messageIds = reports.filter((r) => r.targetType === "MESSAGE").map((r) => r.targetId);
  const postIds = reports.filter((r) => r.targetType === "POST").map((r) => r.targetId);

  const [messages, posts] = await Promise.all([
    messageIds.length
      ? prisma.chatMessage.findMany({
          where: { id: { in: messageIds } },
          select: { id: true, content: true },
        })
      : Promise.resolve([]),
    postIds.length
      ? prisma.post.findMany({
          where: { id: { in: postIds } },
          select: { id: true, initialText: true },
        })
      : Promise.resolve([]),
  ]);

  const messageMap = new Map(messages.map((m) => [m.id, m.content]));
  const postMap = new Map(posts.map((p) => [p.id, p.initialText]));

  const TABS = [
    { value: "PENDING", label: "未対応" },
    { value: "REVIEWED", label: "確認済み" },
    { value: "ACTIONED", label: "対処済み" },
    { value: "DISMISSED", label: "棄却" },
  ];

  return (
    <div className="space-y-5 py-4">
      <div>
        <p className="text-xs text-muted">運営</p>
        <h1 className="text-2xl font-semibold">通報レビュー</h1>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/reports?status=${t.value}`}
            className={`rounded-full px-3 py-1 text-xs ${
              status === t.value
                ? "bg-accent text-white"
                : "border border-gray-300 bg-white text-ink hover:bg-gray-50"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <p className="rounded-md border border-gray-200 bg-white p-5 text-center text-sm text-muted">
          該当の通報はありません
        </p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => {
            const preview =
              r.targetType === "MESSAGE"
                ? messageMap.get(r.targetId) ?? null
                : r.targetType === "POST"
                  ? postMap.get(r.targetId) ?? null
                  : null;
            return (
              <ReportRow
                key={r.id}
                id={r.id}
                reason={r.reason}
                targetType={r.targetType}
                targetId={r.targetId}
                detail={r.detail}
                createdAt={r.createdAt.toISOString()}
                targetPreview={preview ? preview.slice(0, 400) : null}
              />
            );
          })}
        </ul>
      )}

      <div className="pt-4 text-xs text-muted">
        <Link href="/admin/events" className="underline">
          自動検知ログを見る →
        </Link>
      </div>
    </div>
  );
}
