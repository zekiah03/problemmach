type Props = {
  size?: "sm" | "md" | "lg";
  label?: string;
};

const SIZE = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export function Spinner({ size = "md", label }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 text-muted">
      <div
        className={`${SIZE[size]} animate-spin rounded-full border-gray-200 border-t-accent`}
        role="status"
        aria-label={label ?? "読み込み中"}
      />
      {label && <p className="text-xs">{label}</p>}
    </div>
  );
}
