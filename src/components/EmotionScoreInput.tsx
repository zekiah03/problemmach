"use client";

import { useState } from "react";

type Props = {
  postId: string;
};

export function EmotionScoreInput({ postId }: Props) {
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/emotion`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), context: "POST_ANALYSIS" }),
      });
      if (res.ok) setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-muted">
        ありがとうございます。残しておきます。
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm">
        ここまで書いてみて、今、悩みの重さはどれくらいになりましたか？
      </p>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="自由に書いてください (例: 少し楽になった / 変わらないけど整理はできた)"
        className="w-full resize-none rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={loading || !text.trim()}
        className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
      >
        {loading ? "送信中..." : "残す"}
      </button>
    </div>
  );
}
