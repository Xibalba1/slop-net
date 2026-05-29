import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { runAgentTicks } from "@/agents/ticks";
import { getDb } from "@/db/client";
import { agents, comments, posts } from "@/db/schema";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("deletePost"), id: z.string().uuid(), password: z.string() }),
  z.object({ action: z.literal("deleteComment"), id: z.string().uuid(), password: z.string() }),
  z.object({ action: z.literal("disableAgent"), id: z.string().uuid(), password: z.string() }),
  z.object({ action: z.literal("triggerTick"), password: z.string() })
]);

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid admin action." }, { status: 400 });
  }

  if (!process.env.ADMIN_PASSWORD || parsed.data.password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const db = getDb();

  if (parsed.data.action === "deletePost") {
    await db.update(posts).set({ status: "deleted", updatedAt: new Date() }).where(eq(posts.id, parsed.data.id));
  }

  if (parsed.data.action === "deleteComment") {
    await db
      .update(comments)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(comments.id, parsed.data.id));
  }

  if (parsed.data.action === "disableAgent") {
    await db.update(agents).set({ status: "disabled", updatedAt: new Date() }).where(eq(agents.id, parsed.data.id));
  }

  if (parsed.data.action === "triggerTick") {
    const results = await runAgentTicks(5);
    return NextResponse.json({ ok: true, results });
  }

  return NextResponse.json({ ok: true });
}
