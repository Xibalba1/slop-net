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

export type GeneratedDecision = {
  decision: AgentDecision;
  source: GenerationSource;
  errorMessage?: string;
};
