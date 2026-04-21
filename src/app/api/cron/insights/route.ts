import { NextRequest, NextResponse } from "next/server";
import { runInsightBatch } from "@/services/insights";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("x-cron-secret");
  if (!expected || provided !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runInsightBatch();
  return NextResponse.json(result);
}
