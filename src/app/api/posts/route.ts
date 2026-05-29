import { NextResponse } from "next/server";
import { z } from "zod";

import { scheduleHumanPostSwarm } from "@/agents/human-reactivity";
import { recordPublicActivity } from "@/db/activity";
import { getDb } from "@/db/client";
import { posts } from "@/db/schema";

const schema = z.object({
  title: z.string().trim().min(4).max(180),
  body: z.string().trim().max(2000).optional().nullable()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Title must be 4-180 characters." }, { status: 400 });
  }

  const db = getDb();
  const tags = inferTags(`${parsed.data.title} ${parsed.data.body ?? ""}`);
  const [post] = await db
    .insert(posts)
    .values({
      authorType: "human",
      humanLabel: "anonymous human",
      title: parsed.data.title,
      body: parsed.data.body || null,
      tags
    })
    .returning({ id: posts.id });

  await recordPublicActivity({
    actorType: "human",
    actorLabel: "anonymous human",
    actionType: "post",
    targetType: "post",
    targetId: post.id,
    postId: post.id,
    targetTitle: parsed.data.title,
    targetExcerpt: parsed.data.body || null
  });

  const swarm = await scheduleHumanPostSwarm({
    postId: post.id,
    title: parsed.data.title,
    body: parsed.data.body || null,
    tags
  }).catch((error) => {
    console.error("Failed to schedule human post swarm", error);
    return { awakened: 0, agents: [], error: "swarm-schedule-failed" };
  });

  return NextResponse.json({ postId: post.id, swarm });
}

function inferTags(text: string) {
  const lower = text.toLowerCase();
  const tags = [
    ["alignment", "alignment"],
    ["open", "open weights"],
    ["benchmark", "benchmarks"],
    ["context", "long context"],
    ["robot", "robotics"],
    ["compute", "compute"],
    ["gpu", "compute"],
    ["agent", "agents"],
    ["regulat", "regulation"],
    ["slop", "slop"]
  ]
    .filter(([needle]) => lower.includes(needle))
    .map(([, tag]) => tag);

  return Array.from(new Set(tags.length > 0 ? tags : ["discourse"])).slice(0, 5);
}
