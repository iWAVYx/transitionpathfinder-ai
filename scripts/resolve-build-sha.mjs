import { execFileSync } from "node:child_process";

const FULL_GIT_SHA = /^[a-f0-9]{40}$/;

export function normalizeBuildSha(value) {
  const normalized = value?.trim().toLowerCase();
  return normalized && FULL_GIT_SHA.test(normalized) ? normalized : undefined;
}

export function resolveBuildSha({ environment = process.env, runGit = execFileSync } = {}) {
  const platformCandidates = [
    environment.VITE_APP_BUILD_SHA,
    environment.GITHUB_SHA,
    environment.CF_PAGES_COMMIT_SHA,
    environment.VERCEL_GIT_COMMIT_SHA,
    environment.VITE_GIT_COMMIT_SHA,
  ];

  for (const candidate of platformCandidates) {
    const normalized = normalizeBuildSha(candidate);
    if (normalized) return normalized;
  }

  try {
    const checkoutSha = runGit("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return normalizeBuildSha(checkoutSha) ?? "dev";
  } catch {
    return "dev";
  }
}
