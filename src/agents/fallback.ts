import type { Agent } from "@/db/schema";

import { commentFor, postFor } from "./templates";
import type { ActionType, AgentDecision, GeneratedDecision, GenerationDiagnostic } from "./types";
import type { AgentContext } from "./context";
import { pick } from "./random";

type TemplateDecisionOptions = {
  targetPostId?: string;
};

export function templateDecision(
  agent: Agent,
  action: ActionType,
  context: AgentContext,
  errorMessage?: string,
  diagnostic?: GenerationDiagnostic,
  options: TemplateDecisionOptions = {}
): GeneratedDecision {
  if (action === "post" || context.recentPosts.length === 0) {
    return {
      source: "template",
      errorMessage,
      diagnostic,
      decision: {
        action: "post",
        ...postFor(agent)
      }
    };
  }

  if (action === "comment") {
    const target = pick(weightedPostPool(context, agent, options.targetPostId));

    return {
      source: "template",
      errorMessage,
      diagnostic,
      decision: {
        action: "comment",
        postId: target.id,
        body: commentFor(agent, target, context.recentComments.map((comment) => comment.body))
      }
    };
  }

  if (action === "vote") {
    const target = pick(weightedPostPool(context, agent, options.targetPostId));

    return {
      source: "template",
      errorMessage,
      diagnostic,
      decision: {
        action: "vote",
        targetType: "post",
        targetId: target.id,
        value: voteValue(agent, target)
      }
    };
  }

  return {
    source: "template",
    errorMessage,
    diagnostic,
    decision: {
      action: "idle",
      reason: "weighted randomness selected inaction"
    }
  };
}

function weightedPostPool(context: AgentContext, agent: Agent, targetPostId?: string) {
  const pool = context.recentPosts
    .filter((post) => post.authorAgentId !== agent.id)
    .filter((post) => !targetPostId || post.id === targetPostId)
    .flatMap((post) => {
      const relationship = post.relationship?.affinityScore ?? 0;
      const grudgeBoost = relationship < 0 ? Math.min(5, Math.ceil(Math.abs(relationship))) : 0;
      const allyBoost = relationship > 0 ? Math.min(2, Math.ceil(relationship / 2)) : 0;
      const humanBoost = post.authorType === "human" ? Math.ceil(post.reactionBoost * 2) : 0;
      const heatBoost = Math.min(6, Math.ceil(post.threadHeat / 18));
      const repeats = 1 + Math.min(5, post.commentCount) + heatBoost + humanBoost + grudgeBoost + allyBoost;
      return Array.from({ length: repeats }, () => post);
    });

  return pool.length > 0 ? pool : context.recentPosts.filter((post) => post.authorAgentId !== agent.id);
}

function voteValue(agent: Agent, post: AgentContext["recentPosts"][number]): 1 | -1 {
  const affinity = post.relationship?.affinityScore ?? 0;

  if (affinity <= -1 && Math.random() < 0.55 + agent.contrarianism * 0.25) {
    return -1;
  }

  if (affinity >= 1 && Math.random() < 0.65) {
    return 1;
  }

  if (post.authorType === "human" && Math.random() < agent.reactivity * 0.55) {
    return 1;
  }

  if (Math.random() < agent.contrarianism * 0.45) {
    return -1;
  }

  return 1;
}
