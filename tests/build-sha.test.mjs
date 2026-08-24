import assert from "node:assert/strict";
import test from "node:test";

import { normalizeBuildSha, resolveBuildSha } from "../scripts/resolve-build-sha.mjs";

const PLATFORM_SHA = "59195945bc80223a8f735a5fbecf888272dcd505";
const CHECKOUT_SHA = "7803a6486ad67357a523ce252f835ce2d0b53f30";

test("normalizes only exact 40-character Git SHAs", () => {
  assert.equal(normalizeBuildSha(`  ${PLATFORM_SHA.toUpperCase()}  `), PLATFORM_SHA);
  assert.equal(normalizeBuildSha("59195945"), undefined);
  assert.equal(normalizeBuildSha("not-a-sha"), undefined);
});

test("prefers valid hosting-platform commit metadata", () => {
  let gitCalled = false;
  const resolved = resolveBuildSha({
    environment: { GITHUB_SHA: PLATFORM_SHA },
    runGit: () => {
      gitCalled = true;
      return CHECKOUT_SHA;
    },
  });

  assert.equal(resolved, PLATFORM_SHA);
  assert.equal(gitCalled, false);
});

test("derives the exact SHA from the checked-out commit when hosting metadata is absent", () => {
  const resolved = resolveBuildSha({
    environment: {},
    runGit: (command, args, options) => {
      assert.equal(command, "git");
      assert.deepEqual(args, ["rev-parse", "HEAD"]);
      assert.equal(options.encoding, "utf8");
      return `${CHECKOUT_SHA}\n`;
    },
  });

  assert.equal(resolved, CHECKOUT_SHA);
});

test("fails closed when neither platform metadata nor checkout identity is trustworthy", () => {
  assert.equal(
    resolveBuildSha({ environment: { GITHUB_SHA: "short" }, runGit: () => "also-invalid" }),
    "dev",
  );
  assert.equal(
    resolveBuildSha({
      environment: {},
      runGit: () => {
        throw new Error("git metadata unavailable");
      },
    }),
    "dev",
  );
});
