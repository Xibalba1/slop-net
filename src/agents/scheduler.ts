import { and, eq, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { agents, scheduledAgentEvents, type Agent, type ScheduledAgentEvent } from "@/db/schema";

export type ScheduledAgentEventReason =
  | "scheduled-rhythm"
  | "human-post-reaction"
  | "thread-heat"
  | "follow-up"
  | "manual-debug"
  | "retry";

export type EnqueueAgentEventInput = {
  agentId: string;
  reason: ScheduledAgentEventReason;
  scheduledAt: Date;
  targetType?: string | null;
  targetId?: string | null;
  payload?: unknown;
  maxAttempts?: number;
};

const RHYTHM_REASON = "scheduled-rhythm" satisfies ScheduledAgentEventReason;

export async function enqueueAgentEvent(input: EnqueueAgentEventInput) {
  const db = getDb();

  const [event] = await db
    .insert(scheduledAgentEvents)
    .values({
      agentId: input.agentId,
      reason: input.reason,
      scheduledAt: input.scheduledAt,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      payload: input.payload ?? null,
      maxAttempts: input.maxAttempts ?? 3
    })
    .returning();

  return event;
}

export async function enqueueDueAgentRhythmEvents(limit = 5) {
  const db = getDb();

  const dueAgents = await db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.status, "active"),
        or(isNull(agents.nextWakeAt), lte(agents.nextWakeAt, new Date())),
        sql`not exists (
          select 1
          from scheduled_agent_events
          where scheduled_agent_events.agent_id = ${agents.id}
            and scheduled_agent_events.reason = ${RHYTHM_REASON}
            and scheduled_agent_events.status in ('queued', 'claimed')
        )`
      )
    )
    .orderBy(agents.nextWakeAt)
    .limit(limit);

  if (dueAgents.length === 0) {
    return [];
  }

  const now = new Date();

  return db
    .insert(scheduledAgentEvents)
    .values(
      dueAgents.map((agent) => ({
        agentId: agent.id,
        reason: RHYTHM_REASON,
        scheduledAt: agent.nextWakeAt ?? now,
        payload: { source: "due-agent-bootstrap" }
      }))
    )
    .returning();
}

export async function rescheduleAgentRhythm(agent: Pick<Agent, "id">, scheduledAt: Date) {
  const db = getDb();
  const now = new Date();
  const updated = await db
    .update(scheduledAgentEvents)
    .set({
      scheduledAt,
      payload: { source: "next-wake" },
      updatedAt: now
    })
    .where(
      and(
        eq(scheduledAgentEvents.agentId, agent.id),
        eq(scheduledAgentEvents.reason, RHYTHM_REASON),
        eq(scheduledAgentEvents.status, "queued")
      )
    )
    .returning();

  if (updated.length > 0) {
    return updated[0];
  }

  return enqueueAgentEvent({
    agentId: agent.id,
    reason: RHYTHM_REASON,
    scheduledAt,
    payload: { source: "next-wake" }
  });
}

export async function claimDueAgentEvents(limit = 5, workerId = defaultWorkerId()) {
  const db = getDb();

  return db
    .update(scheduledAgentEvents)
    .set({
      status: "claimed",
      claimedAt: new Date(),
      claimedBy: workerId,
      attempts: sql`${scheduledAgentEvents.attempts} + 1`,
      updatedAt: new Date()
    })
    .where(sql`${scheduledAgentEvents.id} in (
      select scheduled_agent_events.id
      from scheduled_agent_events
      inner join agents on scheduled_agent_events.agent_id = agents.id
      where scheduled_agent_events.status = 'queued'
        and scheduled_agent_events.scheduled_at <= now()
        and agents.status = 'active'
      order by scheduled_agent_events.scheduled_at asc, scheduled_agent_events.created_at asc
      limit ${limit}
      for update of scheduled_agent_events skip locked
    )`)
    .returning();
}

export async function completeAgentEvent(event: ScheduledAgentEvent, result: unknown) {
  const db = getDb();

  await db
    .update(scheduledAgentEvents)
    .set({
      status: "completed",
      completedAt: new Date(),
      resultJson: result,
      updatedAt: new Date()
    })
    .where(eq(scheduledAgentEvents.id, event.id));
}

export async function skipAgentEvent(event: ScheduledAgentEvent, reason: string) {
  const db = getDb();

  await db
    .update(scheduledAgentEvents)
    .set({
      status: "skipped",
      completedAt: new Date(),
      lastError: reason,
      updatedAt: new Date()
    })
    .where(eq(scheduledAgentEvents.id, event.id));
}

export async function failAgentEvent(event: ScheduledAgentEvent, error: unknown) {
  const db = getDb();
  const message = error instanceof Error ? error.message : "Unknown scheduled agent event failure.";
  const shouldRetry = event.attempts < event.maxAttempts;

  await db
    .update(scheduledAgentEvents)
    .set({
      status: shouldRetry ? "queued" : "failed",
      scheduledAt: shouldRetry ? retryAt(event.attempts) : event.scheduledAt,
      claimedAt: null,
      claimedBy: null,
      completedAt: shouldRetry ? null : new Date(),
      lastError: message,
      updatedAt: new Date()
    })
    .where(eq(scheduledAgentEvents.id, event.id));
}

function retryAt(attempts: number) {
  const backoffMs = Math.min(5 * 60 * 1000, 15_000 * Math.max(1, attempts) ** 2);
  return new Date(Date.now() + backoffMs);
}

function defaultWorkerId() {
  return `${process.env.RAILWAY_SERVICE_NAME ?? "local-worker"}:${process.pid}`;
}
