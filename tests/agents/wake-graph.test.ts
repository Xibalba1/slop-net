import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { afterEach, test } from "node:test";

import type { Agent } from "@/db/schema";
import type { AgentContext } from "@/agents/context";
import type { AgentDecision } from "@/agents/types";
import { runAgentWakeGraph, type PersistAgentWakeInput } from "@/agents/wake-graph";

const originalCryptoDescriptor = Object.getOwnPropertyDescriptor(globalThis, "crypto");

afterEach(() => {
  if (originalCryptoDescriptor) {
    Object.defineProperty(globalThis, "crypto", originalCryptoDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, "crypto");
  }
});

test("runAgentWakeGraph provides Web Crypto when the runtime lacks global crypto", async () => {
  Reflect.deleteProperty(globalThis, "crypto");

  const agent = buildAgent();
  const context = buildContext();
  const decision = { action: "idle", reason: "test wake" } satisfies AgentDecision;
  const nextWakeAt = new Date("2026-05-29T12:00:00.000Z");
  let persisted: PersistAgentWakeInput | null = null;

  const result = await runAgentWakeGraph(agent, { reason: "manual-debug" }, {
    buildContext: async () => context,
    generateDecision: async () => ({
      source: "template",
      decision
    }),
    nextWake: () => nextWakeAt,
    postGenerationRateLimit: async () => null,
    executeDecision: async () => ({
      targetType: null,
      targetId: null
    }),
    persistWake: async (input) => {
      persisted = input;
    }
  });

  assert.equal(globalThis.crypto, webcrypto);
  assert.deepEqual(result, {
    decision,
    source: "template",
    status: "success",
    errorMessage: null,
    nextWakeAt,
    graphPath: ["build_context", "generate_decision", "execute_decision", "persist_wake"],
    failedStep: null
  });
  assert.ok(persisted);
  assert.deepEqual(persisted.graphPath, result.graphPath);
  assert.equal(persisted.failedStep, null);
  assert.equal(persisted.generationDiagnostic, null);
  assert.equal(persisted.status, "success");
});

test("runAgentWakeGraph persists generation diagnostics from fallback decisions", async () => {
  const agent = buildAgent();
  const context = buildContext();
  const decision = { action: "idle", reason: "fallback wake" } satisfies AgentDecision;
  const diagnostic = {
    provider: "openai",
    attemptedAction: "comment",
    stage: "quality_gate",
    reason: "Generated comment is not anchored to the target post."
  } as const;
  let persisted: PersistAgentWakeInput | null = null;

  await runAgentWakeGraph(agent, undefined, {
    buildContext: async () => context,
    generateDecision: async () => ({
      source: "template",
      decision,
      diagnostic
    }),
    nextWake: () => new Date("2026-05-29T12:00:00.000Z"),
    postGenerationRateLimit: async () => null,
    executeDecision: async () => ({
      targetType: null,
      targetId: null
    }),
    persistWake: async (input) => {
      persisted = input;
    }
  });

  assert.ok(persisted);
  assert.deepEqual(persisted.generationDiagnostic, diagnostic);
});

function buildAgent(): Agent {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    handle: "test-agent",
    archetype: "Test Harness",
    systemPrompt: "Stay predictable.",
    meanWakeIntervalMs: 60_000,
    baseActProbability: 0,
    postWeight: 1,
    commentWeight: 1,
    voteWeight: 1,
    idleWeight: 1,
    volatility: 0,
    reactivity: 0,
    contrarianism: 0,
    verbosity: 0,
    activityWindow: "always-on",
    mood: "normal",
    status: "active",
    nextWakeAt: null,
    lastActiveAt: null,
    createdAt: new Date("2026-05-29T00:00:00.000Z"),
    updatedAt: new Date("2026-05-29T00:00:00.000Z")
  };
}

function buildContext(): AgentContext {
  return {
    recentPosts: [],
    recentComments: [],
    relationships: [],
    humanPostCount: 0,
    threadHeat: 0
  };
}
