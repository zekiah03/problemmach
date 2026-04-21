"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  id: string;
  question: string;
  occurrences: number;
  totalPosts: number;
};

export function InsightCard({ id, question, occurrences, totalPosts }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [hidden, setHidden] = useState(false);

  const respond = async (action: "accept" | "dismiss") => {
    setBusy(true);
    try {
      await fetch(`/api/insights/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      setHidden(true);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (hidden) return null;

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-5">
      <div>
        <p className="text-xs text-muted">
          直近 {totalPosts} 件中 {occurrences} 件の悩みで、似たパターンが見えてきました
        </p>
        <p className="mt-2 text-sm leading-relaxed">{question}</p>
      </div>
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={busy}
          className="rounded-md border border-accent bg-accent/5 px-3 py-1.5 text-xs text-accent disabled:opacity-40"
        >
          少し気になる
        </button>
        <button
          type="button"
          onClick={() => respond("dismiss")}
          disabled={busy}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-muted disabled:opacity-40"
        >
          ピンとこない
        </button>
      </div>
      <p className="text-[10px] text-muted">
        これは断定ではなく、可能性の提示です。あなた自身の感覚を大切にしてください。
      </p>
    </div>
  );
}
