import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getGuestUserReadOnly } from "@/lib/guest";
import { AnalysisCard } from "@/components/AnalysisCard";
import { SolutionTemplateCard } from "@/components/SolutionTemplateCard";
import { EmotionScoreInput } from "@/components/EmotionScoreInput";

export default async function AnalysisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getGuestUserReadOnly();
  if (!user) notFound();

  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      analysis: true,
      presented: { include: { template: true }, orderBy: { order: "asc" } },
    },
  });
  if (!post || post.userId !== user.id) notFound();
  if (!post.analysis) {
    return (
      <div className="py-10 text-center text-sm text-muted">
        分析がまだ完了していません。
        <Link href={`/post/${id}`} className="ml-2 text-accent underline">
          対話に戻る
        </Link>
      </div>
    );
  }

  const a = post.analysis;
  const structure = a.structure as { ideal: string; reality: string; uncertainty: string };
  const solutionTypeScores = a.solutionTypeScores as Record<string, number>;

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">分析結果</h1>
        <p className="text-sm text-muted">
          時間をかけて書いてくれてありがとうございます。以下はあくまで整理のたたき台です。
        </p>
      </div>

      <AnalysisCard
        structure={structure}
        categoryPrimary={a.categoryPrimary}
        categorySecondary={a.categorySecondary}
        confidence={a.confidence}
        solutionTypeScores={solutionTypeScores}
        selfResolvableScore={a.selfResolvableScore}
        longTermFlag={a.longTermFlag}
        matchRecommend={a.matchRecommend}
        matchReason={a.matchReason}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
          今すぐ試せる 3 つの型
        </h2>
        <div className="space-y-2">
          {post.presented.map((p, idx) => (
            <SolutionTemplateCard
              key={p.id}
              type={p.template.type}
              sub={p.template.sub}
              title={p.template.title}
              question={p.template.question}
              whyItFits={p.template.whyItFits}
              defaultOpen={idx === 0}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
          ここまでの感想
        </h2>
        <EmotionScoreInput postId={post.id} />
      </section>

      <div className="flex flex-wrap gap-3 pt-2">
        <Link
          href="/new"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          別の悩みを書く
        </Link>
        <Link
          href="/"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          ホームへ
        </Link>
      </div>
    </div>
  );
}
