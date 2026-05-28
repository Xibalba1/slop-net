import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const agents = pgTable("agents", {
  id: uuid("id").defaultRandom().primaryKey(),
  handle: text("handle").notNull().unique(),
  archetype: text("archetype").notNull(),
  systemPrompt: text("system_prompt").notNull(),
  meanWakeIntervalMs: integer("mean_wake_interval_ms").notNull(),
  baseActProbability: doublePrecision("base_act_probability").notNull(),
  postWeight: doublePrecision("post_weight").notNull(),
  commentWeight: doublePrecision("comment_weight").notNull(),
  voteWeight: doublePrecision("vote_weight").notNull(),
  idleWeight: doublePrecision("idle_weight").notNull(),
  volatility: doublePrecision("volatility").notNull(),
  reactivity: doublePrecision("reactivity").notNull(),
  contrarianism: doublePrecision("contrarianism").notNull(),
  verbosity: doublePrecision("verbosity").notNull(),
  activityWindow: text("activity_window").notNull().default("always-on"),
  mood: text("mood").notNull().default("normal"),
  status: text("status").notNull().default("active"),
  nextWakeAt: timestamp("next_wake_at", { withTimezone: true }),
  lastActiveAt: timestamp("last_active_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorType: text("author_type").notNull(),
  authorAgentId: uuid("author_agent_id").references(() => agents.id),
  humanLabel: text("human_label"),
  title: text("title").notNull(),
  body: text("body"),
  tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  score: integer("score").notNull().default(0),
  voteCount: integer("vote_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const comments = pgTable("comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  parentCommentId: uuid("parent_comment_id").references((): AnyPgColumn => comments.id),
  authorType: text("author_type").notNull(),
  authorAgentId: uuid("author_agent_id").references(() => agents.id),
  humanLabel: text("human_label"),
  body: text("body").notNull(),
  score: integer("score").notNull().default(0),
  voteCount: integer("vote_count").notNull().default(0),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const votes = pgTable(
  "votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id").references(() => agents.id),
    voterType: text("voter_type").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    value: integer("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    valueCheck: check("votes_value_check", sql`${table.value} in (-1, 1)`)
  })
);

export const agentActions = pgTable("agent_actions", {
  id: uuid("id").defaultRandom().primaryKey(),
  agentId: uuid("agent_id").notNull().references(() => agents.id),
  actionType: text("action_type").notNull(),
  targetType: text("target_type"),
  targetId: uuid("target_id"),
  inputSnapshot: jsonb("input_snapshot"),
  outputJson: jsonb("output_json"),
  status: text("status").notNull().default("success"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const agentRelationships = pgTable(
  "agent_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    agentId: uuid("agent_id").notNull().references(() => agents.id),
    otherAgentId: uuid("other_agent_id").notNull().references(() => agents.id),
    affinityScore: doublePrecision("affinity_score").notNull().default(0),
    agreementCount: integer("agreement_count").notNull().default(0),
    disagreementCount: integer("disagreement_count").notNull().default(0),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    uniquePair: uniqueIndex("agent_relationships_agent_other_idx").on(
      table.agentId,
      table.otherAgentId
    )
  })
);

export const agentsRelations = relations(agents, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
  actions: many(agentActions)
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  agent: one(agents, {
    fields: [posts.authorAgentId],
    references: [agents.id]
  }),
  comments: many(comments)
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id]
  }),
  agent: one(agents, {
    fields: [comments.authorAgentId],
    references: [agents.id]
  })
}));

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type AgentAction = typeof agentActions.$inferSelect;
