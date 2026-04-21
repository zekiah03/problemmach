// 投稿の埋め込みベクトル生成
// マッチング (Phase 2) で類似度計算に使う
// 運営側の OPENAI_API_KEY のみ使用 (BYOK は Anthropic だけのため)
import OpenAI from "openai";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536次元
const BATCH_SIZE = 20;

let _client: OpenAI | null = null;
function getClient(): OpenAI | null {
  if (_client) return _client;
  const key = process.env.OPENAI_API_KEY;
  if (!key || key.startsWith("sk-placeholder")) return null;
  _client = new OpenAI({ apiKey: key });
  return _client;
}

export async function runEmbeddingBatch(): Promise<{ processed: number; skipped: number }> {
  const client = getClient();
  if (!client) {
    return { processed: 0, skipped: -1 }; // -1 を「キー未設定でスキップ」のシグナル
  }

  // 顕在分析済みで PostEmbedding がない Post を取得
  const candidates = await prisma.post.findMany({
    where: {
      status: "ANALYZED",
      analysis: { isNot: null },
    },
    include: { analysis: true },
    orderBy: { completedAt: "asc" },
    take: BATCH_SIZE,
  });

  const existingIds = new Set(
    (
      await prisma.$queryRaw<{ postId: string }[]>(
        Prisma.sql`SELECT "postId" FROM "PostEmbedding" WHERE "postId" = ANY(${candidates.map((c) => c.id)}::text[])`,
      )
    ).map((r) => r.postId),
  );

  const targets = candidates.filter((c) => !existingIds.has(c.id));
  let processed = 0;

  for (const post of targets) {
    try {
      const structure = post.analysis?.structure as
        | { ideal?: string; reality?: string }
        | null;
      const ideal = structure?.ideal ?? "";
      const reality = structure?.reality ?? "";

      const inputs = [post.initialText, ideal, reality].filter((s) => s.trim().length > 0);
      const res = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: inputs,
      });

      const vectors = res.data.map((d) => d.embedding);
      const fullText = vectors[0];
      const idealVec = inputs[1] ? vectors[1] : null;
      const realityVec = inputs[2] ? vectors[2] : null;

      await prisma.$executeRaw(
        Prisma.sql`
          INSERT INTO "PostEmbedding" ("postId", "fullText", "ideal", "reality", "modelUsed", "createdAt")
          VALUES (
            ${post.id},
            ${toVectorLiteral(fullText)}::vector,
            ${idealVec ? toVectorLiteral(idealVec) : null}::vector,
            ${realityVec ? toVectorLiteral(realityVec) : null}::vector,
            ${EMBEDDING_MODEL},
            NOW()
          )
          ON CONFLICT ("postId") DO NOTHING
        `,
      );
      processed++;
    } catch (e) {
      console.error(`Embedding failed for post ${post.id}:`, e);
    }
  }

  return { processed, skipped: 0 };
}

function toVectorLiteral(v: number[]): string {
  return `[${v.join(",")}]`;
}
