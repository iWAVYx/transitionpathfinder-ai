// Slice D8 — Lovable AI Gateway generator adapter (DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-shadow-generator.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSystemPrompt,
  buildUserPrompt,
  createShadowLovableRecommendationGenerator,
} from "../src/lib/pathway-shadow-generator.server.ts";
import { parseRecommendationBatchV1 } from "../src/lib/pathway-recommendation-v1.ts";

const PROVENANCE = {
  rules_version: "rules@2026.07.19-shadow",
  prompt_version: "pathway.v1",
  model_version: "google/gemini-3-flash-preview",
  engine_channel: "shadow",
  knowledge_ref: ["idea-2004@2004"],
};

const INPUT = {
  pillar: "employment",
  age_band: "late_high_school",
  signals: [
    { kind: "profile", count: 1 },
    { kind: "student_voice", count: 2 },
  ],
  provenance: PROVENANCE,
};

const GOOD_AI_REC = {
  id: "rec-emp-1",
  title: "Try a paid summer role",
  summary:
    "Jordan has told us she wants a paying job this summer — a paid summer role is the fastest way to test that.",
  why:
    "Student voice + profile both point at paid work as the highest-signal next step for late high school.",
  next_action: "Apply to two paid summer roles this month",
  owner_role: "case_manager",
  timeframe: "30_day",
  confidence: "medium",
  discuss_at_next_meeting: true,
  sources: [
    { kind: "student_voice", label: "Wants a paying job this summer" },
  ],
};

test("prompt builders include pillar, age_band, and every signal", () => {
  const sys = buildSystemPrompt();
  assert.match(sys, /Pathway engine/);
  const prompt = buildUserPrompt(INPUT);
  assert.match(prompt, /Pillar: employment/);
  assert.match(prompt, /Age band: late_high_school/);
  assert.match(prompt, /profile: 1 signal/);
  assert.match(prompt, /student_voice: 2 signal/);
});

test("generator stamps pillar, age_band, provenance, schema_version locally", async () => {
  let received;
  const generate = createShadowLovableRecommendationGenerator({
    runModel: async (call) => {
      received = call;
      return { recommendations: [GOOD_AI_REC] };
    },
  });
  const recs = await generate(INPUT);
  assert.equal(recs.length, 1);
  const [rec] = recs;
  assert.equal(rec.schema_version, 1);
  assert.equal(rec.pillar, "employment");
  assert.equal(rec.age_band, "late_high_school");
  assert.deepEqual(rec.provenance, PROVENANCE);
  assert.equal(rec.title, GOOD_AI_REC.title);
  // Prompt reached the runner.
  assert.match(received.system, /Pathway engine/);
  assert.match(received.prompt, /Pillar: employment/);
});

test("generator output passes the D2 schema gate", async () => {
  const generate = createShadowLovableRecommendationGenerator({
    runModel: async () => ({ recommendations: [GOOD_AI_REC] }),
  });
  const recs = await generate(INPUT);
  const parsed = parseRecommendationBatchV1(recs);
  assert.equal(parsed.ok, true);
});

test("runner errors bubble unchanged (D6 orchestrator turns them into generator_threw)", async () => {
  const generate = createShadowLovableRecommendationGenerator({
    runModel: async () => {
      throw new Error("gateway timeout");
    },
  });
  await assert.rejects(() => generate(INPUT), /gateway timeout/);
});

test("provenance override wins even if runner tried to smuggle one in", async () => {
  const generate = createShadowLovableRecommendationGenerator({
    runModel: async () => ({
      recommendations: [
        { ...GOOD_AI_REC, id: "rec-emp-2" },
      ],
    }),
  });
  const alt = {
    ...INPUT,
    provenance: { ...PROVENANCE, engine_channel: "canary", rules_version: "rules@canary" },
  };
  const [rec] = await generate(alt);
  assert.equal(rec.provenance.engine_channel, "canary");
  assert.equal(rec.provenance.rules_version, "rules@canary");
});
