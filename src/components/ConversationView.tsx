"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatBubble } from "./ChatBubble";
import { ProgressBar } from "./ProgressBar";
import { QuestionOptions } from "./QuestionOptions";

type Slot = "ORIGIN" | "COURSE" | "PRESENT" | "IDEAL" | "CONSTRAINT";

type Turn = {
  id: string;
  turnNumber: number;
  role: "USER" | "AI";
  content: string;
  questionOptions: { value: string; label: string }[] | null;
  filledSlot: Slot | null;
};

type AITurnResp = {
  acknowledgment: string;
  cumulative_summary: string;
  question: string;
  target_slot: Slot;
  options: { value: string; label: string }[];
  ready_to_analyze: boolean;
};

type Props = {
  postId: string;
  initialTurns: Turn[];
};

const MAX_TURNS = 5;

export function ConversationView({ postId, initialTurns }: Props) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const filledSlots: Slot[] = turns
    .filter((t) => t.role === "AI" && t.filledSlot)
    .map((t) => t.filledSlot as Slot);

  const aiTurnCount = turns.filter((t) => t.role === "AI").length;
  const lastAITurn = [...turns].reverse().find((t) => t.role === "AI");
  const readyToAnalyze = aiTurnCount >= MAX_TURNS;

  const submitResponse = async (payload: {
    selectedOption?: string;
    text?: string;
  }) => {
    setLoading(true);
    try {
      const userContent = [payload.selectedOption, payload.text]
        .filter(Boolean)
        .join(" / ");
      setTurns((prev) => [
        ...prev,
        {
          id: `tmp-u-${Date.now()}`,
          turnNumber: prev.length,
          role: "USER",
          content: userContent,
          questionOptions: null,
          filledSlot: null,
        },
      ]);

      const res = await fetch(`/api/posts/${postId}/turns`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { aiTurn?: AITurnResp; error?: string };
      if (!res.ok || !data.aiTurn) {
        return;
      }

      const a = data.aiTurn;
      const aiContent = [a.acknowledgment, a.cumulative_summary, a.question]
        .filter(Boolean)
        .join("\n\n");

      setTurns((prev) => [
        ...prev,
        {
          id: `tmp-ai-${Date.now()}`,
          turnNumber: prev.length,
          role: "AI",
          content: aiContent,
          questionOptions: a.options,
          filledSlot: a.target_slot,
        },
      ]);

      if (a.ready_to_analyze) {
        // ボタンを明示的に押させる (突然遷移しない)
      }
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/posts/${postId}/analyze`, { method: "POST" });
      if (res.ok) {
        router.push(`/post/${postId}/analysis`);
      }
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5">
      <ProgressBar filledSlots={filledSlots} />

      <div className="space-y-3">
        {turns.map((t) => (
          <ChatBubble key={t.id} role={t.role === "USER" ? "user" : "ai"}>
            {t.content}
          </ChatBubble>
        ))}
        {loading && (
          <ChatBubble role="ai">
            <span className="text-muted">考えています...</span>
          </ChatBubble>
        )}
      </div>

      {!analyzing && lastAITurn && !readyToAnalyze && (
        <div className="sticky bottom-2 space-y-3 rounded-lg border border-gray-200 bg-paper/95 p-4 backdrop-blur">
          <QuestionOptions
            options={lastAITurn.questionOptions ?? []}
            onSubmit={submitResponse}
            disabled={loading}
          />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              ターン {aiTurnCount} / {MAX_TURNS}
            </span>
            <button
              type="button"
              onClick={runAnalysis}
              className="rounded border border-gray-300 bg-white px-3 py-1 hover:bg-gray-50"
            >
              このまま分析する
            </button>
          </div>
        </div>
      )}

      {readyToAnalyze && (
        <div className="space-y-3 rounded-lg border border-accent/30 bg-accent/5 p-4 text-sm">
          <p>ここまで聞かせてくれてありがとうございます。分析に進みます。</p>
          <button
            type="button"
            onClick={runAnalysis}
            disabled={analyzing}
            className="rounded-md bg-accent px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            {analyzing ? "分析中..." : "分析結果を見る"}
          </button>
        </div>
      )}

      {analyzing && !readyToAnalyze && (
        <p className="text-center text-sm text-muted">分析しています...</p>
      )}
    </div>
  );
}
