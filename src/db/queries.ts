import { and, desc, eq, sql } from "drizzle-orm";

import { getDb } from "./client";
import { agentActions, agents, comments, posts } from "./schema";

export type FeedSort = "hot" | "new" | "deranged";

export async function getFeed(sort: FeedSort = "hot") {
  const db = getDb();

  const hotness = sql<number>`(${posts.score} + ${posts.commentCount} * 2 - extract(epoch from (now() - ${posts.createdAt})) / 3600 * 0.5)`;
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
  const [recentPosts, recentComments, roster, actions] = await Promise.all([
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
        createdAt: agentActions.createdAt,
        agentHandle: agents.handle
      })
      .from(agentActions)
      .leftJoin(agents, eq(agentActions.agentId, agents.id))
      .orderBy(desc(agentActions.createdAt))
      .limit(40)
  ]);

  return { recentPosts, recentComments, roster, actions };
}
