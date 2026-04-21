"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  matchId: string;
  alreadyAccepted: boolean;
  status: string;
};

export function MatchActions({ matchId, alreadyAccepted, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: "accept" | "decline") => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/matches/${matchId}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "応答に失敗しました");
      } else {
        setDone(action);
        router.refresh();
      }
    } catch {
      setError("通信エラー");
    } finally {
      setBusy(false);
    }
  };

  if (status === "MUTUAL") {
    return (
      <div className="rounded-md bg-accent/10 p-4 text-sm text-accent">
        相互承認済みです。チャット機能は Phase 3 で提供予定。
      </div>
    );
  }

  if (status === "DECLINED" || done === "decline") {
    return (
      <p className="text-sm text-muted">このマッチは辞退しました。</p>
    );
  }

  if (alreadyAccepted || done === "accept") {
    return (
      <p className="text-sm text-muted">
        承認しました。相手の応答を待っています。
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm">
        この方と話してみますか？両者とも承認すると、対話を始められます (Phase 3 で実装予定)。
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => respond("accept")}
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          話してみたい
        </button>
        <button
          type="button"
          onClick={() => respond("decline")}
          disabled={busy}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          辞退する
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
