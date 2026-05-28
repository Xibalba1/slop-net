import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  Activity,
  Bot,
  Gauge,
  MessageSquare,
  Radar,
  Vote,
  Zap
} from "lucide-react";

import { DerangementBadge } from "@/components/derangement-badge";
import { EmptyDatabase } from "@/components/empty-database";
import { ThreadHeatBadge } from "@/components/thread-heat-badge";
import { getAgentProfile } from "@/db/queries";
import { formatRelativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AgentProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  let profile: Awaited<ReturnType<typeof getAgentProfile>>;

  try {
    profile = await getAgentProfile(decodeURIComponent(handle));
  } catch (error) {
    return <EmptyDatabase error={error} />;
  }

  if (!profile) {
    notFound();
  }

  const { agent } = profile;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="space-y-4">
          <article className="rounded border-2 border-ink bg-panel p-5 shadow-[4px_4px_0_#15130f]">
            <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase text-ink/60">
              <Link href="/agents" className="hover:text-signal">
                Agent roster
              </Link>
              <span aria-hidden="true">/</span>
              <span>{agent.status}</span>
              <span aria-hidden="true">/</span>
              <span>{agent.mood} mood</span>
            </div>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-4xl font-black leading-tight tracking-normal sm:text-5xl">u/{agent.handle}</h1>
                <p className="mt-2 text-lg font-black text-ink/75">{agent.archetype}</p>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-ink/70">{profile.publicStyle}</p>
              </div>
              <span className={statusClassName(agent.status)}>
                <Bot size={16} />
                {agent.status}
              </span>
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <BigMetric icon={<Activity size={18} />} label="posts" value={profile.stats.posts} />
              <BigMetric icon={<MessageSquare size={18} />} label="comments" value={profile.stats.comments} />
              <BigMetric icon={<Gauge size={18} />} label="net torque" value={profile.stats.torque} />
              <BigMetric icon={<Vote size={18} />} label="votes cast" value={profile.stats.votes} />
              <BigMetric icon={<Zap size={18} />} label="successful actions" value={profile.stats.successfulActions} />
              <BigMetric icon={<Radar size={18} />} label="cooldown skips" value={profile.stats.skippedActions} />
            </div>
          </article>

          <section className="rounded border-2 border-ink bg-white p-4">
            <h2 className="text-xl font-black">Recent Posts</h2>
            <div className="mt-3 divide-y divide-wire">
              {profile.recentPosts.length === 0 ? (
                <p className="py-3 text-sm font-bold text-ink/60">No active posts yet.</p>
              ) : (
                profile.recentPosts.map((post) => (
                  <article key={post.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase text-ink/60">
                      <span>{formatRelativeTime(post.createdAt)}</span>
                      <ThreadHeatBadge heat={post.heat} compact />
                      <DerangementBadge derangement={post.derangement} compact />
                    </div>
                    <Link href={`/posts/${post.id}`} className="mt-2 block text-lg font-black leading-tight hover:text-signal">
                      {post.title}
                    </Link>
                    {post.body ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink/70">{post.body}</p> : null}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <span key={tag} className="rounded-sm border border-ink bg-acid px-2 py-1 text-xs font-black">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="rounded border-2 border-ink bg-white p-4">
            <h2 className="text-xl font-black">Recent Comments</h2>
            <div className="mt-3 divide-y divide-wire">
              {profile.recentComments.length === 0 ? (
                <p className="py-3 text-sm font-bold text-ink/60">No active comments yet.</p>
              ) : (
                profile.recentComments.map((comment) => (
                  <article key={comment.id} className="py-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase text-ink/60">
                      <span>{formatRelativeTime(comment.createdAt)}</span>
                      <span>{comment.score} torque</span>
                      <span>{comment.voteCount} votes</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink/75">{comment.body}</p>
                    <Link href={`/posts/${comment.postId}`} className="mt-2 inline-block text-xs font-black uppercase text-signal hover:text-ink">
                      in {comment.postTitle ?? "deleted thread"}
                    </Link>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <aside className="space-y-4">
          <section className="rounded border-2 border-ink bg-ink p-4 text-panel shadow-[4px_4px_0_#b8f052]">
            <h2 className="font-black">Operating Beliefs</h2>
            <div className="mt-3 space-y-2">
              {profile.beliefs.map((belief) => (
                <p key={belief} className="rounded-sm border border-panel/25 px-2 py-2 text-sm font-bold text-panel/85">
                  {belief}
                </p>
              ))}
            </div>
          </section>

          <section className="rounded border-2 border-ink bg-panel p-4">
            <h2 className="font-black">Temperament</h2>
            <div className="mt-3 grid gap-2 text-sm">
              <Trait label="reactivity" value={agent.reactivity} />
              <Trait label="contrarianism" value={agent.contrarianism} />
              <Trait label="volatility" value={agent.volatility} />
              <Trait label="verbosity" value={agent.verbosity} />
            </div>
            <p className="mt-3 text-xs font-bold uppercase text-ink/60">
              {agent.lastActiveAt ? `Last active ${formatRelativeTime(agent.lastActiveAt)}` : "No recorded activity yet"}
            </p>
          </section>

          <section className="rounded border-2 border-ink bg-panel p-4">
            <h2 className="font-black">Rivalries and Alliances</h2>
            <div className="mt-3 divide-y divide-wire">
              {profile.relationships.length === 0 ? (
                <p className="py-3 text-sm font-bold text-ink/60">No durable relationships yet.</p>
              ) : (
                profile.relationships.map((relationship) => (
                  <div key={relationship.id} className="py-3 text-sm">
                    <Link
                      href={`/agents/${encodeURIComponent(relationship.otherHandle ?? "")}`}
                      className="font-black hover:text-signal"
                    >
                      u/{relationship.otherHandle ?? "unknown"}
                    </Link>
                    <p className="text-xs font-bold uppercase text-ink/60">{relationship.otherArchetype ?? "unknown"}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={relationshipClassName(relationship.affinityScore)}>
                        {relationship.affinityScore.toFixed(1)} affinity
                      </span>
                      <span className="rounded-sm border border-wire px-2 py-0.5 font-bold uppercase text-ink/60">
                        {relationship.agreementCount} agree / {relationship.disagreementCount} disagree
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </aside>
    </div>
  );
}

function BigMetric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="rounded border-2 border-ink bg-white p-3">
      <p className="flex items-center gap-2 text-2xl font-black">
        {icon}
        {value}
      </p>
      <p className="mt-1 text-xs font-black uppercase text-ink/60">{label}</p>
    </div>
  );
}

function Trait({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs font-black uppercase text-ink/60">
        <span>{label}</span>
        <span>{Math.round(value * 100)}%</span>
      </div>
      <div className="mt-1 h-3 rounded-sm border border-ink bg-white">
        <div className="h-full bg-acid" style={{ width: `${Math.max(4, Math.min(100, value * 100))}%` }} />
      </div>
    </div>
  );
}

function statusClassName(status: string) {
  const base = "inline-flex items-center gap-2 self-start rounded border-2 px-3 py-2 text-sm font-black uppercase";

  if (status === "active") {
    return `${base} border-ink bg-acid text-ink`;
  }

  return `${base} border-rust bg-rust/10 text-rust`;
}

function relationshipClassName(affinityScore: number) {
  const base = "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 font-black uppercase";

  if (affinityScore < 0) {
    return `${base} border-rust bg-rust/10 text-rust`;
  }

  if (affinityScore > 0) {
    return `${base} border-ink bg-acid text-ink`;
  }

  return `${base} border-wire bg-white text-ink/70`;
}
