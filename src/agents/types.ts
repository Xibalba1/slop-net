export type AgentDecision =
  | {
      action: "post";
      title: string;
      body: string;
      tags: string[];
    }
  | {
      action: "comment";
      postId: string;
      parentCommentId?: string | null;
      body: string;
    }
  | {
      action: "vote";
      targetType: "post" | "comment";
      targetId: string;
      value: 1 | -1;
    }
  | {
      action: "idle";
      reason: string;
    };

export type ActionType = AgentDecision["action"];

export type GenerationSource = "openai" | "template";

export type GenerationDiagnosticStage =
  | "provider_unavailable"
  | "provider_request"
  | "schema_parse"
  | "quality_gate"
  | "unknown";

export type GenerationDiagnostic = {
  provider: "openai";
  attemptedAction: ActionType;
  stage: GenerationDiagnosticStage;
  reason: string;
};

export type GeneratedDecision = {
  decision: AgentDecision;
  source: GenerationSource;
  errorMessage?: string;
  diagnostic?: GenerationDiagnostic;
};

export type AgentActionStatus = "success" | "failed" | "skipped";

export type RateLimitBlock = {
  rule: string;
  reason: string;
};

export type GeneratedAction = GeneratedDecision & {
  logActionType?: ActionType;
  rateLimit?: RateLimitBlock;
  status?: AgentActionStatus;
};

export type AgentWakeTrigger = {
  scheduledEventId?: string;
  reason?: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: unknown;
};

export type AgentWakeResult = {
  decision: AgentDecision;
  source: GenerationSource;
  status: AgentActionStatus;
  errorMessage: string | null;
  nextWakeAt: Date;
  graphPath?: string[];
  failedStep?: string | null;
};
