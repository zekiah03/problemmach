import { signIn } from "@/lib/auth";

export default function SignInPage() {
  return (
    <div className="space-y-6 py-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ログイン / 登録</h1>
        <p className="text-sm text-muted">
          メールアドレスを入力すると、ログインリンクが届きます。
          パスワードはありません。
        </p>
      </div>

      <form
        action={async (formData) => {
          "use server";
          await signIn("magic-link", {
            email: formData.get("email") as string,
            redirectTo: "/history",
          });
        }}
        className="space-y-3 rounded-lg border border-gray-200 bg-white p-5"
      >
        <label className="block text-sm font-medium" htmlFor="email">
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-white"
        >
          ログインリンクを送る
        </button>
      </form>

      <div className="rounded-lg bg-gray-50 p-4 text-xs text-muted">
        <p>
          現在ゲストとしてご利用中の場合、登録すると今までの投稿履歴が引き継がれます。
        </p>
        <p className="mt-2">
          メールアドレス以外の個人情報は保存しません。
        </p>
      </div>
    </div>
  );
}
