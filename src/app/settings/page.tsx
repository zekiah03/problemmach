import { getOrCreateGuestUser } from "@/lib/guest";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const user = await getOrCreateGuestUser();
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">設定</h1>
        <p className="text-sm text-muted">
          口調 や API キーを変えられます。いつでも変更できます。
        </p>
      </div>
      <SettingsForm
        initialPersona={user.persona}
        hasApiKey={Boolean(user.encryptedApiKey)}
      />
    </div>
  );
}
