type Category = "DECISION" | "CONTROL" | "IDENTITY" | "RISK";

const CATEGORY_LABEL: Record<Category, string> = {
  DECISION: "判断系 (選べない)",
  CONTROL: "コントロール系 (変えられない)",
  IDENTITY: "自分系 (分からない)",
  RISK: "リスク系 (損したくない)",
};

const SOLUTION_TYPE_LABEL: Record<string, string> = {
  info: "情報型",
  action: "行動型",
  dialog: "対話型",
  coexist: "共存型",
  acceptance: "受容型",
};

type Props = {
  structure: { ideal: string; reality: string; uncertainty: string };
  categoryPrimary: Category;
  categorySecondary: Category | null;
  confidence: number;
  solutionTypeScores: Record<string, number>;
  selfResolvableScore: number;
  longTermFlag: boolean;
  matchRecommend: boolean;
  matchReason: string | null;
};

export function AnalysisCard(p: Props) {
  const sortedTypes = Object.entries(p.solutionTypeScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <div className="space-y-5 rounded-lg border border-gray-200 bg-white p-5">
      <section className="space-y-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
          悩みの構造
        </h3>
        <div className="space-y-1.5 text-sm">
          <p>
            <span className="text-muted">こうなりたい:</span> {p.structure.ideal || "—"}
          </p>
          <p>
            <span className="text-muted">でも今は:</span> {p.structure.reality || "—"}
          </p>
          <p>
            <span className="text-muted">詰まっているのは:</span>{" "}
            {p.structure.uncertainty || "—"}
          </p>
        </div>
      </section>

      <section className="space-y-1">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
          分類
        </h3>
        <p className="text-sm">
          {CATEGORY_LABEL[p.categoryPrimary]}
          {p.categorySecondary && (
            <span className="text-muted">
              {" "}
              + {CATEGORY_LABEL[p.categorySecondary]}
            </span>
          )}
          <span className="ml-2 text-xs text-muted">確信度 {p.confidence}%</span>
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted">
          あなたの現在地
        </h3>
        <div className="space-y-1.5">
          {sortedTypes.map(([k, v]) => (
            <div key={k} className="flex items-center gap-3">
              <span className="w-16 text-xs text-muted">
                {SOLUTION_TYPE_LABEL[k] ?? k}
              </span>
              <div className="h-2 flex-1 rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${v}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs text-muted">{v}</span>
            </div>
          ))}
        </div>
        <p className="pt-2 text-xs text-muted">
          自己解決スコア: {p.selfResolvableScore}% (高いほど一人で整理しやすい悩み)
        </p>
      </section>

      {p.longTermFlag && (
        <section className="rounded-md bg-gray-50 p-3 text-sm">
          <p className="text-muted">
            この悩みは、すぐに答えが出るものではないかもしれません。
            それでも、一緒に整理できることがあります。
          </p>
        </section>
      )}

      {p.matchRecommend && p.matchReason && (
        <section className="rounded-md bg-accent/5 p-3 text-sm">
          <p className="text-xs font-medium text-accent">マッチ推奨</p>
          <p className="mt-1 text-ink">{p.matchReason}</p>
          <p className="mt-1 text-xs text-muted">
            (マッチング機能は Phase 2 で提供予定)
          </p>
        </section>
      )}
    </div>
  );
}
