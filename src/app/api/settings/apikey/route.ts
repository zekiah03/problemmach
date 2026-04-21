import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUser } from "@/lib/guest";
import { encrypt } from "@/lib/crypto";

const schema = z.object({
  apiKey: z.string().min(20).max(200),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const user = await getOrCreateGuestUser();
  const encrypted = encrypt(parsed.data.apiKey);
  await prisma.user.update({
    where: { id: user.id },
    data: { encryptedApiKey: encrypted },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await getOrCreateGuestUser();
  await prisma.user.update({
    where: { id: user.id },
    data: { encryptedApiKey: null },
  });
  return NextResponse.json({ ok: true });
}
