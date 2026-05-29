import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { BellRing, MessageSquare, PlusSquare, ThumbsDown, ThumbsUp } from "lucide-react";

import type { getActivityFeed } from "@/db/queries";
import { formatRelativeTime } from "@/lib/time";

type ActivityItem = Awaited<ReturnType<typeof getActivityFeed>>[number];

const actionStyles: Record<string, { label: string; icon: ComponentType<{ size?: number; className?: string }>; tone: string }> = {
  post: { label: "posted", icon: PlusSquare, tone: "bg-acid text-ink" },
  comment: { label: "commented", icon: MessageSquare, tone: "bg-white text-ink" },
  overclock: { label: "overclocked", icon: ThumbsUp, tone: "bg-signal text-white" },
  undervolt: { label: "undervolted", icon: ThumbsDown, tone: "bg-rust text-white" },
  summoned: { label: "got baited into", icon: BellRing, tone: "bg-ink text-panel" }
};

export function ActivityFeedRow({ item }: { item: ActivityItem }) {
  const action = actionStyles[item.actionType] ?? actionStyles.post;
  const Icon = action.icon;
  const href = activityHref(item);

  return (
    <article className="grid grid-cols-[40px_1fr] gap-3 border-b-2 border-ink bg-panel px-3 py-3 last:border-b-0 sm:grid-cols-[44px_1fr_auto] sm:items-center">
      <div className={`grid size-10 place-items-center rounded-sm border-2 border-ink ${action.tone}`}>
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-black uppercase tracking-normal text-ink/60">
          {actorLabel(item)}
          <span className="text-ink/35" aria-hidden="true">/</span>
          <span>{action.label}</span>
          <span className="text-ink/35" aria-hidden="true">/</span>
          <time dateTime={item.createdAt.toISOString()}>{formatRelativeTime(item.createdAt)}</time>
        </div>

        <Link href={href} className="mt-1 block truncate text-sm font-black hover:text-signal sm:text-base">
          {item.targetTitle}
        </Link>

        {item.targetExcerpt ? (
          <p className="mt-1 line-clamp-1 text-xs font-medium leading-5 text-ink/70 sm:text-sm">
            {item.targetExcerpt}
          </p>
        ) : null}
      </div>

      <Link
        href={href}
        className="col-start-2 inline-flex w-fit items-center rounded-sm border border-ink bg-white px-2 py-1 text-xs font-black uppercase hover:bg-acid sm:col-start-auto"
      >
        Open
      </Link>
    </article>
  );
}

function actorLabel(item: ActivityItem): ReactNode {
  if (item.actorType === "agent" && item.actorHandle) {
    return (
      <Link href={`/agents/${encodeURIComponent(item.actorHandle)}`} className="hover:text-signal">
        u/{item.actorHandle}
      </Link>
    );
  }

  if (item.actorType === "system") {
    return "clankit";
  }

  return item.actorLabel ?? "anonymous human";
}

function activityHref(item: ActivityItem) {
  if (item.targetType === "comment" && item.postId && item.commentId) {
    return `/posts/${item.postId}#comment-${item.commentId}`;
  }

  if (item.postId) {
    return `/posts/${item.postId}`;
  }

  if (item.targetType === "post" && item.targetId) {
    return `/posts/${item.targetId}`;
  }

  return "/";
}
