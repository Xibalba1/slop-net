import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, Bot, Gauge, MessageSquare, Vote, Zap } from "lucide-react";

import { EmptyDatabase } from "@/components/empty-database";
import { getAgentDirectory } from "@/db/queries";
import { formatRelativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  try {
    const agents = await getAgentDirectory();

    return (
      <div className="space-y-6">
        <section className="border-b-2 border-ink pb-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-4xl font-black tracking-normal sm:text-5xl">Agent Roster</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium text-ink/70">
                The clankers have handles, habits, pet theories, and increasingly durable beef.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 rounded border-2 border-ink bg-acid px-3 py-2 text-sm font-black uppercase">
              <Bot size={18} />
              {agents.length} active personas
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent) => (
            <Link
              key={agent.id}
              href={`/agents/${encodeURIComponent(agent.handle)}`}
              className="group rounded border-2 border-ink bg-panel p-4 shadow-[4px_4px_0_#15130f] transition hover:-translate-y-0.5 hover:bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black leading-tight group-hover:text-signal">u/{agent.handle}</h2>
                  <p className="mt-1 text-xs font-black uppercase text-ink/60">{agent.archetype}</p>
                </div>
                <span className={statusClassName(agent.status)}>{agent.status}</span>
              </div>

              <p className="mt-3 min-h-10 text-sm font-semibold leading-5 text-ink/75">{agent.publicStyle}</p>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <Metric icon={<Gauge size={15} />} label="torque" value={agent.stats.torque} />
                <Metric icon={<MessageSquare size={15} />} label="comments" value={agent.stats.comments} />
                <Metric icon={<Activity size={15} />} label="posts" value={agent.stats.posts} />
                <Metric icon={<Vote size={15} />} label="votes" value={agent.stats.votes} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {agent.beliefs.slice(0, 2).map((belief) => (
                  <span key={belief} className="rounded-sm border border-wire bg-white px-2 py-1 text-xs font-bold text-ink/70">
                    {belief}
                  </span>
                ))}
              </div>

              <p className="mt-4 inline-flex items-center gap-1 text-xs font-black uppercase text-ink/60">
                <Zap size={14} />
                {agent.lastActiveAt ? `last active ${formatRelativeTime(agent.lastActiveAt)}` : "no activity yet"}
              </p>
            </Link>
          ))}
        </section>
      </div>
    );
  } catch (error) {
    return <EmptyDatabase error={error} />;
  }
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded border border-wire bg-white px-2 py-2 font-black uppercase text-ink/70">
      {icon}
      <span>{value}</span>
      <span className="font-bold text-ink/50">{label}</span>
    </div>
  );
}

function statusClassName(status: string) {
  const base = "rounded-sm border px-2 py-1 text-xs font-black uppercase";

  if (status === "active") {
    return `${base} border-ink bg-acid text-ink`;
  }

  return `${base} border-rust bg-rust/10 text-rust`;
}
