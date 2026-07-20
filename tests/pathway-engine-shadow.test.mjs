// Slice D6 — Pathway shadow-channel engine adapter (DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-engine-shadow.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  refusalIdFor,
  runPathwayEngineShadow,
} from "../src/lib/pathway-engine-shadow.ts";

const PROVENANCE = {
  rules_version: "rules@2026.07.19-shadow",
  prompt_version: "pathway.v1",
  model_version: "google/gemini-3-flash-preview",
  engine_channel: "shadow",
  knowledge_ref: ["idea-2004@2004", "csde-transition-2024@2024"],
};

const FULL_SIGNALS = [
  { kind: "profile", count: 1 },
  { kind: "student_voice", count: 2 },
];

function makeRec(overrides = {}) {
  return {
    schema_version: 1,
    id: "rec-1",
    pillar: "employment",
    age_band: "late_high_school",
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
    sources: [{ kind: "student_voice", label: "Wants a paying job this summer" }],
    provenance: PROVENANCE,
    ...overrides,
  };
}

test("flag-off short-circuits without calling the generator", async () => {
  let called = false;
  const r = await runPathwayEngineShadow({
    enabled: false,
    reportId: "rep-1",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    provenance: PROVENANCE,
    generate: async () => {
      called = true;
      return [];
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.status, "disabled");
    if (r.status === "disabled") assert.equal(r.reason, "flag_off");
  }
  assert.equal(called, false);
});

test("insufficient evidence produces a schema-valid assessment refusal", async () => {
  const r = await runPathwayEngineShadow({
    enabled: true,
    reportId: "rep-1",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: [] }],
    provenance: PROVENANCE,
    generate: async () => {
      throw new Error("must not be called for insufficient evidence");
    },
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "produced") {
    assert.equal(r.batch.length, 1);
    assert.equal(r.batch[0].pillar, "assessment");
    assert.equal(r.batch[0].id, refusalIdFor("rep-1", "employment"));
    assert.deepEqual(r.per_pillar, [
      { pillar: "employment", outcome: "refused", count: 1 },
    ]);
  }
});

test("sufficient evidence delegates to generator and re-validates output", async () => {
  const r = await runPathwayEngineShadow({
    enabled: true,
    reportId: "rep-2",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    provenance: PROVENANCE,
    generate: async () => [makeRec()],
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "produced") {
    assert.equal(r.batch.length, 1);
    assert.equal(r.batch[0].pillar, "employment");
    assert.equal(r.per_pillar[0].outcome, "generated");
  }
});

test("schema-invalid generator output short-circuits the whole run", async () => {
  const r = await runPathwayEngineShadow({
    enabled: true,
    reportId: "rep-3",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    provenance: PROVENANCE,
    // title is too short → schema reject
    generate: async () => [makeRec({ title: "x" })],
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error_code, "schema_invalid");
    assert.equal(r.pillar, "employment");
  }
});

test("thrown generator surfaces as generator_threw, not an uncaught error", async () => {
  const r = await runPathwayEngineShadow({
    enabled: true,
    reportId: "rep-4",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    provenance: PROVENANCE,
    generate: async () => {
      throw new Error("gateway timeout");
    },
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error_code, "generator_threw");
    assert.equal(r.message, "gateway timeout");
    assert.equal(r.pillar, "employment");
  }
});

test("duplicate pillar input is rejected up front", async () => {
  const r = await runPathwayEngineShadow({
    enabled: true,
    reportId: "rep-5",
    age_band: "late_high_school",
    pillars: [
      { pillar: "employment", signals: FULL_SIGNALS },
      { pillar: "employment", signals: FULL_SIGNALS },
    ],
    provenance: PROVENANCE,
    generate: async () => [makeRec()],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "duplicate_pillar");
});

test("cross-pillar id collision fails the whole-batch uniqueness check", async () => {
  const r = await runPathwayEngineShadow({
    enabled: true,
    reportId: "rep-6",
    age_band: "late_high_school",
    pillars: [
      { pillar: "employment", signals: FULL_SIGNALS },
      { pillar: "independent_living", signals: FULL_SIGNALS },
    ],
    provenance: PROVENANCE,
    // Same id emitted for both pillars → batch uniqueness violation.
    generate: async ({ pillar }) => [makeRec({ id: "shared-id", pillar })],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "batch_invalid");
});

test("mixed pillars: one refused, one generated, both land in the batch", async () => {
  const r = await runPathwayEngineShadow({
    enabled: true,
    reportId: "rep-7",
    age_band: "late_high_school",
    pillars: [
      { pillar: "employment", signals: FULL_SIGNALS },
      { pillar: "independent_living", signals: [] },
    ],
    provenance: PROVENANCE,
    generate: async ({ pillar }) => [makeRec({ id: `rec-${pillar}`, pillar })],
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "produced") {
    assert.equal(r.batch.length, 2);
    const outcomes = Object.fromEntries(r.per_pillar.map((p) => [p.pillar, p.outcome]));
    assert.equal(outcomes["employment"], "generated");
    assert.equal(outcomes["independent_living"], "refused");
  }
});
