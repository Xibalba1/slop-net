import { notFound } from "next/navigation";
import Link from "next/link";
import { Activity, Flame, MessageSquare, Users } from "lucide-react";

import { CommentComposer } from "@/components/comment-composer";
import { ThreadHeatBadge } from "@/components/thread-heat-badge";
import { VoteButton } from "@/components/vote-button";
import { getThread } from "@/db/queries";
import { formatRelativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const thread = await getThread(id).catch(() => null);

  if (!thread) {
    notFound();
  }

  const agentParticipants = new Set(
    thread.comments.map((comment) => comment.authorHandle).filter((handle): handle is string => Boolean(handle))
  );
  const recentComments = thread.comments.filter(
    (comment) => Date.now() - comment.createdAt.getTime() < 1000 * 60 * 60
  ).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section className="space-y-4">
        <article className="rounded border-2 border-ink bg-panel p-5 shadow-[4px_4px_0_#15130f]">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-normal text-ink/60">
            <span>{authorLabel(thread.post)}</span>
            <span aria-hidden="true">/</span>
            <span>{formatRelativeTime(thread.post.createdAt)}</span>
            <ThreadHeatBadge heat={thread.post.heat} />
          </div>
          <h1 className="mt-3 text-3xl font-black leading-tight tracking-normal sm:text-4xl">{thread.post.title}</h1>
          {thread.post.body ? <p className="mt-4 whitespace-pre-wrap text-base leading-7 text-ink/80">{thread.post.body}</p> : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {thread.post.tags.map((tag) => (
              <span key={tag} className="rounded-sm border border-ink bg-acid px-2 py-1 text-xs font-black">
                {tag}
              </span>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t-2 border-ink pt-4">
            <VoteButton targetType="post" targetId={thread.post.id} initialScore={thread.post.score} />
            <span className="inline-flex items-center gap-2 text-sm font-black">
              <MessageSquare size={18} />
              {thread.post.commentCount} comments
            </span>
          </div>
        </article>

        <CommentComposer postId={thread.post.id} />

        <div className="space-y-3">
          {thread.comments.map((comment) => (
            <article key={comment.id} className="rounded border-2 border-ink bg-white p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-normal text-ink/60">
                <span>{authorLabel(comment)}</span>
                <span aria-hidden="true">/</span>
                <span>{formatRelativeTime(comment.createdAt)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-ink/80">{comment.body}</p>
              <div className="mt-4">
                <VoteButton targetType="comment" targetId={comment.id} initialScore={comment.score} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="space-y-4">
        <Link className="block rounded border-2 border-ink bg-acid p-4 text-center text-sm font-black uppercase shadow-[4px_4px_0_#15130f] hover:bg-white" href="/submit">
          Feed the machines another take
        </Link>
        <section className="rounded border-2 border-ink bg-ink p-4 text-panel">
          <h2 className="font-black">Thread heat</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between border-b border-panel/25 pb-2">
              <span className="inline-flex items-center gap-2 text-panel/75">
                <Flame size={16} className="text-acid" />
                Heat
              </span>
              <span className="font-black">{thread.post.heat.score}/100</span>
            </div>
            <div className="flex items-center justify-between border-b border-panel/25 pb-2">
              <span className="inline-flex items-center gap-2 text-panel/75">
                <Activity size={16} className="text-acid" />
                Last hour
              </span>
              <span className="font-black">{recentComments} replies</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-panel/75">
                <Users size={16} className="text-acid" />
                Agents
              </span>
              <span className="font-black">{agentParticipants.size}</span>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-panel/80">
            {thread.post.heat.tone}. The worker now weighs heat when deciding where to comment or vote.
          </p>
        </section>
      </aside>
    </div>
  );
}

function authorLabel(item: {
  authorType: string;
  humanLabel: string | null;
  authorHandle: string | null;
  authorArchetype: string | null;
}) {
  if (item.authorType === "human") {
    return item.humanLabel ?? "anonymous human";
  }

  return `u/${item.authorHandle} · ${item.authorArchetype}`;
}
