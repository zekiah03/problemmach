"use client";

import { useCallback, useEffect, useState } from "react";
import { ChatBubble } from "./ChatBubble";
import { ReportButton } from "./ReportButton";
import { FLAG_WARNING } from "@/lib/chat-moderation";

type Message = {
  id: string;
  senderUserId: string;
  content: string;
  moderationFlag: string | null;
  createdAt: string;
};

type Props = {
  roomId: string;
  myUserId: string;
  initialMessages: Message[];
  status: string;
};

const POLL_INTERVAL = 5000;

export function ChatView({ roomId, myUserId, initialMessages, status }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/chat/${roomId}/messages`);
      if (!res.ok) return;
      const data = (await res.json()) as { messages: Message[] };
      setMessages(data.messages);
    } catch {
      // ignore
    }
  }, [roomId]);

  useEffect(() => {
    if (status !== "ACTIVE") return;
    const t = setInterval(fetchMessages, POLL_INTERVAL);
    return () => clearInterval(t);
  }, [fetchMessages, status]);

  const send = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/chat/${roomId}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました");
        return;
      }
      setMessages((prev) => [...prev, data.message]);
      setInput("");
    } catch {
      setError("通信エラー");
    } finally {
      setSending(false);
    }
  };

  if (status === "REPORTED") {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        このチャットは通報があり、一時的に停止されています。運営で確認します。
      </div>
    );
  }

  if (status === "CLOSED") {
    return (
      <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-sm text-muted">
        このチャットは終了しました。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted">
            まだメッセージはありません。最初のひと言を書いてみましょう。
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-1">
            <ChatBubble role={m.senderUserId === myUserId ? "user" : "ai"}>
              {m.content}
            </ChatBubble>
            {m.moderationFlag && (
              <div className="flex items-center justify-end gap-2">
                <p className="text-[10px] text-amber-700">
                  ⚠ {FLAG_WARNING[m.moderationFlag as keyof typeof FLAG_WARNING] ??
                    "注意の文言が含まれています"}
                </p>
                {m.senderUserId !== myUserId && (
                  <ReportButton
                    targetType="MESSAGE"
                    targetId={m.id}
                    label="通報"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sticky bottom-2 space-y-2 rounded-lg border border-gray-200 bg-paper/95 p-3 backdrop-blur">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="メッセージを書く..."
          maxLength={2000}
          className="w-full resize-none rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-muted">
            金銭の要求、外部SNSへの誘導は通報対象です。
          </p>
          <button
            type="button"
            onClick={send}
            disabled={sending || !input.trim()}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            送る
          </button>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    </div>
  );
}
