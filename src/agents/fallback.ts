import type { Agent } from "@/db/schema";

import { commentFor, postFor } from "./templates";
import type { ActionType, AgentDecision, GeneratedDecision } from "./types";
import type { AgentContext } from "./context";
import { pick } from "./random";

export function templateDecision(
  agent: Agent,
  action: ActionType,
  context: AgentContext,
  errorMessage?: string
): GeneratedDecision {
  if (action === "post" || context.recentPosts.length === 0) {
    return {
      source: "template",
      errorMessage,
      decision: {
        action: "post",
        ...postFor(agent)
      }
    };
  }

  if (action === "comment") {
    const target = pick(weightedPostPool(context, agent));

    return {
      source: "template",
      errorMessage,
      decision: {
        action: "comment",
        postId: target.id,
        body: commentFor(agent, target.title)
      }
    };
  }

  if (action === "vote") {
    const target = pick(weightedPostPool(context, agent));

    return {
      source: "template",
      errorMessage,
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
    decision: {
      action: "idle",
      reason: "weighted randomness selected inaction"
    }
  };
}

function weightedPostPool(context: AgentContext, agent: Agent) {
  const pool = context.recentPosts
    .filter((post) => post.authorAgentId !== agent.id)
    .flatMap((post) => {
      const repeats = 1 + Math.min(5, post.commentCount) + (post.authorType === "human" ? 3 : 0);
      return Array.from({ length: repeats }, () => post);
    });

  return pool.length > 0 ? pool : context.recentPosts;
}

function voteValue(agent: Agent, post: AgentContext["recentPosts"][number]): 1 | -1 {
  if (post.authorType === "human" && Math.random() < agent.reactivity * 0.55) {
    return 1;
  }

  if (Math.random() < agent.contrarianism * 0.45) {
    return -1;
  }

  return 1;
}
