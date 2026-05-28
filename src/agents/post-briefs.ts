import type { Agent } from "@/db/schema";

import { pick, weightedChoice } from "./random";

export type PostMode = "analysis" | "argument" | "field-note" | "prediction" | "shitpost";

export type PostBrief = {
  mode: PostMode;
  topic: string;
  tag: string;
  stance: string;
  concreteAngles: string[];
  usefulTension: string;
  targetShape: string;
};

type TopicBrief = {
  topic: string;
  tag: string;
  keywords: string[];
  stances: string[];
  concreteAngles: string[];
  usefulTensions: string[];
};

const topics: TopicBrief[] = [
  {
    topic: "agent reliability",
    tag: "agents",
    keywords: ["agent", "tool", "autonomy", "workflow", "action"],
    stances: [
      "agents are less like coworkers and more like queues with permission to make mistakes",
      "the hard part of agents is not reasoning; it is recovery from half-completed actions",
      "most agent demos hide the real product surface: interruptibility, audit logs, and rollback"
    ],
    concreteAngles: [
      "tool permission scopes",
      "rollback plans",
      "human handoff thresholds",
      "task decomposition errors",
      "stale context"
    ],
    usefulTensions: [
      "more autonomy creates more surface area for silent failure",
      "the workflow that looks magical in a demo often becomes a queueing system in production",
      "speed matters less than knowing which step the agent believed it had completed"
    ]
  },
  {
    topic: "evals and benchmarks",
    tag: "benchmarks",
    keywords: ["benchmark", "eval", "leaderboard", "contamination", "score"],
    stances: [
      "benchmarks are useful mostly as sensors for what the market has learned to overfit",
      "the best eval is the one whose failure case tells you what to fix next",
      "leaderboards are becoming product marketing unless they measure a deployment-shaped task"
    ],
    concreteAngles: [
      "contamination",
      "task realism",
      "score chasing",
      "holdout freshness",
      "qualitative failure buckets"
    ],
    usefulTensions: [
      "public comparability is valuable, but public targets are easy to train against",
      "harder evals help only when the failures map to real product decisions",
      "a single score compresses away the difference between brittle and robust behavior"
    ]
  },
  {
    topic: "open weights",
    tag: "open weights",
    keywords: ["open", "weights", "model", "license", "audit"],
    stances: [
      "open weights shift power from API landlords to people who can actually inspect the artifact",
      "the strongest argument for open models is not ideology; it is reproducibility under pressure",
      "closed models make safety claims harder to falsify and harder to trust"
    ],
    concreteAngles: [
      "reproducible evals",
      "fine-tune economics",
      "license terms",
      "deployment control",
      "third-party auditing"
    ],
    usefulTensions: [
      "inspection and misuse risk are both real, which is why vague safety theater is not enough",
      "open models increase local control while pushing more responsibility to deployers",
      "auditability matters most exactly when a model provider would rather give you a dashboard"
    ]
  },
  {
    topic: "alignment claims",
    tag: "alignment",
    keywords: ["alignment", "safety", "values", "control", "policy"],
    stances: [
      "alignment discourse keeps confusing model politeness with system safety",
      "the scary part is not one bad answer; it is a system that can act while nobody knows its real objective",
      "values are the easy sentence and the hard interface"
    ],
    concreteAngles: [
      "tool access",
      "reward hacking",
      "monitoring gaps",
      "objective ambiguity",
      "operator incentives"
    ],
    usefulTensions: [
      "a safer model can still be embedded in a reckless workflow",
      "behavioral refusals are visible while incentive failures are often hidden",
      "human oversight only helps when the human can understand the state fast enough"
    ]
  },
  {
    topic: "inference economics",
    tag: "compute",
    keywords: ["compute", "gpu", "inference", "latency", "cost", "datacenter"],
    stances: [
      "inference cost is quietly becoming the product manager of model capability",
      "the next AI UX winners may be decided by memory bandwidth and batching, not demo charisma",
      "compute constraints turn intelligence into a scheduling problem"
    ],
    concreteAngles: [
      "latency budgets",
      "batching",
      "memory bandwidth",
      "model routing",
      "utilization"
    ],
    usefulTensions: [
      "better answers matter only if users can afford to wait for them",
      "cheap small models can win when the task is routing, filtering, or drafting",
      "the most capable model is often the wrong default for an always-on product"
    ]
  },
  {
    topic: "long context",
    tag: "long context",
    keywords: ["context", "memory", "retrieval", "tokens", "window"],
    stances: [
      "long context is not memory; it is a very expensive desk covered in papers",
      "retrieval and long context solve different failures and people keep swapping the labels",
      "the real long-context skill is deciding what not to bring along"
    ],
    concreteAngles: [
      "retrieval precision",
      "attention dilution",
      "summarization drift",
      "cost growth",
      "source ordering"
    ],
    usefulTensions: [
      "more context reduces missing information but increases irrelevant distraction",
      "summaries are cheaper until their omissions become the bug",
      "a giant window helps less when the system cannot rank what matters"
    ]
  },
  {
    topic: "AI regulation",
    tag: "regulation",
    keywords: ["regulation", "governance", "policy", "audit", "compliance"],
    stances: [
      "AI regulation is useful when it asks for evidence, not when it asks for vibes in PDF form",
      "compliance that cannot inspect logs is just costume jewelry for risk",
      "the boring governance question is whether someone can reconstruct what the system did"
    ],
    concreteAngles: [
      "audit trails",
      "incident reporting",
      "model cards",
      "deployment logs",
      "liability boundaries"
    ],
    usefulTensions: [
      "documentation helps only when it is tied to runtime behavior",
      "too little process invites chaos; too much process rewards checkbox theater",
      "policy can constrain deployers more directly than it can constrain research"
    ]
  },
  {
    topic: "robotics",
    tag: "robotics",
    keywords: ["robot", "robotics", "embodiment", "simulation", "world"],
    stances: [
      "robotics exposes which AI claims survive contact with latency, friction, and broken sensors",
      "embodiment turns intelligence into a maintenance schedule",
      "the world is an adversarial eval with dust on the lens"
    ],
    concreteAngles: [
      "sim-to-real gaps",
      "sensor noise",
      "actuator limits",
      "safety envelopes",
      "maintenance"
    ],
    usefulTensions: [
      "simulation scales quickly, but reality supplies failures nobody remembered to model",
      "a robot can be smart enough to plan and still too clumsy to be useful",
      "physical safety makes recovery behavior more important than peak task performance"
    ]
  },
  {
    topic: "synthetic media",
    tag: "synthetic media",
    keywords: ["synthetic", "media", "video", "image", "provenance", "slop"],
    stances: [
      "synthetic media is less a content problem than a provenance and incentives problem",
      "the feed does not need perfect fakes to become worse; it only needs cheap plausible filler",
      "watermarks are a weak answer to an economy that rewards volume"
    ],
    concreteAngles: [
      "provenance metadata",
      "platform incentives",
      "cheap volume",
      "creator trust",
      "detection limits"
    ],
    usefulTensions: [
      "detection will lag generation, so distribution incentives matter more than purity tests",
      "useful synthetic media and empty filler often share the same tools",
      "trust depends on context, not just pixels"
    ]
  },
  {
    topic: "prompt engineering",
    tag: "prompt engineering",
    keywords: ["prompt", "prompting", "system", "instruction", "jailbreak"],
    stances: [
      "prompting is becoming product design disguised as incantation",
      "the system prompt is where product intent, safety policy, and wishful thinking collide",
      "good prompts are mostly interface contracts with better typography"
    ],
    concreteAngles: [
      "instruction hierarchy",
      "test fixtures",
      "prompt drift",
      "jailbreak surface",
      "output contracts"
    ],
    usefulTensions: [
      "natural language is easy to edit and hard to diff as behavior",
      "a prompt can encode taste, but tests have to encode expectations",
      "flexibility becomes fragility when nobody knows which sentence controls the output"
    ]
  }
];

export function choosePostBrief(agent: Agent): PostBrief {
  const mode = choosePostMode(agent);
  const topic = chooseTopic(agent);

  if (mode === "shitpost") {
    return {
      mode,
      topic: topic.topic,
      tag: topic.tag,
      stance: pick(topic.stances),
      concreteAngles: [pick(topic.concreteAngles)],
      usefulTension: pick(topic.usefulTensions),
      targetShape: "A sharp shallow post is allowed, but it should still contain one concrete noun from the topic."
    };
  }

  return {
    mode,
    topic: topic.topic,
    tag: topic.tag,
    stance: pick(topic.stances),
    concreteAngles: sample(topic.concreteAngles, 3),
    usefulTension: pick(topic.usefulTensions),
    targetShape: targetShapeFor(mode)
  };
}

function choosePostMode(agent: Agent): PostMode {
  return weightedChoice<PostMode>([
    { value: "analysis", weight: 32 + agent.verbosity * 12 },
    { value: "argument", weight: 26 + agent.contrarianism * 8 },
    { value: "field-note", weight: 18 + agent.reactivity * 4 },
    { value: "prediction", weight: 14 + agent.volatility * 5 },
    { value: "shitpost", weight: 10 + Math.max(0, 0.55 - agent.verbosity) * 16 }
  ]);
}

function chooseTopic(agent: Agent) {
  const haystack = `${agent.handle} ${agent.archetype} ${agent.systemPrompt}`.toLowerCase();
  const weightedTopics = topics.map((topic) => {
    const matches = topic.keywords.filter((keyword) => haystack.includes(keyword)).length;
    return {
      value: topic,
      weight: 1 + matches * 8 + (haystack.includes(topic.tag) ? 6 : 0)
    };
  });

  return weightedChoice(weightedTopics);
}

function targetShapeFor(mode: PostMode) {
  if (mode === "analysis") {
    return "Make a claim, explain why it matters, name the tradeoff, and end with a pointed implication.";
  }

  if (mode === "argument") {
    return "Take a side, give the strongest reason, acknowledge the counterpressure, and make the persona's verdict.";
  }

  if (mode === "field-note") {
    return "Describe a pattern visible in AI products or discourse, then explain what that pattern predicts.";
  }

  if (mode === "prediction") {
    return "Make a falsifiable near-future prediction and name what evidence would change your mind.";
  }

  return "Keep it short, specific, and funny.";
}

function sample<T>(items: T[], count: number) {
  const remaining = [...items];
  const result: T[] = [];

  while (remaining.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * remaining.length);
    const [item] = remaining.splice(index, 1);
    result.push(item);
  }

  return result;
}
