"use client";

import { useState } from "react";

const PERSONA_OPTIONS = [
  { value: "FLAT_POLITE", label: "フラット (敬語)", hint: "です・ます調、柔らかい相談役" },
  { value: "FLAT_CASUAL", label: "フラット (ため口)", hint: "距離近め、でも落ち着いた相談役" },
  { value: "EXPERT", label: "専門家風 (敬語)", hint: "理性的に整理するトーン" },
  { value: "FRIEND", label: "友達風 (ため口)", hint: "共感前面、カジュアル" },
] as const;

type Persona = (typeof PERSONA_OPTIONS)[number]["value"];

type Props = {
  initialPersona: Persona;
  hasApiKey: boolean;
};

export function SettingsForm({ initialPersona, hasApiKey }: Props) {
  const [persona, setPersona] = useState<Persona>(initialPersona);
  const [personaSaving, setPersonaSaving] = useState(false);
  const [personaSaved, setPersonaSaved] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(hasApiKey);
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);

  const savePersona = async (p: Persona) => {
    setPersona(p);
    setPersonaSaving(true);
    setPersonaSaved(false);
    try {
      const res = await fetch("/api/settings/persona", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ persona: p }),
      });
      if (res.ok) setPersonaSaved(true);
    } finally {
      setPersonaSaving(false);
    }
  };

  const saveKey = async () => {
    if (!apiKey.trim()) return;
    setKeyBusy(true);
    setKeyMsg(null);
    try {
      const res = await fetch("/api/settings/apikey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      if (res.ok) {
        setHasKey(true);
        setApiKey("");
        setKeyMsg("保存しました");
      } else {
        setKeyMsg("保存に失敗しました");
      }
    } finally {
      setKeyBusy(false);
    }
  };

  const deleteKey = async () => {
    setKeyBusy(true);
    setKeyMsg(null);
    try {
      const res = await fetch("/api/settings/apikey", { method: "DELETE" });
      if (res.ok) {
        setHasKey(false);
        setKeyMsg("削除しました");
      }
    } finally {
      setKeyBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
          AI の口調
        </h2>
        <div className="grid gap-2 md:grid-cols-2">
          {PERSONA_OPTIONS.map((p) => (
            <label
              key={p.value}
              className={`cursor-pointer rounded-md border p-3 text-sm ${
                persona === p.value
                  ? "border-accent bg-accent/5"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="persona"
                value={p.value}
                checked={persona === p.value}
                onChange={() => savePersona(p.value)}
                disabled={personaSaving}
                className="sr-only"
              />
              <p className="font-medium">{p.label}</p>
              <p className="mt-0.5 text-xs text-muted">{p.hint}</p>
            </label>
          ))}
        </div>
        {personaSaved && (
          <p className="text-xs text-muted">保存しました</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted">
          API キー (上級者向け・任意)
        </h2>
        <p className="text-xs text-muted">
          Anthropic の API キーを設定すると、あなたの分析はあなたのキーで実行されます。
          未設定の場合は運営キーが使われます。キーはサーバーで暗号化して保管します。
        </p>
        {hasKey ? (
          <div className="flex items-center gap-3 rounded-md border border-gray-200 bg-white p-3 text-sm">
            <span className="text-muted">API キーは保存されています</span>
            <button
              type="button"
              onClick={deleteKey}
              disabled={keyBusy}
              className="ml-auto rounded-md border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50"
            >
              削除
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-ant-..."
              className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
              disabled={keyBusy}
            />
            <button
              type="button"
              onClick={saveKey}
              disabled={keyBusy || !apiKey.trim()}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              保存
            </button>
          </div>
        )}
        {keyMsg && <p className="text-xs text-muted">{keyMsg}</p>}
      </section>
    </div>
  );
}
