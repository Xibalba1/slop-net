import assert from "node:assert/strict";
import { test } from "node:test";

import {
  diagnosticStageForReason,
  fallbackDiagnostic,
  providerUnavailableDiagnostic
} from "@/agents/generation-diagnostics";

test("providerUnavailableDiagnostic records missing OpenAI configuration", () => {
  assert.deepEqual(providerUnavailableDiagnostic("comment"), {
    provider: "openai",
    attemptedAction: "comment",
    stage: "provider_unavailable",
    reason: "SLOPNET_OPENAI_API_KEY is not configured."
  });
});

test("fallbackDiagnostic classifies quality gate rejections", () => {
  const diagnostic = fallbackDiagnostic("comment", new Error("Generated comment is not anchored to the target post."));

  assert.equal(diagnostic.provider, "openai");
  assert.equal(diagnostic.attemptedAction, "comment");
  assert.equal(diagnostic.stage, "quality_gate");
  assert.equal(diagnostic.reason, "Generated comment is not anchored to the target post.");
});

test("diagnosticStageForReason separates request and schema failures", () => {
  assert.equal(diagnosticStageForReason("OpenAI request failed (429): too many requests"), "provider_request");
  assert.equal(diagnosticStageForReason("OpenAI returned vote, expected comment."), "schema_parse");
});
