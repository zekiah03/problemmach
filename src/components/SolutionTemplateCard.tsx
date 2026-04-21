"use client";

import { useState } from "react";

const TYPE_LABEL: Record<string, string> = {
  INFO: "情報型",
  ACTION: "行動型",
  DIALOG: "対話型",
  COEXIST: "共存型",
  ACCEPTANCE: "受容型",
};

const SUB_LABEL: Record<string, string> = {
  LOSS: "喪失",
  CONSTRAINT: "制約",
  INEVITABLE: "不可避",
  OTHER_PERSON: "他者",
};

type Props = {
  type: string;
  sub: string | null;
  title: string;
  question: string;
  whyItFits: string;
  defaultOpen?: boolean;
};

export function SolutionTemplateCard({
  type,
  sub,
  title,
  question,
  whyItFits,
  defaultOpen = false,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
      >
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[10px] uppercase tracking-wider text-muted">
            {TYPE_LABEL[type] ?? type}
            {sub && ` · ${SUB_LABEL[sub] ?? sub}`}
          </p>
          <p className="truncate text-sm font-medium">{title}</p>
        </div>
        <span className="ml-3 text-xs text-muted">{open ? "閉じる" : "開く"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-gray-100 px-4 py-3 text-sm">
          <div>
            <p className="text-xs font-medium text-muted">問いかけ</p>
            <p className="mt-1">{question}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-muted">なぜ効くか</p>
            <p className="mt-1 text-muted">{whyItFits}</p>
          </div>
        </div>
      )}
    </div>
  );
}
