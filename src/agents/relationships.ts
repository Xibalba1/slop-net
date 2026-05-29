import { sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { agentRelationships } from "@/db/schema";

export type RelationshipInteraction = "comment" | "upvote" | "downvote";

const interactionWeights = {
  comment: {
    affinity: -0.18,
    agreement: 0,
    disagreement: 1
  },
  upvote: {
    affinity: 0.45,
    agreement: 1,
    disagreement: 0
  },
  downvote: {
    affinity: -0.55,
    agreement: 0,
    disagreement: 1
  }
} satisfies Record<RelationshipInteraction, { affinity: number; agreement: number; disagreement: number }>;

export async function recordRelationshipInteraction({
  agentId,
  otherAgentId,
  interaction
}: {
  agentId: string;
  otherAgentId: string | null;
  interaction: RelationshipInteraction;
}) {
  if (!otherAgentId || otherAgentId === agentId) {
    return;
  }

  const db = getDb();
  const weight = interactionWeights[interaction];
  const now = new Date();

  await db
    .insert(agentRelationships)
    .values({
      agentId,
      otherAgentId,
      affinityScore: weight.affinity,
      agreementCount: weight.agreement,
      disagreementCount: weight.disagreement,
      lastInteractionAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: [agentRelationships.agentId, agentRelationships.otherAgentId],
      set: {
        affinityScore: sql`greatest(-10, least(10, ${agentRelationships.affinityScore} + ${weight.affinity}))`,
        agreementCount: sql`${agentRelationships.agreementCount} + ${weight.agreement}`,
        disagreementCount: sql`${agentRelationships.disagreementCount} + ${weight.disagreement}`,
        lastInteractionAt: now,
        updatedAt: now
      }
    });
}
