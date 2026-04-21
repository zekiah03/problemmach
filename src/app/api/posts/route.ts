import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";
import { getGuestPostCount, GUEST_POST_LIMIT } from "@/lib/guest";
import { judgeRisk, SELF_HARM_RESPONSE } from "@/lib/moderation";
import { generateAITurn } from "@/services/conversation";

const schema = z.object({
  text: z.string().min(30, "悩みは30文字以上入力してください").max(4000),
  ageConfirmed: z.literal(true),
  termsAccepted: z.literal(true),
});

const GUEST_TTL_DAYS = 30;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const user = await getOrCreateCurrentUser();

  if (user.isGuest) {
    const count = await getGuestPostCount(user.id);
    if (count >= GUEST_POST_LIMIT) {
      return NextResponse.json(
        { error: "guest_limit", limit: GUEST_POST_LIMIT },
        { status: 403 },
      );
    }
  }

  // 1段目: リスク判定
  const risk = await judgeRisk(user.id, parsed.data.text);

  // 自傷検知 → 専用応答で終了。Post は作らない
  if (risk.flag === "SELF_HARM") {
    return NextResponse.json({
      riskFlag: "SELF_HARM",
      selfHarmResponse: SELF_HARM_RESPONSE,
    });
  }

  // その他の危険系 → Post は作るが分析停止
  if (risk.flag === "HARM_OTHERS" || risk.flag === "ILLEGAL") {
    return NextResponse.json(
      {
        riskFlag: risk.flag,
        message:
          "この投稿内容では分析を進められません。内容を確認のうえ、表現を変えて再度お試しください。",
      },
      { status: 400 },
    );
  }

  // 個人情報検知 → ユーザーに編集を促す
  if (risk.flag === "PII_DETECTED" || risk.piiDetected) {
    return NextResponse.json(
      {
        riskFlag: "PII_DETECTED",
        message:
          "氏名・住所・電話番号など、個人を特定できる情報が含まれている可能性があります。該当部分を削除または伏せ字にしてから再投稿してください。",
      },
      { status: 400 },
    );
  }

  // 利用規約と年齢を永続化
  if (!user.ageConfirmed || !user.termsAcceptedAt) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        ageConfirmed: true,
        termsAcceptedAt: user.termsAcceptedAt ?? new Date(),
      },
    });
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + GUEST_TTL_DAYS);

  const post = await prisma.post.create({
    data: {
      userId: user.id,
      initialText: parsed.data.text,
      status: "IN_CONVERSATION",
      riskFlag: risk.flag === "MEDICAL" ? "MEDICAL" : "NONE",
      expiresAt: user.isGuest ? expiresAt : null,
    },
  });

  // 初回AIターン生成
  let turnNumber = 1;
  // ユーザー発言を Turn 0 として保存
  await prisma.conversationTurn.create({
    data: {
      postId: post.id,
      turnNumber: 0,
      role: "USER",
      content: parsed.data.text,
    },
  });

  const aiTurn = await generateAITurn({
    postId: post.id,
    userId: user.id,
    persona: user.persona,
    initialText: parsed.data.text,
  });

  await prisma.conversationTurn.create({
    data: {
      postId: post.id,
      turnNumber,
      role: "AI",
      content: buildAIContent(aiTurn),
      questionOptions: aiTurn.options,
      filledSlot: aiTurn.target_slot,
    },
  });

  return NextResponse.json({
    postId: post.id,
    aiTurn,
    riskFlag: "NONE",
  });
}

function buildAIContent(t: {
  acknowledgment: string;
  cumulative_summary: string;
  question: string;
}): string {
  const parts = [t.acknowledgment];
  if (t.cumulative_summary) parts.push(t.cumulative_summary);
  parts.push(t.question);
  return parts.filter(Boolean).join("\n\n");
}
