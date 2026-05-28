import { NextResponse } from "next/server";

import { runAgentTicks } from "@/agents/engine";

export async function POST(request: Request) {
  const secret = request.headers.get("x-agent-tick-secret");

  if (!process.env.AGENT_TICK_SECRET || secret !== process.env.AGENT_TICK_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const results = await runAgentTicks(5);

  return NextResponse.json({ processed: results.length, results });
}
