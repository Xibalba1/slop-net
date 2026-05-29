const COMMIT_ENV_KEYS = [
  "RAILWAY_GIT_COMMIT_SHA",
  "GIT_SHA",
  "GITHUB_SHA",
  "VERCEL_GIT_COMMIT_SHA",
  "SOURCE_COMMIT",
  "NEXT_PUBLIC_APP_VERSION"
] as const;

type CommitSource = (typeof COMMIT_ENV_KEYS)[number];

export type ReleaseMetadata = {
  ok: true;
  commit: {
    sha: string | null;
    shortSha: string | null;
    source: CommitSource | null;
  };
  environment: string;
  railway: {
    deploymentId: string | null;
    environmentName: string | null;
    serviceName: string | null;
  };
};

export function getReleaseMetadata(env: NodeJS.ProcessEnv = process.env): ReleaseMetadata {
  const commit = getReleaseCommit(env);

  return {
    ok: true,
    commit,
    environment: env.NODE_ENV ?? "unknown",
    railway: {
      deploymentId: env.RAILWAY_DEPLOYMENT_ID ?? null,
      environmentName: env.RAILWAY_ENVIRONMENT_NAME ?? null,
      serviceName: env.RAILWAY_SERVICE_NAME ?? null
    }
  };
}

function getReleaseCommit(env: NodeJS.ProcessEnv): ReleaseMetadata["commit"] {
  for (const key of COMMIT_ENV_KEYS) {
    const value = normalizeSha(env[key]);

    if (value) {
      return {
        sha: value,
        shortSha: value.slice(0, 7),
        source: key
      };
    }
  }

  return {
    sha: null,
    shortSha: null,
    source: null
  };
}

function normalizeSha(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
