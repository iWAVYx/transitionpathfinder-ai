import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFile(path.join(repoRoot, file), "utf8");

function projectBlock(config, name) {
  const marker = `name: "${name}"`;
  const start = config.indexOf(marker);
  assert.notEqual(start, -1, `missing Playwright project ${name}`);
  const next = config.indexOf("\n    {\n      name:", start + marker.length);
  return config.slice(start, next === -1 ? config.length : next);
}

test("authenticated Playwright projects never retain traces", async () => {
  const config = await read("playwright.config.ts");
  assert.match(config, /use:\s*\{\s*baseURL,[\s\S]*?trace:\s*"off"/);

  for (const name of [
    "setup",
    "authed",
    "dashboard-setup",
    "dashboard-regression",
    "role-access",
    "release-public",
    "release-signedin",
  ]) {
    assert.match(
      projectBlock(config, name),
      /trace:\s*"off"/,
      `${name} must disable trace capture`,
    );
  }

  assert.match(projectBlock(config, "anon"), /trace:\s*"retain-on-failure"/);
  assert.equal(
    [...config.matchAll(/trace:\s*"retain-on-failure"/g)].length,
    1,
    "only the credential-free anon project may retain traces",
  );
});

test("protected workflows sanitize artifacts and fail closed before upload", async () => {
  for (const file of [
    ".github/workflows/dashboard-regression.yml",
    ".github/workflows/role-guard-qa.yml",
    ".github/workflows/release-readiness.yml",
    ".github/workflows/staging-role-verification.yml",
  ]) {
    const workflow = await read(file);
    const uploads = [...workflow.matchAll(/actions\/upload-artifact@v4/g)].length;
    assert.ok(uploads > 0, `${file} must upload diagnostic evidence`);
    assert.match(workflow, /id:\s*sanitize-artifacts/);
    assert.match(
      workflow,
      /node tests\/e2e\/scripts\/sanitize-playwright-artifacts\.mjs playwright-report test-results/,
    );
    assert.equal(
      [...workflow.matchAll(/steps\.sanitize-artifacts\.outcome == 'success'/g)].length,
      uploads,
      `${file} must gate every upload on successful sanitization`,
    );
  }
});

test("sanitizer removes traces and token-bearing files but keeps safe evidence", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "tf-playwright-artifacts-"));
  const nested = path.join(root, "nested");
  const script = path.join(repoRoot, "tests/e2e/scripts/sanitize-playwright-artifacts.mjs");

  try {
    await mkdir(nested, { recursive: true });
    await writeFile(path.join(nested, "error-context.md"), "safe diagnostic\n");
    await writeFile(path.join(nested, "trace.zip"), "fake archive");
    await writeFile(
      path.join(nested, "session.json"),
      JSON.stringify({ refresh_token: "synthetic-refresh-value" }),
    );

    const result = spawnSync(process.execPath, [script, root], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    await access(path.join(nested, "error-context.md"));
    await assert.rejects(access(path.join(nested, "trace.zip")));
    await assert.rejects(access(path.join(nested, "session.json")));
    assert.match(result.stdout, /upload is safe/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
