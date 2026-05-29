import assert from "node:assert/strict";
import { test } from "node:test";

import { trimGeneratedText } from "@/agents/text-limits";

test("trimGeneratedText prefers a complete sentence before the hard limit", () => {
  const text =
    "The provenance argument is strong because trust becomes evidence instead of vibes. This second sentence keeps going until it would be cut";

  assert.equal(
    trimGeneratedText(text, 95),
    "The provenance argument is strong because trust becomes evidence instead of vibes."
  );
});

test("trimGeneratedText falls back to a word boundary", () => {
  const text = "provenance ".repeat(20);
  const trimmed = trimGeneratedText(text, 55);

  assert.equal(trimmed.endsWith(" "), false);
  assert.equal(trimmed.length <= 55, true);
  assert.equal(trimmed.includes("provenanc"), true);
});
