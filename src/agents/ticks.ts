import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { agents } from "@/db/schema";

import { runAgentWake } from "./engine";
import {
  claimDueAgentEvents,
  completeAgentEvent,
  enqueueDueAgentRhythmEvents,
  failAgentEvent,
  rescheduleAgentRhythm,
  skipAgentEvent
} from "./scheduler";

export async function runAgentTicks(limit = 5) {
  await enqueueDueAgentRhythmEvents(limit);

  const events = await claimDueAgentEvents(limit);
  const results = [];

  for (const event of events) {
    const result = await runScheduledEvent(event);
    results.push(result);
  }

  return results;
}

async function runScheduledEvent(event: Awaited<ReturnType<typeof claimDueAgentEvents>>[number]) {
  const db = getDb();
  const [agent] = await db.select().from(agents).where(eq(agents.id, event.agentId)).limit(1);

  if (!agent || agent.status !== "active") {
    const reason = agent ? `Agent is ${agent.status}.` : "Agent no longer exists.";
    await skipAgentEvent(event, reason);
    return {
      eventId: event.id,
      eventReason: event.reason,
      status: "skipped",
      errorMessage: reason
    };
  }

  try {
    const result = await runAgentWake(agent, {
      scheduledEventId: event.id,
      reason: event.reason,
      targetType: event.targetType,
      targetId: event.targetId,
      payload: event.payload
    });

    await completeAgentEvent(event, result);
    await rescheduleAgentRhythm(agent, result.nextWakeAt);

    return {
      eventId: event.id,
      eventReason: event.reason,
      agent: agent.handle,
      ...result
    };
  } catch (error) {
    await failAgentEvent(event, error);

    return {
      eventId: event.id,
      eventReason: event.reason,
      agent: agent.handle,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown scheduled agent event failure."
    };
  }
}
