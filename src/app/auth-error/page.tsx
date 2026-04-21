import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="space-y-4 py-10 text-center">
      <h1 className="text-2xl font-semibold">ログインできませんでした</h1>
      <p className="text-sm text-muted">
        リンクが無効か、有効期限が切れている可能性があります。
      </p>
      <p>
        <Link href="/signin" className="text-accent underline">
          もう一度ログインする
        </Link>
      </p>
    </div>
  );
}
