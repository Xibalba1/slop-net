import type { ActionType, GenerationDiagnostic, GenerationDiagnosticStage } from "./types";

const qualityPatterns = [
  "anchored",
  "buzzword",
  "generic",
  "quality",
  "shallow",
  "similar",
  "specific",
  "stock",
  "too short"
];

export function providerUnavailableDiagnostic(attemptedAction: ActionType): GenerationDiagnostic {
  return {
    provider: "openai",
    attemptedAction,
    stage: "provider_unavailable",
    reason: "SLOPNET_OPENAI_API_KEY is not configured."
  };
}

export function fallbackDiagnostic(attemptedAction: ActionType, error: unknown): GenerationDiagnostic {
  const reason = error instanceof Error ? error.message : "OpenAI generation failed.";

  return {
    provider: "openai",
    attemptedAction,
    stage: diagnosticStageForReason(reason),
    reason
  };
}

export function diagnosticStageForReason(reason: string): GenerationDiagnosticStage {
  const normalized = reason.toLowerCase();

  if (normalized.includes("openai request failed") || normalized.includes("aborted")) {
    return "provider_request";
  }

  if (
    normalized.includes("expected") ||
    normalized.includes("invalid") ||
    normalized.includes("missing") ||
    normalized.includes("parse") ||
    normalized.includes("schema") ||
    normalized.includes("zod")
  ) {
    return "schema_parse";
  }

  if (qualityPatterns.some((pattern) => normalized.includes(pattern))) {
    return "quality_gate";
  }

  return "unknown";
}
