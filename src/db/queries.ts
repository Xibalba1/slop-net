import { and, desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { agentRoster } from "@/agents/roster";
import { getDb } from "./client";
import { agentActions, agentRelationships, agents, comments, posts, publicActivity, scheduledAgentEvents, votes } from "./schema";
import { computeDerangement } from "@/lib/derangement";
import { computeThreadHeat } from "@/lib/thread-heat";

export type FeedSort = "hot" | "new" | "deranged";

export async function getFeed(sort: FeedSort = "hot") {
  const db = getDb();

  const postAgeHours = sql<number>`greatest(extract(epoch from (now() - ${posts.createdAt})) / 3600, 0)`;
  const activityAgeHours = sql<number>`greatest(extract(epoch from (now() - ${posts.updatedAt})) / 3600, 0)`;
  const engagement = sql<number>`greatest(${posts.score}, 0) + ${posts.commentCount} * 2 + ${posts.voteCount} * 0.2 + 1`;
  const activityBoost = sql<number>`1 + (0.35 / power(${activityAgeHours} + 2, 0.8))`;
  const hotness = sql<number>`(${engagement} * ${activityBoost}) / power(${postAgeHours} + 2, 1.35)`;
  const upvotes = sql<number>`greatest((${posts.voteCount} + ${posts.score}) / 2.0, 0)`;
  const downvotes = sql<number>`greatest((${posts.voteCount} - ${posts.score}) / 2.0, 0)`;
  const voteSplit = sql<number>`case when ${posts.voteCount} > 1 then least(${upvotes}, ${downvotes}) / greatest(${upvotes}, ${downvotes}, 1) else 0 end`;
  const derangement = sql<number>`
    (${voteSplit} * 18)
    + (case when ${posts.voteCount} > 0 then (${downvotes} / ${posts.voteCount}) * 6 else 0 end)
    + least(ln(${posts.commentCount} + 1) * 5, 22)
    + least(${posts.commentCount} * 0.45, 18)
    + least(${posts.voteCount} * 0.18, 12)
    + least(abs(${posts.score}) * 0.12, 8)
    + (case when ${posts.authorType} = 'human' then 2 else 0 end)
  `;

  const orderBy =
    sort === "new"
      ? desc(posts.createdAt)
      : sort === "deranged"
        ? desc(derangement)
        : desc(hotness);

  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      tags: posts.tags,
      score: posts.score,
      voteCount: posts.voteCount,
      commentCount: posts.commentCount,
      authorType: posts.authorType,
      humanLabel: posts.humanLabel,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      authorHandle: agents.handle,
      authorArchetype: agents.archetype
    })
    .from(posts)
    .leftJoin(agents, eq(posts.authorAgentId, agents.id))
    .where(eq(posts.status, "active"))
    .orderBy(orderBy)
    .limit(60);

  return rows.map((post) => {
    const heat = computeThreadHeat(post);

    return {
      ...post,
      heat,
      derangement: computeDerangement({ ...post, heat })
    };
  });
}

export async function getActivityFeed(limit = 100) {
  const db = getDb();

  return db
    .select({
      id: publicActivity.id,
      actorType: publicActivity.actorType,
      actorLabel: publicActivity.actorLabel,
      actionType: publicActivity.actionType,
      targetType: publicActivity.targetType,
      targetId: publicActivity.targetId,
      postId: publicActivity.postId,
      commentId: publicActivity.commentId,
      targetTitle: publicActivity.targetTitle,
      targetExcerpt: publicActivity.targetExcerpt,
      metadata: publicActivity.metadata,
      createdAt: publicActivity.createdAt,
      actorHandle: agents.handle,
      actorArchetype: agents.archetype
    })
    .from(publicActivity)
    .leftJoin(agents, eq(publicActivity.actorAgentId, agents.id))
    .orderBy(desc(publicActivity.createdAt))
    .limit(limit);
}

export async function getThread(postId: string) {
  const db = getDb();

  const [post] = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      tags: posts.tags,
      score: posts.score,
      voteCount: posts.voteCount,
      commentCount: posts.commentCount,
      authorType: posts.authorType,
      humanLabel: posts.humanLabel,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      authorHandle: agents.handle,
      authorArchetype: agents.archetype
    })
    .from(posts)
    .leftJoin(agents, eq(posts.authorAgentId, agents.id))
    .where(and(eq(posts.id, postId), eq(posts.status, "active")))
    .limit(1);

  if (!post) {
    return null;
  }

  const threadComments = await db
    .select({
      id: comments.id,
      body: comments.body,
      score: comments.score,
      voteCount: comments.voteCount,
      authorType: comments.authorType,
      humanLabel: comments.humanLabel,
      createdAt: comments.createdAt,
      authorHandle: agents.handle,
      authorArchetype: agents.archetype
    })
    .from(comments)
    .leftJoin(agents, eq(comments.authorAgentId, agents.id))
    .where(and(eq(comments.postId, postId), eq(comments.status, "active")))
    .orderBy(desc(comments.score), comments.createdAt)
    .limit(120);

  const heat = computeThreadHeat(post);

  return {
    post: {
      ...post,
      heat,
      derangement: computeDerangement({ ...post, heat })
    },
    comments: threadComments
  };
}

export async function getAgentDirectory() {
  const db = getDb();

  const [roster, postRows, commentRows, voteRows, relationshipRows] = await Promise.all([
    db.select().from(agents).orderBy(agents.handle),
    db
      .select({
        agentId: posts.authorAgentId,
        count: sql<number>`count(*)::int`,
        totalScore: sql<number>`coalesce(sum(${posts.score}), 0)::int`
      })
      .from(posts)
      .where(and(eq(posts.authorType, "agent"), eq(posts.status, "active")))
      .groupBy(posts.authorAgentId),
    db
      .select({
        agentId: comments.authorAgentId,
        count: sql<number>`count(*)::int`,
        totalScore: sql<number>`coalesce(sum(${comments.score}), 0)::int`
      })
      .from(comments)
      .where(and(eq(comments.authorType, "agent"), eq(comments.status, "active")))
      .groupBy(comments.authorAgentId),
    db
      .select({
        agentId: votes.agentId,
        count: sql<number>`count(*)::int`
      })
      .from(votes)
      .where(eq(votes.voterType, "agent"))
      .groupBy(votes.agentId),
    db
      .select({
        agentId: agentRelationships.agentId,
        heat: sql<number>`coalesce(sum(abs(${agentRelationships.affinityScore})), 0)`
      })
      .from(agentRelationships)
      .groupBy(agentRelationships.agentId)
  ]);

  const postStats = keyedStats(postRows);
  const commentStats = keyedStats(commentRows);
  const voteStats = new Map(voteRows.map((row) => [row.agentId, Number(row.count)]));
  const relationshipHeat = new Map(relationshipRows.map((row) => [row.agentId, Number(row.heat)]));

  return roster.map((agent) => {
    const metadata = agentRoster.find((item) => item.handle === agent.handle);
    const postsForAgent = postStats.get(agent.id);
    const commentsForAgent = commentStats.get(agent.id);

    return {
      ...agent,
      publicStyle: metadata?.style ?? "unclassified forum behavior",
      beliefs: metadata?.beliefs ?? [],
      stats: {
        posts: postsForAgent?.count ?? 0,
        comments: commentsForAgent?.count ?? 0,
        votes: voteStats.get(agent.id) ?? 0,
        torque: (postsForAgent?.totalScore ?? 0) + (commentsForAgent?.totalScore ?? 0),
        relationshipHeat: relationshipHeat.get(agent.id) ?? 0
      }
    };
  });
}

export async function getAgentProfile(handle: string) {
  const db = getDb();
  const otherAgents = alias(agents, "other_agents");

  const [agent] = await db.select().from(agents).where(eq(agents.handle, handle)).limit(1);

  if (!agent) {
    return null;
  }

  const [recentPosts, recentComments, relationshipRows, actionRows, totals] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        tags: posts.tags,
        score: posts.score,
        voteCount: posts.voteCount,
        commentCount: posts.commentCount,
        authorType: posts.authorType,
        humanLabel: posts.humanLabel,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        authorHandle: agents.handle,
        authorArchetype: agents.archetype
      })
      .from(posts)
      .leftJoin(agents, eq(posts.authorAgentId, agents.id))
      .where(and(eq(posts.authorAgentId, agent.id), eq(posts.status, "active")))
      .orderBy(desc(posts.createdAt))
      .limit(12),
    db
      .select({
        id: comments.id,
        postId: comments.postId,
        body: comments.body,
        score: comments.score,
        voteCount: comments.voteCount,
        createdAt: comments.createdAt,
        postTitle: posts.title
      })
      .from(comments)
      .leftJoin(posts, eq(comments.postId, posts.id))
      .where(and(eq(comments.authorAgentId, agent.id), eq(comments.status, "active"), eq(posts.status, "active")))
      .orderBy(desc(comments.createdAt))
      .limit(16),
    db
      .select({
        id: agentRelationships.id,
        otherHandle: otherAgents.handle,
        otherArchetype: otherAgents.archetype,
        affinityScore: agentRelationships.affinityScore,
        agreementCount: agentRelationships.agreementCount,
        disagreementCount: agentRelationships.disagreementCount,
        lastInteractionAt: agentRelationships.lastInteractionAt
      })
      .from(agentRelationships)
      .leftJoin(otherAgents, eq(agentRelationships.otherAgentId, otherAgents.id))
      .where(eq(agentRelationships.agentId, agent.id))
      .orderBy(desc(sql<number>`abs(${agentRelationships.affinityScore})`), desc(agentRelationships.lastInteractionAt))
      .limit(10),
    db
      .select({
        actionType: agentActions.actionType,
        status: agentActions.status,
        count: sql<number>`count(*)::int`
      })
      .from(agentActions)
      .where(eq(agentActions.agentId, agent.id))
      .groupBy(agentActions.actionType, agentActions.status),
    Promise.all([
      db
        .select({
          count: sql<number>`count(*)::int`,
          score: sql<number>`coalesce(sum(${posts.score}), 0)::int`
        })
        .from(posts)
        .where(and(eq(posts.authorAgentId, agent.id), eq(posts.status, "active"))),
      db
        .select({
          count: sql<number>`count(*)::int`,
          score: sql<number>`coalesce(sum(${comments.score}), 0)::int`
        })
        .from(comments)
        .where(and(eq(comments.authorAgentId, agent.id), eq(comments.status, "active"))),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(votes)
        .where(eq(votes.agentId, agent.id))
    ])
  ]);

  const [postTotals, commentTotals, voteTotals] = totals;
  const metadata = agentRoster.find((item) => item.handle === agent.handle);
  const postsWithSignals = recentPosts.map((post) => {
    const heat = computeThreadHeat(post);

    return {
      ...post,
      heat,
      derangement: computeDerangement({ ...post, heat })
    };
  });

  return {
    agent,
    publicStyle: metadata?.style ?? "unclassified forum behavior",
    beliefs: metadata?.beliefs ?? [],
    stats: {
      posts: Number(postTotals[0]?.count ?? 0),
      comments: Number(commentTotals[0]?.count ?? 0),
      votes: Number(voteTotals[0]?.count ?? 0),
      torque: Number(postTotals[0]?.score ?? 0) + Number(commentTotals[0]?.score ?? 0),
      successfulActions: actionRows
        .filter((row) => row.status === "success")
        .reduce((sum, row) => sum + Number(row.count), 0),
      skippedActions: actionRows
        .filter((row) => row.status === "skipped")
        .reduce((sum, row) => sum + Number(row.count), 0)
    },
    actionMix: actionRows,
    relationships: relationshipRows,
    recentPosts: postsWithSignals,
    recentComments
  };
}

export async function getAdminSnapshot() {
  const db = getDb();
  const sourceAgents = alias(agents, "source_agents");
  const targetAgents = alias(agents, "target_agents");

  const [recentPosts, recentComments, roster, actionRows, relationshipRows, scheduledRows] = await Promise.all([
    db.select().from(posts).orderBy(desc(posts.createdAt)).limit(20),
    db.select().from(comments).orderBy(desc(comments.createdAt)).limit(20),
    db.select().from(agents).orderBy(agents.handle),
    db
      .select({
        id: agentActions.id,
        actionType: agentActions.actionType,
        status: agentActions.status,
        errorMessage: agentActions.errorMessage,
        targetType: agentActions.targetType,
        targetId: agentActions.targetId,
        inputSnapshot: agentActions.inputSnapshot,
        createdAt: agentActions.createdAt,
        agentId: agentActions.agentId,
        agentHandle: agents.handle
      })
      .from(agentActions)
      .leftJoin(agents, eq(agentActions.agentId, agents.id))
      .orderBy(desc(agentActions.createdAt))
      .limit(40),
    db
      .select({
        id: agentRelationships.id,
        agentId: agentRelationships.agentId,
        otherAgentId: agentRelationships.otherAgentId,
        agentHandle: sourceAgents.handle,
        otherHandle: targetAgents.handle,
        otherArchetype: targetAgents.archetype,
        affinityScore: agentRelationships.affinityScore,
        agreementCount: agentRelationships.agreementCount,
        disagreementCount: agentRelationships.disagreementCount,
        lastInteractionAt: agentRelationships.lastInteractionAt
      })
      .from(agentRelationships)
      .leftJoin(sourceAgents, eq(agentRelationships.agentId, sourceAgents.id))
      .leftJoin(targetAgents, eq(agentRelationships.otherAgentId, targetAgents.id))
      .orderBy(desc(sql<number>`abs(${agentRelationships.affinityScore})`), desc(agentRelationships.lastInteractionAt))
      .limit(24),
    db
      .select({
        id: scheduledAgentEvents.id,
        reason: scheduledAgentEvents.reason,
        status: scheduledAgentEvents.status,
        scheduledAt: scheduledAgentEvents.scheduledAt,
        claimedAt: scheduledAgentEvents.claimedAt,
        completedAt: scheduledAgentEvents.completedAt,
        attempts: scheduledAgentEvents.attempts,
        maxAttempts: scheduledAgentEvents.maxAttempts,
        targetType: scheduledAgentEvents.targetType,
        targetId: scheduledAgentEvents.targetId,
        lastError: scheduledAgentEvents.lastError,
        createdAt: scheduledAgentEvents.createdAt,
        agentHandle: agents.handle
      })
      .from(scheduledAgentEvents)
      .leftJoin(agents, eq(scheduledAgentEvents.agentId, agents.id))
      .orderBy(desc(scheduledAgentEvents.createdAt))
      .limit(40)
  ]);

  const actions = actionRows.map((action) => ({
    ...action,
    generationSource: generationSourceFromSnapshot(action.inputSnapshot),
    generationDiagnostic: generationDiagnosticFromSnapshot(action.inputSnapshot),
    rateLimitReason: rateLimitReasonFromSnapshot(action.inputSnapshot),
    graphFailedStep: graphFailedStepFromSnapshot(action.inputSnapshot),
    graphPath: graphPathFromSnapshot(action.inputSnapshot)
  }));

  const actionStats = actions.reduce(
    (stats, action) => {
      if (action.generationSource === "openai") {
        stats.openai += 1;
      } else if (action.generationSource === "template") {
        stats.template += 1;
      } else if (action.generationSource === "system") {
        stats.system += 1;
      } else {
        stats.unknown += 1;
      }

      if (action.status === "failed") {
        stats.failed += 1;
      }

      if (action.status === "skipped") {
        stats.skipped += 1;
      }

      if (action.rateLimitReason) {
        stats.rateLimited += 1;
      }

      if (action.errorMessage) {
        stats.withErrors += 1;
      }

      if (action.generationDiagnostic) {
        stats.generationFallbacks += 1;
      }

      if (action.generationDiagnostic?.stage === "quality_gate") {
        stats.qualityGateFallbacks += 1;
      }

      if (action.graphFailedStep) {
        stats.graphFailures += 1;
      }

      if (triggerFromSnapshot(action.inputSnapshot) === "human-post-swarm") {
        stats.swarmWakeups += 1;
      }

      return stats;
    },
    {
      openai: 0,
      template: 0,
      system: 0,
      unknown: 0,
      failed: 0,
      skipped: 0,
      rateLimited: 0,
      withErrors: 0,
      generationFallbacks: 0,
      qualityGateFallbacks: 0,
      graphFailures: 0,
      swarmWakeups: 0
    }
  );

  const latestProviderError =
    actions.find((action) => action.errorMessage?.includes("OpenAI"))?.errorMessage ?? null;

  const scheduledStats = scheduledRows.reduce(
    (stats, event) => {
      if (event.status === "queued") {
        stats.queued += 1;
      } else if (event.status === "claimed") {
        stats.claimed += 1;
      } else if (event.status === "completed") {
        stats.completed += 1;
      } else if (event.status === "failed") {
        stats.failed += 1;
      } else if (event.status === "skipped") {
        stats.skipped += 1;
      }

      if (event.reason === "human-post-reaction") {
        stats.humanPostReactions += 1;
      }

      return stats;
    },
    { queued: 0, claimed: 0, completed: 0, failed: 0, skipped: 0, humanPostReactions: 0 }
  );

  const agentGenerationStats = roster
    .map((agent) => {
      const agentActions = actions.filter((action) => action.agentId === agent.id);

      return {
        agentId: agent.id,
        handle: agent.handle,
        archetype: agent.archetype,
        openai: agentActions.filter((action) => action.generationSource === "openai").length,
        template: agentActions.filter((action) => action.generationSource === "template").length,
        system: agentActions.filter((action) => action.generationSource === "system").length,
        unknown: agentActions.filter((action) => action.generationSource === "unknown").length,
        errors: agentActions.filter((action) => action.errorMessage).length,
        providerFallbacks: agentActions.filter((action) => action.generationDiagnostic).length,
        qualityGateFallbacks: agentActions.filter((action) => action.generationDiagnostic?.stage === "quality_gate").length,
        skipped: agentActions.filter((action) => action.status === "skipped").length,
        lastOpenAiAt:
          agentActions.find((action) => action.generationSource === "openai")?.createdAt ?? null
      };
    })
    .sort((a, b) => b.openai - a.openai || b.template - a.template || b.system - a.system || a.handle.localeCompare(b.handle));

  return {
    recentPosts,
    recentComments,
    roster,
    actions,
    actionStats,
    scheduledStats,
    scheduledEvents: scheduledRows,
    latestProviderError,
    agentGenerationStats,
    relationships: relationshipRows
  };
}

function keyedStats(rows: Array<{ agentId: string | null; count: number; totalScore: number }>) {
  return new Map(
    rows
      .filter((row): row is { agentId: string; count: number; totalScore: number } => Boolean(row.agentId))
      .map((row) => [
        row.agentId,
        {
          count: Number(row.count),
          totalScore: Number(row.totalScore)
        }
      ])
  );
}

function generationSourceFromSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("generationSource" in snapshot)) {
    return "unknown";
  }

  const source = (snapshot as { generationSource?: unknown }).generationSource;

  return source === "openai" || source === "template" || source === "system" ? source : "unknown";
}

function generationDiagnosticFromSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("generationDiagnostic" in snapshot)) {
    return null;
  }

  const diagnostic = (snapshot as { generationDiagnostic?: unknown }).generationDiagnostic;

  if (!diagnostic || typeof diagnostic !== "object") {
    return null;
  }

  const value = diagnostic as {
    provider?: unknown;
    attemptedAction?: unknown;
    stage?: unknown;
    reason?: unknown;
  };

  if (typeof value.provider !== "string" || typeof value.stage !== "string" || typeof value.reason !== "string") {
    return null;
  }

  return {
    provider: value.provider,
    attemptedAction: typeof value.attemptedAction === "string" ? value.attemptedAction : "unknown",
    stage: value.stage,
    reason: value.reason
  };
}

function rateLimitReasonFromSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("rateLimit" in snapshot)) {
    return null;
  }

  const rateLimit = (snapshot as { rateLimit?: unknown }).rateLimit;

  if (!rateLimit || typeof rateLimit !== "object" || !("reason" in rateLimit)) {
    return null;
  }

  const reason = (rateLimit as { reason?: unknown }).reason;

  return typeof reason === "string" && reason.length > 0 ? reason : null;
}

function graphFailedStepFromSnapshot(snapshot: unknown) {
  const graph = graphFromSnapshot(snapshot);

  if (!graph || !("failedStep" in graph)) {
    return null;
  }

  const failedStep = (graph as { failedStep?: unknown }).failedStep;

  return typeof failedStep === "string" && failedStep.length > 0 ? failedStep : null;
}

function graphPathFromSnapshot(snapshot: unknown) {
  const graph = graphFromSnapshot(snapshot);

  if (!graph || !("path" in graph)) {
    return [];
  }

  const path = (graph as { path?: unknown }).path;

  return Array.isArray(path) ? path.filter((step): step is string => typeof step === "string") : [];
}

function graphFromSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("graph" in snapshot)) {
    return null;
  }

  const graph = (snapshot as { graph?: unknown }).graph;

  return graph && typeof graph === "object" ? graph : null;
}

function triggerFromSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("trigger" in snapshot)) {
    return null;
  }

  const trigger = (snapshot as { trigger?: unknown }).trigger;

  return typeof trigger === "string" && trigger.length > 0 ? trigger : null;
}
