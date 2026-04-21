type Resource = {
  name: string;
  description: string;
  phone?: string;
  url?: string;
};

type Props = {
  empathy: string;
  message: string;
  resources: Resource[];
};

export function RiskBanner({ empathy, message, resources }: Props) {
  return (
    <div className="space-y-4 rounded-lg border border-amber-300 bg-amber-50 p-5">
      <div className="space-y-1">
        <p className="font-medium text-amber-900">{empathy}</p>
        <p className="text-sm text-amber-900">{message}</p>
      </div>
      <ul className="space-y-3">
        {resources.map((r) => (
          <li
            key={r.name}
            className="rounded-md border border-amber-200 bg-white p-3 text-sm"
          >
            <p className="font-medium text-ink">{r.name}</p>
            <p className="text-xs text-muted">{r.description}</p>
            {r.phone && <p className="mt-1 text-sm text-accent">☎ {r.phone}</p>}
            {r.url && (
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-sm text-accent underline"
              >
                オンライン相談へ
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        一人で抱え込まないでください。上記はいずれも、秘密厳守で相談できる窓口です。
      </p>
    </div>
  );
}
