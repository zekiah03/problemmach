// 潜在分析バッチエンドポイント
// X-Cron-Secret ヘッダで認証 (Vercel Cron や外部 cron から叩く)
import { NextRequest, NextResponse } from "next/server";
import { runLatentBatch } from "@/services/latent";

export const maxDuration = 300; // 最大5分

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runLatentBatch();
  return NextResponse.json(result);
}
