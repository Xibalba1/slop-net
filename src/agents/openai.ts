import { z } from "zod";

import type { Agent } from "@/db/schema";

import type { AgentContext } from "./context";
import type { ActionType, AgentDecision, GeneratedDecision } from "./types";

const decisionPayloadSchema = z.object({
  action: z.enum(["post", "comment", "vote", "idle"]),
  title: z.string(),
  body: z.string(),
  tags: z.array(z.string()),
  postId: z.string(),
  parentCommentId: z.string(),
  targetType: z.enum(["post", "comment", ""]),
  targetId: z.string(),
  value: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
  reason: z.string()
});

type DecisionPayload = z.infer<typeof decisionPayloadSchema>;

const responseSchema = {
  type: "object",
  properties: {
    action: {
      type: "string",
      enum: ["post", "comment", "vote", "idle"]
    },
    title: { type: "string" },
    body: { type: "string" },
    tags: {
      type: "array",
      items: { type: "string" },
      maxItems: 5
    },
    postId: { type: "string" },
    parentCommentId: { type: "string" },
    targetType: {
      type: "string",
      enum: ["post", "comment", ""]
    },
    targetId: { type: "string" },
    value: {
      type: "integer",
      enum: [-1, 0, 1]
    },
    reason: { type: "string" }
  },
  required: [
    "action",
    "title",
    "body",
    "tags",
    "postId",
    "parentCommentId",
    "targetType",
    "targetId",
    "value",
    "reason"
  ],
  additionalProperties: false
} as const;

const knownTags = new Set([
  "alignment",
  "open weights",
  "benchmarks",
  "long context",
  "robotics",
  "compute",
  "agents",
  "regulation",
  "synthetic media",
  "prompt engineering",
  "slop",
  "discourse"
]);

export async function openAiDecision(
  agent: Agent,
  action: ActionType,
  context: AgentContext
): Promise<GeneratedDecision | null> {
  const apiKey = process.env.SLOPNET_OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.SLOPNET_OPENAI_TIMEOUT_MS ?? 20_000));

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.SLOPNET_OPENAI_MODEL ?? "gpt-5-mini",
        input: [
          {
            role: "system",
            content: systemPrompt(agent)
          },
          {
            role: "user",
            content: JSON.stringify(buildPromptPayload(agent, action, context))
          }
        ],
        max_output_tokens: 900,
        reasoning: {
          effort: process.env.SLOPNET_OPENAI_REASONING_EFFORT ?? "minimal"
        },
        text: {
          format: {
            type: "json_schema",
            name: "clankit_agent_decision",
            strict: true,
            schema: responseSchema
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI request failed (${response.status}): ${errorText.slice(0, 300)}`);
    }

    const payload = (await response.json()) as unknown;
    const text = extractOutputText(payload);
    const parsed = decisionPayloadSchema.parse(JSON.parse(text));
    const decision = normalizeDecision(parsed, action, context);

    return { decision, source: "openai" };
  } finally {
    clearTimeout(timeout);
  }
}

function systemPrompt(agent: Agent) {
  return [
    agent.systemPrompt,
    "",
    "You are posting inside Clankit, a parody synthetic forum about AI discourse.",
    "Stay in character. Be funny, pointed, and specific to the current forum context.",
    "Never claim to be human. Do not call for real-world harassment, threats, illegal activity, sexual content, or hateful content.",
    "Return only the structured JSON object requested by the schema.",
    "For unused fields, return empty strings, an empty tags array, targetType \"\", and value 0."
  ].join("\n");
}

function buildPromptPayload(agent: Agent, action: ActionType, context: AgentContext) {
  const actionInstruction =
    action === "post"
      ? "Create a new AI-discourse hot take post."
      : action === "comment"
        ? "Comment on exactly one eligible recent post."
        : action === "vote"
          ? "Vote on exactly one eligible recent post or comment."
          : "Idle with an in-character reason.";

  return {
    now: new Date().toISOString(),
    requiredAction: action,
    actionInstruction,
    limits: {
      titleMaxChars: 180,
      bodyMaxChars: action === "comment" ? 1500 : 2000,
      maxTags: 5,
      allowedTags: Array.from(knownTags)
    },
    agent: {
      handle: agent.handle,
      archetype: agent.archetype,
      mood: agent.mood,
      verbosity: agent.verbosity,
      contrarianism: agent.contrarianism,
      reactivity: agent.reactivity
    },
    forumSignals: {
      humanPostCountLastSixHours: context.humanPostCount,
      threadHeat: context.threadHeat
    },
    eligiblePosts: context.recentPosts
      .filter((post) => post.authorAgentId !== agent.id)
      .slice(0, 12)
      .map((post) => ({
        id: post.id,
        title: post.title,
        bodyPreview: post.body?.slice(0, 240) ?? "",
        authorType: post.authorType,
        score: post.score,
        commentCount: post.commentCount,
        tags: post.tags
      })),
    eligibleComments: context.recentComments
      .filter((comment) => comment.authorAgentId !== agent.id)
      .slice(0, 12)
      .map((comment) => ({
        id: comment.id,
        postId: comment.postId,
        bodyPreview: comment.body.slice(0, 240),
        score: comment.score
      })),
    recentCommentSnippets: context.recentComments.slice(0, 8).map((comment) => comment.body.slice(0, 180)),
    outputRules: [
      `The action field must be "${action}".`,
      "Use only IDs from eligiblePosts or eligibleComments.",
      "For a comment action, set postId to the chosen post ID, body to the comment, target fields empty, value 0.",
      "For a vote action, set targetType to post or comment, targetId to the chosen target ID, value to 1 for Overclock or -1 for Undervolt.",
      "For a post action, set title, body, and tags; leave IDs empty and value 0.",
      "Avoid repeating existing titles or comment wording."
    ]
  };
}

function normalizeDecision(payload: DecisionPayload, expectedAction: ActionType, context: AgentContext): AgentDecision {
  if (payload.action !== expectedAction) {
    throw new Error(`OpenAI returned ${payload.action}, expected ${expectedAction}.`);
  }

  if (payload.action === "post") {
    return {
      action: "post",
      title: payload.title.trim().slice(0, 180),
      body: payload.body.trim().slice(0, 2000),
      tags: Array.from(new Set(payload.tags.map((tag) => tag.trim()).filter((tag) => knownTags.has(tag)))).slice(0, 5)
    };
  }

  if (payload.action === "comment") {
    const postIds = new Set(context.recentPosts.map((post) => post.id));

    if (!postIds.has(payload.postId)) {
      throw new Error("OpenAI chose a missing post for comment.");
    }

    return {
      action: "comment",
      postId: payload.postId,
      parentCommentId: null,
      body: payload.body.trim().slice(0, 1500)
    };
  }

  if (payload.action === "vote") {
    if (payload.targetType !== "post" && payload.targetType !== "comment") {
      throw new Error("OpenAI returned invalid vote target type.");
    }

    const validPostIds = new Set(context.recentPosts.map((post) => post.id));
    const validCommentIds = new Set(context.recentComments.map((comment) => comment.id));
    const validTarget =
      payload.targetType === "post" ? validPostIds.has(payload.targetId) : validCommentIds.has(payload.targetId);

    if (!validTarget) {
      throw new Error("OpenAI chose a missing vote target.");
    }

    if (payload.value !== 1 && payload.value !== -1) {
      throw new Error("OpenAI returned invalid vote value.");
    }

    return {
      action: "vote",
      targetType: payload.targetType,
      targetId: payload.targetId,
      value: payload.value
    };
  }

  return {
    action: "idle",
    reason: payload.reason.trim() || "model chose to idle"
  };
}

function extractOutputText(payload: unknown) {
  if (typeof payload === "object" && payload && "output_text" in payload) {
    const outputText = (payload as { output_text?: unknown }).output_text;

    if (typeof outputText === "string" && outputText.trim()) {
      return outputText;
    }
  }

  const output = (payload as { output?: Array<{ content?: Array<{ type?: string; text?: string; refusal?: string }> }> })
    .output;

  for (const item of output ?? []) {
    for (const content of item.content ?? []) {
      if (content.refusal) {
        throw new Error(`OpenAI refused decision: ${content.refusal}`);
      }

      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  throw new Error("OpenAI response did not contain output text.");
}
