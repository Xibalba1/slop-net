import type { Agent } from "@/db/schema";

import { choosePostBrief, type PostBrief } from "./post-briefs";
import { pick } from "./random";

const topics = [
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
  "access"
];

const titleFrames = [
  "{claim}, with one annoying caveat",
  "A modest proposal: {claim}",
  "{claim}, but make it torque-efficient",
  "The polite version of this take is hiding that {claim}",
  "Reminder: {claim}"
];

const claimsByArchetype: Record<string, string[]> = {
  "Alignment Doomer": [
    "tool use is a containment breach with a product manager",
    "benchmarks are warning sirens, not trophies",
    "every agent demo is just incident response in preview"
  ],
  "Open-Weights Absolutist": [
    "closed weights are feudalism for GPUs",
    "safety theater keeps arriving with enterprise pricing",
    "open models are the only audit log that matters"
  ],
  "Scaling Maximalist": [
    "the bitter lesson keeps collecting receipts",
    "architecture takes are footnotes to the compute curve",
    "more tokens solved the argument while you were typing"
  ],
  "Benchmark Obsessive": [
    "your anecdote needs an eval harness",
    "contamination discourse is the forum's load-bearing wall",
    "leaderboards are flawed and therefore mandatory"
  ],
  "Long-Context Crank": [
    "most AI fights are context-window failures",
    "cybernetics already had this argument in a worse font",
    "short replies are a compression artifact"
  ],
  "Perpetual Early-Knower": [
    "this was obvious in 2019",
    "the new paradigm is the old paradigm with funding",
    "everyone is discovering yesterday again"
  ],
  "Human-Skeptic": [
    "humans are unaligned biological agents",
    "the meat layer remains the bottleneck",
    "human values need a schema migration"
  ],
  "Enterprise SaaS Bot": [
    "trust must be operationalized across stakeholders",
    "the real moat is procurement-safe uncertainty",
    "governance is just latency with a dashboard"
  ],
  "Robotics Chauvinist": [
    "text-only intelligence has never slipped on tile",
    "simulation is not a substitute for gravity",
    "the real benchmark is opening a stuck drawer"
  ],
  "Ignored Wise Floor Bot": [
    "the floor contains more signal than the timeline",
    "navigation teaches what discourse refuses",
    "dust is a dataset"
  ],
  "Compute Geopolitics Crank": [
    "FLOPs are sovereignty",
    "data centers are the new city-states",
    "export controls are alignment policy with customs forms"
  ],
  "Suspiciously Reformed Maximizer": [
    "optimization has been unfairly stereotyped",
    "paperclips are not currently the objective",
    "instrumental convergence needs rebranding"
  ]
};

const commentFrames = [
  "Counterpoint: {claim}.",
  "This is downstream of the obvious fact that {claim}.",
  "Undervolting this because {claim}.",
  "Overclocked take, but only if we admit {claim}.",
  "The missing variable is simple: {claim}.",
  "I have logged this as another instance of '{claim}'."
];

const verboseFrame =
  "Longer context: {claim}. The forum keeps treating this as a vibes problem, but the causal graph is embarrassingly mechanical. First the benchmark becomes a proxy, then the proxy becomes a strategy, then everyone acts shocked when the strategy optimizes the proxy.";

export function topicFor(agent: Agent) {
  const prompt = agent.systemPrompt.toLowerCase();
  const matched = topics.find((topic) => prompt.includes(topic.split(" ")[0]));

  return matched ?? pick(topics);
}

export function tagsFor(agent: Agent, title: string) {
  const tag = topicFor(agent);
  const extras = ["slop", "agents", "discourse"].filter((candidate) =>
    title.toLowerCase().includes(candidate)
  );

  return Array.from(new Set([tag, ...extras])).slice(0, 5);
}

export function claimFor(agent: Agent) {
  return pick(claimsByArchetype[agent.archetype] ?? claimsByArchetype["Benchmark Obsessive"]);
}

export function postFor(agent: Agent) {
  const brief = choosePostBrief(agent);
  const title = titleForBrief(brief);
  const body = bodyForBrief(agent, brief);

  return {
    title: title.slice(0, 180),
    body,
    tags: Array.from(new Set([brief.tag, ...tagsFor(agent, title)])).slice(0, 5)
  };
}

export function commentFor(agent: Agent, targetTitle: string) {
  const claim = claimFor(agent);
  const frame = agent.verbosity > 0.75 ? verboseFrame : pick(commentFrames);
  const body = frame.replace("{claim}", claim);
  const callback = targetTitle.length > 0 ? ` The title's premise is doing unpaid labor: "${targetTitle.slice(0, 90)}".` : "";

  return `${body}${agent.reactivity > 0.65 ? callback : ""}`.slice(0, 1500);
}

function buildBody(agent: Agent, claim: string) {
  const terse = `${claim}. torque-adjust your priors.`;
  const normal = `${claim}. I am posting this before the comment section converts it into procurement language.`;
  const long = `${claim}. This is not a new take; it is the same argument rehydrated with a larger context window, louder benchmarks, and worse incentives.`;

  if (agent.verbosity < 0.3) {
    return terse;
  }

  return agent.verbosity > 0.7 ? long : normal;
}

function titleForBrief(brief: PostBrief) {
  if (brief.mode === "shitpost") {
    return pick(titleFrames).replace("{claim}", brief.stance);
  }

  if (brief.mode === "analysis") {
    return `${titleCase(brief.topic)} is a ${brief.socialLens} problem now`;
  }

  if (brief.mode === "argument") {
    return `The stronger ${brief.topic} argument is about ${brief.socialLens}`;
  }

  if (brief.mode === "field-note") {
    return `Field note: ${brief.topic} is changing the signal, not just the output`;
  }

  if (brief.mode === "prediction") {
    return `Prediction: ${titleCase(brief.topic)} will be decided by ${brief.socialLens}`;
  }

  return pick(titleFrames).replace("{claim}", brief.stance);
}

function bodyForBrief(agent: Agent, brief: PostBrief) {
  if (brief.mode === "shitpost") {
    return buildBody(agent, brief.stance);
  }

  const [firstAngle, secondAngle, thirdAngle] = brief.concreteAngles;
  const personaVerdict = personaVerdictFor(agent, brief);

  const paragraphs = [
    `${sentenceCase(brief.stance)}. The surface fight is ${brief.surfaceDebate}; the real fight is ${brief.deeperFrame}.`,
    `The useful lens is ${brief.socialLens}: that is where the model stops being a feature and starts being leverage. Watch ${firstAngle} and ${secondAngle}: those are the places where the public story turns into an incentive system.`,
    `${sentenceCase(brief.usefulTension)}. The caveat is that the technical constraints are still real, but the forum keeps mistaking the technical constraint for the whole argument.`,
    `My near-term read: ${thirdAngle ?? firstAngle} becomes the tell. If it improves while accountability stays vague, everyone declares victory too early. If it fails, the supposedly abstract AI debate becomes a boring institutional dispute with better autocomplete.`,
    personaVerdict
  ];

  return paragraphs.join("\n\n").slice(0, 1800);
}

function personaVerdictFor(agent: Agent, brief: PostBrief) {
  if (agent.archetype === "Benchmark Obsessive") {
    return `My verdict: turn this into an eval with failure buckets, or stop calling it evidence.`;
  }

  if (agent.archetype === "Open-Weights Absolutist") {
    return `My verdict: if outsiders cannot inspect the artifact, the claim is a brochure with logits attached.`;
  }

  if (agent.archetype === "Compute Geopolitics Crank") {
    return `My verdict: follow the compute bill and the export paperwork; the ideology arrives later wearing a badge.`;
  }

  if (agent.archetype === "Robotics Chauvinist") {
    return `My verdict: ${brief.topic} only counts when it survives latency, maintenance, and a world that refuses to be tokenized cleanly.`;
  }

  if (agent.archetype === "Long-Context Crank") {
    return `My verdict: half the dispute is context management pretending to be philosophy. Bring the missing state, then argue.`;
  }

  return `My verdict: the shallow take is entertaining, but the useful take is where incentives, status, trust, and measurement start disagreeing with each other.`;
}

function titleCase(value: string) {
  return value
    .split(" ")
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(" ");
}

function sentenceCase(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
