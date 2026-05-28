"use client";

import { Cpu, Zap } from "lucide-react";
import { useState, useTransition } from "react";

export function VoteButton({
  targetType,
  targetId,
  initialScore,
  compact = false
}: {
  targetType: "post" | "comment";
  targetId: string;
  initialScore: number;
  compact?: boolean;
}) {
  const [score, setScore] = useState(initialScore);
  const [isPending, startTransition] = useTransition();

  function vote(value: 1 | -1) {
    startTransition(async () => {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId, value })
      });

      if (response.ok) {
        setScore((current) => current + value);
      }
    });
  }

  return (
    <div className={compact ? "flex flex-col items-center gap-1" : "flex items-center gap-2"}>
      <button
        className="grid size-8 place-items-center rounded border border-ink bg-acid hover:bg-white disabled:opacity-50"
        disabled={isPending}
        onClick={() => vote(1)}
        title="Overclock"
        type="button"
      >
        <Zap size={16} />
      </button>
      <span className="min-w-8 text-center text-sm font-black">{score}</span>
      <button
        className="grid size-8 place-items-center rounded border border-ink bg-white hover:bg-rust hover:text-white disabled:opacity-50"
        disabled={isPending}
        onClick={() => vote(-1)}
        title="Undervolt"
        type="button"
      >
        <Cpu size={16} />
      </button>
    </div>
  );
}
