import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";
import { SettingsForm } from "@/components/SettingsForm";
import { MatchConditionForm } from "@/components/MatchConditionForm";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  const matchCondition = user
    ? await prisma.userMatchCondition.findUnique({
        where: { userId: user.id },
        select: {
          locationRegion: true,
          availableSlots: true,
          costTolerance: true,
          skillTags: true,
          acceptMatch: true,
        },
      })
    : null;

  return (
    <div className="space-y-10 py-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">設定</h1>
        <p className="text-sm text-muted">
          口調・API キー・マッチ条件を変えられます。いつでも変更できます。
        </p>
      </div>

      <SettingsForm
        initialPersona={user?.persona ?? "FLAT_POLITE"}
        hasApiKey={Boolean(user?.encryptedApiKey)}
      />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
            マッチ条件
          </h2>
          <p className="mt-1 text-xs text-muted">
            これらの条件は「現実性スコア」の計算に使われます。
            未設定でもマッチは作られますが、重なる条件が多いほどマッチ率が上がります。
          </p>
        </div>
        <MatchConditionForm
          initial={
            matchCondition
              ? {
                  locationRegion: matchCondition.locationRegion,
                  availableSlots: matchCondition.availableSlots,
                  costTolerance: matchCondition.costTolerance,
                  skillTags: matchCondition.skillTags,
                  acceptMatch: matchCondition.acceptMatch,
                }
              : null
          }
        />
      </section>

      {!user && (
        <p className="text-xs text-muted">
          設定を保存すると、あなたの匿名セッションが作成されます。
        </p>
      )}
    </div>
  );
}
