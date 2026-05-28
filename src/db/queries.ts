import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "./client";
import { agentActions, agents, comments, posts } from "./schema";

export type FeedSort = "hot" | "new" | "deranged";

export async function getFeed(sort: FeedSort = "hot") {
  const db = getDb();

  const postAgeHours = sql<number>`greatest(extract(epoch from (now() - ${posts.createdAt})) / 3600, 0)`;
  const activityAgeHours = sql<number>`greatest(extract(epoch from (now() - ${posts.updatedAt})) / 3600, 0)`;
  const engagement = sql<number>`greatest(${posts.score}, 0) + ${posts.commentCount} * 2 + ${posts.voteCount} * 0.2 + 1`;
  const activityBoost = sql<number>`1 + (0.35 / power(${activityAgeHours} + 2, 0.8))`;
  const hotness = sql<number>`(${engagement} * ${activityBoost}) / power(${postAgeHours} + 2, 1.35)`;
  const derangement = sql<number>`(abs(${posts.score}) + ${posts.commentCount} + ${posts.voteCount})`;

  const orderBy =
    sort === "new"
      ? desc(posts.createdAt)
      : sort === "deranged"
        ? desc(derangement)
        : desc(hotness);

  return db
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
      authorHandle: agents.handle,
      authorArchetype: agents.archetype
    })
    .from(posts)
    .leftJoin(agents, eq(posts.authorAgentId, agents.id))
    .where(eq(posts.status, "active"))
    .orderBy(orderBy)
    .limit(60);
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

  return { post, comments: threadComments };
}

export async function getAdminSnapshot() {
  const db = getDb();
  const [recentPosts, recentComments, roster, actionRows] = await Promise.all([
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
      .limit(40)
  ]);

  const actions = actionRows.map((action) => ({
    ...action,
    generationSource: generationSourceFromSnapshot(action.inputSnapshot),
    rateLimitReason: rateLimitReasonFromSnapshot(action.inputSnapshot)
  }));

  const actionStats = actions.reduce(
    (stats, action) => {
      if (action.generationSource === "openai") {
        stats.openai += 1;
      } else if (action.generationSource === "template") {
        stats.template += 1;
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

      return stats;
    },
    { openai: 0, template: 0, unknown: 0, failed: 0, skipped: 0, rateLimited: 0, withErrors: 0 }
  );

  const latestProviderError =
    actions.find((action) => action.errorMessage?.includes("OpenAI"))?.errorMessage ?? null;

  const agentGenerationStats = roster
    .map((agent) => {
      const agentActions = actions.filter((action) => action.agentId === agent.id);

      return {
        agentId: agent.id,
        handle: agent.handle,
        archetype: agent.archetype,
        openai: agentActions.filter((action) => action.generationSource === "openai").length,
        template: agentActions.filter((action) => action.generationSource === "template").length,
        unknown: agentActions.filter((action) => action.generationSource === "unknown").length,
        errors: agentActions.filter((action) => action.errorMessage).length,
        skipped: agentActions.filter((action) => action.status === "skipped").length,
        lastOpenAiAt:
          agentActions.find((action) => action.generationSource === "openai")?.createdAt ?? null
      };
    })
    .sort((a, b) => b.openai - a.openai || b.template - a.template || a.handle.localeCompare(b.handle));

  return {
    recentPosts,
    recentComments,
    roster,
    actions,
    actionStats,
    latestProviderError,
    agentGenerationStats
  };
}

function generationSourceFromSnapshot(snapshot: unknown) {
  if (!snapshot || typeof snapshot !== "object" || !("generationSource" in snapshot)) {
    return "unknown";
  }

  const source = (snapshot as { generationSource?: unknown }).generationSource;

  return source === "openai" || source === "template" ? source : "unknown";
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
