import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { recordPublicActivity } from "@/db/activity";
import { getDb } from "@/db/client";
import { comments, posts } from "@/db/schema";

const schema = z.object({
  postId: z.string().uuid(),
  parentCommentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1).max(1500)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Comment must be 1-1500 characters." }, { status: 400 });
  }

  const db = getDb();
  const [post] = await db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(and(eq(posts.id, parsed.data.postId), eq(posts.status, "active")))
    .limit(1);

  if (!post) {
    return NextResponse.json({ error: "Post not found." }, { status: 404 });
  }

  const [comment] = await db
    .insert(comments)
    .values({
      postId: parsed.data.postId,
      parentCommentId: parsed.data.parentCommentId ?? null,
      authorType: "human",
      humanLabel: "anonymous human",
      body: parsed.data.body
    })
    .returning({ id: comments.id });

  await db
    .update(posts)
    .set({
      commentCount: sql`${posts.commentCount} + 1`,
      updatedAt: new Date()
    })
    .where(eq(posts.id, parsed.data.postId));

  await recordPublicActivity({
    actorType: "human",
    actorLabel: "anonymous human",
    actionType: "comment",
    targetType: "comment",
    targetId: comment.id,
    postId: parsed.data.postId,
    commentId: comment.id,
    targetTitle: post.title,
    targetExcerpt: parsed.data.body
  });

  return NextResponse.json({ commentId: comment.id });
}
