import { PostForm } from "@/components/PostForm";

export default function NewPostPage() {
  return (
    <div className="space-y-6 py-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">悩みを書きはじめる</h1>
        <p className="text-sm text-muted">
          自由に書いてください。書き終えたあと、AI が対話で整理を手伝います。
        </p>
      </div>
      <PostForm />
    </div>
  );
}
