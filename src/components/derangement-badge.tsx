import { Siren } from "lucide-react";

import type { Derangement } from "@/lib/derangement";

const styles: Record<Derangement["label"], string> = {
  tame: "border-wire bg-panel text-ink/70",
  spicy: "border-ink bg-acid text-ink",
  unhinged: "border-ink bg-rust text-white",
  "containment breach": "border-acid bg-ink text-acid"
};

export function DerangementBadge({ derangement, compact = false }: { derangement: Derangement; compact?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-black uppercase ${styles[derangement.label]}`}
      title={`${derangement.score}/100 deranged: ${derangement.tone}`}
    >
      <Siren size={compact ? 12 : 14} />
      {compact ? derangement.score : `${derangement.score} ${derangement.label}`}
    </span>
  );
}
