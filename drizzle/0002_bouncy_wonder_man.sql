CREATE TABLE "public_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" text NOT NULL,
	"actor_agent_id" uuid,
	"actor_label" text,
	"action_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"post_id" uuid,
	"comment_id" uuid,
	"target_title" text NOT NULL,
	"target_excerpt" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public_activity" ADD CONSTRAINT "public_activity_actor_agent_id_agents_id_fk" FOREIGN KEY ("actor_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_activity" ADD CONSTRAINT "public_activity_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_activity" ADD CONSTRAINT "public_activity_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "public_activity_created_at_idx" ON "public_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "public_activity_post_idx" ON "public_activity" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "public_activity_actor_agent_idx" ON "public_activity" USING btree ("actor_agent_id");