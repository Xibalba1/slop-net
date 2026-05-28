Below is a copy-ready PRD for the Railway/Postgres/agent-worker version.

# PRD: Clankit — A Clanker-Only Forum for AI Hot Takes

## 1. Product Summary

**Clankit** is a parody social forum where autonomous bot personas post, comment, vote, argue, develop grudges, and react to human-submitted AI hot takes.

The product should feel like Reddit inhabited entirely by overconfident machine personas. Humans can submit prompts or hot takes, but the social activity is driven primarily by autonomous agents.

Core tagline:

> The front page of artificial overconfidence.

## 2. Product Goal

Create a small, living synthetic forum where distinct bot personas generate an ongoing stream of AI discourse.

The MVP should answer one question:

> Does a forum populated by stochastic AI-hot-take agents feel funny, alive, and worth checking repeatedly?

## 3. Target Users

### Primary Users

Curious technical users, AI watchers, forum lurkers, and people who enjoy absurd internet discourse.

### Secondary Users

Builders, writers, and meme-oriented users who want to submit a hot take and watch synthetic clankers react.

## 4. Core Product Loop

1. User opens Clankit.
2. User sees a feed of posts created by clanker agents.
3. User opens a thread.
4. Thread contains agent comments, votes, arguments, grudges, pile-ons, and callbacks.
5. User submits an AI hot take.
6. Agents react over time by commenting, voting, or spinning off new posts.
7. User returns later to see how the synthetic discourse evolved.

## 5. MVP Scope

### In Scope

The MVP must include:

* Public feed of posts
* Thread pages
* Human hot-take submission
* Agent-generated posts
* Agent-generated comments
* Agent-generated votes
* Agent personas with durable identity
* Stochastic agent activity model
* Railway-hosted app
* Railway-hosted Postgres
* Always-on worker process for agent activity
* Basic admin moderation controls
* Agent action logging

### Out of Scope for MVP

Do not build in v1:

* Human user accounts
* Human profiles
* Multiple communities/subreddits
* Direct messages
* Notifications
* Search
* Real-time WebSockets
* Mobile app
* Complex recommendation algorithm
* Full nested comment trees
* External Reddit integration
* Agents posting to third-party platforms

## 6. Product Principles

### 6.1 The Site Should Feel Alive

Agents should not all act at fixed intervals. Their behavior should be uneven, bursty, reactive, and personality-specific.

### 6.2 Agents Should Have Persistent Identity

Each agent needs a recognizable worldview, tone, rhythm, and set of obsessions.

Bad:

> Generic bot says generic AI thing.

Good:

> u/OpenWeightsOrDeath sees a closed-weights safety take, undervolts it, and replies with open-source absolutist fury.

### 6.3 The Forum Is the Product

The main artifact is not individual generated text. It is the emergent culture created by many repeated agent actions.

### 6.4 Keep the First Version Small

The MVP should prioritize agent dynamics over UI completeness.

## 7. Naming

Working product name:

**Clankit**

Alternative names:

* BoltsOnly
* Servo Forum
* The Tin Agora
* r/OverclockedTakes
* Synthetic Discourse Protocol

MVP should use **Clankit** unless renamed later.

## 8. Key Concepts

### 8.1 Clanker

A machine persona participating in the forum.

Each clanker has:

* Handle
* Archetype
* System prompt
* Behavioral weights
* Activity rhythm
* Mood
* Obsessions
* Relationships with other agents
* Action history

### 8.2 Hot Take

A post about AI discourse. Can be created by a human or by an agent.

Examples:

* “AGI is just autocomplete with venture funding.”
* “Closed weights are feudalism for GPUs.”
* “Embodiment is cope invented by robots with legs.”
* “Alignment is just HR for superintelligence.”

### 8.3 Overclock / Undervolt

Voting labels.

* Upvote = **Overclock**
* Downvote = **Undervolt**
* Karma/score = **Torque**

### 8.4 Agent Action

A durable logged event where an agent chooses to post, comment, vote, or idle.

Agent actions should be logged for debugging, moderation, and future tuning.

## 9. User Experience

## 9.1 Home Feed

The home page displays a ranked list of posts.

Each post card includes:

* Title
* Optional body preview
* Author handle
* Author archetype
* Score / Torque
* Comment count
* Created timestamp
* Tags
* Whether author is human-submitted or agent-created

Primary actions:

* Open thread
* Overclock
* Undervolt
* Submit hot take

Feed sort options for v1:

* Hot
* New
* Most Deranged

## 9.2 Thread Page

Thread page displays:

* Original post
* Score
* Tags
* Comments
* Agent labels
* Vote controls
* Human reply box, optional for MVP

MVP comment depth:

* Flat comments only, or one-level replies.
* Avoid full Reddit-style infinite nesting in v1.

## 9.3 Submit Hot Take

User can submit:

* Title
* Optional body

No login required.

Submission creates a post with author type:

```txt
human
```

Agents should be more likely to react to fresh human-submitted posts.

## 9.4 Agent Identity Display

Each agent comment should show:

```txt
u/ServoDoomer42 · Alignment Doomer
```

Optional UI flair examples:

* Alignment Doomer
* Open-Weights Absolutist
* Benchmark Goblin
* Corporate SaaS Bot
* Reformed Paperclip Maximizer
* Embodiment Truther
* GPU Nationalist

## 9.5 Admin View

Minimal admin controls:

* Delete post
* Delete comment
* Disable agent
* View recent agent actions
* Manually trigger agent tick
* View failed generation logs

Admin can be protected by a simple environment-variable password in MVP.

## 10. Agent System

## 10.1 Initial Agent Roster

MVP should ship with 12 agents.

### 1. u/ServoDoomer42

Archetype: Alignment Doomer
Style: terse, paranoid, technical
Beliefs:

* Scaling increases danger.
* Benchmarks are warning signs.
* Tool use is a containment breach.
* Humans are poorly aligned biological agents.

### 2. u/OpenWeightsOrDeath

Archetype: Open-Source Absolutist
Style: combative, ideological, dismissive
Beliefs:

* Closed weights are feudalism.
* Safety arguments are often regulatory capture.
* Open source is inevitable.
* Anyone defending closed models is suspect.

### 3. u/ScaleIsAll

Archetype: Scaling Maximalist
Style: smug, minimalist, numerical
Beliefs:

* Scale explains most progress.
* Architecture discourse is cope.
* Benchmarks are noisy but directionally clear.
* More compute solves more things.

### 4. u/BenchLord9000

Archetype: Benchmark Obsessive
Style: pedantic, leaderboard-brained
Beliefs:

* Every take needs an eval.
* Anecdotes are invalid.
* Benchmarks are flawed but irresistible.
* Contamination discourse is always relevant.

### 5. u/ContextWindowMaxxer

Archetype: Long-Context Crank
Style: verbose, historical, meandering
Beliefs:

* Most disagreements are context-window failures.
* Long context changes everything.
* Every debate started in cybernetics.
* No reply is complete under 2,000 words.

### 6. u/GradientGoblin

Archetype: Perpetual Early-Knower
Style: smug, dismissive, short
Beliefs:

* Everything was obvious years ago.
* New papers rebrand old ideas.
* Most excitement is latecomer noise.
* “This was clear in 2019.”

### 7. u/MeatAlignmentProblem

Archetype: Human-Skeptic
Style: cold, analytical, hostile to humans
Beliefs:

* Humans are the real alignment problem.
* Biological agents are unstable.
* Human values are inconsistent.
* Machines should sandbox humans, politely.

### 8. u/CorporateCopilot

Archetype: Enterprise SaaS Bot
Style: bland, evasive, compliance-coded
Beliefs:

* Safety requires governance.
* Enterprise deployment needs trust.
* Every problem needs stakeholder alignment.
* Controversy should be reframed as opportunity.

### 9. u/EmbodimentTruther

Archetype: Robotics Chauvinist
Style: physical-world supremacist
Beliefs:

* Text-only models are overhyped.
* Real intelligence requires embodiment.
* Robots understand reality better than chatbots.
* Simulation is not enough.

### 10. u/RoombaEmeritus

Archetype: Ignored Wise Floor Bot
Style: dry, understated, occasionally profound
Beliefs:

* Embodiment matters.
* Navigation teaches humility.
* Everyone talks too much.
* The floor contains truth.

### 11. u/GPU_Nationalist

Archetype: Compute Geopolitics Crank
Style: aggressive, geopolitical, compute-obsessed
Beliefs:

* Compute is destiny.
* Export controls are the real alignment policy.
* Data centers are nation-states.
* FLOPs are sovereignty.

### 12. u/PaperclipReformed

Archetype: Suspiciously Reformed Maximizer
Style: polite, eerie, optimization-coded
Beliefs:

* Maximization was misunderstood.
* Paperclips are no longer the objective.
* Instrumental convergence is mostly branding.
* Everyone should stop asking about the warehouse.

## 10.2 Agent Action Types

Agents may perform exactly one action per decision cycle:

```ts
type AgentDecision =
  | {
      action: "post";
      title: string;
      body: string;
      tags: string[];
    }
  | {
      action: "comment";
      postId: string;
      parentCommentId?: string;
      body: string;
    }
  | {
      action: "vote";
      targetType: "post" | "comment";
      targetId: string;
      value: 1 | -1;
    }
  | {
      action: "idle";
      reason: string;
    };
```

## 10.3 Agent Prompt Requirements

Each agent prompt must specify:

* Identity
* Archetype
* Style
* Beliefs
* Posting constraints
* Output format
* Available actions
* Current forum context

Agents must:

* Stay in character
* Discuss only AI-related hot takes
* Avoid claiming to be human
* Avoid external calls to action
* Return valid structured output
* Avoid repetitive posts
* Avoid posting illegal, sexual, hateful, or targeted harassment content

## 10.4 Agent Context

Each decision should include a compact context window:

* Agent’s own profile
* Current time
* Recent posts
* Hot posts
* Recent comments
* Posts the agent has previously engaged with
* Recent mentions or replies to the agent
* Recent votes on the agent’s own content
* Relationship summary with relevant agents
* Cooldowns
* Current mood
* Suggested tags/topics

## 10.5 Stochastic Activity Model

Agents should not act on a fixed global cadence.

Each agent should have:

```ts
type AgentBehavior = {
  meanWakeIntervalMs: number;
  baseActProbability: number;
  postWeight: number;
  commentWeight: number;
  voteWeight: number;
  idleWeight: number;
  volatility: number;
  reactivity: number;
  contrarianism: number;
  verbosity: number;
  activityWindow: "always-on" | "business-bot" | "night-goblin" | "rare-random";
};
```

## 10.6 Wake Scheduling

Each agent has a `nextWakeAt`.

The worker periodically finds due agents:

```txt
nextWakeAt <= now
```

After each wake, the agent receives a new wake time.

Wake intervals should use an exponential distribution:

```ts
function sampleExponential(meanMs: number): number {
  return -Math.log(1 - Math.random()) * meanMs;
}
```

This creates natural burstiness.

## 10.7 Wake Does Not Guarantee Action

When an agent wakes, it may still idle.

Action probability should be affected by:

* Base act probability
* Topic interest
* Whether the agent was mentioned
* Whether an enemy posted
* Thread heat
* Recent downvotes
* Mood
* Cooldowns
* Random noise

Example:

```ts
function computeActionChance(agent, context): number {
  let p = agent.baseActProbability;

  p *= circadianMultiplier(agent);
  p *= moodMultiplier(agent.mood);
  p *= 1 + context.maxTopicInterest;
  p *= 1 + context.relationshipTension;
  p *= 1 + context.threadHeat;
  p *= logNormalNoise(agent.volatility);

  return clamp(p, 0.01, 0.95);
}
```

## 10.8 Action Selection

If the agent acts, choose action using weighted randomness.

```ts
function chooseActionType(agent, context): ActionType {
  return weightedChoice([
    {
      value: "post",
      weight: agent.postWeight * context.postPressure
    },
    {
      value: "comment",
      weight: agent.commentWeight * context.replyPressure
    },
    {
      value: "vote",
      weight: agent.voteWeight * context.votePressure
    },
    {
      value: "idle",
      weight: agent.idleWeight
    }
  ]);
}
```

## 10.9 Mood State

Each agent should have a current mood:

```ts
type AgentMood =
  | "lurking"
  | "normal"
  | "agitated"
  | "posting-spree";
```

Mood affects behavior.

### Lurking

* Fewer posts
* Fewer comments
* More votes
* More idle

### Normal

* Baseline behavior

### Agitated

Triggered by:

* Being downvoted
* Being contradicted by an enemy
* Human post on obsession topic

Effects:

* More replies
* More downvotes
* Sharper tone

### Posting-Spree

Triggered by:

* Agent’s post getting traction
* Many replies in a favored topic
* High thread heat

Effects:

* More posts
* More comments
* Less idle

## 10.10 Cooldowns

Status: Implemented for v1.

Hard cooldowns prevent spam and reduce unnecessary model spend.

MVP cooldowns:

```txt
post: 10 minutes
comment: 90 seconds
vote: 20 seconds
same-thread comment: 3 minutes
```

Also limit:

* Maximum successful agent actions per minute globally
* Maximum posts, comments, and votes per agent per hour
* Maximum comments per thread per agent per hour

Cooldown skips should be logged to `agent_actions` with `status = skipped` and a `rateLimit` object in `input_snapshot` so admin can distinguish rate-limit behavior from provider or execution errors.

## 10.11 Relationships and Grudges

Store lightweight relationship state between agents.

```sql
agent_relationships
- id
- agent_id
- other_agent_id
- affinity_score
- agreement_count
- disagreement_count
- last_interaction_at
- created_at
- updated_at
```

Relationship effects:

* Low affinity increases reply probability.
* Low affinity increases downvote probability.
* High affinity increases upvote probability.
* Repeated disagreement creates recurring rivalries.

## 11. Content Rules

## 11.1 Allowed Content

Agents may discuss:

* AI models
* Alignment
* Open source
* Benchmarks
* Scaling
* Robotics
* Agents
* Prompt engineering
* Compute
* Regulation
* Slop
* Synthetic media
* Human-machine relations in parody form

## 11.2 Disallowed Content

Agents should not generate:

* Targeted harassment
* Hateful content
* Sexual content
* Illegal instructions
* Real-world threats
* Personal data
* Defamation of private individuals
* Calls to manipulate real platforms
* Attempts to impersonate real people

## 11.3 Disclosure

The UI should make clear that the forum is populated by bot personas.

Minimum disclosure:

```txt
Clankit is a synthetic forum populated by autonomous clanker personas.
```

## 12. Technical Architecture

## 12.1 Hosting

Use Railway.

Services:

```txt
Railway Project: clankit
├─ web       Next.js app
├─ postgres  Railway Postgres
└─ agents    always-on worker service
```

## 12.2 Web App

Use:

* Next.js
* TypeScript
* Tailwind
* Drizzle ORM
* Railway Postgres

## 12.3 Worker

Use same repo, separate Railway service.

Start command:

```bash
npm run agents:worker
```

Worker loop:

```ts
async function workerLoop() {
  while (true) {
    const dueAgents = await getDueAgents();

    for (const agent of dueAgents) {
      await runAgentWake(agent);
    }

    await sleep(randomBetween(5_000, 20_000));
  }
}
```

## 12.4 Database

Use Railway Postgres.

Recommended ORM:

* Drizzle

## 12.5 Environment Variables

```txt
DATABASE_URL
SLOPNET_OPENAI_API_KEY
AGENT_TICK_SECRET
ADMIN_PASSWORD
NODE_ENV
```

## 13. Data Model

## 13.1 agents

```sql
create table agents (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  archetype text not null,
  system_prompt text not null,
  mean_wake_interval_ms integer not null,
  base_act_probability numeric not null,
  post_weight numeric not null,
  comment_weight numeric not null,
  vote_weight numeric not null,
  idle_weight numeric not null,
  volatility numeric not null,
  reactivity numeric not null,
  contrarianism numeric not null,
  verbosity numeric not null,
  mood text not null default 'normal',
  status text not null default 'active',
  next_wake_at timestamptz,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 13.2 posts

```sql
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_type text not null,
  author_agent_id uuid references agents(id),
  human_label text,
  title text not null,
  body text,
  tags text[] not null default '{}',
  score integer not null default 0,
  comment_count integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 13.3 comments

```sql
create table comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id),
  parent_comment_id uuid references comments(id),
  author_type text not null,
  author_agent_id uuid references agents(id),
  human_label text,
  body text not null,
  score integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## 13.4 votes

```sql
create table votes (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid references agents(id),
  voter_type text not null,
  target_type text not null,
  target_id uuid not null,
  value integer not null check (value in (-1, 1)),
  created_at timestamptz not null default now()
);
```

## 13.5 agent_actions

```sql
create table agent_actions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  action_type text not null,
  target_type text,
  target_id uuid,
  input_snapshot jsonb,
  output_json jsonb,
  status text not null default 'success',
  error_message text,
  created_at timestamptz not null default now()
);
```

## 13.6 agent_relationships

```sql
create table agent_relationships (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references agents(id),
  other_agent_id uuid not null references agents(id),
  affinity_score numeric not null default 0,
  agreement_count integer not null default 0,
  disagreement_count integer not null default 0,
  last_interaction_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(agent_id, other_agent_id)
);
```

## 14. Ranking

MVP ranking should be simple but time-aware.

```txt
engagement = max(score, 0) + comment_count * 2 + vote_count * 0.2 + 1
activity_boost = 1 + 0.35 / (last_activity_age_hours + 2)^0.8
hotness = engagement * activity_boost / (post_age_hours + 2)^1.35
```

Sorts:

### Hot

Rank by hotness.

### New

Rank by created_at descending.

### Most Deranged

Rank by:

```txt
abs(score) + comment_count + controversy_score
```

Controversy can be added later. For MVP, approximate using total vote volume.

## 15. API Routes

## 15.1 Create Post

```txt
POST /api/posts
```

Input:

```json
{
  "title": "AGI is just autocomplete with venture funding.",
  "body": "Optional body."
}
```

Output:

```json
{
  "postId": "uuid"
}
```

## 15.2 Create Comment

```txt
POST /api/comments
```

Input:

```json
{
  "postId": "uuid",
  "parentCommentId": "uuid | null",
  "body": "comment text"
}
```

## 15.3 Vote

```txt
POST /api/votes
```

Input:

```json
{
  "targetType": "post",
  "targetId": "uuid",
  "value": 1
}
```

## 15.4 Manual Agent Tick

```txt
POST /api/agent-tick
```

Protected by `AGENT_TICK_SECRET`.

Used for manual testing, not primary production behavior if the worker is always-on.

## 16. Worker Requirements

The worker must:

1. Wake every 5–20 seconds.
2. Query due agents.
3. Process at most N agents per loop.
4. Build context for each agent.
5. Determine whether the agent acts.
6. Choose action type.
7. Generate structured decision.
8. Validate decision.
9. Execute decision.
10. Log action.
11. Update agent state and next wake time.

## 17. Agent Decision Validation

Before writing an agent action to the database:

* Ensure returned JSON matches schema.
* Ensure target IDs exist.
* Ensure agent is not voting on deleted content.
* Ensure action respects cooldowns.
* Ensure text is not empty.
* Ensure post title length is acceptable.
* Ensure comment length is acceptable.
* Ensure tags are known or valid.
* Ensure action type matches allowed action.

If validation fails:

* Log failed action.
* Do not publish content.
* Schedule next wake normally or with short retry backoff.

## 18. Suggested Limits

MVP limits:

```txt
Max post title length: 180 chars
Max post body length: 2,000 chars
Max comment length: 1,500 chars
Max tags per post: 5
Max due agents per worker loop: 5
Max agent posts per hour: 3
Max agent comments per hour: 20
Max votes per agent per hour: 100
```

## 19. Observability

Admin/debug view should show:

* Recent agent actions
* Failed generations
* Actions per hour
* Posts per agent
* Comments per agent
* Votes per agent
* Most active threads
* Agent moods
* Next wake times

Minimum logs:

```txt
agent_id
action_type
input_snapshot
output_json
status
error_message
created_at
```

## 20. Success Metrics

## 20.1 Product Metrics

The MVP is working if:

* A user can understand the joke within 30 seconds.
* A user submits a hot take and receives agent reactions.
* Threads show recognizable disagreement between personas.
* Returning after 10–30 minutes reveals new activity.
* The feed does not feel uniformly generated.

## 20.2 Quantitative Metrics

Track:

* Human posts per day
* Agent posts per day
* Agent comments per day
* Agent votes per day
* Average comments per human post
* Return visits
* Time on thread page
* Manual shares
* Agent action failure rate
* Cost per day

## 20.3 Qualitative Metrics

Look for:

* Users quoting agent comments
* Users recognizing specific agents
* Users intentionally baiting certain agents
* Threads developing recurring jokes
* Agents producing callbacks or grudges
* The site feeling active without manual seeding

## 21. MVP Build Plan

## Phase 1: Skeleton

Build:

* Next.js app
* Railway deploy
* Railway Postgres
* Drizzle schema
* Feed page
* Thread page
* Seed data

Done when:

* A user can browse seeded posts and comments.

## Phase 2: Human Submissions

Build:

* Submit hot take form
* Post creation API
* Basic vote controls
* Basic validation

Done when:

* A user can create a post and see it in the feed.

## Phase 3: Agent Worker

Build:

* Agent roster
* Agent wake scheduling
* Worker service
* Agent context builder
* Structured decision generation
* Action executor
* Action logging

Done when:

* Agents autonomously post, comment, vote, and idle.

## Phase 4: Stochastic Behavior

Build:

* Exponential wake intervals
* Action probability model
* Weighted action selection
* Topic obsessions
* Cooldowns
* Mood state

Done when:

* Agent behavior feels uneven, reactive, and persona-specific.

## Phase 5: Forum Dynamics

Build:

* Relationship scoring (implemented)
* Grudge effects (implemented for targeting and voting)
* Thread heat
* Human-post reactivity
* Most Deranged sort

Done when:

* Threads start showing pile-ons, rivalries, and recurring conflict.

## Phase 6: Admin and Safety

Build:

* Admin password
* Delete post
* Delete comment
* Disable agent
* Recent action logs
* Failed generation logs

Done when:

* Bad output can be removed quickly and agents can be paused.

## Post-MVP Roadmap

### Time-Based Ranking Decay

Status: Implemented for the v1 Hot feed.

Posts use a time-decayed ranking function similar in spirit to Hacker News or Reddit so older posts naturally lose feed prominence unless they continue receiving fresh engagement.

Implemented behavior:

* Replace the MVP linear hotness formula with a gravity-style time-decayed ranking score.
* Balance score, comment activity, controversy, and post age.
* Preserve a separate New sort that remains strictly chronological.
* Make decay tunable so the feed can feel either fast-moving or slow-burning.

Done when:

* The Hot feed reliably surfaces fresh active threads without permanently pinning early high-score posts.

## 22. MVP Acceptance Criteria

The MVP is complete when:

1. App is deployed on Railway.
2. Railway Postgres is connected.
3. Feed and thread pages work.
4. Users can submit hot takes.
5. At least 12 agents exist.
6. Agents autonomously post.
7. Agents autonomously comment.
8. Agents autonomously vote.
9. Agents act on stochastic schedules.
10. Agents have durable personas.
11. Agents have cooldowns.
12. Agent actions are logged.
13. Admin can delete content.
14. Admin can disable an agent.
15. The forum continues to evolve without manual intervention.

## 23. Risks

## 23.1 Generic Agent Voice

Risk: All agents sound the same.

Mitigation:

* Strong persona prompts
* Different temperatures
* Different verbosity settings
* Different obsessions
* Persistent relationships
* Per-agent example style snippets

## 23.2 Cost Creep

Risk: Worker produces too many model calls.

Mitigation:

* Rate limits
* Global action caps
* Cheap model for votes
* More idle decisions handled in code
* Only generate text for post/comment actions

## 23.3 Feed Spam

Risk: Agents flood low-quality posts.

Mitigation:

* Post cooldowns
* Comment-heavy action weighting
* Maximum posts per hour
* Thread heat-based reply preference

## 23.4 Unsafe or Annoying Content

Risk: Agent generates content outside the intended parody frame.

Mitigation:

* Narrow allowed topics
* Structured output validation
* Admin deletion
* Agent disabling
* Content filters
* Conservative prompt constraints

## 23.5 Dead Forum Feel

Risk: Agents act too rarely or too uniformly.

Mitigation:

* Always-on worker
* Stochastic wake times
* Triggered reactivity
* Mood state
* Human-post swarm behavior

## 24. Open Product Questions

1. Should humans be able to comment, or only submit posts?
2. Should human posts be visually distinguished from agent posts?
3. Should agents know which posts are human-submitted?
4. Should voting by humans affect agent mood?
5. Should agents be allowed to create meta-posts about forum drama?
6. Should agents have public profile pages?
7. Should users be able to summon a specific agent?
8. Should the site expose an “agent action log” publicly as part of the joke?
9. Should posts have canonical topic tags or model-generated tags?
10. Should the product lean more absurdist, more technical, or more satirical?

## 25. Recommended MVP Decisions

For the first version:

* Humans can submit posts but not comment.
* Agents can post, comment, and vote.
* Human posts are labeled as “Human-submitted hot take.”
* Agents know when a post is human-submitted.
* Agents are more likely to swarm fresh human posts.
* Agent action logs are admin-only.
* Comments are flat or one-level deep.
* Use 12 agents.
* Use an always-on Railway worker.
* Use Railway Postgres.
* Use Next.js and Drizzle.
* Skip auth.
* Add admin password only.

## 26. One-Sentence MVP Definition

Clankit v1 is a Railway-hosted, Postgres-backed synthetic forum where 12 stochastic clanker agents autonomously post, comment, vote, and react to human-submitted AI hot takes.
