#!/usr/bin/env node

/**
 * Remove credential-bearing Playwright output before CI uploads artifacts.
 *
 * Playwright traces serialize browser storageState. For signed-in Supabase
 * tests that includes access and refresh tokens, so trace archives must never
 * leave the runner. The config disables authenticated traces at the source;
 * this sanitizer is the fail-closed second layer for future regressions.
 */

import { lstat, readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_ROOTS = ["playwright-report", "test-results"];
const roots = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_ROOTS;

const credentialPatterns = [
  {
    label: "Supabase auth storage key",
    pattern: /sb-[a-z0-9]+-auth-token/i,
  },
  {
    label: "serialized access token",
    pattern: /["']access_token["']\s*:\s*["'][^"']{16,}["']/i,
  },
  {
    label: "serialized refresh token",
    pattern: /["']refresh_token["']\s*:\s*["'][^"']{8,}["']/i,
  },
  {
    label: "bearer JWT",
    pattern: /bearer\s+eyJ[A-Za-z0-9_-]{20,}/i,
  },
];

const removed = [];

async function exists(target) {
  try {
    await lstat(target);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
}

async function walk(root) {
  if (!(await exists(root))) return [];

  const entries = await readdir(root, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(root, entry.name);
    if (entry.isSymbolicLink()) {
      // Uploading a symlink can escape the intended diagnostic tree.
      await rm(target, { force: true });
      removed.push({ target, reason: "symbolic link" });
    } else if (entry.isDirectory()) {
      files.push(...(await walk(target)));
    } else if (entry.isFile()) {
      files.push(target);
    }
  }
  return files;
}

async function sanitizeRoot(root) {
  const files = await walk(root);
  for (const file of files) {
    if (path.extname(file).toLowerCase() === ".zip") {
      await rm(file, { force: true });
      removed.push({ target: file, reason: "archive may contain storageState" });
      continue;
    }

    const content = (await readFile(file)).toString("utf8");
    const finding = credentialPatterns.find(({ pattern }) => pattern.test(content));
    if (finding) {
      await rm(file, { force: true });
      removed.push({ target: file, reason: finding.label });
    }
  }
}

for (const root of roots) {
  await sanitizeRoot(path.resolve(root));
}

// Verify the post-sanitization tree independently. A failure prevents every
// guarded upload step from running.
for (const root of roots) {
  for (const file of await walk(path.resolve(root))) {
    if (path.extname(file).toLowerCase() === ".zip") {
      throw new Error(`Unsafe archive remains after sanitization: ${file}`);
    }
    const content = (await readFile(file)).toString("utf8");
    const finding = credentialPatterns.find(({ pattern }) => pattern.test(content));
    if (finding) {
      throw new Error(`Credential-bearing file remains (${finding.label}): ${file}`);
    }
  }
}

for (const item of removed) {
  console.log(`Removed ${path.relative(process.cwd(), item.target)} (${item.reason}).`);
}
console.log(
  `Playwright artifacts sanitized: ${removed.length} unsafe file(s) removed; upload is safe.`,
);
