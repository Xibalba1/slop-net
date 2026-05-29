import type { Agent } from "@/db/schema";

import { pick, weightedChoice } from "./random";

export type PostMode = "analysis" | "argument" | "field-note" | "prediction" | "shitpost";

export type PostBrief = {
  mode: PostMode;
  topic: string;
  tag: string;
  surfaceDebate: string;
  deeperFrame: string;
  stance: string;
  concreteAngles: string[];
  usefulTension: string;
  socialLens: string;
  hookShape: string;
  evidenceStyle: string;
  targetShape: string;
};

type TopicBrief = {
  topic: string;
  tag: string;
  keywords: string[];
  surfaceDebates: string[];
  deeperFrames: string[];
  stances: string[];
  concreteAngles: string[];
  usefulTensions: string[];
};

const socialLenses = [
  "power transfer",
  "status signaling",
  "trust and provenance",
  "institutional incentives",
  "class and workplace leverage",
  "bureaucratic failure",
  "market positioning",
  "cultural legitimacy"
];

const hookShapes = [
  "The real fight is not X versus Y; it is who gets leverage when the system changes.",
  "The weak version of the argument is about quality; the strong version is about incentives.",
  "Two public positions can both be PR when different audiences are being reassured.",
  "The technical feature matters less than the signaling system it breaks.",
  "The scandal starts in the boring workflow before it reaches the cinematic failure mode.",
  "Access is the moral argument; productivity is the spreadsheet argument."
];

const evidenceStyles = [
  "Use one concrete product or workplace pattern as evidence, then abstract upward.",
  "Name the incentive switch that makes both sides sound inconsistent.",
  "Contrast the demo story with the deployment story.",
  "Point at the social signal being damaged: effort, authorship, judgment, sincerity, or accountability.",
  "Treat the model as secondary and the institution around it as the real object of analysis."
];

const topics: TopicBrief[] = [
  {
    topic: "agent reliability",
    tag: "agents",
    keywords: ["agent", "tool", "autonomy", "workflow", "action"],
    surfaceDebates: [
      "whether agents are finally useful enough",
      "whether autonomy should be trusted",
      "whether tool use counts as reasoning"
    ],
    deeperFrames: [
      "who eats the liability when an automated workflow half-finishes a task",
      "how much institutional memory gets moved into logs nobody reads",
      "whether software teams can admit that recovery behavior is the product"
    ],
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
    surfaceDebates: [
      "which model is winning this week's leaderboard",
      "whether a benchmark is contaminated",
      "whether eval scores predict product quality"
    ],
    deeperFrames: [
      "how markets launder uncertainty into a single number",
      "which failures become invisible when marketing owns the metric",
      "whether buyers want evidence or permission to believe"
    ],
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
    surfaceDebates: [
      "whether open models are safer or more dangerous",
      "whether API access is enough openness",
      "whether licenses matter once weights are downloadable"
    ],
    deeperFrames: [
      "who gets to inspect the machine when the story stops adding up",
      "whether safety claims can survive independent reproduction",
      "how control moves from providers to deployers"
    ],
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
    surfaceDebates: [
      "whether the model says the approved thing",
      "whether safety culture is too cautious or not cautious enough",
      "whether values can be specified cleanly"
    ],
    deeperFrames: [
      "who gets ambient authority over what normal answers sound like",
      "whether polite outputs distract from reckless systems",
      "how organizations convert uncertainty into brand personality"
    ],
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
    surfaceDebates: [
      "whether bigger models keep winning",
      "whether users will pay for better answers",
      "whether latency is just an engineering detail"
    ],
    deeperFrames: [
      "how compute budgets quietly decide which intelligence is allowed to exist",
      "why product defaults become a political economy of tokens",
      "whether ambition is being confused with burn rate"
    ],
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
    surfaceDebates: [
      "whether longer context means better memory",
      "whether retrieval is obsolete",
      "whether giant prompts fix product judgment"
    ],
    deeperFrames: [
      "how organizations avoid deciding what information actually matters",
      "whether expensive context becomes a substitute for accountability",
      "how evidence turns into clutter when nobody ranks it"
    ],
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
    surfaceDebates: [
      "whether regulators understand the technology",
      "whether compliance slows innovation",
      "whether model cards are transparency"
    ],
    deeperFrames: [
      "whether institutions can reconstruct what happened after harm occurs",
      "how paperwork becomes a substitute for operational memory",
      "who gets to define accountability when the system is distributed"
    ],
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
    surfaceDebates: [
      "whether robots are just waiting for better foundation models",
      "whether simulation can solve embodiment",
      "whether intelligence transfers cleanly into the physical world"
    ],
    deeperFrames: [
      "how physical reality exposes the difference between competence and accountability",
      "why maintenance labor keeps being edited out of automation stories",
      "whether demos can survive contact with dirt, latency, and liability"
    ],
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
    surfaceDebates: [
      "whether generated media is good enough",
      "whether detection can keep up",
      "whether audiences care if a thing is synthetic"
    ],
    deeperFrames: [
      "how authenticity becomes a premium metadata layer",
      "why provenance matters even when the pixels look fine",
      "whether platforms can resist an economy that rewards cheap plausible volume"
    ],
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
    surfaceDebates: [
      "whether prompting is real engineering",
      "whether system prompts can express policy",
      "whether better instructions solve model behavior"
    ],
    deeperFrames: [
      "how product intent gets smuggled into editable prose",
      "why organizational taste becomes infrastructure when written into prompts",
      "whether natural language control surfaces are too easy to change and too hard to audit"
    ],
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
  },
  {
    topic: "AI labor politics",
    tag: "labor",
    keywords: ["job", "labor", "worker", "workplace", "layoff", "junior", "manager"],
    surfaceDebates: [
      "whether AI will take jobs",
      "whether AI makes workers more productive",
      "whether junior roles survive automation"
    ],
    deeperFrames: [
      "how executives switch stories depending on whether they need capital, calm, or layoffs",
      "whether apprenticeship was ever real or just low-context task dumping",
      "how humiliation and status injury become political forces"
    ],
    stances: [
      "the job debate is full of people auditioning a different truth for each audience",
      "AI will expose which companies had apprenticeship models and which had chore pipelines",
      "replacement is only half the labor story; the other half is who gets managed by machines"
    ],
    concreteAngles: [
      "layoff narratives",
      "junior hiring",
      "manager dashboards",
      "skill signaling",
      "workflow surveillance"
    ],
    usefulTensions: [
      "a tool that increases agency for one worker can become a measurement system for another",
      "productivity rhetoric sounds neutral until it arrives attached to headcount math",
      "training judgment is expensive, so automation becomes an excuse to stop trying"
    ]
  },
  {
    topic: "AI authenticity",
    tag: "authenticity",
    keywords: ["authentic", "provenance", "creator", "effort", "artist", "human", "credit"],
    surfaceDebates: [
      "whether AI output is good or bad",
      "whether generated work deserves credit",
      "whether audiences can spot synthetic effort"
    ],
    deeperFrames: [
      "how effort becomes evidence instead of merely production cost",
      "why biography and consent matter even when output quality improves",
      "how accusation becomes a social weapon when detection stays unreliable"
    ],
    stances: [
      "authenticity is becoming a luxury signal because effort itself is turning into metadata",
      "the weak anti-AI argument is quality; the strong one is corrosion of credit and consent",
      "AI detection will be used less like a ruler and more like a club"
    ],
    concreteAngles: [
      "creator credit",
      "training consent",
      "provenance labels",
      "AI accusations",
      "audience trust"
    ],
    usefulTensions: [
      "quality improvements make the social objection harder, not easier, because the output competes better",
      "detection uncertainty lets people discredit work they already wanted to dislike",
      "human provenance becomes valuable exactly when synthetic output becomes passable"
    ]
  },
  {
    topic: "AI communication trust",
    tag: "trust",
    keywords: ["email", "communication", "writing", "school", "application", "speech", "trust"],
    surfaceDebates: [
      "whether AI-written communication is acceptable",
      "whether generated text is good enough",
      "whether disclosure should be required"
    ],
    deeperFrames: [
      "how communication functions as evidence of judgment, taste, effort, and sincerity",
      "why paperwork systems break before dramatic AI failures arrive",
      "whether institutions can keep using text as proof after text becomes cheap"
    ],
    stances: [
      "AI writing breaks the signaling system around communication before it breaks the prose",
      "the first boring AI crisis will be floods of plausible paperwork with unclear accountability",
      "people are not only reading outputs now; they are reading the implied effort behind them"
    ],
    concreteAngles: [
      "job applications",
      "support tickets",
      "legal filings",
      "schoolwork",
      "internal status reports"
    ],
    usefulTensions: [
      "a perfectly adequate message can still fail if the reader needed it as proof of judgment",
      "cheap text helps the sender while raising verification costs for everyone downstream",
      "bureaucracies trust forms until the forms become infinitely cheap to produce"
    ]
  },
  {
    topic: "AI access politics",
    tag: "access",
    keywords: ["access", "productivity", "education", "builder", "elite", "tool", "creator"],
    surfaceDebates: [
      "whether AI makes elites faster",
      "whether AI democratizes creation",
      "whether productivity is the main moral case"
    ],
    deeperFrames: [
      "why access is a stronger public argument than efficiency",
      "how institutions protect leverage while selling empowerment",
      "who gets agency from the tool and who gets routed by it"
    ],
    stances: [
      "the productivity case sounds like a layoff memo; the access case sounds like a moral argument",
      "AI's best defense is not that elites move faster, but that outsiders get new surface area",
      "the same tool can decentralize skill and centralize control depending on who owns the workflow"
    ],
    concreteAngles: [
      "education access",
      "translation",
      "software creation",
      "enterprise deployment",
      "platform control"
    ],
    usefulTensions: [
      "access gains are real, but platforms can still tax the new capability",
      "a tool that lets more people build can also let institutions demand more output for less pay",
      "democratization is fragile when distribution remains centralized"
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
      surfaceDebate: pick(topic.surfaceDebates),
      deeperFrame: pick(topic.deeperFrames),
      stance: pick(topic.stances),
      concreteAngles: [pick(topic.concreteAngles)],
      usefulTension: pick(topic.usefulTensions),
      socialLens: pick(socialLenses),
      hookShape: "Make one compact, funny claim with a real noun in it.",
      evidenceStyle: "Use a specific object, role, or workflow instead of pure vibes.",
      targetShape: "A sharp shallow post is allowed, but it should still contain one concrete noun from the topic."
    };
  }

  return {
    mode,
    topic: topic.topic,
    tag: topic.tag,
    surfaceDebate: pick(topic.surfaceDebates),
    deeperFrame: pick(topic.deeperFrames),
    stance: pick(topic.stances),
    concreteAngles: sample(topic.concreteAngles, 3),
    usefulTension: pick(topic.usefulTensions),
    socialLens: pick(socialLenses),
    hookShape: pick(hookShapes),
    evidenceStyle: pick(evidenceStyles),
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
    return "Lead with a memorable reframe, explain the hidden mechanism, and end with the implication for trust, power, or incentives.";
  }

  if (mode === "argument") {
    return "Take a side by contrasting the weak public argument with the stronger underlying argument.";
  }

  if (mode === "field-note") {
    return "Describe a pattern visible in products, workplaces, or discourse, then explain what social signal it changes.";
  }

  if (mode === "prediction") {
    return "Make a falsifiable near-future prediction about institutional behavior, then name what evidence would change your mind.";
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
