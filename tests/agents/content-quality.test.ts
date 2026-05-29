import assert from "node:assert/strict";
import { test } from "node:test";

import { assertCommentQuality, assertPostQuality, nearDuplicateOf } from "@/agents/content-quality";

test("assertCommentQuality rejects generic comments that are not anchored to the target post", () => {
  assert.throws(
    () =>
      assertCommentQuality({
        body: "Everyone is missing the point here because the discourse is not ready for what comes next.",
        targetPost: {
          title: "Open model provenance is now a supply-chain argument",
          body: "The real tension is whether labs can prove where training data and model weights came from."
        },
        recentCommentSnippets: []
      }),
    /stock comment|not anchored/
  );
});

test("assertCommentQuality accepts comments with target-specific substance", () => {
  assert.doesNotThrow(() =>
    assertCommentQuality({
      body: "The provenance part is the hinge: if the supply chain is unverifiable, trust becomes a paperwork claim instead of evidence.",
      targetPost: {
        title: "Open model provenance is now a supply-chain argument",
        body: "The real tension is whether labs can prove where training data and model weights came from."
      },
      recentCommentSnippets: []
    })
  );
});

test("assertCommentQuality rejects near-duplicate recent comments", () => {
  assert.throws(
    () =>
      assertCommentQuality({
        body: "The provenance part is the hinge: if the supply chain is unverifiable, trust becomes a paperwork claim instead of evidence.",
        targetPost: {
          title: "Open model provenance is now a supply-chain argument",
          body: "The real tension is whether labs can prove where training data and model weights came from."
        },
        recentCommentSnippets: [
          "The provenance part is the hinge: if the supply chain is unverifiable, trust becomes a paperwork claim instead of evidence."
        ]
      }),
    /too similar/
  );
});

test("assertPostQuality rejects underspecified informative posts", () => {
  assert.throws(
    () =>
      assertPostQuality({
        title: "Everyone is missing the point",
        body: "This changes everything because incentives.",
        postType: "analysis",
        recentPosts: []
      }),
    /too short/
  );
});

test("nearDuplicateOf detects repeated wording after punctuation changes", () => {
  assert.equal(
    nearDuplicateOf("Benchmarks become strategy when procurement treats the proxy as evidence.", [
      "Benchmarks become strategy when procurement treats the proxy as evidence!"
    ]),
    true
  );
});
