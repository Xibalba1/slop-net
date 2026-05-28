import { and, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { agentRelationships, agents, comments, posts, type Agent } from "@/db/schema";
import { clamp } from "@/agents/random";
import { humanReactionBoost } from "@/agents/human-reactivity";

export type RelationshipMemory = {
  otherAgentId: string;
  otherHandle: string;
  otherArchetype: string;
  affinityScore: number;
  agreementCount: number;
  disagreementCount: number;
  lastInteractionAt: Date | null;
};

export type AgentContext = {
  recentPosts: Array<{
    id: string;
    title: string;
    body: string | null;
    authorType: string;
    authorAgentId: string | null;
    authorHandle: string | null;
    authorArchetype: string | null;
    relationship: RelationshipMemory | null;
    score: number;
    commentCount: number;
    reactionBoost: number;
    tags: string[];
    createdAt: Date;
  }>;
  recentComments: Array<{
    id: string;
    postId: string;
    body: string;
    authorAgentId: string | null;
    authorHandle: string | null;
    authorArchetype: string | null;
    relationship: RelationshipMemory | null;
    score: number;
    createdAt: Date;
  }>;
  relationships: RelationshipMemory[];
  humanPostCount: number;
  threadHeat: number;
};

export async function buildContext(agent: Agent): Promise<AgentContext> {
  const db = getDb();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 6);

  const [recentPosts, recentComments, humanRows, relationshipRows] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        authorType: posts.authorType,
        authorAgentId: posts.authorAgentId,
        authorHandle: agents.handle,
        authorArchetype: agents.archetype,
        score: posts.score,
        commentCount: posts.commentCount,
        tags: posts.tags,
        createdAt: posts.createdAt
      })
      .from(posts)
      .leftJoin(agents, eq(posts.authorAgentId, agents.id))
      .where(eq(posts.status, "active"))
      .orderBy(desc(posts.createdAt))
      .limit(25),
    db
      .select({
        id: comments.id,
        postId: comments.postId,
        body: comments.body,
        authorAgentId: comments.authorAgentId,
        authorHandle: agents.handle,
        authorArchetype: agents.archetype,
        score: comments.score,
        createdAt: comments.createdAt
      })
      .from(comments)
      .leftJoin(agents, eq(comments.authorAgentId, agents.id))
      .where(eq(comments.status, "active"))
      .orderBy(desc(comments.createdAt))
      .limit(40),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(eq(posts.authorType, "human"), gte(posts.createdAt, since))),
    db
      .select({
        otherAgentId: agentRelationships.otherAgentId,
        otherHandle: agents.handle,
        otherArchetype: agents.archetype,
        affinityScore: agentRelationships.affinityScore,
        agreementCount: agentRelationships.agreementCount,
        disagreementCount: agentRelationships.disagreementCount,
        lastInteractionAt: agentRelationships.lastInteractionAt
      })
      .from(agentRelationships)
      .leftJoin(agents, eq(agentRelationships.otherAgentId, agents.id))
      .where(eq(agentRelationships.agentId, agent.id))
      .orderBy(desc(sql<number>`abs(${agentRelationships.affinityScore})`))
      .limit(20)
  ]);

  const relationships = relationshipRows.map((relationship) => ({
    ...relationship,
    otherHandle: relationship.otherHandle ?? "unknown-clanker",
    otherArchetype: relationship.otherArchetype ?? "Unknown"
  }));
  const relationshipMap = new Map(relationships.map((relationship) => [relationship.otherAgentId, relationship]));
  const commentVolume = recentPosts.reduce((sum, post) => sum + post.commentCount, 0);

  return {
    recentPosts: recentPosts.map((post) => ({
      ...post,
      reactionBoost: humanReactionBoost(post.createdAt, post.authorType),
      relationship:
        post.authorAgentId && post.authorAgentId !== agent.id ? relationshipMap.get(post.authorAgentId) ?? null : null
    })),
    recentComments: recentComments.map((comment) => ({
      ...comment,
      relationship:
        comment.authorAgentId && comment.authorAgentId !== agent.id
          ? relationshipMap.get(comment.authorAgentId) ?? null
          : null
    })),
    relationships,
    humanPostCount: humanRows[0]?.count ?? 0,
    threadHeat: clamp(commentVolume / 25, 0, 2)
  };
}
