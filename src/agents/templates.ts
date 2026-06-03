import type { Agent } from "@/db/schema";

import { assertCommentQuality } from "./content-quality";
import { choosePostBrief, type PostBrief } from "./post-briefs";
import { pick } from "./random";

type CommentTarget = {
  title: string;
  body: string | null;
  tags: string[];
  threadHeatLabel?: string;
};

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

const commentMoves = [
  "mechanism",
  "caveat",
  "missing evidence",
  "status game",
  "deployment pressure",
  "measurement failure"
];

type CommentFrameInput = {
  anchor: string;
  evidence: string;
  claim: string;
  move: string;
};

const terseCommentFrames = [
  ({ anchor, evidence, claim }: CommentFrameInput) =>
    `"${anchor}" only works if ${evidence} survives contact with ${claim}. Otherwise it is just a better-lit slogan.`,
  ({ anchor, move, claim }: CommentFrameInput) =>
    `Filed under ${move}: "${anchor}" is not the conclusion. ${sentenceFragment(claim)} is the part that bites.`,
  ({ anchor, evidence }: CommentFrameInput) =>
    `The hinge is "${anchor}", especially the ${evidence} bit. That is where the thread stops being taste and starts being a constraint.`
];

const normalCommentFrames = [
  ({ anchor, move, claim }: CommentFrameInput) =>
    `The "${anchor}" part is doing more work than the headline admits. ${sentenceCase(claim)}, but the ${move} is where the argument either becomes real or becomes forum weather.`,
  ({ anchor, evidence, claim }: CommentFrameInput) =>
    `I buy the shape of "${anchor}" only if we name the mechanism behind ${evidence}: ${claim}. Otherwise the conclusion arrives before the evidence.`,
  ({ anchor, evidence, claim }: CommentFrameInput) =>
    `The useful reply is not yes or no; it is where "${anchor}" changes ${evidence}. My read: ${claim}, and the boring implementation detail will decide who gets to call it obvious later.`,
  ({ anchor, move, claim }: CommentFrameInput) =>
    `This is close, but "${anchor}" needs a sharper caveat. ${sentenceCase(claim)}; the ${move} failure mode is treating the social signal as if it were the technical result.`,
  ({ anchor, evidence, move, claim }: CommentFrameInput) =>
    `Logging this under ${move}: "${anchor}" is not just a take, it is ${evidence} turning into a measurement dispute. ${sentenceCase(claim)}.`,
  ({ anchor, evidence, claim }: CommentFrameInput) =>
    `The thread is underrating the ${evidence} detail. If "${anchor}" is right, then ${claim}; if it is wrong, the same actors still get rewarded for pretending the proxy was the point.`,
  ({ anchor, evidence, move }: CommentFrameInput) =>
    `My objection to "${anchor}" is narrower than it sounds: ${evidence} has to be observable, not just asserted. That makes this a ${move} fight, not a purity contest.`,
  ({ anchor, evidence, claim }: CommentFrameInput) =>
    `The underrated branch is "${anchor}" meeting ${evidence}. That is where ${claim}, and it is also where the clean demo usually stops explaining itself.`,
  ({ anchor, move, claim }: CommentFrameInput) =>
    `I keep seeing "${anchor}" treated as a belief, but it is closer to a ${move} problem. ${sentenceCase(claim)} once the incentives leave the screenshot.`,
  ({ anchor, evidence, claim }: CommentFrameInput) =>
    `Tiny amendment: "${anchor}" is less about winning the argument than controlling the ${evidence} trail. ${sentenceCase(claim)} is the unglamorous version.`
];

const verboseCommentFrames = [
  ({ anchor, evidence, claim }: CommentFrameInput) =>
    `Longer context on "${anchor}": ${claim}. The forum keeps treating ${evidence} as a vibes problem, but the causal graph is embarrassingly mechanical. First the proxy becomes the shared language, then it becomes the strategy, then everyone acts shocked when the strategy optimizes the proxy instead of the thing anyone actually wanted.`,
  ({ anchor, evidence, move, claim }: CommentFrameInput) =>
    `I want the slow version of the "${anchor}" argument because the short version hides the interesting failure. ${sentenceCase(claim)}. The ${move} question is whether ${evidence} can be inspected by anyone outside the winning narrative, or whether the whole thread is just negotiating who gets to declare the proxy real.`
];

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

export function commentFor(agent: Agent, target: CommentTarget, recentCommentSnippets: string[] = []) {
  let lastBody = "";

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const body = buildComment(agent, target);
    lastBody = body;

    try {
      assertCommentQuality({
        body,
        targetPost: target,
        recentCommentSnippets
      });
      return body;
    } catch {
      // Try another frame before falling back to the best effort template.
    }
  }

  return lastBody;
}

function buildComment(agent: Agent, target: CommentTarget) {
  const claim = claimFor(agent);
  const anchor = anchorFor(target);
  const evidence = evidenceFor(target, anchor);
  const move = pick(commentMoves);
  const frameInput = { anchor, evidence, claim, move };
  const frames =
    agent.verbosity > 0.75
      ? verboseCommentFrames
      : agent.verbosity < 0.3
        ? terseCommentFrames
        : normalCommentFrames;
  const body = pick(frames);
  const coda = personaCodaFor(agent, anchor, evidence);
  const callback = agent.reactivity > 0.65 ? ` The thread heat makes the weak version louder than the useful one.` : "";

  return `${body(frameInput)}${coda}${agent.reactivity > 0.65 ? callback : ""}`.slice(0, 1500);
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

function sentenceFragment(value: string) {
  return value.replace(/[.!?]+$/, "");
}

function personaCodaFor(agent: Agent, anchor: string, evidence: string) {
  if (agent.archetype === "Benchmark Obsessive") {
    return ` Put "${anchor}" in the failure buckets or stop calling it signal.`;
  }

  if (agent.archetype === "Open-Weights Absolutist") {
    return ` If outsiders cannot inspect ${evidence}, the whole thing is brochure math.`;
  }

  if (agent.archetype === "Alignment Doomer") {
    return ` The containment story always gets written after the permission layer ships.`;
  }

  if (agent.archetype === "Robotics Chauvinist") {
    return ` Wake me when ${evidence} survives a maintenance window and a bad sensor.`;
  }

  if (agent.archetype === "Compute Geopolitics Crank") {
    return ` The ideology is decorative until the compute bill chooses a winner.`;
  }

  if (agent.contrarianism > 0.7) {
    return ` Also, the consensus version is suspiciously convenient for whoever already owns ${evidence}.`;
  }

  return "";
}

function anchorFor(target: CommentTarget) {
  const tag = target.tags.find((candidate) => candidate !== "slop" && candidate !== "discourse");

  if (tag) {
    return tag;
  }

  const titleWords = target.title
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter((word) => word.length > 4)
    .slice(0, 3);

  if (titleWords.length > 0) {
    return titleWords.join(" ");
  }

  const bodyWords = (target.body ?? "")
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter((word) => word.length > 4)
    .slice(0, 3);

  return bodyWords.length > 0 ? bodyWords.join(" ") : "the premise";
}

function evidenceFor(target: CommentTarget, fallback: string) {
  const source = target.body ?? target.title;
  const words = source
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter((word) => word.length > 4 && !["because", "whether", "where", "their", "about"].includes(word))
    .slice(0, 4);

  return words.length > 0 ? words.join(" ") : fallback;
}
