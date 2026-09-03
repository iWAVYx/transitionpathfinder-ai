import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync("tests/e2e/role-access-rules.signedin.spec.ts", "utf8");
const forbiddenLoopStart = source.indexOf("for (const forbidden of FORBIDDEN_ROUTES[role.key])");
const forbiddenLoopEnd = source.indexOf("// PartnerForward management tools");

test("forbidden-route checks assert authorization without waiting for network idle", () => {
  assert.notEqual(forbiddenLoopStart, -1, "forbidden-route loop is missing");
  assert.notEqual(forbiddenLoopEnd, -1, "forbidden-route loop boundary is missing");

  const forbiddenLoop = source.slice(forbiddenLoopStart, forbiddenLoopEnd);

  assert.match(forbiddenLoop, /waitUntil:\s*"domcontentloaded"/);
  assert.match(forbiddenLoop, /timeout:\s*20_000/);
  assert.match(forbiddenLoop, /expect\s*\.poll\(/);
  assert.match(forbiddenLoop, /timeout:\s*15_000/);
  assert.doesNotMatch(forbiddenLoop, /waitUntil:\s*"networkidle"/);
});
