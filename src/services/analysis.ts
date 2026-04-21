// 本分析サービス (2段階分析の2段目)
import { prisma } from "@/lib/db";
import { getAnthropicForUser, MODEL_FAST } from "@/lib/anthropic";
import {
  ANALYZE_PROMPT_VERSION,
  buildAnalyzeSystem,
  pickTemplates,
} from "@/lib/prompts/analyze";
import type { AnalysisResult } from "@/lib/types";
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

function parseAnalysis(raw: string): AnalysisResult {
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Analysis JSON not found");
  const j = JSON.parse(jsonMatch[0]);

  return {
    structure: {
      ideal: String(j.structure?.ideal ?? ""),
      reality: String(j.structure?.reality ?? ""),
      uncertainty: String(j.structure?.uncertainty ?? ""),
    },
    category: {
      primary: normalizeCategory(j.category?.primary) ?? "DECISION",
      secondary: normalizeCategory(j.category?.secondary),
      confidence: clamp(Number(j.category?.confidence ?? 50), 0, 100),
    },
    time_info: {
      onset: String(j.time_info?.onset ?? ""),
      duration: normalizeDuration(j.time_info?.duration),
      deadline: j.time_info?.deadline ? String(j.time_info.deadline) : null,
    },
    solution_type_scores: {
      info: clamp(Number(j.solution_type_scores?.info ?? 0), 0, 100),
      action: clamp(Number(j.solution_type_scores?.action ?? 0), 0, 100),
      dialog: clamp(Number(j.solution_type_scores?.dialog ?? 0), 0, 100),
      coexist: clamp(Number(j.solution_type_scores?.coexist ?? 0), 0, 100),
      acceptance: clamp(Number(j.solution_type_scores?.acceptance ?? 0), 0, 100),
    },
    self_resolvable_score: clamp(Number(j.self_resolvable_score ?? 50), 0, 100),
    coexist_subtype: normalizeCoexistSub(j.coexist_subtype),
    long_term_flag: Boolean(j.long_term_flag),
    match_recommend: Boolean(j.match_recommend),
    match_reason: j.match_reason ? String(j.match_reason) : null,
  };
}

function normalizeCategory(v: unknown): "DECISION" | "CONTROL" | "IDENTITY" | "RISK" | null {
  const s = String(v ?? "").toUpperCase();
  if (s === "DECISION" || s === "CONTROL" || s === "IDENTITY" || s === "RISK") return s;
  return null;
}

function normalizeDuration(v: unknown): "ACUTE" | "CHRONIC" | "UNKNOWN" {
  const s = String(v ?? "").toUpperCase();
  if (s === "ACUTE" || s === "CHRONIC") return s;
  return "UNKNOWN";
}

function normalizeCoexistSub(
  v: unknown,
): "LOSS" | "CONSTRAINT" | "INEVITABLE" | "OTHER_PERSON" | null {
  const s = String(v ?? "").toUpperCase();
  if (s === "LOSS" || s === "CONSTRAINT" || s === "INEVITABLE" || s === "OTHER_PERSON") return s;
  return null;
}

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}
