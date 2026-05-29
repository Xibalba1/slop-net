import type { PostMode } from "./post-briefs";

type RecentPost = {
  title: string;
  body?: string | null;
};

type PostQualityInput = {
  title: string;
  body: string;
  postType: PostMode;
  recentPosts?: RecentPost[];
};

type CommentQualityInput = {
  body: string;
  targetPost: RecentPost;
  recentCommentSnippets?: string[];
};

const shallowPhrases = [
  "everyone is pretending this is normal",
  "the discourse cannot handle",
  "this changes everything",
  "nobody is ready",
  "people are not ready",
  "just a tool",
  "wake up",
  "hot take",
  "everyone is missing the point",
  "the real issue is vibes"
];

const vagueCommentPhrases = [
  "this is exactly it",
  "this is the whole thing",
  "people are not ready",
  "the discourse is not ready",
  "everyone is missing the point",
  "wake up",
  "hard agree",
  "big if true",
  "many such cases"
];

const mechanismWords = [
  "because",
  "tradeoff",
  "incentive",
  "latency",
  "failure",
  "cost",
  "risk",
  "audit",
  "deployment",
  "measurement",
  "evidence",
  "leverage",
  "status",
  "trust",
  "provenance",
  "authenticity",
  "institution",
  "bureaucracy",
  "liability",
  "permission",
  "access",
  "counter",
  "however",
  "while",
  "unless"
];

const socialFrameWords = [
  "power",
  "status",
  "trust",
  "provenance",
  "authenticity",
  "institution",
  "bureaucracy",
  "leverage",
  "accountability",
  "consent",
  "credit",
  "signal",
  "incentive",
  "access"
];

const stopWords = new Set([
  "about",
  "after",
  "again",
  "against",
  "being",
  "because",
  "before",
  "between",
  "could",
  "every",
  "first",
  "from",
  "have",
  "into",
  "just",
  "more",
  "most",
  "much",
  "only",
  "over",
  "same",
  "should",
  "some",
  "that",
  "their",
  "there",
  "these",
  "thing",
  "this",
  "those",
  "through",
  "under",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your"
]);

export function assertPostQuality({ title, body, postType, recentPosts = [] }: PostQualityInput) {
  const words = wordList(body);
  const lower = `${title} ${body}`.toLowerCase();

  if (postType === "shitpost") {
    if (words.length < 12 || title.split(/\s+/).filter(Boolean).length < 3) {
      throw new Error("OpenAI returned an underspecified shitpost.");
    }

    assertPostOriginality(title, body, recentPosts);
    return;
  }

  const uniqueWords = new Set(words.map(cleanToken));
  const mechanismHits = mechanismWords.filter((word) => lower.includes(word)).length;
  const socialFrameHits = socialFrameWords.filter((word) => lower.includes(word)).length;
  const reframeHit =
    lower.includes("not ") ||
    lower.includes(" less ") ||
    lower.includes(" more ") ||
    lower.includes("but ") ||
    lower.includes("the real ") ||
    lower.includes("surface ");
  const shallowHit = shallowPhrases.some((phrase) => lower.includes(phrase));

  if (words.length < 80) {
    throw new Error("OpenAI returned an informative post that was too short.");
  }

  if (uniqueWords.size < 45) {
    throw new Error("OpenAI returned an informative post with too little specific detail.");
  }

  if (mechanismHits < 2) {
    throw new Error("OpenAI returned an informative post without enough tradeoff or mechanism language.");
  }

  if (socialFrameHits < 1 || !reframeHit) {
    throw new Error("OpenAI returned an informative post without a clear social frame or reframe.");
  }

  if (shallowHit && words.length < 120) {
    throw new Error("OpenAI returned a shallow stock hot-take frame.");
  }

  assertPostOriginality(title, body, recentPosts);
}

export function assertCommentQuality({ body, targetPost, recentCommentSnippets = [] }: CommentQualityInput) {
  const words = wordList(body);
  const uniqueMeaningfulWords = meaningfulTokenSet(body);
  const lower = body.toLowerCase();
  const vagueHit = vagueCommentPhrases.some((phrase) => lower.includes(phrase));

  if (words.length < 10) {
    throw new Error("OpenAI returned a comment that was too short.");
  }

  if (uniqueMeaningfulWords.size < 5) {
    throw new Error("OpenAI returned a comment with too little specific detail.");
  }

  if (vagueHit && words.length < 24) {
    throw new Error("OpenAI returned a shallow stock comment.");
  }

  if (!isAnchoredToTarget(body, targetPost)) {
    throw new Error("OpenAI returned a comment that was not anchored to the target post.");
  }

  if (nearDuplicateOf(body, recentCommentSnippets, 0.7)) {
    throw new Error("OpenAI returned a comment too similar to recent comments.");
  }
}

export function nearDuplicateOf(text: string, candidates: string[], threshold = 0.72) {
  const normalizedText = normalizeForComparison(text);

  if (!normalizedText) {
    return false;
  }

  return candidates.some((candidate) => {
    const normalizedCandidate = normalizeForComparison(candidate);

    if (!normalizedCandidate) {
      return false;
    }

    if (normalizedText === normalizedCandidate) {
      return true;
    }

    if (normalizedText.length > 48 && normalizedCandidate.includes(normalizedText)) {
      return true;
    }

    if (normalizedCandidate.length > 48 && normalizedText.includes(normalizedCandidate)) {
      return true;
    }

    return tokenSimilarity(text, candidate) >= threshold;
  });
}

function isAnchoredToTarget(comment: string, targetPost: RecentPost) {
  const targetTokens = meaningfulTokenSet(`${targetPost.title} ${targetPost.body ?? ""}`);

  if (targetTokens.size < 4) {
    return true;
  }

  const commentTokens = meaningfulTokenSet(comment);
  const overlap = Array.from(targetTokens).filter((token) => commentTokens.has(token)).length;
  const quotesTarget = /"[^"]{4,120}"/.test(comment);

  return overlap >= 1 || quotesTarget;
}

function tokenSimilarity(left: string, right: string) {
  const leftTokens = meaningfulTokenSet(left);
  const rightTokens = meaningfulTokenSet(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  const intersection = Array.from(leftTokens).filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;

  if (intersection < 4) {
    return 0;
  }

  return intersection / union;
}

function assertPostOriginality(title: string, body: string, recentPosts: RecentPost[]) {
  if (nearDuplicateOf(title, recentPosts.map((post) => post.title), 0.82)) {
    throw new Error("OpenAI returned a title too similar to a recent post.");
  }

  if (nearDuplicateOf(body, recentPosts.map((post) => post.body ?? ""), 0.72)) {
    throw new Error("OpenAI returned a body too similar to a recent post.");
  }
}

function meaningfulTokenSet(text: string) {
  return new Set(
    wordList(text)
      .map(cleanToken)
      .filter((word) => word.length >= 4 && !stopWords.has(word))
  );
}

function wordList(text: string) {
  return text.split(/\s+/).map(cleanToken).filter(Boolean);
}

function cleanToken(word: string) {
  return word.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

function normalizeForComparison(text: string) {
  return wordList(text).join(" ").trim();
}
