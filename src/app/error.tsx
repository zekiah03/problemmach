"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 py-12 text-center">
      <h2 className="text-xl font-semibold">問題が起きました</h2>
      <p className="text-sm text-muted">
        ページの表示中にエラーが発生しました。時間をおいて再度お試しください。
      </p>
      {error.digest && (
        <p className="text-xs text-muted">エラーID: {error.digest}</p>
      )}
      <div className="flex justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          再試行
        </button>
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          ホームへ
        </Link>
      </div>
    </div>
  );
}
