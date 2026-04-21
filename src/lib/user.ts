// 現在のユーザー取得のラッパ
// 1. Auth.js セッションがあればそのユーザー
// 2. ゲストクッキーがあればゲストユーザー
// 3. なければ作成 (Route Handler 専用) or null (Server Component)
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateGuestUser, getGuestUserReadOnly } from "@/lib/guest";

export async function getCurrentUser() {
  const session = await auth();
  if (session?.user?.id) {
    return prisma.user.findUnique({ where: { id: session.user.id } });
  }
  return getGuestUserReadOnly();
}

export async function getOrCreateCurrentUser() {
  const session = await auth();
  if (session?.user?.id) {
    const u = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (u) return u;
  }
  return getOrCreateGuestUser();
}
