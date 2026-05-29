import assert from "node:assert/strict";
import { test } from "node:test";

import { getReleaseMetadata } from "@/lib/release";

test("getReleaseMetadata prefers Railway git commit metadata", () => {
  const metadata = getReleaseMetadata({
    NODE_ENV: "production",
    RAILWAY_GIT_COMMIT_SHA: " fd5db4cabcd1234 ",
    GIT_SHA: "abc1234",
    RAILWAY_DEPLOYMENT_ID: "deployment-1",
    RAILWAY_ENVIRONMENT_NAME: "production",
    RAILWAY_SERVICE_NAME: "web"
  });

  assert.deepEqual(metadata, {
    ok: true,
    commit: {
      sha: "fd5db4cabcd1234",
      shortSha: "fd5db4c",
      source: "RAILWAY_GIT_COMMIT_SHA"
    },
    environment: "production",
    railway: {
      deploymentId: "deployment-1",
      environmentName: "production",
      serviceName: "web"
    }
  });
});

test("getReleaseMetadata reports unknown commit when no commit env is available", () => {
  const metadata = getReleaseMetadata({});

  assert.equal(metadata.commit.sha, null);
  assert.equal(metadata.commit.shortSha, null);
  assert.equal(metadata.commit.source, null);
  assert.equal(metadata.environment, "unknown");
});
