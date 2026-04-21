export default function VerifyRequestPage() {
  return (
    <div className="space-y-4 py-10 text-center">
      <h1 className="text-2xl font-semibold">メールを確認してください</h1>
      <p className="text-sm text-muted">
        ログインリンクを送りました。メールに記載のリンクをクリックすると、ログインが完了します。
      </p>
      <p className="text-xs text-muted">
        リンクは 1 時間有効です。届かない場合は、迷惑メールフォルダもご確認ください。
      </p>
    </div>
  );
}
