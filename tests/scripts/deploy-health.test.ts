import assert from "node:assert/strict";
import { test } from "node:test";

import { checkReleaseMetadata, shaMatches } from "../../scripts/deploy-health.mjs";

const quietLogger = {
  error: () => {},
  log: () => {}
};

test("shaMatches accepts exact and short expected commits", () => {
  assert.equal(shaMatches("fd5db4c", "fd5db4cabcd1234"), true);
  assert.equal(shaMatches("fd5db4cabcd1234", "fd5db4cabcd1234"), true);
  assert.equal(shaMatches("F D", "fd5db4cabcd1234"), false);
  assert.equal(shaMatches("abc1234", "fd5db4cabcd1234"), false);
});

test("checkReleaseMetadata passes when expected commit matches", async () => {
  const failures = await checkReleaseMetadata({
    baseUrl: "https://example.test/",
    expectedSha: "fd5db4c",
    timeoutMs: 1000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: true,
          commit: {
            sha: "fd5db4cabcd1234",
            shortSha: "fd5db4c",
            source: "RAILWAY_GIT_COMMIT_SHA"
          }
        })
      ),
    logger: quietLogger
  });

  assert.equal(failures, 0);
});

test("checkReleaseMetadata fails when expected commit differs", async () => {
  const failures = await checkReleaseMetadata({
    baseUrl: "https://example.test/",
    expectedSha: "abc1234",
    timeoutMs: 1000,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          ok: true,
          commit: {
            sha: "fd5db4cabcd1234",
            shortSha: "fd5db4c",
            source: "RAILWAY_GIT_COMMIT_SHA"
          }
        })
      ),
    logger: quietLogger
  });

  assert.equal(failures, 1);
});
