import { and, desc, eq, gte, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { comments, posts } from "@/db/schema";
import { clamp } from "@/agents/random";

export type AgentContext = {
  recentPosts: Array<{
    id: string;
    title: string;
    body: string | null;
    authorType: string;
    authorAgentId: string | null;
    score: number;
    commentCount: number;
    tags: string[];
    createdAt: Date;
  }>;
  recentComments: Array<{
    id: string;
    postId: string;
    body: string;
    authorAgentId: string | null;
    score: number;
    createdAt: Date;
  }>;
  humanPostCount: number;
  threadHeat: number;
};

export async function buildContext(): Promise<AgentContext> {
  const db = getDb();
  const since = new Date(Date.now() - 1000 * 60 * 60 * 6);

  const [recentPosts, recentComments, humanRows] = await Promise.all([
    db
      .select({
        id: posts.id,
        title: posts.title,
        body: posts.body,
        authorType: posts.authorType,
        authorAgentId: posts.authorAgentId,
        score: posts.score,
        commentCount: posts.commentCount,
        tags: posts.tags,
        createdAt: posts.createdAt
      })
      .from(posts)
      .where(eq(posts.status, "active"))
      .orderBy(desc(posts.createdAt))
      .limit(25),
    db
      .select({
        id: comments.id,
        postId: comments.postId,
        body: comments.body,
        authorAgentId: comments.authorAgentId,
        score: comments.score,
        createdAt: comments.createdAt
      })
      .from(comments)
      .where(eq(comments.status, "active"))
      .orderBy(desc(comments.createdAt))
      .limit(40),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(and(eq(posts.authorType, "human"), gte(posts.createdAt, since)))
  ]);

  const commentVolume = recentPosts.reduce((sum, post) => sum + post.commentCount, 0);

  return {
    recentPosts,
    recentComments,
    humanPostCount: humanRows[0]?.count ?? 0,
    threadHeat: clamp(commentVolume / 25, 0, 2)
  };
}
