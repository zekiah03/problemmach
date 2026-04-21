// Auth.js v5 設定
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { Resend } from "resend";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  pages: {
    signIn: "/signin",
    verifyRequest: "/verify-request",
    error: "/auth-error",
  },
  providers: [
    {
      id: "magic-link",
      name: "Magic Link",
      type: "email",
      from: process.env.EMAIL_FROM ?? "noreply@example.com",
      maxAge: 60 * 60, // 1時間
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey || apiKey.startsWith("re_placeholder")) {
          // 開発環境ではコンソール出力
          console.log("\n=== Magic Link (dev) ===");
          console.log(`To: ${identifier}`);
          console.log(`URL: ${url}`);
          console.log("=========================\n");
          return;
        }
        const resend = new Resend(apiKey);
        const { error } = await resend.emails.send({
          from: provider.from as string,
          to: identifier,
          subject: "problemmach へのログインリンク",
          text: buildEmailText(url),
          html: buildEmailHtml(url),
        });
        if (error) throw new Error(`Failed to send email: ${error.message}`);
      },
    },
  ],
  events: {
    async signIn({ user }) {
      // ログイン成功時、ゲストフラグを外す
      if (user.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isGuest: false, lastActiveAt: new Date() },
        });
      }
    },
  },
});

function buildEmailText(url: string): string {
  return `problemmach へログインするには、以下のリンクをクリックしてください:\n\n${url}\n\nこのリンクは1時間有効です。心当たりがない場合は無視してください。`;
}

function buildEmailHtml(url: string): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <h1 style="font-size:18px;margin:0 0 16px;">problemmach へのログイン</h1>
  <p style="line-height:1.7;margin:0 0 20px;color:#555;">以下のボタンを押すと、ログインが完了します。</p>
  <p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#4a6fa5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500;">ログインする</a></p>
  <p style="font-size:12px;line-height:1.6;color:#888;">このリンクは 1 時間有効です。心当たりがない場合は無視してください。</p>
</div>
  `.trim();
}
