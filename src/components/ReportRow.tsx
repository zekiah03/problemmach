"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REASON_LABEL: Record<string, string> = {
  SPAM: "スパム",
  HARASSMENT: "嫌がらせ",
  MONEY_REQUEST: "金銭要求",
  EXTERNAL_SOLICITATION: "外部誘導",
  SELF_HARM_CONCERN: "自傷懸念",
  OTHER: "その他",
};

const TARGET_LABEL: Record<string, string> = {
  POST: "投稿",
  MESSAGE: "メッセージ",
  USER: "ユーザー",
  MATCH: "マッチ",
};

type Props = {
  id: string;
  reason: string;
  targetType: string;
  targetId: string;
  detail: string | null;
  createdAt: string;
  targetPreview: string | null;
};

export function ReportRow({
  id,
  reason,
  targetType,
  targetId,
  detail,
  createdAt,
  targetPreview,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [handled, setHandled] = useState<string | null>(null);

  const act = async (action: "reviewed" | "actioned" | "dismiss") => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        setHandled(action);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  if (handled) {
    return (
      <li className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-muted">
        処理しました: {handled}
      </li>
    );
  }

  return (
    <li className="space-y-2 rounded-md border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
          {REASON_LABEL[reason] ?? reason}
        </span>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-muted">
          {TARGET_LABEL[targetType] ?? targetType}
        </span>
        <span className="text-muted">
          {new Date(createdAt).toLocaleString("ja-JP")}
        </span>
        <code className="ml-auto text-[10px] text-muted">{targetId}</code>
      </div>
      {targetPreview && (
        <p className="whitespace-pre-wrap rounded border border-gray-100 bg-gray-50 p-2 text-xs text-ink">
          {targetPreview}
        </p>
      )}
      {detail && (
        <p className="text-xs text-muted">
          <span className="font-medium">通報者コメント: </span>
          {detail}
        </p>
      )}
      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => act("actioned")}
          disabled={busy}
          className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          対処する (削除)
        </button>
        <button
          type="button"
          onClick={() => act("reviewed")}
          disabled={busy}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
        >
          確認済み
        </button>
        <button
          type="button"
          onClick={() => act("dismiss")}
          disabled={busy}
          className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
        >
          棄却
        </button>
      </div>
    </li>
  );
}
