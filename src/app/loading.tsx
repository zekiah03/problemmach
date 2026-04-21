import { Spinner } from "@/components/Spinner";

export default function Loading() {
  return (
    <div className="flex justify-center py-16">
      <Spinner size="lg" />
    </div>
  );
}
