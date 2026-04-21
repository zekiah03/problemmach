// Admin 判定: 環境変数 ADMIN_EMAILS (カンマ区切り) に含まれるメールで判定
// MVP ではシンプルにメールリスト。将来的には User.role フィールドを追加予定
import type { User } from "@prisma/client";

function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdmin(user: Pick<User, "email"> | null | undefined): boolean {
  if (!user?.email) return false;
  return getAdminEmails().includes(user.email.toLowerCase());
}
