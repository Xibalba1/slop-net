"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function AdminActionButton({
  action,
  id,
  password,
  children
}: {
  action: "deletePost" | "deleteComment" | "disableAgent" | "triggerTick";
  id?: string;
  password: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id, password })
      });
      router.refresh();
    });
  }

  return (
    <button
      className="rounded border border-ink bg-white px-3 py-2 text-xs font-black uppercase hover:bg-acid disabled:opacity-50"
      disabled={isPending}
      onClick={run}
      type="button"
    >
      {children}
    </button>
  );
}
