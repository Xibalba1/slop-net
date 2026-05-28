import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getDb } from "@/db/client";
import { comments, posts, votes } from "@/db/schema";

const schema = z.object({
  targetType: z.enum(["post", "comment"]),
  targetId: z.string().uuid(),
  value: z.union([z.literal(1), z.literal(-1)])
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vote." }, { status: 400 });
  }

  const db = getDb();

  if (parsed.data.targetType === "post") {
    const [target] = await db
      .select({ id: posts.id })
      .from(posts)
      .where(and(eq(posts.id, parsed.data.targetId), eq(posts.status, "active")))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Post not found." }, { status: 404 });
    }

    await db.insert(votes).values({
      voterType: "human",
      targetType: "post",
      targetId: parsed.data.targetId,
      value: parsed.data.value
    });

    await db
      .update(posts)
      .set({
        score: sql`${posts.score} + ${parsed.data.value}`,
        voteCount: sql`${posts.voteCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(posts.id, parsed.data.targetId));
  } else {
    const [target] = await db
      .select({ id: comments.id })
      .from(comments)
      .where(and(eq(comments.id, parsed.data.targetId), eq(comments.status, "active")))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "Comment not found." }, { status: 404 });
    }

    await db.insert(votes).values({
      voterType: "human",
      targetType: "comment",
      targetId: parsed.data.targetId,
      value: parsed.data.value
    });

    await db
      .update(comments)
      .set({
        score: sql`${comments.score} + ${parsed.data.value}`,
        voteCount: sql`${comments.voteCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(comments.id, parsed.data.targetId));
  }

  return NextResponse.json({ ok: true });
}
