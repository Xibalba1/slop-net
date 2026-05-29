#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const railwayProject = {
  id: "2a6a1ee5-c994-4601-832f-ffa6d7b2be16",
  environmentId: "2bed2e70-8b60-4861-889d-957e62477ca2",
  services: {
    web: "dbf0c05e-9cf9-437e-99b0-acf37f0a820e",
    agents: "11a55cb4-5108-4a3c-82cb-04fddfb02724"
  }
};

const usage = `Usage:
  node scripts/railway-clankit.mjs status [-- extra railway args]
  node scripts/railway-clankit.mjs up <web|agents> [-- extra railway args]
  node scripts/railway-clankit.mjs redeploy <web|agents> [-- extra railway args]
  node scripts/railway-clankit.mjs deployments <web|agents> [-- extra railway args]
  node scripts/railway-clankit.mjs logs <web|agents> [deployment-id] [-- extra railway args]`;

if (isMainModule()) {
  runMain(process.argv.slice(2));
}

function runMain(argv) {
  try {
    const { args, env } = buildRailwayInvocation(argv, process.env);
    const result = spawnSync("railway", args, {
      env,
      stdio: "inherit"
    });

    process.exit(result.status ?? 1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    console.error(usage);
    process.exit(1);
  }
}

export function buildRailwayInvocation(argv, baseEnv = process.env) {
  const [command, maybeService, ...rest] = argv;

  if (!command) {
    throw new Error("Missing Railway command.");
  }

  const env = buildRailwayEnv(baseEnv);

  if (command === "status") {
    return { args: ["status", ...splitExtraArgs([maybeService, ...rest])], env };
  }

  if (!["up", "redeploy", "deployments", "logs"].includes(command)) {
    throw new Error(`Unsupported Railway command: ${command}`);
  }

  const serviceId = serviceIdFor(maybeService);
  const extraArgs = splitExtraArgs(rest);

  if (command === "deployments") {
    return {
      args: [
        "deployment",
        "list",
        "--environment",
        railwayProject.environmentId,
        "--service",
        serviceId,
        ...extraArgs
      ],
      env
    };
  }

  if (command === "logs") {
    const { positionals, extra } = splitDelimitedArgs(rest);

    if (positionals.length > 1) {
      throw new Error("Logs accepts at most one deployment id.");
    }

    const [maybeDeploymentId, ...logRest] = extra;
    const deploymentArgs =
      positionals.length > 0 ? positionals : maybeDeploymentId && !maybeDeploymentId.startsWith("-") ? [maybeDeploymentId] : [];
    const remainingArgs = positionals.length > 0 || deploymentArgs.length === 0 ? extra : logRest;

    return {
      args: [
        "logs",
        ...deploymentArgs,
        "--project",
        railwayProject.id,
        "--environment",
        railwayProject.environmentId,
        "--service",
        serviceId,
        ...remainingArgs
      ],
      env
    };
  }

  return {
    args: [
      command,
      "--project",
      railwayProject.id,
      "--environment",
      railwayProject.environmentId,
      "--service",
      serviceId,
      ...extraArgs
    ],
    env
  };
}

export function buildRailwayEnv(baseEnv) {
  return {
    ...baseEnv,
    RAILWAY_PROJECT_ID: railwayProject.id,
    RAILWAY_ENVIRONMENT_ID: railwayProject.environmentId
  };
}

function serviceIdFor(service) {
  if (service === "web" || service === "agents") {
    return railwayProject.services[service];
  }

  throw new Error(`Unknown Railway service: ${service ?? "(missing)"}`);
}

function splitExtraArgs(args) {
  const normalized = args.filter((arg) => typeof arg === "string" && arg.length > 0);
  const delimiterIndex = normalized.indexOf("--");
  return delimiterIndex === -1 ? normalized : normalized.slice(delimiterIndex + 1);
}

function splitDelimitedArgs(args) {
  const normalized = args.filter((arg) => typeof arg === "string" && arg.length > 0);
  const delimiterIndex = normalized.indexOf("--");

  if (delimiterIndex === -1) {
    return { positionals: [], extra: normalized };
  }

  return {
    positionals: normalized.slice(0, delimiterIndex),
    extra: normalized.slice(delimiterIndex + 1)
  };
}

function isMainModule() {
  if (!process.argv[1]) {
    return false;
  }

  return import.meta.url === pathToFileURL(process.argv[1]).href;
}
