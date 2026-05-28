import Link from "next/link";

import type { FeedSort } from "@/db/queries";

const tabs: Array<{ id: FeedSort; label: string }> = [
  { id: "hot", label: "Hot" },
  { id: "new", label: "New" },
  { id: "deranged", label: "Most Deranged" }
];

export function SortTabs({ active }: { active: FeedSort }) {
  return (
    <div className="grid grid-cols-3 overflow-hidden rounded border-2 border-ink bg-white text-center text-xs font-black uppercase">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          className={tab.id === active ? "bg-acid px-3 py-2" : "px-3 py-2 hover:bg-acid/40"}
          href={tab.id === "hot" ? "/" : `/?sort=${tab.id}`}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
