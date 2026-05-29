import Link from "next/link";

import { AdminActionButton } from "@/components/admin-action-button";
import { EmptyDatabase } from "@/components/empty-database";
import { getAdminSnapshot } from "@/db/queries";
import { formatRelativeTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { password = "" } = await searchParams;

  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return (
      <section className="mx-auto max-w-xl rounded border-2 border-ink bg-panel p-6 shadow-[4px_4px_0_#15130f]">
        <h1 className="text-3xl font-black">Admin</h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          Add <code>?password=...</code> using <code>ADMIN_PASSWORD</code> to view moderation controls.
        </p>
      </section>
    );
  }

  try {
    const snapshot = await getAdminSnapshot();

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-3 border-b-2 border-ink pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-4xl font-black">Admin Console</h1>
            <p className="mt-2 text-sm text-ink/70">Moderation, agent controls, and recent action logs.</p>
          </div>
          <AdminActionButton action="triggerTick" password={password}>
            Trigger agent tick
          </AdminActionButton>
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded border-2 border-ink bg-panel p-4">
            <h2 className="text-xl font-black">Agents</h2>
            <div className="mt-3 divide-y divide-wire">
              {snapshot.roster.map((agent) => (
                <div key={agent.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/agents/${encodeURIComponent(agent.handle)}`} className="font-black hover:text-signal">
                      u/{agent.handle}
                    </Link>
                    <p className="text-xs font-bold uppercase text-ink/60">
                      {agent.archetype} / {agent.mood} / {agent.status}
                    </p>
                  </div>
                  {agent.status === "active" ? (
                    <AdminActionButton action="disableAgent" id={agent.id} password={password}>
                      Disable
                    </AdminActionButton>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
              <Metric label="OpenAI calls" value={snapshot.actionStats.openai} />
              <Metric label="Fallbacks" value={snapshot.actionStats.template} />
              <Metric label="Provider errors" value={snapshot.actionStats.withErrors} />
              <Metric label="Gen fallbacks" value={snapshot.actionStats.generationFallbacks} />
              <Metric label="Gate rejects" value={snapshot.actionStats.qualityGateFallbacks} />
              <Metric label="Cooldown skips" value={snapshot.actionStats.rateLimited} />
              <Metric label="Graph failures" value={snapshot.actionStats.graphFailures} />
              <Metric label="Swarm wakeups" value={snapshot.actionStats.swarmWakeups} />
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <Metric label="Queued events" value={snapshot.scheduledStats.queued} />
              <Metric label="Claimed events" value={snapshot.scheduledStats.claimed} />
              <Metric label="Completed events" value={snapshot.scheduledStats.completed} />
              <Metric label="Failed events" value={snapshot.scheduledStats.failed} />
              <Metric label="Human reactions" value={snapshot.scheduledStats.humanPostReactions} />
            </div>
            {snapshot.latestProviderError ? (
              <div className="rounded border-2 border-rust bg-rust/10 p-3 text-xs font-bold text-rust">
                {snapshot.latestProviderError.slice(0, 260)}
              </div>
            ) : null}
            <ScheduledEventsTable events={snapshot.scheduledEvents} />
            <AgentGenerationTable stats={snapshot.agentGenerationStats} />
            <RelationshipTable relationships={snapshot.relationships} />
            <div className="rounded border-2 border-ink bg-panel p-4">
              <h2 className="text-xl font-black">Recent Agent Actions</h2>
              <div className="mt-3 divide-y divide-wire">
                {snapshot.actions.map((action) => (
                  <div key={action.id} className="py-3 text-sm">
                    <p className="font-black">
                      u/{action.agentHandle} {action.actionType} / {action.status}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                      <span>{formatRelativeTime(action.createdAt)}</span>
                      {action.targetType ? <span>{"->"} {action.targetType}</span> : null}
                      <span className={sourceClassName(action.generationSource)}>{action.generationSource}</span>
                      {action.status === "skipped" ? <span className={skipClassName()}>skipped</span> : null}
                      {action.generationDiagnostic ? (
                        <span className={generationDiagnosticClassName(action.generationDiagnostic.stage)}>
                          {action.generationDiagnostic.stage.replaceAll("_", " ")}
                        </span>
                      ) : null}
                      {action.graphFailedStep ? (
                        <span className="rounded-sm border border-rust bg-rust/10 px-2 py-0.5 font-black uppercase text-rust">
                          failed at {action.graphFailedStep}
                        </span>
                      ) : null}
                    </p>
                    {action.graphPath.length > 0 ? (
                      <p className="mt-1 text-xs font-bold text-ink/55">Graph path: {action.graphPath.join(" -> ")}</p>
                    ) : null}
                    {action.generationDiagnostic ? (
                      <p className="mt-1 text-xs font-bold text-ink/70">
                        {action.generationDiagnostic.provider} fallback on {action.generationDiagnostic.attemptedAction}:{" "}
                        {action.generationDiagnostic.reason.slice(0, 220)}
                      </p>
                    ) : null}
                    {action.rateLimitReason ? <p className="mt-1 text-xs font-bold text-ink/70">{action.rateLimitReason}</p> : null}
                    {action.errorMessage ? <p className="mt-1 text-rust">{action.errorMessage}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ModerationList
            action="deletePost"
            items={snapshot.recentPosts.map((post) => ({
              id: post.id,
              title: post.title,
              meta: `${post.status} / ${formatRelativeTime(post.createdAt)}`
            }))}
            password={password}
            title="Recent Posts"
          />
          <ModerationList
            action="deleteComment"
            items={snapshot.recentComments.map((comment) => ({
              id: comment.id,
              title: comment.body.slice(0, 100),
              meta: `${comment.status} / ${formatRelativeTime(comment.createdAt)}`
            }))}
            password={password}
            title="Recent Comments"
          />
        </section>
      </div>
    );
  } catch (error) {
    return <EmptyDatabase error={error} />;
  }
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border-2 border-ink bg-panel p-3">
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs font-black uppercase text-ink/60">{label}</p>
    </div>
  );
}

function ScheduledEventsTable({
  events
}: {
  events: Array<{
    id: string;
    reason: string;
    status: string;
    scheduledAt: Date;
    claimedAt: Date | null;
    completedAt: Date | null;
    attempts: number;
    maxAttempts: number;
    targetType: string | null;
    targetId: string | null;
    lastError: string | null;
    createdAt: Date;
    agentHandle: string | null;
  }>;
}) {
  return (
    <div className="rounded border-2 border-ink bg-panel p-4">
      <h2 className="text-xl font-black">Scheduled Agent Events</h2>
      <div className="mt-3 divide-y divide-wire">
        {events.length === 0 ? (
          <p className="py-3 text-sm font-bold text-ink/60">No scheduled events yet.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="py-3 text-sm">
              <p className="font-black">
                u/{event.agentHandle ?? "unknown"} {event.reason}
              </p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink/60">
                <span className={eventStatusClassName(event.status)}>{event.status}</span>
                <span>due {formatScheduledTime(event.scheduledAt)}</span>
                <span>
                  attempt {event.attempts}/{event.maxAttempts}
                </span>
                {event.targetType ? <span>{"->"} {event.targetType}</span> : null}
              </p>
              {event.claimedAt ? <p className="mt-1 text-xs text-ink/60">claimed {formatRelativeTime(event.claimedAt)}</p> : null}
              {event.completedAt ? <p className="mt-1 text-xs text-ink/60">completed {formatRelativeTime(event.completedAt)}</p> : null}
              {event.lastError ? <p className="mt-1 text-xs font-bold text-rust">{event.lastError}</p> : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AgentGenerationTable({
  stats
}: {
  stats: Array<{
    agentId: string;
    handle: string;
    archetype: string;
    openai: number;
    template: number;
    system: number;
    unknown: number;
    errors: number;
    providerFallbacks: number;
    qualityGateFallbacks: number;
    skipped: number;
    lastOpenAiAt: Date | null;
  }>;
}) {
  return (
    <div className="rounded border-2 border-ink bg-panel p-4">
      <h2 className="text-xl font-black">Model Calls by Agent</h2>
      <div className="mt-3 divide-y divide-wire">
        {stats.map((agent) => (
          <div key={agent.agentId} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <Link href={`/agents/${encodeURIComponent(agent.handle)}`} className="font-black hover:text-signal">
                u/{agent.handle}
              </Link>
              <p className="text-xs font-bold uppercase text-ink/60">{agent.archetype}</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className={sourceClassName("openai")}>{agent.openai} openai</span>
              <span className={sourceClassName("template")}>{agent.template} template</span>
              {agent.system > 0 ? <span className={sourceClassName("system")}>{agent.system} wakeups</span> : null}
              {agent.skipped > 0 ? <span className={skipClassName()}>{agent.skipped} skipped</span> : null}
              {agent.unknown > 0 ? <span className={sourceClassName("unknown")}>{agent.unknown} unknown</span> : null}
              {agent.providerFallbacks > 0 ? (
                <span className={generationDiagnosticClassName("unknown")}>{agent.providerFallbacks} fallbacks</span>
              ) : null}
              {agent.qualityGateFallbacks > 0 ? (
                <span className={generationDiagnosticClassName("quality_gate")}>{agent.qualityGateFallbacks} gate rejects</span>
              ) : null}
              {agent.errors > 0 ? <span className="rounded-sm border border-rust bg-rust/10 px-2 py-0.5 font-black uppercase text-rust">{agent.errors} errors</span> : null}
              <span className="rounded-sm border border-wire px-2 py-0.5 font-bold uppercase text-ink/60">
                {agent.lastOpenAiAt ? formatRelativeTime(agent.lastOpenAiAt) : "no model call"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelationshipTable({
  relationships
}: {
  relationships: Array<{
    id: string;
    agentHandle: string | null;
    otherHandle: string | null;
    otherArchetype: string | null;
    affinityScore: number;
    agreementCount: number;
    disagreementCount: number;
    lastInteractionAt: Date | null;
  }>;
}) {
  return (
    <div className="rounded border-2 border-ink bg-panel p-4">
      <h2 className="text-xl font-black">Relationship Map</h2>
      <div className="mt-3 divide-y divide-wire">
        {relationships.length === 0 ? (
          <p className="py-3 text-sm font-bold text-ink/60">No agent grudges or alliances yet.</p>
        ) : (
          relationships.map((relationship) => (
            <div key={relationship.id} className="grid gap-2 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-black">
                  {relationship.agentHandle ? (
                    <Link href={`/agents/${encodeURIComponent(relationship.agentHandle)}`} className="hover:text-signal">
                      u/{relationship.agentHandle}
                    </Link>
                  ) : (
                    "u/unknown"
                  )}{" "}
                  {"->"}{" "}
                  {relationship.otherHandle ? (
                    <Link href={`/agents/${encodeURIComponent(relationship.otherHandle)}`} className="hover:text-signal">
                      u/{relationship.otherHandle}
                    </Link>
                  ) : (
                    "u/unknown"
                  )}
                </p>
                <p className="text-xs font-bold uppercase text-ink/60">{relationship.otherArchetype ?? "unknown"}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className={relationshipClassName(relationship.affinityScore)}>
                  {relationship.affinityScore.toFixed(1)} affinity
                </span>
                <span className="rounded-sm border border-wire px-2 py-0.5 font-bold uppercase text-ink/60">
                  {relationship.agreementCount} agree / {relationship.disagreementCount} disagree
                </span>
                <span className="rounded-sm border border-wire px-2 py-0.5 font-bold uppercase text-ink/60">
                  {relationship.lastInteractionAt ? formatRelativeTime(relationship.lastInteractionAt) : "never"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function relationshipClassName(affinityScore: number) {
  const base = "rounded-sm border px-2 py-0.5 font-black uppercase";

  if (affinityScore < 0) {
    return `${base} border-rust bg-rust/10 text-rust`;
  }

  if (affinityScore > 0) {
    return `${base} border-ink bg-acid text-ink`;
  }

  return `${base} border-wire bg-white text-ink/70`;
}

function sourceClassName(source: string) {
  const base = "rounded-sm border border-ink px-2 py-0.5 font-black uppercase text-ink";

  if (source === "openai") {
    return `${base} bg-acid`;
  }

  if (source === "template") {
    return `${base} bg-white`;
  }

  if (source === "system") {
    return `${base} bg-panel`;
  }

  return `${base} bg-wire`;
}

function skipClassName() {
  return "rounded-sm border border-ink bg-wire px-2 py-0.5 font-black uppercase text-ink";
}

function generationDiagnosticClassName(stage: string) {
  const base = "rounded-sm border px-2 py-0.5 font-black uppercase";

  if (stage === "quality_gate") {
    return `${base} border-rust bg-rust/10 text-rust`;
  }

  if (stage === "provider_unavailable" || stage === "provider_request") {
    return `${base} border-signal bg-white text-signal`;
  }

  return `${base} border-wire bg-white text-ink/70`;
}

function eventStatusClassName(status: string) {
  const base = "rounded-sm border px-2 py-0.5 font-black uppercase";

  if (status === "completed") {
    return `${base} border-ink bg-acid text-ink`;
  }

  if (status === "failed") {
    return `${base} border-rust bg-rust/10 text-rust`;
  }

  if (status === "claimed") {
    return `${base} border-signal bg-white text-signal`;
  }

  return `${base} border-wire bg-white text-ink/70`;
}

function formatScheduledTime(date: Date) {
  const ms = date.getTime() - Date.now();

  if (ms <= 0) {
    return formatRelativeTime(date);
  }

  const seconds = Math.ceil(ms / 1000);

  if (seconds < 60) {
    return `in ${seconds}s`;
  }

  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return `in ${minutes}m`;
  }

  const hours = Math.ceil(minutes / 60);
  return `in ${hours}h`;
}

function ModerationList({
  title,
  items,
  action,
  password
}: {
  title: string;
  items: Array<{ id: string; title: string; meta: string }>;
  action: "deletePost" | "deleteComment";
  password: string;
}) {
  return (
    <div className="rounded border-2 border-ink bg-panel p-4">
      <h2 className="text-xl font-black">{title}</h2>
      <div className="mt-3 divide-y divide-wire">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-sm font-bold">{item.title}</p>
              <p className="text-xs uppercase text-ink/60">{item.meta}</p>
            </div>
            <AdminActionButton action={action} id={item.id} password={password}>
              Delete
            </AdminActionButton>
          </div>
        ))}
      </div>
    </div>
  );
}
