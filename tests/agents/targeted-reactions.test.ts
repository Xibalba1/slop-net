import assert from "node:assert/strict";
import { test } from "node:test";

import type { AgentContext } from "@/agents/context";
import { assertCommentQuality } from "@/agents/content-quality";
import { templateDecision } from "@/agents/fallback";
import { agentRoster, buildSystemPrompt } from "@/agents/roster";
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

test("templateDecision fallback comments stay anchored and pass quality gates", () => {
  withMockedRandom(0.42, () => {
    const agent = buildAgent({
      archetype: "Benchmark Obsessive",
      systemPrompt: "Obsess over benchmarks, evals, provenance, and evidence.",
      verbosity: 0.5
    });
    const context = buildContext();
    const generated = templateDecision(agent, "comment", context, undefined, undefined, {
      targetPostId: "target-post"
    });

    assert.equal(generated.decision.action, "comment");

    if (generated.decision.action === "comment") {
      const targetPost = context.recentPosts.find((post) => post.id === generated.decision.postId);

      assert.ok(targetPost);
      assertCommentQuality({
        body: generated.decision.body,
        targetPost,
        recentCommentSnippets: []
      });
    }
  });
});

test("templateDecision fallback comments pass quality gates across roster samples", () => {
  const context = buildContext();
  const randomSamples = [0.02, 0.28, 0.51, 0.76, 0.98];

  for (const rosterAgent of agentRoster) {
    for (const randomSample of randomSamples) {
      withMockedRandom(randomSample, () => {
        const agent = buildAgent({
          handle: rosterAgent.handle,
          archetype: rosterAgent.archetype,
          systemPrompt: buildSystemPrompt(rosterAgent),
          verbosity: rosterAgent.verbosity,
          reactivity: rosterAgent.reactivity,
          contrarianism: rosterAgent.contrarianism
        });
        const generated = templateDecision(agent, "comment", context, undefined, undefined, {
          targetPostId: "target-post"
        });

        assert.equal(generated.decision.action, "comment");

        if (generated.decision.action === "comment") {
          assertCommentQuality({
            body: generated.decision.body,
            targetPost: context.recentPosts[1],
            recentCommentSnippets: []
          });
        }
      });
    }
  }
});

test("templateDecision fallback comments retry repeated frames", () => {
  withMockedRandomSequence([0, 0, 0, 0, 0, 0, 0.55], () => {
    const context = buildContext({
      recentComments: [
        {
          body: `The "open weights" part is doing more work than the headline admits. Open models are the only audit log that matters, but the mechanism is where the argument either becomes real or becomes forum weather.`,
          postId: "target-post"
        }
      ]
    });
    const agent = buildAgent({
      archetype: "Open-Weights Absolutist",
      systemPrompt: "Argue for open weights, public audits, model provenance, and inspectable evidence.",
      verbosity: 0.45
    });
    const generated = templateDecision(agent, "comment", context, undefined, undefined, {
      targetPostId: "target-post"
    });

    assert.equal(generated.decision.action, "comment");

    if (generated.decision.action === "comment") {
      assert.doesNotMatch(generated.decision.body, /^The "open weights" part is doing more work/);
      assertCommentQuality({
        body: generated.decision.body,
        targetPost: context.recentPosts[1],
        recentCommentSnippets: context.recentComments.map((comment) => comment.body)
      });
    }
  });
});

test("templateDecision fallback comments avoid fixed reactive tails", () => {
  withMockedRandom(0.42, () => {
    const agent = buildAgent({
      archetype: "Open-Weights Absolutist",
      systemPrompt: "Argue for open weights, public audits, model provenance, and inspectable evidence.",
      reactivity: 1,
      verbosity: 0.45
    });
    const context = buildContext();
    const generated = templateDecision(agent, "comment", context, undefined, undefined, {
      targetPostId: "target-post"
    });

    assert.equal(generated.decision.action, "comment");

    if (generated.decision.action === "comment") {
      assert.doesNotMatch(generated.decision.body, /thread heat makes the weak version louder/i);
      assertCommentQuality({
        body: generated.decision.body,
        targetPost: context.recentPosts[1],
        recentCommentSnippets: []
      });
    }
  });
});

test("templateDecision fallback comments avoid callback claim echoes", () => {
  withMockedRandom(0.7, () => {
    const agent = buildAgent({
      archetype: "Benchmark Obsessive",
      systemPrompt: "Obsess over benchmarks, evals, provenance, and evidence.",
      reactivity: 1,
      verbosity: 0.45
    });
    const context = buildContext();
    const generated = templateDecision(agent, "comment", context, undefined, undefined, {
      targetPostId: "target-post"
    });

    assert.equal(generated.decision.action, "comment");

    if (generated.decision.action === "comment") {
      assert.doesNotMatch(generated.decision.body, /The boring version is still sharper/i);
      assertCommentQuality({
        body: generated.decision.body,
        targetPost: context.recentPosts[1],
        recentCommentSnippets: []
      });
    }
  });
});

test("templateDecision fallback comments avoid callback move echoes", () => {
  withMockedRandom(0.3, () => {
    const agent = buildAgent({
      archetype: "Compute Geopolitics Crank",
      systemPrompt: "Talk about compute, provenance, data centers, supply chains, and AI infrastructure.",
      reactivity: 1,
      verbosity: 0.45
    });
    const context = buildContext();
    const generated = templateDecision(agent, "comment", context, undefined, undefined, {
      targetPostId: "target-post"
    });

    assert.equal(generated.decision.action, "comment");

    if (generated.decision.action === "comment") {
      assert.doesNotMatch(generated.decision.body, /problem before it is a take/i);
      assertCommentQuality({
        body: generated.decision.body,
        targetPost: context.recentPosts[1],
        recentCommentSnippets: []
      });
    }
  });
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

function buildAgent(overrides: Partial<Agent> = {}): Agent {
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
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
    ...overrides
  };
}

function buildContext(
  overrides: {
    recentComments?: Array<{ body: string; postId: string }>;
  } = {}
): AgentContext {
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
        title: "Open model provenance is now a supply-chain argument",
        body: "Model weights and training data provenance decide whether labs can prove where the supply chain came from.",
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
        tags: ["open weights"],
        createdAt: now,
        updatedAt: now
      }
    ],
    recentComments: (overrides.recentComments ?? []).map((comment, index) => ({
      id: `recent-comment-${index}`,
      body: comment.body,
      postId: comment.postId,
      authorAgentId: null,
      authorHandle: "OtherAgent",
      authorArchetype: "Other Archetype",
      relationship: null,
      score: 0,
      createdAt: now
    })),
    relationships: [],
    humanPostCount: 1,
    threadHeat: 1
  };
}

function withMockedRandom<T>(value: number, callback: () => T) {
  const originalRandom = Math.random;
  Math.random = () => value;

  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}

function withMockedRandomSequence<T>(values: number[], callback: () => T) {
  const originalRandom = Math.random;
  let index = 0;
  Math.random = () => values[Math.min(index++, values.length - 1)] ?? 0;

  try {
    return callback();
  } finally {
    Math.random = originalRandom;
  }
}
