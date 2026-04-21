import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { MatchActions } from "@/components/MatchActions";

const TYPE_LABEL: Record<string, string> = {
  MIRROR: "同じ悩みを持つ人 (ミラー)",
  EXPERIENCED: "似た悩みを乗り越えた人 (経験者)",
};

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) notFound();

  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      postA: {
        include: {
          user: { select: { displayName: true, matchCondition: { select: { locationRegion: true } } } },
          analysis: { select: { structure: true, categoryPrimary: true, categorySecondary: true, longTermFlag: true } },
        },
      },
      postB: {
        include: {
          user: { select: { displayName: true, matchCondition: { select: { locationRegion: true } } } },
          analysis: { select: { structure: true, categoryPrimary: true, categorySecondary: true, longTermFlag: true } },
        },
      },
    },
  });
  if (!match) notFound();

  const isA = match.postA.userId === user.id;
  const isB = match.postB.userId === user.id;
  if (!isA && !isB) notFound();

  const partnerPost = isA ? match.postB : match.postA;
  const partnerUser = partnerPost.user;
  const partnerStructure = partnerPost.analysis?.structure as
    | { ideal: string; reality: string; uncertainty: string }
    | null;

  const alreadyAccepted = isA ? match.acceptedByA : match.acceptedByB;

  return (
    <div className="space-y-6 py-4">
      <div>
        <Link href="/matches" className="text-xs text-muted hover:text-ink">
          ← マッチ一覧
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">マッチ候補</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">
            {TYPE_LABEL[match.matchType]}
          </span>
          <span>適合度 {match.compatibilityScore}</span>
          <span>現実性 {match.realnessScore}</span>
        </div>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          相手のプロフィール (匿名)
        </p>
        <p className="mt-2 text-lg font-medium">
          {partnerUser.displayName ?? "匿名"}
        </p>
        {partnerUser.matchCondition?.locationRegion && (
          <p className="mt-1 text-xs text-muted">
            {partnerUser.matchCondition.locationRegion}
          </p>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">
          相手の悩み
        </p>
        <p className="whitespace-pre-wrap text-sm">{partnerPost.initialText}</p>
        {partnerStructure && (
          <div className="space-y-1 border-t border-gray-100 pt-3 text-sm">
            <p>
              <span className="text-muted">こうなりたい:</span>{" "}
              {partnerStructure.ideal || "—"}
            </p>
            <p>
              <span className="text-muted">でも今は:</span>{" "}
              {partnerStructure.reality || "—"}
            </p>
            <p>
              <span className="text-muted">詰まっているのは:</span>{" "}
              {partnerStructure.uncertainty || "—"}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        <p className="font-medium">この対話のルール</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>解決を約束する関係ではありません</li>
          <li>金銭の要求や外部 SNS への誘導が来たら、すぐに通報してください (Phase 3)</li>
          <li>相手に過度な期待をしないこと、自分の身を最優先に</li>
        </ul>
      </section>

      <MatchActions
        matchId={match.id}
        alreadyAccepted={alreadyAccepted}
        status={match.status}
      />
    </div>
  );
}
