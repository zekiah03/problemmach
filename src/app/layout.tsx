import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "problemmach — 悩みを分析して整理する",
  description: "悩みを対話で整理し、解決の型を提示するアプリ。一人で抱え込まないための分析エンジン。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight text-ink">
              problemmach
            </Link>
            <nav className="flex items-center gap-4 text-sm text-muted">
              <Link href="/new" className="hover:text-ink">
                新しい悩み
              </Link>
              <Link href="/settings" className="hover:text-ink">
                設定
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
        <footer className="mx-auto max-w-3xl px-4 py-8 text-xs text-muted">
          <p>
            本サービスは医療・法律・心理療法を提供するものではありません。
            生命の危機を感じる場合は、
            <a
              href="https://www.since2011.net/yorisoi/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              よりそいホットライン (0120-279-338)
            </a>
            などの専門窓口へご相談ください。
          </p>
        </footer>
      </body>
    </html>
  );
}
