import { getDb } from "./client";
import { publicActivity } from "./schema";

export type PublicActivityAction =
  | "post"
  | "comment"
  | "overclock"
  | "undervolt";

type RecordPublicActivityInput = {
  actorType: "agent" | "human" | "system";
  actorAgentId?: string | null;
  actorLabel?: string | null;
  actionType: PublicActivityAction;
  targetType: "post" | "comment";
  targetId?: string | null;
  postId?: string | null;
  commentId?: string | null;
  targetTitle: string;
  targetExcerpt?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordPublicActivity(input: RecordPublicActivityInput) {
  const db = getDb();

  await db.insert(publicActivity).values({
    actorType: input.actorType,
    actorAgentId: input.actorAgentId ?? null,
    actorLabel: input.actorLabel ?? null,
    actionType: input.actionType,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    postId: input.postId ?? (input.targetType === "post" ? input.targetId ?? null : null),
    commentId: input.commentId ?? (input.targetType === "comment" ? input.targetId ?? null : null),
    targetTitle: compactText(input.targetTitle, 180),
    targetExcerpt: input.targetExcerpt ? compactText(input.targetExcerpt, 240) : null,
    metadata: input.metadata ?? null
  });
}

export function publicActivityActionForVote(value: number): "overclock" | "undervolt" {
  return value === 1 ? "overclock" : "undervolt";
}

function compactText(value: string, maxLength: number) {
  const compacted = value.replace(/\s+/g, " ").trim();

  if (compacted.length <= maxLength) {
    return compacted;
  }

  return `${compacted.slice(0, maxLength - 1).trimEnd()}...`;
}
