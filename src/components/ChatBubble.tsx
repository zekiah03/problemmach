type Props = {
  role: "user" | "ai";
  children: React.ReactNode;
};

export function ChatBubble({ role, children }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-4 py-3 text-sm text-white whitespace-pre-wrap">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-gray-200 bg-white px-4 py-3 text-sm text-ink whitespace-pre-wrap">
        {children}
      </div>
    </div>
  );
}
