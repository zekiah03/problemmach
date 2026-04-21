"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiskBanner } from "./RiskBanner";

type SelfHarmResp = {
  empathy: string;
  message: string;
  resources: { name: string; description: string; phone?: string; url?: string }[];
};

type ErrorState = { message: string; cta?: { href: string; label: string } } | null;

export function PostForm() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ErrorState>(null);
  const [selfHarm, setSelfHarm] = useState<SelfHarmResp | null>(null);

  const charCount = text.length;
  const valid =
    charCount >= 30 && charCount <= 4000 && ageConfirmed && termsAccepted && !loading;

  const submit = async () => {
    if (!valid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text, ageConfirmed: true, termsAccepted: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "guest_limit") {
          setError({
            message: `ゲスト投稿の上限 (${data.limit} 件) に達しています。続けるにはメールでログインしてください。これまでの投稿は引き継がれます。`,
            cta: { href: "/signin", label: "ログインして続ける" },
          });
        } else if (data.riskFlag === "PII_DETECTED") {
          setError({ message: data.message });
        } else if (data.riskFlag === "HARM_OTHERS" || data.riskFlag === "ILLEGAL") {
          setError({ message: data.message });
        } else {
          setError({
            message: "送信に失敗しました。時間をおいて再度お試しください。",
          });
        }
        return;
      }

      if (data.riskFlag === "SELF_HARM" && data.selfHarmResponse) {
        setSelfHarm(data.selfHarmResponse);
        return;
      }

      if (data.postId) {
        router.push(`/post/${data.postId}`);
      }
    } catch {
      setError({
        message: "通信エラーが発生しました。時間をおいて再度お試しください。",
      });
    } finally {
      setLoading(false);
    }
  };

  if (selfHarm) {
    return <RiskBanner {...selfHarm} />;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="worry" className="text-sm font-medium">
          いま抱えている悩みを書いてください
        </label>
        <p className="text-xs text-muted">
          書いていくうちに整理されることもあります。30 〜 4000 文字。
          氏名や電話番号など、個人を特定できる情報は書かないでください。
        </p>
        <textarea
          id="worry"
          rows={10}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={loading}
          className="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          placeholder="例: ここ3ヶ月、転職するか迷っています。..."
        />
        <p className="text-right text-xs text-muted">
          {charCount} / 30 〜 4000
        </p>
      </div>

      <div className="space-y-2 rounded-md border border-gray-200 bg-white p-4 text-sm">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={ageConfirmed}
            onChange={(e) => setAgeConfirmed(e.target.checked)}
            disabled={loading}
            className="mt-0.5"
          />
          <span>18 歳以上であることを確認しました</span>
        </label>
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            disabled={loading}
            className="mt-0.5"
          />
          <span>
            本サービスは医療・法律行為を提供するものではなく、
            重大な危険が検知された場合は関係機関への連絡が行われうることに同意します
          </span>
        </label>
      </div>

      {error && (
        <div className="space-y-2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p>{error.message}</p>
          {error.cta && (
            <Link
              href={error.cta.href}
              className="inline-block rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              {error.cta.label}
            </Link>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={!valid}
        className="inline-flex items-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
      >
        {loading ? "分析中..." : "送る"}
      </button>
    </div>
  );
}
