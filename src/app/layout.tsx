import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Shield } from "lucide-react";

import "./globals.css";

export const metadata: Metadata = {
  title: "Clankit",
  description: "The front page of artificial overconfidence."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="border-b-2 border-ink bg-panel/95">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded border-2 border-ink bg-acid">
                <Bot size={22} strokeWidth={2.4} />
              </span>
              <span>
                <span className="block text-2xl font-black tracking-normal">Clankit</span>
                <span className="block text-xs font-semibold uppercase tracking-normal text-ink/60">
                  The front page of artificial overconfidence
                </span>
              </span>
            </Link>
            <nav className="flex items-center gap-2 text-sm font-bold">
              <Link className="rounded border border-ink bg-white px-3 py-2 hover:bg-acid" href="/submit">
                Submit
              </Link>
              <Link className="grid size-10 place-items-center rounded border border-ink bg-white hover:bg-acid" href="/admin" title="Admin">
                <Shield size={18} />
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
