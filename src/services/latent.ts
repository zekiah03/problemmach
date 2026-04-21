// 潜在分析バッチサービス
// cron から呼ばれ、未処理 Post に対してまとめて Sonnet で深掘り
import { prisma } from "@/lib/db";
import { getAnthropicForUser, MODEL_DEEP } from "@/lib/anthropic";
import { LATENT_ANALYZE_SYSTEM, LATENT_PROMPT_VERSION } from "@/lib/prompts/latent";

const BATCH_SIZE = 20;

export async function runLatentBatch(): Promise<{ processed: number; failed: number }> {
  // 顕在分析が完了し、まだ潜在分析がない Post を取得
  const posts = await prisma.post.findMany({
    where: {
      status: "ANALYZED",
      riskFlag: { in: ["NONE", "MEDICAL"] }, // 自傷検知系は対象外
    },
    include: { turns: { orderBy: { turnNumber: "asc" } }, analysis: true },
    orderBy: { completedAt: "asc" },
    take: BATCH_SIZE,
  });

  // すでに LatentAnalysis があるものは除外
  const existingPostIds = new Set(
    (
      await prisma.latentAnalysis.findMany({
        where: { postId: { in: posts.map((p) => p.id) } },
        select: { postId: true },
      })
    ).map((l) => l.postId),
  );

  const targets = posts.filter((p) => !existingPostIds.has(p.id));

  let processed = 0;
  let failed = 0;

  for (const post of targets) {
    try {
      await runLatentForPost(post.id, post.userId, post);
      processed++;
    } catch (e) {
      console.error(`Latent analysis failed for post ${post.id}:`, e);
      failed++;
    }
  }

  return { processed, failed };
}

async function runLatentForPost(
  postId: string,
  userId: string,
  post: { initialText: string; turns: { role: string; content: string }[] },
) {
  const dialogue = renderDialogue(post.initialText, post.turns);
  const { client } = await getAnthropicForUser(userId);

  const res = await client.messages.create({
    model: MODEL_DEEP,
    max_tokens: 1500,
    system: LATENT_ANALYZE_SYSTEM,
    messages: [{ role: "user", content: dialogue }],
  });

  const block = res.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";
  const parsed = parseLatent(raw);

  await prisma.latentAnalysis.create({
    data: {
      postId,
      emotionLayers: parsed.emotion_layers,
      cognitiveDistortions: parsed.cognitive_distortions,
      rootCauses: parsed.root_causes,
      patternTags: parsed.pattern_tags,
      llmUsed: MODEL_DEEP,
      promptVersion: LATENT_PROMPT_VERSION,
    },
  });
}

function renderDialogue(initialText: string, turns: { role: string; content: string }[]): string {
  const lines = [`[初回投稿]\n${initialText}`];
  for (const t of turns) {
    lines.push(`[${t.role === "AI" ? "AI" : "ユーザー"}]\n${t.content}`);
  }
  lines.push(
    "\n上記の対話の潜在層を分析してください。出力は指定されたJSONのみ。",
  );
  return lines.join("\n\n");
}

function parseLatent(raw: string) {
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) {
    return {
      emotion_layers: { surface: [], deep: [], meta: [] },
      cognitive_distortions: [],
      root_causes: [],
      pattern_tags: [],
    };
  }
  try {
    const j = JSON.parse(m[0]);
    return {
      emotion_layers: {
        surface: arr(j.emotion_layers?.surface),
        deep: arr(j.emotion_layers?.deep),
        meta: arr(j.emotion_layers?.meta),
      },
      cognitive_distortions: Array.isArray(j.cognitive_distortions)
        ? j.cognitive_distortions
        : [],
      root_causes: Array.isArray(j.root_causes) ? j.root_causes : [],
      pattern_tags: arr(j.pattern_tags),
    };
  } catch {
    return {
      emotion_layers: { surface: [], deep: [], meta: [] },
      cognitive_distortions: [],
      root_causes: [],
      pattern_tags: [],
    };
  }
}

function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}
