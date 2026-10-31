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

test("Partner management visibility uses settled caller pages without swallowing navigation failures", () => {
  const start = source.indexOf("// PartnerForward management tools: only Partner + Owner.");
  const end = source.indexOf("// The existing QA student", start);
  const checks = source.slice(start, end);
  assert.match(checks, /test\.use\(\{ storageState: role\.storageState \}\)/);
  assert.match(checks, /async \(\{ page \}\)/);
  assert.match(checks, /waitUntil:\s*"domcontentloaded"/);
  assert.match(checks, /expect\.poll/);
  assert.match(checks, /toBe\(shouldSee\)/);
  assert.match(checks, /role\.dashboard/);
  assert.doesNotMatch(checks, /waitUntil:\s*"networkidle"|\.catch\(|ctx\.close|browser\.newContext/);
});

test("high-school fixture checks readable grade and real planning links without a silent grade skip", () => {
  const grade = source.slice(source.indexOf("// The existing QA student"));
  assert.match(grade, /High School ·/);
  assert.match(grade, /student-voice/);
  assert.match(grade, /bridgeforward\/intake/);
  assert.doesNotMatch(grade, /test\.skip\(!grade|waitUntil:\s*"networkidle"|hasTransition/);
});
