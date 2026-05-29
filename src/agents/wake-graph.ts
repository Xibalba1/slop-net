import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { webcrypto } from "node:crypto";

import type { Agent } from "@/db/schema";

import type { AgentContext } from "./context";
import type {
  AgentActionStatus,
  AgentDecision,
  AgentWakeResult,
  AgentWakeTrigger,
  GeneratedAction,
  GenerationSource,
  GenerationDiagnostic,
  RateLimitBlock
} from "./types";

const WakeGraphState = Annotation.Root({
  agent: Annotation<Agent>(),
  wakeTrigger: Annotation<AgentWakeTrigger | undefined>(),
  context: Annotation<AgentContext | undefined>(),
  generated: Annotation<GeneratedAction | undefined>(),
  decision: Annotation<AgentDecision | undefined>(),
  source: Annotation<GenerationSource | undefined>(),
  nextWakeAt: Annotation<Date | undefined>(),
  status: Annotation<AgentActionStatus | undefined>(),
  errorMessage: Annotation<string | null | undefined>(),
  targetType: Annotation<string | null | undefined>(),
  targetId: Annotation<string | null | undefined>(),
  rateLimit: Annotation<RateLimitBlock | null | undefined>(),
  generationDiagnostic: Annotation<GenerationDiagnostic | null | undefined>(),
  logActionType: Annotation<AgentDecision["action"] | undefined>(),
  result: Annotation<AgentWakeResult | undefined>(),
  failedStep: Annotation<string | null | undefined>(),
  stepHistory: Annotation<string[]>({
    reducer: (left, right) => left.concat(right),
    default: () => []
  })
});

type WakeGraphStateType = typeof WakeGraphState.State;

export type PersistAgentWakeInput = {
  agent: Agent;
  wakeTrigger?: AgentWakeTrigger;
  context: AgentContext;
  decision: AgentDecision;
  source: GenerationSource;
  nextWakeAt: Date;
  status: AgentActionStatus;
  errorMessage: string | null;
  targetType: string | null;
  targetId: string | null;
  rateLimit: RateLimitBlock | null;
  generationDiagnostic: GenerationDiagnostic | null;
  logActionType: AgentDecision["action"];
  graphPath: string[];
  failedStep: string | null;
};

export type AgentWakeGraphDeps = {
  buildContext(agent: Agent): Promise<AgentContext>;
  generateDecision(agent: Agent, context: AgentContext): Promise<GeneratedAction>;
  nextWake(agent: Agent): Date;
  postGenerationRateLimit(agent: Agent, decision: AgentDecision): Promise<RateLimitBlock | null>;
  executeDecision(agent: Agent, decision: AgentDecision): Promise<{ targetType: string | null; targetId: string | null }>;
  persistWake(input: PersistAgentWakeInput): Promise<void>;
};

export async function runAgentWakeGraph(agent: Agent, wakeTrigger: AgentWakeTrigger | undefined, deps: AgentWakeGraphDeps) {
  ensureWebCrypto();

  const graph = new StateGraph(WakeGraphState)
    .addNode("build_context", async (state: WakeGraphStateType) => ({
      context: await deps.buildContext(state.agent),
      stepHistory: ["build_context"]
    }))
    .addNode("generate_decision", async (state: WakeGraphStateType) => {
      const context = required(state.context, "context", "generate_decision");
      const generated = await deps.generateDecision(state.agent, context);
      const decision = generated.decision;

      return {
        generated,
        decision,
        source: generated.source,
        nextWakeAt: deps.nextWake(state.agent),
        status: generated.status ?? "success",
        errorMessage: generated.errorMessage ?? null,
        rateLimit: generated.rateLimit ?? null,
        generationDiagnostic: generated.diagnostic ?? null,
        logActionType: generated.logActionType ?? decision.action,
        stepHistory: ["generate_decision"]
      };
    })
    .addNode("execute_decision", async (state: WakeGraphStateType) => {
      const decision = required(state.decision, "decision", "execute_decision");
      let status = state.status ?? "success";
      let errorMessage = state.errorMessage ?? null;
      let rateLimit = state.rateLimit ?? null;
      let targetType: string | null = null;
      let targetId: string | null = null;
      let failedStep: string | null = null;

      if (status !== "skipped") {
        rateLimit = await deps.postGenerationRateLimit(state.agent, decision);

        if (rateLimit) {
          status = "skipped";
        } else {
          try {
            const executed = await deps.executeDecision(state.agent, decision);
            targetType = executed.targetType;
            targetId = executed.targetId;
          } catch (error) {
            status = "failed";
            errorMessage = error instanceof Error ? error.message : "Unknown agent execution failure.";
            failedStep = "execute_decision";
          }
        }
      }

      return {
        status,
        errorMessage,
        targetType,
        targetId,
        rateLimit,
        failedStep,
        stepHistory: ["execute_decision"]
      };
    })
    .addNode("persist_wake", async (state: WakeGraphStateType) => {
      const context = required(state.context, "context", "persist_wake");
      const decision = required(state.decision, "decision", "persist_wake");
      const source = required(state.source, "source", "persist_wake");
      const nextWakeAt = required(state.nextWakeAt, "nextWakeAt", "persist_wake");
      const status = required(state.status, "status", "persist_wake");
      const logActionType = required(state.logActionType, "logActionType", "persist_wake");
      const graphPath = [...state.stepHistory, "persist_wake"];
      const failedStep = state.failedStep ?? (status === "failed" ? "execute_decision" : null);
      const result: AgentWakeResult = {
        decision,
        source,
        status,
        errorMessage: state.errorMessage ?? null,
        nextWakeAt,
        graphPath,
        failedStep
      };

      await deps.persistWake({
        agent: state.agent,
        wakeTrigger: state.wakeTrigger,
        context,
        decision,
        source,
        nextWakeAt,
        status,
        errorMessage: state.errorMessage ?? null,
        targetType: state.targetType ?? null,
        targetId: state.targetId ?? null,
        rateLimit: state.rateLimit ?? null,
        generationDiagnostic: state.generationDiagnostic ?? null,
        logActionType,
        graphPath,
        failedStep
      });

      return {
        result,
        stepHistory: ["persist_wake"]
      };
    })
    .addEdge(START, "build_context")
    .addEdge("build_context", "generate_decision")
    .addEdge("generate_decision", "execute_decision")
    .addEdge("execute_decision", "persist_wake")
    .addEdge("persist_wake", END)
    .compile();

  const finalState = await graph.invoke({ agent, wakeTrigger });
  const result = finalState.result;

  if (!result) {
    throw new Error("Agent wake graph completed without a result.");
  }

  return result;
}

function ensureWebCrypto() {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", {
      value: webcrypto,
      configurable: true
    });
  }
}

function required<T>(value: T | null | undefined, name: string, step: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Agent wake graph missing ${name} at ${step}.`);
  }

  return value;
}
