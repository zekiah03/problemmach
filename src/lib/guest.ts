import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { prisma } from "./db";

const COOKIE_NAME = "pm_guest";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30日

// ゲストの投稿数上限 (Phase 0)
export const GUEST_POST_LIMIT = 3;

export async function getOrCreateGuestUser() {
  const jar = await cookies();
  let token = jar.get(COOKIE_NAME)?.value;

  let user = token
    ? await prisma.user.findUnique({ where: { guestToken: token } })
    : null;

  if (!user) {
    token = randomBytes(16).toString("hex");
    user = await prisma.user.create({
      data: {
        guestToken: token,
        isGuest: true,
        displayName: generateAnonymousName(),
      },
    });
    jar.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }

  return user;
}

export async function getGuestPostCount(userId: string) {
  return prisma.post.count({ where: { userId } });
}

const ADJECTIVES = ["悩める", "揺れる", "迷う", "さすらう", "考える", "静かな"];
const NOUNS = ["猫", "星", "月", "影", "風", "波", "光", "森"];

function generateAnonymousName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}`;
}
