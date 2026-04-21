// 本分析サービス (2段階分析の2段目)
import { prisma } from "@/lib/db";
import { getAnthropicForUser, MODEL_FAST } from "@/lib/anthropic";
import {
  ANALYZE_PROMPT_VERSION,
  buildAnalyzeSystem,
  pickTemplates,
} from "@/lib/prompts/analyze";
import { parseAnalysis } from "@/lib/parsers";
import { Category, CoexistSub, Persona } from "@prisma/client";

export async function runAnalysis(params: {
  postId: string;
  userId: string;
  persona: Persona;
}) {
  const post = await prisma.post.findUnique({
    where: { id: params.postId },
    include: { turns: { orderBy: { turnNumber: "asc" } } },
  });
  if (!post) throw new Error("Post not found");

  const dialogue = renderDialogue(post.initialText, post.turns);

  const systemPrompt = buildAnalyzeSystem(params.persona);
  const { client } = await getAnthropicForUser(params.userId);

  const res = await client.messages.create({
    model: MODEL_FAST,
    max_tokens: 1200,
    system: systemPrompt,
    messages: [{ role: "user", content: dialogue }],
  });

  const block = res.content.find((b) => b.type === "text");
  const raw = block && block.type === "text" ? block.text : "";
  const parsed = parseAnalysis(raw);

  const analysis = await prisma.analysis.upsert({
    where: { postId: params.postId },
    create: {
      postId: params.postId,
      structure: parsed.structure,
      categoryPrimary: parsed.category.primary as Category,
      categorySecondary: parsed.category.secondary as Category | null,
      confidence: parsed.category.confidence,
      timeInfo: parsed.time_info,
      solutionTypeScores: parsed.solution_type_scores,
      selfResolvableScore: parsed.self_resolvable_score,
      coexistSubtype: parsed.coexist_subtype as CoexistSub | null,
      longTermFlag: parsed.long_term_flag,
      matchRecommend: parsed.match_recommend,
      matchReason: parsed.match_reason,
      promptVersion: ANALYZE_PROMPT_VERSION,
      llmUsed: MODEL_FAST,
    },
    update: {
      structure: parsed.structure,
      categoryPrimary: parsed.category.primary as Category,
      categorySecondary: parsed.category.secondary as Category | null,
      confidence: parsed.category.confidence,
      timeInfo: parsed.time_info,
      solutionTypeScores: parsed.solution_type_scores,
      selfResolvableScore: parsed.self_resolvable_score,
      coexistSubtype: parsed.coexist_subtype as CoexistSub | null,
      longTermFlag: parsed.long_term_flag,
      matchRecommend: parsed.match_recommend,
      matchReason: parsed.match_reason,
      promptVersion: ANALYZE_PROMPT_VERSION,
      llmUsed: MODEL_FAST,
    },
  });

  await prisma.post.update({
    where: { id: params.postId },
    data: {
      status: "ANALYZED",
      categoryPrimary: parsed.category.primary as Category,
      categorySecondary: parsed.category.secondary as Category | null,
      coexistSubtype: parsed.coexist_subtype as CoexistSub | null,
      longTermFlag: parsed.long_term_flag,
      completedAt: new Date(),
    },
  });

  // 解決の型を3つ選出して記録
  const picked = pickTemplates(
    {
      solutionTypeScores: parsed.solution_type_scores,
      categoryPrimary: parsed.category.primary,
      categorySecondary: parsed.category.secondary,
      coexistSubtype: parsed.coexist_subtype,
    },
    3,
  );

  await prisma.presentedTemplate.deleteMany({ where: { postId: params.postId } });
  for (let i = 0; i < picked.length; i++) {
    await prisma.presentedTemplate.create({
      data: {
        postId: params.postId,
        templateId: picked[i].id,
        order: i,
      },
    });
  }

  return { analysis, picked };
}

function renderDialogue(
  initialText: string,
  turns: { role: string; content: string; turnNumber: number }[],
): string {
  const lines = [`[初回投稿]\n${initialText}`];
  for (const t of turns) {
    const speaker = t.role === "AI" ? "AI" : "ユーザー";
    lines.push(`[${speaker}]\n${t.content}`);
  }
  lines.push("\n上記の対話を読み、分析結果をJSONで返してください。");
  return lines.join("\n\n");
}
