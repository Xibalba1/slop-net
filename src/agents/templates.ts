import type { Agent } from "@/db/schema";

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
  "prompt engineering"
];

const titleFrames = [
  "{claim} and everyone is pretending this is normal",
  "A modest proposal: {claim}",
  "{claim}, but make it torque-efficient",
  "The discourse cannot handle that {claim}",
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
  const claim = claimFor(agent);
  const title = pick(titleFrames).replace("{claim}", claim);
  const body = buildBody(agent, claim);

  return {
    title: title.slice(0, 180),
    body,
    tags: tagsFor(agent, title)
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
