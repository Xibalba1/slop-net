import { spawnSync } from "node:child_process";

const baseUrl = normalizeBaseUrl(process.env.DEPLOY_HEALTH_BASE_URL ?? "https://web-production-87f78.up.railway.app");
const timeoutMs = Number.parseInt(process.env.DEPLOY_HEALTH_TIMEOUT_MS ?? "10000", 10);

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

let failures = 0;

console.log(`Deploy health for ${baseUrl}`);

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

if (failures > 0) {
  console.error(`Deploy health failed with ${failures} issue${failures === 1 ? "" : "s"}.`);
  process.exit(1);
}

console.log("Deploy health passed.");

function normalizeBaseUrl(value) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("DEPLOY_HEALTH_BASE_URL cannot be empty");
  }

  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}
