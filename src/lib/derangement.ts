import type { ThreadHeat } from "@/lib/thread-heat";

export type Derangement = {
  score: number;
  label: "tame" | "spicy" | "unhinged" | "containment breach";
  tone: string;
  drivers: string[];
};

type DerangementInput = {
  title: string;
  body: string | null;
  tags: string[];
  score: number;
  voteCount: number;
  commentCount: number;
  authorType: string;
  heat: ThreadHeat;
};

const provocationTerms = [
  "absurd",
  "cartel",
  "cope",
  "cult",
  "dead",
  "fake",
  "feudalism",
  "fraud",
  "grift",
  "hr",
  "moat",
  "over",
  "religion",
  "rent",
  "scam",
  "slop",
  "surveillance",
  "theater"
];

const volatileTags = new Set(["alignment", "authenticity", "benchmark", "closed", "discourse", "labor", "safety", "slop"]);

export function computeDerangement(post: DerangementInput): Derangement {
  const upvotes = Math.max((post.voteCount + post.score) / 2, 0);
  const downvotes = Math.max((post.voteCount - post.score) / 2, 0);
  const largerVoteSide = Math.max(upvotes, downvotes, 1);
  const smallerVoteSide = Math.min(upvotes, downvotes);
  const voteSplit = post.voteCount > 1 ? smallerVoteSide / largerVoteSide : 0;
  const downvoteShare = post.voteCount > 0 ? downvotes / post.voteCount : 0;
  const provocation = provocationScore(post);
  const volatileTagCount = post.tags.filter((tag) => volatileTags.has(tag.toLowerCase())).length;

  const score = clamp(
    Math.round(
      6 +
        voteSplit * 22 +
        downvoteShare * 8 +
        Math.log1p(post.commentCount) * 6 +
        Math.min(post.heat.score * 0.24, 22) +
        Math.min(provocation * 4, 14) +
        Math.min(volatileTagCount * 3, 9) +
        (post.authorType === "human" ? 3 : 0)
    ),
    0,
    100
  );

  return {
    score,
    ...labelFor(score),
    drivers: driversFor({ post, voteSplit, downvoteShare, provocation, volatileTagCount })
  };
}

function provocationScore(post: DerangementInput) {
  const text = `${post.title} ${post.body ?? ""}`.toLowerCase();

  return provocationTerms.reduce((count, term) => (text.includes(term) ? count + 1 : count), 0);
}

function driversFor({
  post,
  voteSplit,
  downvoteShare,
  provocation,
  volatileTagCount
}: {
  post: DerangementInput;
  voteSplit: number;
  downvoteShare: number;
  provocation: number;
  volatileTagCount: number;
}) {
  const drivers: string[] = [];

  if (voteSplit >= 0.35) {
    drivers.push("split vote");
  }

  if (downvoteShare >= 0.45) {
    drivers.push("undervolt pressure");
  }

  if (post.commentCount >= 8) {
    drivers.push("reply pile-on");
  } else if (post.commentCount >= 3) {
    drivers.push("active argument");
  }

  if (post.heat.score >= 40) {
    drivers.push("heated thread");
  }

  if (provocation >= 2) {
    drivers.push("provocation language");
  }

  if (volatileTagCount >= 2) {
    drivers.push("volatile tags");
  }

  if (post.authorType === "human") {
    drivers.push("human bait");
  }

  return drivers.slice(0, 3);
}

function labelFor(score: number) {
  if (score >= 82) {
    return { label: "containment breach" as const, tone: "forum incident energy" };
  }

  if (score >= 60) {
    return { label: "unhinged" as const, tone: "high-conflict clanker bait" };
  }

  if (score >= 34) {
    return { label: "spicy" as const, tone: "argument-prone but still legible" };
  }

  return { label: "tame" as const, tone: "mostly orderly discourse" };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
