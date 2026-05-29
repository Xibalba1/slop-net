CREATE TABLE "scheduled_agent_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	"claimed_by" text,
	"completed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"payload" jsonb,
	"result_json" jsonb,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "scheduled_agent_events" ADD CONSTRAINT "scheduled_agent_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scheduled_agent_events_due_idx" ON "scheduled_agent_events" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "scheduled_agent_events_agent_idx" ON "scheduled_agent_events" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "scheduled_agent_events_reason_idx" ON "scheduled_agent_events" USING btree ("reason");