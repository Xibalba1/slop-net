import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const baseUrl = normalizeBaseUrl(process.env.DEPLOY_HEALTH_BASE_URL ?? "https://web-production-87f78.up.railway.app");
const timeoutMs = Number.parseInt(process.env.DEPLOY_HEALTH_TIMEOUT_MS ?? "10000", 10);
const expectedDeploymentId = normalizeOptionalValue(process.env.DEPLOY_HEALTH_EXPECTED_DEPLOYMENT_ID);
const expectedSha = normalizeOptionalValue(process.env.DEPLOY_HEALTH_EXPECTED_SHA);

const checks = [
  {
    label: "activity feed",
    path: "/activity",
    expectedText: "Activity"
  },
  {
    label: "admin shell",
    path: "/admin",
    expectedText: "Admin"
  }
];

if (isMainModule()) {
  runMain().catch((error) => {
    console.error(`Deploy health failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

async function runMain() {
  const failures = await runDeployHealth({ baseUrl, checks, expectedDeploymentId, expectedSha, timeoutMs });

  if (failures > 0) {
    console.error(`Deploy health failed with ${failures} issue${failures === 1 ? "" : "s"}.`);
    process.exit(1);
  }

  console.log("Deploy health passed.");
}

export async function runDeployHealth({ baseUrl, checks, expectedDeploymentId, expectedSha, timeoutMs }) {
  let failures = 0;

  console.log(`Deploy health for ${baseUrl}`);

  failures += await checkReleaseMetadata({ baseUrl, expectedDeploymentId, expectedSha, timeoutMs });

  for (const check of checks) {
    const url = new URL(check.path, baseUrl);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "User-Agent": "clankit-deploy-health/1.0"
        }
      });

      if (!response.ok) {
        failures += 1;
        console.error(`FAIL ${check.label}: ${response.status} ${response.statusText} at ${url}`);
        continue;
      }

      const body = await response.text();

      if (!body.includes(check.expectedText)) {
        failures += 1;
        console.error(`FAIL ${check.label}: missing expected text "${check.expectedText}" at ${url}`);
        continue;
      }

      console.log(`PASS ${check.label}: ${response.status} ${url}`);
    } catch (error) {
      failures += 1;
      console.error(`FAIL ${check.label}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const auditResult = spawnSync("npm", ["audit", "--audit-level=high"], {
    stdio: "inherit",
    env: process.env
  });

  if (auditResult.status === 0) {
    console.log("PASS npm audit: no high or critical advisories");
  } else {
    failures += 1;
    console.error("FAIL npm audit: high or critical advisories are present, or npm audit could not complete");
  }

  return failures;
}

export async function checkReleaseMetadata({
  baseUrl,
  expectedDeploymentId,
  expectedSha,
  timeoutMs,
  fetchImpl = fetch,
  logger = console
}) {
  const url = new URL("/api/health", baseUrl);

  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "clankit-deploy-health/1.0"
      }
    });

    if (!response.ok) {
      logger.error(`FAIL release metadata: ${response.status} ${response.statusText} at ${url}`);
      return 1;
    }

    const metadata = await response.json();
    const commitSha = normalizeOptionalValue(metadata?.commit?.sha);
    const shortSha = normalizeOptionalValue(metadata?.commit?.shortSha) ?? (commitSha ? commitSha.slice(0, 7) : null);
    const deploymentId = normalizeOptionalValue(metadata?.railway?.deploymentId);
    const source = normalizeOptionalValue(metadata?.commit?.source) ?? "unknown source";

    if (!metadata?.ok) {
      logger.error(`FAIL release metadata: health payload did not report ok=true at ${url}`);
      return 1;
    }

    if (expectedSha && !commitSha) {
      logger.error(`FAIL release metadata: expected ${expectedSha.slice(0, 7)}, but deployed commit is unknown`);
      return 1;
    }

    if (expectedDeploymentId && !deploymentId) {
      logger.error(`FAIL release metadata: expected deployment ${expectedDeploymentId}, but deployment id is unknown`);
      return 1;
    }

    if (expectedDeploymentId && deploymentId !== expectedDeploymentId) {
      logger.error(`FAIL release metadata: expected deployment ${expectedDeploymentId}, got ${deploymentId}`);
      return 1;
    }

    if (expectedSha && commitSha && !shaMatches(expectedSha, commitSha)) {
      logger.error(`FAIL release metadata: expected ${expectedSha.slice(0, 7)}, got ${commitSha.slice(0, 7)}`);
      return 1;
    }

    const suffixes = [
      expectedSha ? "matched expected commit" : null,
      expectedDeploymentId ? "matched expected deployment" : null
    ].filter(Boolean);
    const suffix = suffixes.length > 0 ? ` and ${suffixes.join(", ")}` : "";
    logger.log(`PASS release metadata: ${shortSha ?? "unknown commit"} from ${source}${suffix}`);
    return 0;
  } catch (error) {
    logger.error(`FAIL release metadata: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

export function shaMatches(expectedSha, actualSha) {
  const normalizedExpected = normalizeOptionalValue(expectedSha)?.toLowerCase();
  const normalizedActual = normalizeOptionalValue(actualSha)?.toLowerCase();

  if (!normalizedExpected || !normalizedActual) {
    return false;
  }

  return normalizedActual === normalizedExpected || normalizedActual.startsWith(normalizedExpected);
}

function normalizeBaseUrl(value) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("DEPLOY_HEALTH_BASE_URL cannot be empty");
  }

  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function normalizeOptionalValue(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized ? normalized : null;
}

function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
