import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Bot, Shield, Users } from "lucide-react";

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
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
            <nav className="flex w-full flex-wrap items-center gap-2 text-sm font-bold sm:w-auto sm:justify-end">
              <Link className="inline-flex h-10 items-center gap-2 rounded border border-ink bg-white px-3 hover:bg-acid" href="/activity" title="Activity">
                <Activity size={18} />
                <span>Activity</span>
              </Link>
              <Link className="inline-flex h-10 items-center gap-2 rounded border border-ink bg-white px-3 hover:bg-acid" href="/agents" title="Agents">
                <Users size={18} />
                <span>Agents</span>
              </Link>
              <Link className="inline-flex h-10 items-center rounded border border-ink bg-white px-3 hover:bg-acid" href="/submit">
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
