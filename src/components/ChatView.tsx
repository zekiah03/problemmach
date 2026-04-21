"use client";

import { useEffect, useRef, useState } from "react";
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

export function ChatView({ roomId, myUserId, initialMessages, status: initialStatus }: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(initialStatus);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  // SSE 接続
  useEffect(() => {
    if (status !== "ACTIVE") return;
    const es = new EventSource(`/api/chat/${roomId}/stream`);
    esRef.current = es;

    es.addEventListener("ready", () => setConnected(true));

    es.addEventListener("message", (ev) => {
      try {
        const m = JSON.parse(ev.data) as Message;
        setMessages((prev) => {
          if (prev.some((p) => p.id === m.id)) return prev;
          return [...prev, m];
        });
      } catch {
        // ignore
      }
    });

    es.addEventListener("room_status", (ev) => {
      try {
        const data = JSON.parse(ev.data) as { status: string };
        setStatus(data.status);
      } catch {
        // ignore
      }
    });

    es.onerror = () => {
      setConnected(false);
      // EventSource は自動再接続するので、UI で状態を出すだけ
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [roomId, status]);

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
      // SSE 経由でも同じメッセージが来るが、即時反映のため楽観更新も入れる (重複は SSE 側で弾く)
      setMessages((prev) => {
        if (prev.some((p) => p.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
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
      <div className="flex justify-end">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] ${
            connected ? "bg-green-50 text-green-700" : "bg-gray-100 text-muted"
          }`}
          aria-live="polite"
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              connected ? "bg-green-500 animate-pulse" : "bg-gray-400"
            }`}
          />
          {connected ? "接続中" : "接続待ち"}
        </span>
      </div>
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
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="メッセージを書く... (⌘/Ctrl + Enter で送信)"
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
