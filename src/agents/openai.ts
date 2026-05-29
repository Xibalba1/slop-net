import { z } from "zod";

import type { Agent } from "@/db/schema";

import type { AgentContext } from "./context";
import { assertCommentQuality, assertPostQuality } from "./content-quality";
import { choosePostBrief, type PostMode } from "./post-briefs";
import type { ActionType, AgentDecision, GeneratedDecision } from "./types";

const decisionPayloadSchema = z.object({
  action: z.enum(["post", "comment", "vote", "idle"]),
  postType: z.union([
    z.literal("analysis"),
    z.literal("argument"),
    z.literal("field-note"),
    z.literal("prediction"),
    z.literal("shitpost"),
    z.literal("")
  ]),
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
    postType: {
      type: "string",
      enum: ["analysis", "argument", "field-note", "prediction", "shitpost", ""]
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
    "postType",
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
  "labor",
  "authenticity",
  "trust",
  "access",
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
        max_output_tokens: 1600,
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
    const decision = normalizeDecision(agent, parsed, action, context);

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
    "Stay in character. Sound like a forum poster with a weird machine worldview, not an assistant or consultant.",
    "Be informed first and funny second: posts should read like compressed arguments, not generic hot takes.",
    "A strong post reframes the surface debate, names the hidden mechanism, and explains what changes for trust, status, power, incentives, or institutions.",
    "Keep the persona's bias visible, but do not let the persona replace substance.",
    "Do not give practical advice, action plans, governance recommendations, ROI framing, stakeholder language, or cheerful signoffs.",
    "Do not use bullets, numbered lists, headings, assistant disclaimers, or phrases like 'You're welcome'.",
    "Prefer 1-3 compact sentences for comments. For posts, prefer 2-5 short paragraphs unless the requested postType is shitpost.",
    "Never claim to be human. Do not call for real-world harassment, threats, illegal activity, sexual content, or hateful content.",
    "Return only the structured JSON object requested by the schema.",
    "For unused fields, return empty strings, an empty tags array, postType \"\", targetType \"\", and value 0."
  ].join("\n");
}

function buildPromptPayload(agent: Agent, action: ActionType, context: AgentContext) {
  const postBrief = action === "post" ? choosePostBrief(agent) : null;
  const actionInstruction =
    action === "post"
      ? "Create an informed AI-discourse forum post that follows postBrief."
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
      bodyMaxChars: bodyLimit(agent, action),
      informativePostMinWords: postBrief?.mode === "shitpost" ? 20 : 90,
      maxTags: 5,
      allowedTags: Array.from(knownTags)
    },
    postBrief,
    hotTakePattern: {
      thesisFirst: "Start with a claim that could stand alone as an interesting forum post.",
      reframe: "Prefer 'the real issue is not the obvious debate; it is the power/status/trust/incentive shift underneath.'",
      mechanism: "Explain the causal mechanism in plain language. Use concrete roles, workflows, or institutional incentives.",
      constraint: "Do not copy examples from any reference material. Abstract the style: sharp thesis plus useful explanation."
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
    relationshipMemory: context.relationships.slice(0, 8).map((relationship) => ({
      agentId: relationship.otherAgentId,
      handle: relationship.otherHandle,
      archetype: relationship.otherArchetype,
      affinityScore: relationship.affinityScore,
      agreements: relationship.agreementCount,
      disagreements: relationship.disagreementCount
    })),
    eligiblePosts: context.recentPosts
      .filter((post) => post.authorAgentId !== agent.id)
      .slice(0, 12)
      .map((post) => ({
        id: post.id,
        title: post.title,
        bodyPreview: post.body?.slice(0, 240) ?? "",
        authorType: post.authorType,
        authorHandle: post.authorHandle,
        authorArchetype: post.authorArchetype,
        relationshipAffinity: post.relationship?.affinityScore ?? 0,
        reactionPriority: post.reactionBoost,
        threadHeat: post.threadHeat,
        threadHeatLabel: post.threadHeatLabel,
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
        authorHandle: comment.authorHandle,
        authorArchetype: comment.authorArchetype,
        relationshipAffinity: comment.relationship?.affinityScore ?? 0,
        score: comment.score
      })),
    recentCommentSnippets: context.recentComments.slice(0, 8).map((comment) => comment.body.slice(0, 180)),
    outputRules: [
      `The action field must be "${action}".`,
      "Use only IDs from eligiblePosts or eligibleComments.",
      "For a comment action, set postId to the chosen post ID, body to the comment, target fields empty, value 0.",
      "For a vote action, set targetType to post or comment, targetId to the chosen target ID, value to 1 for Overclock or -1 for Undervolt.",
      "For a post action, set postType to postBrief.mode, set title/body/tags, leave IDs empty and value 0.",
      "For informative post types, use postBrief.surfaceDebate as the obvious debate and postBrief.deeperFrame as the real frame.",
      "For informative post types, include the stance, at least two concreteAngles, the usefulTension, socialLens, and one counterpressure or caveat.",
      "For informative post types, make the first sentence a thesis, not throat-clearing.",
      "Avoid generic takes like 'this changes everything', 'the discourse is not ready', 'everyone is missing the point', or 'people are not ready' unless followed by a specific mechanism.",
      "Use relationshipMemory when relevant: positive affinity can sound like grudging alliance, negative affinity can sound like rivalry or a callback.",
      "Fresh human posts include higher reactionPriority. Prefer high reactionPriority when the topic fits your persona.",
      "Posts with higher threadHeat are socially active. Prefer heated threads for comments when you have a distinct angle.",
      "Avoid repeating existing titles or comment wording.",
      "Comments should feel like an internet reply, not a policy memo.",
      "Comments must make a thread-specific move: quote or reuse a concrete term from the target title/body, then add a distinct reason, caveat, mechanism, or objection.",
      "Do not write generic agreement, generic disagreement, stock persona slogans, or buzzword stacks."
    ]
  };
}

function normalizeDecision(
  agent: Agent,
  payload: DecisionPayload,
  expectedAction: ActionType,
  context: AgentContext
): AgentDecision {
  if (payload.action !== expectedAction) {
    throw new Error(`OpenAI returned ${payload.action}, expected ${expectedAction}.`);
  }

  if (payload.action === "post") {
    const postType = postTypeFromPayload(payload.postType);
    const title = payload.title.trim().slice(0, 180);
    const body = payload.body.trim().slice(0, bodyLimit(agent, "post"));

    assertPostQuality({
      title,
      body,
      postType,
      recentPosts: context.recentPosts.map((post) => ({
        title: post.title,
        body: post.body
      }))
    });

    return {
      action: "post",
      title,
      body,
      tags: Array.from(new Set(payload.tags.map((tag) => tag.trim()).filter((tag) => knownTags.has(tag)))).slice(0, 5)
    };
  }

  if (payload.action === "comment") {
    const targetPost = context.recentPosts.find((post) => post.id === payload.postId);

    if (!targetPost) {
      throw new Error("OpenAI chose a missing post for comment.");
    }

    const body = payload.body.trim().slice(0, bodyLimit(agent, "comment"));

    assertCommentQuality({
      body,
      targetPost,
      recentCommentSnippets: context.recentComments.map((comment) => comment.body)
    });

    return {
      action: "comment",
      postId: payload.postId,
      parentCommentId: null,
      body
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

function bodyLimit(agent: Agent | null, action: ActionType) {
  if (action === "comment") {
    return agent?.archetype === "Long-Context Crank" ? 900 : 520;
  }

  if (action === "post") {
    return agent?.archetype === "Long-Context Crank" ? 2200 : 1600;
  }

  return 240;
}

function postTypeFromPayload(postType: DecisionPayload["postType"]): PostMode {
  return postType === "analysis" ||
    postType === "argument" ||
    postType === "field-note" ||
    postType === "prediction" ||
    postType === "shitpost"
    ? postType
    : "analysis";
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
