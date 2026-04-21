import { getGuestUserReadOnly } from "@/lib/guest";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const user = await getGuestUserReadOnly();
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">設定</h1>
        <p className="text-sm text-muted">
          口調 や API キーを変えられます。いつでも変更できます。
        </p>
      </div>
      <SettingsForm
        initialPersona={user?.persona ?? "FLAT_POLITE"}
        hasApiKey={Boolean(user?.encryptedApiKey)}
      />
      {!user && (
        <p className="text-xs text-muted">
          設定を保存すると、あなたの匿名セッションが作成されます。
        </p>
      )}
    </div>
  );
}
