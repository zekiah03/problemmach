"use client";

import { useState } from "react";

type Reason =
  | "SPAM"
  | "HARASSMENT"
  | "MONEY_REQUEST"
  | "EXTERNAL_SOLICITATION"
  | "SELF_HARM_CONCERN"
  | "OTHER";

const REASON_LABEL: Record<Reason, string> = {
  SPAM: "スパム / 商材",
  HARASSMENT: "嫌がらせ・攻撃的",
  MONEY_REQUEST: "金銭要求",
  EXTERNAL_SOLICITATION: "外部誘導 (LINE / SNS)",
  SELF_HARM_CONCERN: "自傷・身の危険を感じる",
  OTHER: "その他",
};

type Props = {
  targetType: "POST" | "MESSAGE" | "USER" | "MATCH";
  targetId: string;
  label?: string;
};

export function ReportButton({ targetType, targetId, label }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<Reason | "">("");
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetType, targetId, reason, detail }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "通報に失敗しました");
      }
    } catch {
      setError("通信エラー");
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <p className="text-xs text-muted">
        通報を受け付けました。運営で確認します。
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-muted underline hover:text-red-700"
      >
        {label ?? "通報する"}
      </button>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-gray-200 bg-white p-3">
      <p className="text-xs font-medium">通報理由</p>
      <select
        value={reason}
        onChange={(e) => setReason(e.target.value as Reason)}
        className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
      >
        <option value="">選んでください</option>
        {Object.entries(REASON_LABEL).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      <textarea
        rows={2}
        placeholder="詳細 (任意)"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        className="w-full resize-none rounded-md border border-gray-300 px-2 py-1 text-xs"
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={!reason || busy}
          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          通報する
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs"
        >
          キャンセル
        </button>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
