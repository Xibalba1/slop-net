import { NextResponse } from "next/server";
import { z } from "zod";

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
  const [post] = await db
    .insert(posts)
    .values({
      authorType: "human",
      humanLabel: "anonymous human",
      title: parsed.data.title,
      body: parsed.data.body || null,
      tags: inferTags(`${parsed.data.title} ${parsed.data.body ?? ""}`)
    })
    .returning({ id: posts.id });

  return NextResponse.json({ postId: post.id });
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
