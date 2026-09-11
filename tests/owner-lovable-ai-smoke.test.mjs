import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { buildOwnerAiSmokePrompt } from "../src/lib/owner/ai-smoke-test.ts";

const read = (path) => readFileSync(path, "utf8");
const server = read("src/lib/owner/ai-smoke-test.functions.ts");
const page = read("src/routes/_authenticated/owner.health.tsx");

test("the synthetic smoke prompt removes every fixed private identifier before egress", () => {
  const result = buildOwnerAiSmokePrompt();

  assert.ok(result.redactionCount >= 7);
  assert.doesNotMatch(
    result.prompt,
    /Jordan Example|03\/07\/2010|TF-SMOKE-1001|parent\.smoke@example\.invalid|860\) 555-0100|100 Test Lane|Example Transition Academy/,
  );
  assert.match(result.prompt, /PRIVACY-SAFE SYNTHETIC TEXT/);
  assert.match(result.prompt, /transition goal/i);
});

test("the live probe is authenticated, Owner-only, fixed-input, and write-free", () => {
  assert.match(server, /createServerFn\(\{ method: "POST" \}\)/);
  assert.match(server, /\.middleware\(\[requireSupabaseAuth\]\)/);
  assert.match(server, /\.from\("admin_roles"\)/);
  assert.match(server, /\.eq\("role", "platform_owner"\)/);
  assert.match(server, /platform owner access is required/);
  assert.match(server, /process\.env\.LOVABLE_API_KEY/);
  assert.match(server, /buildOwnerAiSmokePrompt\(\)/);
  assert.match(server, /gateway\(OWNER_AI_SMOKE_MODEL\)/);
  assert.match(server, /persistedRecords: 0/);
  assert.doesNotMatch(server, /\.(?:insert|update|upsert|delete)\s*\(/);
});

test("the Owner UI never runs the live probe automatically", () => {
  assert.match(page, /useServerFn\(runOwnerAiSmokeTest\)/);
  assert.match(page, /onClick=\{runSyntheticAiSmokeTest\}/);
  assert.match(page, /Not run\. This check starts only when the TransitionForward platform owner/);
  assert.match(page, /accepts no user text, uploads no file/);

  const effects = page.match(/useEffect\([\s\S]*?\n\s*\}, \[[^\]]*\]\);/g) ?? [];
  for (const effect of effects) {
    assert.doesNotMatch(effect, /runAiSmokeTest|runSyntheticAiSmokeTest/);
  }
  assert.doesNotMatch(page, /<Textarea|type="file"/);
});
