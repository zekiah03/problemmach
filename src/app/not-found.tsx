import Link from "next/link";

export default function NotFound() {
  return (
    <div className="space-y-4 py-16 text-center">
      <h2 className="text-3xl font-semibold">404</h2>
      <p className="text-sm text-muted">
        お探しのページは見つかりませんでした。
      </p>
      <div className="flex justify-center gap-3 pt-2">
        <Link
          href="/"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          ホームへ
        </Link>
        <Link
          href="/new"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          新しい悩みを書く
        </Link>
      </div>
    </div>
  );
}
