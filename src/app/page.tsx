import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="space-y-10 py-6">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          悩みを、対話で整理する。
        </h1>
        <p className="max-w-xl text-muted">
          あなたの悩みを、AI が対話しながら時系列で整理します。
          情報不足で詰まっているのか、気持ちの整理が必要なのか、
          それとも解決しない悩みと付き合い方を探す時期なのか。
          自分で見つけられる答えを、ここで一緒に見つけます。
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/new"
            className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90"
          >
            悩みを書きはじめる
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium hover:bg-gray-50"
          >
            口調などを設定する
          </Link>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <FeatureCard
          title="時系列で整理"
          body="起点 → 経過 → 現在 → 理想 → 制約。対話を通して、悩みの全体像を時間軸で組み立てます。"
        />
        <FeatureCard
          title="5 つの解決の型"
          body="情報型 / 行動型 / 対話型 / 共存型 / 受容型。あなたの悩みに合う型を 3 つ提示します。"
        />
        <FeatureCard
          title="解決しない悩みも"
          body="すぐに解けないものとの「付き合い方」を一緒に探します。頑張れば解決、とは言いません。"
        />
      </section>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-5 text-sm text-muted">
        <h2 className="font-medium text-ink">お願い</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>18 歳以上の方がご利用ください</li>
          <li>投稿時は、氏名・住所・電話番号など個人を特定できる情報は書かないでください</li>
          <li>
            本サービスは医療・法律行為を提供しません。緊急時は
            <a
              href="https://www.since2011.net/yorisoi/"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-1 underline"
            >
              専門窓口
            </a>
            へご相談ください
          </li>
        </ul>
      </section>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm text-muted">{body}</p>
    </div>
  );
}
