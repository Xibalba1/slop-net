import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRailwayEnv, buildRailwayInvocation, railwayProject } from "../../scripts/railway-clankit.mjs";

describe("railway-clankit", () => {
  it("overrides an ambient Railway project id", () => {
    const env = buildRailwayEnv({
      PATH: "/usr/bin",
      RAILWAY_PROJECT_ID: "wrong-project",
      RAILWAY_ENVIRONMENT_ID: "wrong-environment"
    });

    assert.equal(env.PATH, "/usr/bin");
    assert.equal(env.RAILWAY_PROJECT_ID, railwayProject.id);
    assert.equal(env.RAILWAY_ENVIRONMENT_ID, railwayProject.environmentId);
  });

  it("builds a web upload command with explicit project, environment, and service", () => {
    const { args, env } = buildRailwayInvocation(["up", "web", "--", "--detach", "--json"], {
      RAILWAY_PROJECT_ID: "wrong-project"
    });

    assert.deepEqual(args, [
      "up",
      "--project",
      railwayProject.id,
      "--environment",
      railwayProject.environmentId,
      "--service",
      railwayProject.services.web,
      "--detach",
      "--json"
    ]);
    assert.equal(env.RAILWAY_PROJECT_ID, railwayProject.id);
  });

  it("builds an agents deployment list command", () => {
    const { args } = buildRailwayInvocation(["deployments", "agents", "--", "--json", "--limit", "5"], {});

    assert.deepEqual(args, [
      "deployment",
      "list",
      "--environment",
      railwayProject.environmentId,
      "--service",
      railwayProject.services.agents,
      "--json",
      "--limit",
      "5"
    ]);
  });

  it("builds a log command with an optional deployment id", () => {
    const { args } = buildRailwayInvocation(["logs", "web", "abc-123", "--", "--lines", "20"], {});

    assert.deepEqual(args, [
      "logs",
      "abc-123",
      "--project",
      railwayProject.id,
      "--environment",
      railwayProject.environmentId,
      "--service",
      railwayProject.services.web,
      "--lines",
      "20"
    ]);
  });

  it("rejects unknown services", () => {
    assert.throws(() => buildRailwayInvocation(["up", "api"], {}), /Unknown Railway service/);
  });
});
