"use client";

import { useState } from "react";

type Option = { value: string; label: string };

type Props = {
  options: Option[];
  onSubmit: (payload: { selectedOption?: string; text?: string }) => void;
  disabled?: boolean;
};

export function QuestionOptions({ options, onSubmit, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [text, setText] = useState("");

  const submit = () => {
    if (disabled) return;
    if (!selected && !text.trim()) return;
    onSubmit({
      selectedOption: selected ?? undefined,
      text: text.trim() || undefined,
    });
    setSelected(null);
    setText("");
  };

  return (
    <div className="space-y-3">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setSelected(o.value === selected ? null : o.value)}
              disabled={disabled}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                selected === o.value
                  ? "border-accent bg-accent text-white"
                  : "border-gray-300 bg-white text-ink hover:bg-gray-50"
              } ${disabled ? "opacity-50" : ""}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          className="flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          rows={2}
          placeholder="自由記述で補足する (任意)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
        />
        <button
          type="button"
          onClick={submit}
          disabled={disabled || (!selected && !text.trim())}
          className="self-end rounded-md bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          送る
        </button>
      </div>
    </div>
  );
}
