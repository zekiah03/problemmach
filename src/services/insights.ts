// 潜在分析から PotentialInsight を生成
// 直接「あなたの本当の問題は◯◯」とは言わず、「問いの形」で還元する
import { prisma } from "@/lib/db";

const MIN_OCCURRENCES = 3; // 3回以上現れたパターンのみ示唆
const RECENT_DAYS = 60;
const BATCH_USERS = 50;

type DistortionEntry = { type: string; evidence?: string; confidence?: number };

const DISTORTION_QUESTIONS: Record<string, string> = {
  ALL_OR_NOTHING: "「白か黒か」で考えていることはないでしょうか？グレーで居られる選択肢はありますか？",
  OVERGENERALIZATION: "1つの出来事を「いつもこう」と広げていないか、振り返ってみる時間はありますか？",
  MENTAL_FILTER: "うまくいかなかったことだけを見ていることはないですか？小さな進みもありませんでしたか？",
  DISCOUNTING_POSITIVE: "良かったことを「たまたま」と片づけていることはないですか？",
  MIND_READING: "相手の気持ちを「こう思っているはず」と決めつけていないでしょうか？確かめる方法はありますか？",
  FORTUNE_TELLING: "未来を悪い方に決めつけていないでしょうか？別の可能性も書き出してみますか？",
  CATASTROPHIZING: "「最悪のケース」が頭を支配していないでしょうか？実際の確率はどれくらいでしょう？",
  EMOTIONAL_REASONING: "「こう感じるから事実だ」と思っていないか、立ち止まる時間はありますか？",
  SHOULD_STATEMENTS: "「べき」「ねばならない」が多くないでしょうか？それは誰の声ですか？",
  LABELING: "自分や他人を一言で決めていないか、振り返れますか？",
  PERSONALIZATION: "本来あなたの責任ではないことを背負い込んでいないでしょうか？",
};

export async function runInsightBatch(): Promise<{
  usersProcessed: number;
  insightsCreated: number;
}> {
  // 直近 N 日に投稿のあったユーザーを抽出
  const since = new Date();
  since.setDate(since.getDate() - RECENT_DAYS);

  const userIds = await prisma.user.findMany({
    where: {
      posts: { some: { createdAt: { gte: since } } },
    },
    select: { id: true },
    take: BATCH_USERS,
  });

  let usersProcessed = 0;
  let insightsCreated = 0;

  for (const { id: userId } of userIds) {
    const created = await generateInsightsForUser(userId);
    insightsCreated += created;
    usersProcessed++;
  }

  return { usersProcessed, insightsCreated };
}

async function generateInsightsForUser(userId: string): Promise<number> {
  // 既存の PENDING / SHOWN がある場合は新規追加しない (重複防止)
  const existing = await prisma.potentialInsight.count({
    where: { userId, status: { in: ["PENDING", "SHOWN"] } },
  });
  if (existing >= 5) return 0;

  // 直近 N 日の LatentAnalysis を集める
  const since = new Date();
  since.setDate(since.getDate() - RECENT_DAYS);

  const latents = await prisma.latentAnalysis.findMany({
    where: {
      createdAt: { gte: since },
    },
  });

  // 自分の投稿に紐づくものだけ
  const myPostIds = new Set(
    (
      await prisma.post.findMany({
        where: { userId },
        select: { id: true },
      })
    ).map((p) => p.id),
  );

  const myLatents = latents.filter((l) => myPostIds.has(l.postId));
  if (myLatents.length < MIN_OCCURRENCES) return 0;

  // 認知歪みの頻度集計
  const distortionCounts = new Map<string, number>();
  for (const l of myLatents) {
    const ds = (l.cognitiveDistortions as DistortionEntry[]) ?? [];
    for (const d of ds) {
      if (typeof d?.type !== "string") continue;
      if ((d.confidence ?? 0) < 50) continue;
      distortionCounts.set(d.type, (distortionCounts.get(d.type) ?? 0) + 1);
    }
  }

  let created = 0;

  for (const [type, count] of distortionCounts) {
    if (count < MIN_OCCURRENCES) continue;
    const question = DISTORTION_QUESTIONS[type];
    if (!question) continue;

    // 同じ insightType が既にあれば skip
    const dup = await prisma.potentialInsight.findFirst({
      where: { userId, insightType: `DISTORTION_${type}`, status: { in: ["PENDING", "SHOWN"] } },
    });
    if (dup) continue;

    await prisma.potentialInsight.create({
      data: {
        userId,
        insightType: `DISTORTION_${type}`,
        detail: {
          question,
          occurrences: count,
          totalPosts: myLatents.length,
        },
        confidence: Math.min(100, count * 25),
      },
    });
    created++;
  }

  return created;
}
