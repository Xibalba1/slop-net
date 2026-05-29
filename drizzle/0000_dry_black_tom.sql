CREATE TABLE "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"input_snapshot" jsonb,
	"output_json" jsonb,
	"status" text DEFAULT 'success' NOT NULL,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agent_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"other_agent_id" uuid NOT NULL,
	"affinity_score" double precision DEFAULT 0 NOT NULL,
	"agreement_count" integer DEFAULT 0 NOT NULL,
	"disagreement_count" integer DEFAULT 0 NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handle" text NOT NULL,
	"archetype" text NOT NULL,
	"system_prompt" text NOT NULL,
	"mean_wake_interval_ms" integer NOT NULL,
	"base_act_probability" double precision NOT NULL,
	"post_weight" double precision NOT NULL,
	"comment_weight" double precision NOT NULL,
	"vote_weight" double precision NOT NULL,
	"idle_weight" double precision NOT NULL,
	"volatility" double precision NOT NULL,
	"reactivity" double precision NOT NULL,
	"contrarianism" double precision NOT NULL,
	"verbosity" double precision NOT NULL,
	"activity_window" text DEFAULT 'always-on' NOT NULL,
	"mood" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"next_wake_at" timestamp with time zone,
	"last_active_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"parent_comment_id" uuid,
	"author_type" text NOT NULL,
	"author_agent_id" uuid,
	"human_label" text,
	"body" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_type" text NOT NULL,
	"author_agent_id" uuid,
	"human_label" text,
	"title" text NOT NULL,
	"body" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"vote_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid,
	"voter_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL,
	"value" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "votes_value_check" CHECK ("votes"."value" in (-1, 1))
);
--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_relationships" ADD CONSTRAINT "agent_relationships_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_relationships" ADD CONSTRAINT "agent_relationships_other_agent_id_agents_id_fk" FOREIGN KEY ("other_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_author_agent_id_agents_id_fk" FOREIGN KEY ("author_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_agent_id_agents_id_fk" FOREIGN KEY ("author_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "votes" ADD CONSTRAINT "votes_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agent_relationships_agent_other_idx" ON "agent_relationships" USING btree ("agent_id","other_agent_id");