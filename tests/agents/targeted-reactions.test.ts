import assert from "node:assert/strict";
import { test } from "node:test";

import type { AgentContext } from "@/agents/context";
import { templateDecision } from "@/agents/fallback";
import type { Agent } from "@/db/schema";

test("templateDecision comments on the targeted human post when provided", () => {
  const agent = buildAgent();
  const context = buildContext();

  const generated = templateDecision(agent, "comment", context, undefined, undefined, {
    targetPostId: "target-post"
  });

  assert.equal(generated.decision.action, "comment");

  if (generated.decision.action === "comment") {
    assert.equal(generated.decision.postId, "target-post");
  }
});

test("templateDecision votes on the targeted human post when provided", () => {
  const agent = buildAgent();
  const context = buildContext();

  const generated = templateDecision(agent, "vote", context, undefined, undefined, {
    targetPostId: "target-post"
  });

  assert.equal(generated.decision.action, "vote");

  if (generated.decision.action === "vote") {
    assert.equal(generated.decision.targetType, "post");
    assert.equal(generated.decision.targetId, "target-post");
  }
});

function buildAgent(): Agent {
  return {
    id: "agent-id",
    handle: "TestAgent",
    archetype: "Test Harness",
    systemPrompt: "React to test posts.",
    meanWakeIntervalMs: 60_000,
    baseActProbability: 1,
    postWeight: 1,
    commentWeight: 1,
    voteWeight: 1,
    idleWeight: 1,
    volatility: 0,
    reactivity: 1,
    contrarianism: 0,
    verbosity: 0,
    activityWindow: "always-on",
    mood: "normal",
    status: "active",
    nextWakeAt: null,
    lastActiveAt: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z")
  };
}

function buildContext(): AgentContext {
  const now = new Date("2026-06-01T00:00:00.000Z");

  return {
    recentPosts: [
      {
        id: "other-post",
        title: "Other thread",
        body: "This should not receive the targeted reaction.",
        authorType: "human",
        authorAgentId: null,
        authorHandle: null,
        authorArchetype: null,
        relationship: null,
        score: 30,
        commentCount: 12,
        voteCount: 20,
        threadHeat: 80,
        threadHeatLabel: "hot",
        reactionBoost: 10,
        tags: ["agents"],
        createdAt: now,
        updatedAt: now
      },
      {
        id: "target-post",
        title: "Target human post",
        body: "Agents should react to this specific submitted post.",
        authorType: "human",
        authorAgentId: null,
        authorHandle: null,
        authorArchetype: null,
        relationship: null,
        score: 0,
        commentCount: 0,
        voteCount: 0,
        threadHeat: 0,
        threadHeatLabel: "quiet",
        reactionBoost: 2,
        tags: ["agents"],
        createdAt: now,
        updatedAt: now
      }
    ],
    recentComments: [],
    relationships: [],
    humanPostCount: 1,
    threadHeat: 1
  };
}
