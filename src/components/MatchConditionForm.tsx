"use client";

import { useState } from "react";
import {
  PREFECTURES,
  AVAILABLE_SLOTS,
  COST_TOLERANCE_OPTIONS,
} from "@/data/prefectures";

type SlotValue = (typeof AVAILABLE_SLOTS)[number]["value"];
type CostValue = (typeof COST_TOLERANCE_OPTIONS)[number]["value"];

type Props = {
  initial: {
    locationRegion: string | null;
    availableSlots: string[];
    costTolerance: string;
    skillTags: string[];
    acceptMatch: boolean;
  } | null;
};

const MAX_SKILL_TAGS = 10;
const MAX_SKILL_LEN = 30;

export function MatchConditionForm({ initial }: Props) {
  const [locationRegion, setLocationRegion] = useState<string>(
    initial?.locationRegion ?? "",
  );
  const [slots, setSlots] = useState<Set<SlotValue>>(
    new Set((initial?.availableSlots ?? []) as SlotValue[]),
  );
  const [costTolerance, setCostTolerance] = useState<CostValue>(
    (initial?.costTolerance as CostValue) ?? "FREE",
  );
  const [skillTags, setSkillTags] = useState<string[]>(
    initial?.skillTags ?? [],
  );
  const [skillInput, setSkillInput] = useState("");
  const [acceptMatch, setAcceptMatch] = useState<boolean>(
    initial?.acceptMatch ?? true,
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const toggleSlot = (v: SlotValue) => {
    setSlots((prev) => {
      const next = new Set(prev);
      if (next.has(v)) next.delete(v);
      else next.add(v);
      return next;
    });
  };

  const addSkill = () => {
    const v = skillInput.trim().slice(0, MAX_SKILL_LEN);
    if (!v) return;
    if (skillTags.includes(v)) {
      setSkillInput("");
      return;
    }
    if (skillTags.length >= MAX_SKILL_TAGS) return;
    setSkillTags([...skillTags, v]);
    setSkillInput("");
  };

  const removeSkill = (v: string) => {
    setSkillTags(skillTags.filter((t) => t !== v));
  };

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/settings/match-condition", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locationRegion: locationRegion || null,
          availableSlots: Array.from(slots),
          costTolerance,
          skillTags,
          acceptMatch,
        }),
      });
      if (res.ok) {
        setMsg("保存しました");
      } else {
        setMsg("保存に失敗しました");
      }
    } catch {
      setMsg("通信エラーが発生しました");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="flex cursor-pointer items-start gap-2">
          <input
            type="checkbox"
            checked={acceptMatch}
            onChange={(e) => setAcceptMatch(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm">
            <span className="font-medium">マッチを受け入れる</span>
            <span className="ml-2 text-xs text-muted">
              オフにすると、新規マッチ候補は作成されません
            </span>
          </span>
        </label>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="region" className="text-sm font-medium">
          都道府県
        </label>
        <p className="text-xs text-muted">
          同じ都道府県のマッチが優先されます。省略するとこの条件は使われません
        </p>
        <select
          id="region"
          value={locationRegion}
          onChange={(e) => setLocationRegion(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          <option value="">未設定</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">利用可能な時間帯</p>
        <p className="text-xs text-muted">
          重なる時間帯の相手とマッチしやすくなります
        </p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_SLOTS.map((s) => {
            const active = slots.has(s.value);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => toggleSlot(s.value)}
                className={`rounded-full border px-3 py-1 text-xs transition ${
                  active
                    ? "border-accent bg-accent text-white"
                    : "border-gray-300 bg-white text-ink hover:bg-gray-50"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">金銭的な許容度</p>
        <p className="text-xs text-muted">
          同じ金額感の相手とマッチしやすくなります (例: 喫茶店代 / 有料相談)
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {COST_TOLERANCE_OPTIONS.map((o) => {
            const active = costTolerance === o.value;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setCostTolerance(o.value)}
                className={`rounded-md border px-2 py-1.5 text-xs transition ${
                  active
                    ? "border-accent bg-accent/5 text-accent"
                    : "border-gray-300 bg-white text-ink hover:bg-gray-50"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="skill" className="text-sm font-medium">
          関連するスキル / 経験のタグ (最大 {MAX_SKILL_TAGS} 個)
        </label>
        <p className="text-xs text-muted">
          例: 転職 / 育児 / うつ経験 / 独学プログラミング
        </p>
        <div className="flex flex-wrap gap-2">
          {skillTags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
            >
              {t}
              <button
                type="button"
                onClick={() => removeSkill(t)}
                className="text-accent hover:text-red-600"
                aria-label={`${t} を削除`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            id="skill"
            type="text"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value.slice(0, MAX_SKILL_LEN))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="タグを入力して Enter"
            disabled={skillTags.length >= MAX_SKILL_TAGS}
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none disabled:opacity-50"
          />
          <button
            type="button"
            onClick={addSkill}
            disabled={!skillInput.trim() || skillTags.length >= MAX_SKILL_TAGS}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs hover:bg-gray-50 disabled:opacity-40"
          >
            追加
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "保存中..." : "マッチ条件を保存"}
        </button>
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </div>
    </div>
  );
}
