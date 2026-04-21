import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

const CATEGORY_LABEL: Record<string, string> = {
  DECISION: "判断",
  CONTROL: "コントロール",
  IDENTITY: "自分",
  RISK: "リスク",
};

const SOLUTION_LABEL: Record<string, string> = {
  info: "情報",
  action: "行動",
  dialog: "対話",
  coexist: "共存",
  acceptance: "受容",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Empty />
    );
  }

  const [posts, analyses, emotions] = await Promise.all([
    prisma.post.findMany({
      where: { userId: user.id },
      select: { id: true, categoryPrimary: true, longTermFlag: true, createdAt: true },
    }),
    prisma.analysis.findMany({
      where: { post: { userId: user.id } },
      select: { solutionTypeScores: true, selfResolvableScore: true },
    }),
    prisma.emotionScore.findMany({
      where: { post: { userId: user.id } },
      orderBy: { recordedAt: "desc" },
      take: 10,
      select: { text: true, recordedAt: true, postId: true },
    }),
  ]);

  if (posts.length === 0) {
    return <Empty />;
  }

  const categoryCount = countBy(
    posts.map((p) => p.categoryPrimary as string | null).filter((c): c is string => Boolean(c)),
  );

  const solutionAvg = averageScores(
    analyses.map((a) => a.solutionTypeScores as Record<string, number>),
  );

  const selfResolvableAvg =
    analyses.length === 0
      ? null
      : Math.round(
          analyses.reduce((s, a) => s + a.selfResolvableScore, 0) / analyses.length,
        );

  return (
    <div className="space-y-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold">あなたのダッシュボード</h1>
        <p className="text-sm text-muted">
          {posts.length} 件の悩みから見えてきた傾向。あなた自身が一番の解釈者です。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card label="悩みの数" value={`${posts.length}`} />
        <Card
          label="自己解決スコア (平均)"
          value={selfResolvableAvg !== null ? `${selfResolvableAvg}%` : "—"}
          hint="高いほど一人で整理しやすい傾向"
        />
        <Card
          label="長期で寄り添う悩み"
          value={`${posts.filter((p) => p.longTermFlag).length}`}
          hint="共存型として扱う悩みの数"
        />
      </div>

      {Object.keys(categoryCount).length > 0 && (
        <Section title="4類型の比率">
          <BarChart data={categoryCount} labelMap={CATEGORY_LABEL} />
        </Section>
      )}

      {Object.keys(solutionAvg).length > 0 && (
        <Section title="解決の型 (平均スコア)">
          <BarChart data={solutionAvg} labelMap={SOLUTION_LABEL} max={100} />
        </Section>
      )}

      {emotions.length > 0 && (
        <Section title="最近の感情ログ">
          <ul className="space-y-2 text-sm">
            {emotions.map((e, idx) => (
              <li
                key={idx}
                className="rounded-md border border-gray-200 bg-white p-3"
              >
                <p className="text-xs text-muted">
                  {e.recordedAt.toLocaleString("ja-JP")}
                </p>
                <p className="mt-1">{e.text}</p>
                <Link
                  href={`/post/${e.postId}/analysis`}
                  className="mt-1 inline-block text-xs text-accent underline"
                >
                  この悩みを見る
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
        {title}
      </h2>
      {children}
    </section>
  );
}

function BarChart({
  data,
  labelMap,
  max,
}: {
  data: Record<string, number>;
  labelMap: Record<string, string>;
  max?: number;
}) {
  const m = max ?? Math.max(...Object.values(data), 1);
  return (
    <div className="space-y-1.5">
      {Object.entries(data)
        .sort((a, b) => b[1] - a[1])
        .map(([k, v]) => (
          <div key={k} className="flex items-center gap-3">
            <span className="w-20 text-xs text-muted">{labelMap[k] ?? k}</span>
            <div className="h-3 flex-1 rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-accent"
                style={{ width: `${(v / m) * 100}%` }}
              />
            </div>
            <span className="w-10 text-right text-xs text-muted">{v}</span>
          </div>
        ))}
    </div>
  );
}

function Empty() {
  return (
    <div className="space-y-4 py-12 text-center">
      <p className="text-muted">
        まだダッシュボードに表示できるデータがありません。
      </p>
      <p className="text-xs text-muted">
        悩みを 1 つ書くと、ここに傾向が見えてきます。
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

function countBy(arr: string[]): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, k) => {
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function averageScores(arr: Record<string, number>[]): Record<string, number> {
  if (arr.length === 0) return {};
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const obj of arr) {
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v !== "number") continue;
      sums[k] = (sums[k] ?? 0) + v;
      counts[k] = (counts[k] ?? 0) + 1;
    }
  }
  const out: Record<string, number> = {};
  for (const k of Object.keys(sums)) {
    out[k] = Math.round(sums[k] / counts[k]);
  }
  return out;
}
