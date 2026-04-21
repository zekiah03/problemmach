// マッチング計算サービス
// 顕在分析済み + matchRecommend=true + matchEligible=true な Post 間で
// 相補マッチ (ミラー / 経験者) を作成
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const BATCH_PER_POST = 30; // 1 つの Post につき検討する候補数
const TOP_N_PER_POST = 3; // 1 つの Post につき採用する候補数
const SCORE_THRESHOLD = 35; // これ未満は除外
const EXPERIENCED_DAYS = 14; // 14 日以上の差で「経験者」と判定
const MATCH_TTL_DAYS = 30;

const REGION_BONUS = 25;
const COST_BONUS = 10;

type CandidatePost = {
  id: string;
  userId: string;
  categoryPrimary: string | null;
  categorySecondary: string | null;
  coexistSubtype: string | null;
  longTermFlag: boolean;
  completedAt: Date | null;
  user: {
    matchCondition: {
      locationRegion: string | null;
      availableSlots: string[];
      costTolerance: string;
      acceptMatch: boolean;
    } | null;
  };
};

export async function runMatchingBatch(): Promise<{
  evaluated: number;
  created: number;
}> {
  // 顕在分析が出ていてマッチ推奨の Post を集める
  const candidates = await prisma.post.findMany({
    where: {
      status: "ANALYZED",
      matchEligible: true,
      analysis: { matchRecommend: true },
    },
    select: {
      id: true,
      userId: true,
      categoryPrimary: true,
      categorySecondary: true,
      coexistSubtype: true,
      longTermFlag: true,
      completedAt: true,
      user: {
        select: {
          matchCondition: {
            select: {
              locationRegion: true,
              availableSlots: true,
              costTolerance: true,
              acceptMatch: true,
            },
          },
        },
      },
    },
  });

  // 受け入れ拒否ユーザーは除外 (条件未設定なら受け入れ扱い)
  const eligible = candidates.filter(
    (c) => c.user.matchCondition?.acceptMatch !== false,
  );

  let created = 0;
  let evaluated = 0;

  for (const a of eligible) {
    const others = await pickCandidatesFor(a as CandidatePost, eligible as CandidatePost[]);

    for (const b of others) {
      evaluated++;
      const compat = computeCompatibility(a as CandidatePost, b);
      if (compat.compatibilityScore < SCORE_THRESHOLD) continue;

      const realness = computeRealness(a as CandidatePost, b);
      if (realness < 30) continue;

      const finalScore = Math.round(compat.compatibilityScore * 0.7 + realness * 0.3);
      if (finalScore < SCORE_THRESHOLD) continue;

      const expires = new Date();
      expires.setDate(expires.getDate() + MATCH_TTL_DAYS);

      try {
        await prisma.match.create({
          data: {
            postAId: a.id,
            postBId: b.id,
            matchType: compat.matchType,
            compatibilityScore: compat.compatibilityScore,
            realnessScore: realness,
            expiresAt: expires,
          },
        });
        created++;
      } catch (e) {
        // 既存マッチがあるなど (unique 衝突)
        if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) {
          throw e;
        }
      }
    }
  }

  return { evaluated, created };
}

async function pickCandidatesFor(
  a: CandidatePost,
  pool: CandidatePost[],
): Promise<CandidatePost[]> {
  // 自分自身・同一ユーザー・既存マッチ済みを除外
  const existing = await prisma.match.findMany({
    where: {
      OR: [
        { postAId: a.id },
        { postBId: a.id },
      ],
    },
    select: { postAId: true, postBId: true },
  });
  const matched = new Set<string>();
  for (const m of existing) {
    matched.add(m.postAId);
    matched.add(m.postBId);
  }

  return pool
    .filter(
      (p) =>
        p.id !== a.id &&
        p.userId !== a.userId &&
        !matched.has(p.id) &&
        // 同じ primary category または同じ coexist subtype を最低条件に
        (p.categoryPrimary === a.categoryPrimary ||
          (a.coexistSubtype && p.coexistSubtype === a.coexistSubtype)),
    )
    .slice(0, BATCH_PER_POST);
}

function computeCompatibility(
  a: CandidatePost,
  b: CandidatePost,
): { compatibilityScore: number; matchType: "MIRROR" | "EXPERIENCED" } {
  let score = 30; // ベース (同類型なので最低限合う)

  // ミラー判定
  let isMirror = false;
  if (a.categoryPrimary === b.categoryPrimary) {
    score += 20;
    isMirror = true;
  }
  if (
    a.coexistSubtype &&
    b.coexistSubtype &&
    a.coexistSubtype === b.coexistSubtype
  ) {
    score += 25;
    isMirror = true;
  }
  // secondary 類型も合えばボーナス
  if (
    a.categorySecondary &&
    (a.categorySecondary === b.categoryPrimary ||
      a.categorySecondary === b.categorySecondary)
  ) {
    score += 5;
  }

  // 経験者判定: 完了時刻に EXPERIENCED_DAYS 以上の差があれば
  let isExperienced = false;
  if (a.completedAt && b.completedAt) {
    const diff =
      Math.abs(a.completedAt.getTime() - b.completedAt.getTime()) /
      (1000 * 60 * 60 * 24);
    if (diff >= EXPERIENCED_DAYS) {
      score += 10;
      isExperienced = true;
    }
  }

  // 長期 (共存系) 同士はマッチしやすい
  if (a.longTermFlag && b.longTermFlag) score += 5;

  return {
    compatibilityScore: Math.min(100, Math.max(0, score)),
    // 経験者要素が強い時は EXPERIENCED、それ以外は MIRROR
    matchType: isExperienced && !isMirror ? "EXPERIENCED" : "MIRROR",
  };
}

function computeRealness(a: CandidatePost, b: CandidatePost): number {
  let score = 50; // ベース (条件未設定なら中立)
  const ca = a.user.matchCondition;
  const cb = b.user.matchCondition;

  // 同じ都道府県なら大きいプラス
  if (ca?.locationRegion && cb?.locationRegion) {
    if (ca.locationRegion === cb.locationRegion) score += REGION_BONUS;
    else score -= 5;
  }

  // 時間帯の重なり
  if (ca?.availableSlots?.length && cb?.availableSlots?.length) {
    const overlap = ca.availableSlots.filter((s) =>
      cb.availableSlots.includes(s),
    ).length;
    if (overlap > 0) score += 10;
    else score -= 10;
  }

  // コスト許容: 同じか以上同士なら+
  if (ca?.costTolerance && cb?.costTolerance) {
    if (ca.costTolerance === cb.costTolerance) score += COST_BONUS;
  }

  return Math.min(100, Math.max(0, score));
}
