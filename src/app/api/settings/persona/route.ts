import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUser } from "@/lib/guest";

const schema = z.object({
  persona: z.enum(["FLAT_POLITE", "FLAT_CASUAL", "EXPERT", "FRIEND"]),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const user = await getOrCreateGuestUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { persona: parsed.data.persona },
  });
  return NextResponse.json({ ok: true });
}
