// 埋め込みベクトル生成バッチ
// X-Cron-Secret ヘッダで認証
import { NextRequest, NextResponse } from "next/server";
import { runEmbeddingBatch } from "@/services/embedding";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runEmbeddingBatch();
  if (result.skipped === -1) {
    return NextResponse.json(
      { ok: false, message: "OPENAI_API_KEY is not configured" },
      { status: 200 },
    );
  }
  return NextResponse.json(result);
}
