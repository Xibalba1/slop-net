import { and, eq, gt, isNull, or } from "drizzle-orm";

import { getDb } from "@/db/client";
import { agentActions, agents, type Agent } from "@/db/schema";

import { clamp, randomBetween } from "./random";

const DEFAULT_SWARM_SIZE = 5;
const HUMAN_REACTION_WINDOW_MS = 1000 * 60 * 75;
const HUMAN_REACTION_MAX_BOOST = 4;

type SwarmCandidate = {
  agent: Agent;
  score: number;
  matchedTerms: string[];
};

const tagTerms: Record<string, string[]> = {
  alignment: ["alignment", "safety", "values", "unaligned", "control"],
  "open weights": ["open", "weights", "open-source", "openweight", "oss"],
  benchmarks: ["benchmark", "bench", "eval", "leaderboard"],
  "long context": ["context", "long-context", "memory", "tokens"],
  robotics: ["robot", "robotics", "embodiment", "actuator"],
  compute: ["compute", "gpu", "datacenter", "chips"],
  agents: ["agent", "agents", "autonomy", "tool use"],
  regulation: ["regulation", "policy", "governance", "law"],
  "synthetic media": ["synthetic", "media", "video", "image", "slop"],
  "prompt engineering": ["prompt", "prompting", "jailbreak", "system prompt"],
  slop: ["slop", "content", "posting", "feed"],
  discourse: ["discourse", "forum", "reply", "take"]
};

export async function scheduleHumanPostSwarm({
  postId,
  title,
  body,
  tags
}: {
  postId: string;
  title: string;
  body: string | null;
  tags: string[];
}) {
  const db = getDb();
  const activeAgents = await db.select().from(agents).where(eq(agents.status, "active"));
  const swarmSize = clamp(positiveInteger(process.env.AGENT_HUMAN_POST_SWARM_SIZE, DEFAULT_SWARM_SIZE), 1, 8);
  const candidates = activeAgents
    .map((agent) => scoreAgent(agent, `${title} ${body ?? ""}`, tags))
    .sort((a, b) => b.score - a.score)
    .slice(0, swarmSize);

  if (candidates.length === 0) {
    return { awakened: 0, agents: [] };
  }

  const now = Date.now();
  const wakeups = candidates.map((candidate, index) => ({
    ...candidate,
    wakeAt: new Date(now + (index === 0 ? 0 : randomBetween(8_000, 75_000)))
  }));

  await Promise.all(
    wakeups.map(({ agent, score, matchedTerms, wakeAt }) =>
      Promise.all([
        db
          .update(agents)
          .set({
            nextWakeAt: wakeAt,
            mood: agent.mood === "lurking" ? "normal" : "agitated",
            updatedAt: new Date()
          })
          .where(and(eq(agents.id, agent.id), or(isNull(agents.nextWakeAt), gt(agents.nextWakeAt, wakeAt)))),
        db.insert(agentActions).values({
          agentId: agent.id,
          actionType: "summoned",
          targetType: "post",
          targetId: postId,
          inputSnapshot: {
            generationSource: "system",
            trigger: "human-post-swarm",
            postId,
            title,
            tags,
            matchScore: Number(score.toFixed(2)),
            matchedTerms,
            wakeAt: wakeAt.toISOString()
          },
          outputJson: {
            action: "summoned",
            postId,
            wakeAt: wakeAt.toISOString()
          },
          status: "success"
        })
      ])
    )
  );

  return {
    awakened: wakeups.length,
    agents: wakeups.map(({ agent, score, wakeAt }) => ({
      id: agent.id,
      handle: agent.handle,
      score: Number(score.toFixed(2)),
      wakeAt
    }))
  };
}

export function humanReactionBoost(createdAt: Date, authorType: string) {
  if (authorType !== "human") {
    return 1;
  }

  const ageMs = Date.now() - createdAt.getTime();

  if (ageMs < 0 || ageMs > HUMAN_REACTION_WINDOW_MS) {
    return 1;
  }

  const remaining = 1 - ageMs / HUMAN_REACTION_WINDOW_MS;
  return Number((1 + HUMAN_REACTION_MAX_BOOST * remaining).toFixed(2));
}

function scoreAgent(agent: Agent, text: string, tags: string[]): SwarmCandidate {
  const haystack = `${agent.handle} ${agent.archetype} ${agent.systemPrompt}`.toLowerCase();
  const textTerms = tokenize(text);
  const matchedTerms = new Set<string>();
  let score = agent.reactivity * 8 + agent.commentWeight * 2 + agent.volatility;

  for (const tag of tags) {
    const terms = tagTerms[tag] ?? [tag];
    const tagMatched = terms.some((term) => haystack.includes(term));

    if (tagMatched) {
      score += 3;
      matchedTerms.add(tag);
    }
  }

  for (const term of textTerms) {
    if (haystack.includes(term)) {
      score += 0.8;
      matchedTerms.add(term);
    }
  }

  score += Math.random() * Math.max(agent.volatility, 0.2);

  return {
    agent,
    score,
    matchedTerms: Array.from(matchedTerms).slice(0, 8)
  };
}

function tokenize(text: string) {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9-]+/)
        .filter((term) => term.length >= 4)
    )
  ).slice(0, 60);
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
