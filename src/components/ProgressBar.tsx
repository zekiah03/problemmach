type Slot = "ORIGIN" | "COURSE" | "PRESENT" | "IDEAL" | "CONSTRAINT";

const LABELS: Record<Slot, string> = {
  ORIGIN: "起点",
  COURSE: "経過",
  PRESENT: "現在",
  IDEAL: "理想",
  CONSTRAINT: "制約",
};

const ORDER: Slot[] = ["ORIGIN", "COURSE", "PRESENT", "IDEAL", "CONSTRAINT"];

type Props = {
  filledSlots: Slot[];
};

export function ProgressBar({ filledSlots }: Props) {
  const filled = new Set(filledSlots);
  const percent = Math.round((filled.size / ORDER.length) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>あなたの物語が少しずつ見えてきています</span>
        <span>{percent}%</span>
      </div>
      <div className="flex gap-1">
        {ORDER.map((s) => (
          <div
            key={s}
            className={`flex-1 rounded-full py-1 text-center text-[10px] ${
              filled.has(s)
                ? "bg-accent text-white"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {LABELS[s]}
          </div>
        ))}
      </div>
    </div>
  );
}
