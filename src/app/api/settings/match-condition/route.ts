// マッチング条件の更新
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";

const schema = z.object({
  locationRegion: z.string().max(20).nullable().optional(),
  availableSlots: z.array(z.enum(["MORNING", "DAYTIME", "EVENING", "NIGHT", "WEEKEND"])).default([]),
  costTolerance: z.enum(["FREE", "LOW", "MEDIUM", "HIGH"]).default("FREE"),
  skillTags: z.array(z.string().max(30)).max(10).default([]),
  acceptMatch: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const user = await getOrCreateCurrentUser();
  await prisma.userMatchCondition.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data, locationRegion: parsed.data.locationRegion ?? null },
    update: { ...parsed.data, locationRegion: parsed.data.locationRegion ?? null },
  });
  return NextResponse.json({ ok: true });
}
