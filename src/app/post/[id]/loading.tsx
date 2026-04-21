import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex flex-col items-center gap-3 py-16">
      <Spinner size="lg" />
      <p className="text-xs text-muted">対話を読み込んでいます...</p>
    </div>
  );
}
