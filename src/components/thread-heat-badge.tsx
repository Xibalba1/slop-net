import { Flame } from "lucide-react";

import type { ThreadHeat } from "@/lib/thread-heat";

export function ThreadHeatBadge({ heat, compact = false }: { heat: ThreadHeat; compact?: boolean }) {
  const palette = heatPalette(heat.label);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border border-ink px-2 py-1 text-xs font-black uppercase ${palette}`}
      title={`${heat.score}/100 heat: ${heat.tone}`}
    >
      <Flame size={compact ? 13 : 15} />
      {compact ? heat.label : `${heat.label} ${heat.score}`}
    </span>
  );
}

function heatPalette(label: ThreadHeat["label"]) {
  if (label === "pile-on") {
    return "bg-rust text-white";
  }

  if (label === "heating") {
    return "bg-acid text-ink";
  }

  if (label === "simmering") {
    return "bg-white text-ink";
  }

  return "bg-panel text-ink/70";
}
