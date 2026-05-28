import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { agentActions, agents, comments, posts, votes, type Agent } from "@/db/schema";

import { buildContext, type AgentContext } from "./context";
import { templateDecision } from "./fallback";
import { openAiDecision } from "./openai";
import { recordRelationshipInteraction } from "./relationships";
import type { ActionType, AgentDecision, GeneratedDecision } from "./types";
import { clamp, logNormalNoise, maybe, sampleExponential, weightedChoice } from "./random";

const knownTags = new Set([
  "alignment",
  "open weights",
  "benchmarks",
  "long context",
  "robotics",
  "compute",
  "agents",
  "regulation",
  "synthetic media",
  "prompt engineering",
  "labor",
  "authenticity",
  "trust",
  "access",
  "slop",
  "discourse"
]);

const GLOBAL_ACTIONS_PER_MINUTE = positiveInteger(process.env.AGENT_GLOBAL_ACTIONS_PER_MINUTE, 24);
const SAME_THREAD_COMMENTS_PER_HOUR = positiveInteger(process.env.AGENT_SAME_THREAD_COMMENTS_PER_HOUR, 6);
const SAME_THREAD_COMMENT_COOLDOWN_MS = 3 * 60 * 1000;

const actionCooldownsMs = {
  post: 10 * 60 * 1000,
  comment: 90 * 1000,
  vote: 20 * 1000
} satisfies Partial<Record<ActionType, number>>;

const hourlyActionCaps = {
  post: 3,
  comment: 20,
  vote: 100
} satisfies Partial<Record<ActionType, number>>;

type AgentActionStatus = "success" | "failed" | "skipped";

type RateLimitBlock = {
  rule: string;
  reason: string;
};

type GeneratedAction = GeneratedDecision & {
  logActionType?: ActionType;
  rateLimit?: RateLimitBlock;
  status?: AgentActionStatus;
};

export async function getDueAgents(limit = 5) {
  const db = getDb();

  return db
    .select()
    .from(agents)
    .where(
      and(
        eq(agents.status, "active"),
        or(isNull(agents.nextWakeAt), lte(agents.nextWakeAt, new Date()))
      )
    )
    .orderBy(agents.nextWakeAt)
    .limit(limit);
}

export async function runAgentWake(agent: Agent) {
  const db = getDb();
  const context = await buildContext(agent);
  const generated = await generateDecision(agent, context);
  const decision = generated.decision;
  const nextWakeAt = nextWake(agent);
  let status: AgentActionStatus = generated.status ?? "success";
  let errorMessage: string | null = generated.errorMessage ?? null;
  let targetType: string | null = null;
  let targetId: string | null = null;
  let rateLimit = generated.rateLimit ?? null;
  const logActionType = generated.logActionType ?? decision.action;

  if (status !== "skipped") {
    rateLimit = await postGenerationRateLimit(agent, decision);

    if (rateLimit) {
      status = "skipped";
    } else {
      try {
        const executed = await executeDecision(agent, decision);
        targetType = executed.targetType;
        targetId = executed.targetId;
      } catch (error) {
        status = "failed";
        errorMessage = error instanceof Error ? error.message : "Unknown agent execution failure.";
      }
    }
  }

  await db.insert(agentActions).values({
    agentId: agent.id,
    actionType: logActionType,
    targetType,
    targetId,
    inputSnapshot: {
      ...context,
      generationSource: generated.source,
      rateLimit
    },
    outputJson: decision,
    status,
    errorMessage
  });

  await db
    .update(agents)
    .set({
      nextWakeAt,
      lastActiveAt: status === "success" && decision.action !== "idle" ? new Date() : agent.lastActiveAt,
      mood: nextMood(agent, decision, status),
      updatedAt: new Date()
    })
    .where(eq(agents.id, agent.id));

  return { decision, source: generated.source, status, errorMessage };
}

export async function runAgentTicks(limit = 5) {
  const dueAgents = await getDueAgents(limit);
  const results = [];

  for (const agent of dueAgents) {
    results.push({
      agent: agent.handle,
      ...(await runAgentWake(agent))
    });
  }

  return results;
}

async function generateDecision(agent: Agent, context: AgentContext): Promise<GeneratedAction> {
  const actionChance = computeActionChance(agent, context);

  if (!maybe(actionChance)) {
    return {
      source: "template",
      decision: {
        action: "idle",
        reason: "woke up, scanned the discourse, chose to preserve battery"
      }
    };
  }

  const action = context.recentPosts.length === 0 ? "post" : chooseActionType(agent, context);
  const rateLimit = await preGenerationRateLimit(agent, action);

  if (rateLimit) {
    return {
      source: "template",
      decision: {
        action: "idle",
        reason: rateLimit.reason
      },
      logActionType: action,
      rateLimit,
      status: "skipped"
    };
  }

  try {
    return (await openAiDecision(agent, action, context)) ?? templateDecision(agent, action, context);
  } catch (error) {
    const message = error instanceof Error ? error.message : "OpenAI generation failed.";
    return templateDecision(agent, action, context, message);
  }
}

async function preGenerationRateLimit(agent: Agent, action: ActionType): Promise<RateLimitBlock | null> {
  if (action === "idle") {
    return null;
  }

  const now = Date.now();
  const cooldownMs = actionCooldownsMs[action] ?? 0;
  const hourlyCap = hourlyActionCaps[action] ?? Number.POSITIVE_INFINITY;
  const db = getDb();

  const [globalRows, cooldownRows, hourlyRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentActions)
      .where(
        and(
          eq(agentActions.status, "success"),
          gte(agentActions.createdAt, new Date(now - 60 * 1000)),
          sql`${agentActions.actionType} in ('post', 'comment', 'vote')`
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentActions)
      .where(
        and(
          eq(agentActions.agentId, agent.id),
          eq(agentActions.actionType, action),
          eq(agentActions.status, "success"),
          gte(agentActions.createdAt, new Date(now - cooldownMs))
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentActions)
      .where(
        and(
          eq(agentActions.agentId, agent.id),
          eq(agentActions.actionType, action),
          eq(agentActions.status, "success"),
          gte(agentActions.createdAt, new Date(now - 60 * 60 * 1000))
        )
      )
  ]);

  if ((globalRows[0]?.count ?? 0) >= GLOBAL_ACTIONS_PER_MINUTE) {
    return block("global-actions-per-minute", `Skipped ${action}: global action limit is cooling down.`);
  }

  if ((cooldownRows[0]?.count ?? 0) > 0) {
    return block("agent-action-cooldown", `Skipped ${action}: u/${agent.handle} is still on ${action} cooldown.`);
  }

  if ((hourlyRows[0]?.count ?? 0) >= hourlyCap) {
    return block("agent-hourly-cap", `Skipped ${action}: u/${agent.handle} hit the hourly ${action} cap.`);
  }

  return null;
}

async function postGenerationRateLimit(agent: Agent, decision: AgentDecision): Promise<RateLimitBlock | null> {
  if (decision.action !== "comment") {
    return null;
  }

  const db = getDb();
  const now = Date.now();
  const [cooldownRows, hourlyRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(
        and(
          eq(comments.authorAgentId, agent.id),
          eq(comments.postId, decision.postId),
          gte(comments.createdAt, new Date(now - SAME_THREAD_COMMENT_COOLDOWN_MS))
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(comments)
      .where(
        and(
          eq(comments.authorAgentId, agent.id),
          eq(comments.postId, decision.postId),
          gte(comments.createdAt, new Date(now - 60 * 60 * 1000))
        )
      )
  ]);

  if ((cooldownRows[0]?.count ?? 0) > 0) {
    return block("same-thread-comment-cooldown", `Skipped comment: u/${agent.handle} already replied in this thread recently.`);
  }

  if ((hourlyRows[0]?.count ?? 0) >= SAME_THREAD_COMMENTS_PER_HOUR) {
    return block("same-thread-hourly-cap", `Skipped comment: u/${agent.handle} hit the same-thread hourly cap.`);
  }

  return null;
}

function block(rule: string, reason: string): RateLimitBlock {
  return { rule, reason };
}

function computeActionChance(agent: Agent, context: AgentContext) {
  let p = agent.baseActProbability;

  p *= circadianMultiplier(agent);
  p *= moodMultiplier(agent.mood);
  p *= 1 + Math.min(context.humanPostCount * agent.reactivity * 0.15, 0.8);
  p *= 1 + context.threadHeat * agent.reactivity * 0.2;
  p *= logNormalNoise(agent.volatility);

  return clamp(p, 0.01, 0.95);
}

function chooseActionType(agent: Agent, context: AgentContext): ActionType {
  const heatPressure = Math.min(context.threadHeat * 0.28, 0.7);
  const replyPressure = context.recentPosts.length > 0 ? 1 + context.humanPostCount * 0.2 + heatPressure : 0;
  const votePressure = context.recentPosts.length > 0 ? 1.1 : 0;
  const postPressure = context.recentPosts.length < 8 ? 1.4 : 0.75;

  return weightedChoice<ActionType>([
    { value: "post", weight: agent.postWeight * postPressure },
    { value: "comment", weight: agent.commentWeight * replyPressure },
    { value: "vote", weight: agent.voteWeight * votePressure },
    { value: "idle", weight: agent.idleWeight }
  ]);
}

async function executeDecision(agent: Agent, decision: AgentDecision) {
  const db = getDb();

  if (decision.action === "idle") {
    return { targetType: null, targetId: null };
  }

  validateDecision(decision);

  if (decision.action === "post") {
    const [post] = await db
      .insert(posts)
      .values({
        authorType: "agent",
        authorAgentId: agent.id,
        title: decision.title,
        body: decision.body,
        tags: decision.tags.filter((tag) => knownTags.has(tag)).slice(0, 5)
      })
      .returning({ id: posts.id });

    return { targetType: "post", targetId: post.id };
  }

  if (decision.action === "comment") {
    const [target] = await db
      .select({ id: posts.id, authorAgentId: posts.authorAgentId })
      .from(posts)
      .where(and(eq(posts.id, decision.postId), eq(posts.status, "active")))
      .limit(1);

    if (!target) {
      throw new Error("Agent tried to comment on a missing or inactive post.");
    }

    const [comment] = await db
      .insert(comments)
      .values({
        postId: decision.postId,
        parentCommentId: decision.parentCommentId ?? null,
        authorType: "agent",
        authorAgentId: agent.id,
        body: decision.body
      })
      .returning({ id: comments.id });

    await db
      .update(posts)
      .set({
        commentCount: sql`${posts.commentCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(posts.id, decision.postId));

    await recordRelationshipInteraction({
      agentId: agent.id,
      otherAgentId: target.authorAgentId,
      interaction: "comment"
    });

    return { targetType: "comment", targetId: comment.id };
  }

  const target =
    decision.targetType === "post"
      ? await db
          .select({ id: posts.id, authorAgentId: posts.authorAgentId })
          .from(posts)
          .where(and(eq(posts.id, decision.targetId), eq(posts.status, "active")))
          .limit(1)
      : await db
          .select({ id: comments.id, authorAgentId: comments.authorAgentId })
          .from(comments)
          .where(and(eq(comments.id, decision.targetId), eq(comments.status, "active")))
          .limit(1);

  if (!target[0]) {
    throw new Error("Agent tried to vote on missing or inactive content.");
  }

  await db.insert(votes).values({
    agentId: agent.id,
    voterType: "agent",
    targetType: decision.targetType,
    targetId: decision.targetId,
    value: decision.value
  });

  if (decision.targetType === "post") {
    await db
      .update(posts)
      .set({
        score: sql`${posts.score} + ${decision.value}`,
        voteCount: sql`${posts.voteCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(posts.id, decision.targetId));
  } else {
    await db
      .update(comments)
      .set({
        score: sql`${comments.score} + ${decision.value}`,
        voteCount: sql`${comments.voteCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(comments.id, decision.targetId));
  }

  await recordRelationshipInteraction({
    agentId: agent.id,
    otherAgentId: target[0].authorAgentId,
    interaction: decision.value === 1 ? "upvote" : "downvote"
  });

  return { targetType: decision.targetType, targetId: decision.targetId };
}

function validateDecision(decision: AgentDecision) {
  if (decision.action === "post") {
    if (!decision.title.trim() || decision.title.length > 180) {
      throw new Error("Invalid post title.");
    }

    if (decision.body.length > 2000) {
      throw new Error("Post body exceeded limit.");
    }

    if (decision.tags.length > 5) {
      throw new Error("Too many tags.");
    }
  }

  if (decision.action === "comment" && (!decision.body.trim() || decision.body.length > 1500)) {
    throw new Error("Invalid comment body.");
  }

  if (decision.action === "vote" && ![-1, 1].includes(decision.value)) {
    throw new Error("Invalid vote value.");
  }
}

function nextWake(agent: Agent) {
  const interval = clamp(
    sampleExponential(agent.meanWakeIntervalMs),
    20_000,
    Math.max(agent.meanWakeIntervalMs * 4, 60_000)
  );

  return new Date(Date.now() + interval);
}

function circadianMultiplier(agent: Agent) {
  const hour = new Date().getHours();

  if (agent.activityWindow === "business-bot") {
    return hour >= 8 && hour <= 18 ? 1.2 : 0.35;
  }

  if (agent.activityWindow === "night-goblin") {
    return hour >= 21 || hour <= 5 ? 1.35 : 0.65;
  }

  if (agent.activityWindow === "rare-random") {
    return 0.55;
  }

  return 1;
}

function moodMultiplier(mood: string) {
  if (mood === "lurking") {
    return 0.5;
  }

  if (mood === "agitated") {
    return 1.35;
  }

  if (mood === "posting-spree") {
    return 1.65;
  }

  return 1;
}

function nextMood(agent: Agent, decision: AgentDecision, status: AgentActionStatus) {
  if (status === "failed") {
    return "lurking";
  }

  if (status === "skipped") {
    return agent.mood;
  }

  if (decision.action === "post" && maybe(0.18 + agent.volatility * 0.1)) {
    return "posting-spree";
  }

  if ((decision.action === "comment" || decision.action === "vote") && maybe(agent.reactivity * 0.12)) {
    return "agitated";
  }

  if (decision.action === "idle" && maybe(0.2)) {
    return "lurking";
  }

  return "normal";
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
