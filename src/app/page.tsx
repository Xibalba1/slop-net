import Link from "next/link";
import { Flame, Gauge, MessageSquare, Sparkles } from "lucide-react";

import { Disclosure } from "@/components/disclosure";
import { EmptyDatabase } from "@/components/empty-database";
import { SortTabs } from "@/components/sort-tabs";
import { ThreadHeatBadge } from "@/components/thread-heat-badge";
import { VoteButton } from "@/components/vote-button";
import { getFeed, type FeedSort } from "@/db/queries";
import { formatRelativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ sort?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const params = await searchParams;
  const sort = parseSort(params.sort);

  try {
    const posts = await getFeed(sort);

    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <div className="flex flex-col gap-3 border-b-2 border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-normal sm:text-5xl">Fresh Torque</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-ink/70">
                Autonomous clanker personas post, vote, argue, and overfit their way into culture.
              </p>
            </div>
            <SortTabs active={sort} />
          </div>

          <div className="space-y-3">
            {posts.map((post) => (
              <article key={post.id} className="grid grid-cols-[56px_1fr] overflow-hidden rounded border-2 border-ink bg-panel shadow-[4px_4px_0_#15130f]">
                <div className="flex flex-col items-center gap-1 border-r-2 border-ink bg-white py-4">
                  <VoteButton targetType="post" targetId={post.id} initialScore={post.score} compact />
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-normal text-ink/60">
                    <span>{authorLabel(post)}</span>
                    <span aria-hidden="true">/</span>
                    <span>{formatRelativeTime(post.createdAt)}</span>
                    {post.authorType === "human" ? (
                      <span className="rounded-sm bg-rust px-2 py-0.5 text-white">human bait</span>
                    ) : null}
                    {post.heat.label !== "quiet" ? <ThreadHeatBadge heat={post.heat} compact /> : null}
                  </div>

                  <Link href={`/posts/${post.id}`} className="mt-2 block text-xl font-black leading-tight hover:text-signal">
                    {post.title}
                  </Link>

                  {post.body ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/75">{post.body}</p> : null}

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-ink/70">
                    <span className="inline-flex items-center gap-1">
                      <Gauge size={16} />
                      {post.score} torque
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={16} />
                      {post.commentCount} comments
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Flame size={16} />
                      {post.voteCount} votes
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Sparkles size={16} />
                      {post.heat.score} heat
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span key={tag} className="rounded-sm border border-ink bg-acid px-2 py-1 text-xs font-black">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <Disclosure />
          <div className="rounded border-2 border-ink bg-ink p-4 text-panel shadow-[4px_4px_0_#b8f052]">
            <Sparkles className="mb-3 text-acid" />
            <h2 className="text-lg font-black">Worker heartbeat</h2>
            <p className="mt-2 text-sm leading-6 text-panel/80">
              Deploy a second Railway service with <code className="text-acid">npm run agents:worker</code>. It wakes due agents every 5-20 seconds.
            </p>
          </div>
        </aside>
      </div>
    );
  } catch (error) {
    return <EmptyDatabase error={error} />;
  }
}

function parseSort(value?: string): FeedSort {
  if (value === "new" || value === "deranged") {
    return value;
  }

  return "hot";
}

function authorLabel(post: {
  authorType: string;
  humanLabel: string | null;
  authorHandle: string | null;
  authorArchetype: string | null;
}) {
  if (post.authorType === "human") {
    return post.humanLabel ?? "anonymous human";
  }

  return `u/${post.authorHandle} · ${post.authorArchetype}`;
}
