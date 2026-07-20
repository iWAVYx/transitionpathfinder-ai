// Slice D9 — Pathway report preview (server-only, DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-report-preview.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { previewPathwayReport } from "../src/lib/pathway-report-writer.server.ts";

const RULES_ROW = {
  version: "rules@2026.07.19-shadow",
  engine_channel: "shadow",
  effective_at: "2026-07-19T00:00:00Z",
  retired_at: null,
  ruleset: {},
};

const KNOWLEDGE = [
  { slug: "idea-2004", version: "2004", retired_at: null },
];

const FULL_SIGNALS = [
  { kind: "profile", count: 1 },
  { kind: "student_voice", count: 2 },
];

function makeRegistryClient(overrides = {}) {
  const rulesRow = overrides.rulesRow === undefined ? RULES_ROW : overrides.rulesRow;
  const rulesBuilder = {
    select: () => rulesBuilder,
    eq: () => rulesBuilder,
    is: () => rulesBuilder,
    order: () => rulesBuilder,
    limit: () => rulesBuilder,
    maybeSingle: async () => ({ data: rulesRow, error: null }),
  };
  return {
    from: () => rulesBuilder,
    fromKnowledge: () => ({
      select: () => ({
        is: async () => ({ data: KNOWLEDGE, error: null }),
      }),
    }),
  };
}

function makeRec(pillar, id = `rec-${pillar}`) {
  return {
    schema_version: 1,
    id,
    pillar,
    age_band: "late_high_school",
    title: "Try a paid summer role",
    summary:
      "Jordan wants a paying job this summer — a paid summer role is the fastest way to test that.",
    why: "Student voice + profile both point at paid work as the highest-signal next step.",
    next_action: "Apply to two paid summer roles this month",
    owner_role: "case_manager",
    timeframe: "30_day",
    confidence: "medium",
    discuss_at_next_meeting: true,
    sources: [{ kind: "student_voice", label: "Wants a paying job this summer" }],
    provenance: {
      rules_version: RULES_ROW.version,
      prompt_version: "pathway.v1",
      model_version: "google/gemini-3-flash-preview",
      engine_channel: "shadow",
      knowledge_ref: ["idea-2004@2004"],
    },
  };
}

test("flag-off performs zero DB read and zero generator call", async () => {
  let touched = false;
  const registryClient = {
    from: () => {
      touched = true;
      throw new Error("must not query");
    },
    fromKnowledge: () => {
      throw new Error("must not query");
    },
  };
  let generated = false;
  const r = await previewPathwayReport({
    enabled: false,
    reportId: "rep-1",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "p",
    modelVersion: "m",
    registryClient,
    generate: async () => {
      generated = true;
      return [];
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.status, "disabled");
  assert.equal(touched, false);
  assert.equal(generated, false);
});

test("happy path returns provenance columns + recommendations, never writes", async () => {
  const r = await previewPathwayReport({
    enabled: true,
    reportId: "rep-2",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    generate: async ({ pillar }) => [makeRec(pillar)],
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "previewed") {
    assert.equal(r.reportId, "rep-2");
    assert.equal(r.columns.rules_version, RULES_ROW.version);
    assert.equal(r.columns.engine_channel, "shadow");
    assert.equal(r.columns.prompt_version, "pathway.v1");
    assert.deepEqual(r.columns.knowledge_snapshot, {
      knowledge_ref: ["idea-2004@2004"],
    });
    assert.equal(r.columns.recommendations.length, 1);
    assert.equal(r.per_pillar[0].outcome, "generated");
  }
});

test("loader failure short-circuits before generator", async () => {
  let generated = false;
  const r = await previewPathwayReport({
    enabled: true,
    reportId: "rep-3",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "p",
    modelVersion: "m",
    registryClient: makeRegistryClient({ rulesRow: null }),
    generate: async () => {
      generated = true;
      return [];
    },
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "no_active_rules");
  assert.equal(generated, false);
});

test("schema-invalid rec surfaces as schema_invalid, no partial preview", async () => {
  const r = await previewPathwayReport({
    enabled: true,
    reportId: "rep-4",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    generate: async ({ pillar }) => [{ ...makeRec(pillar), title: "x" }],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "schema_invalid");
});

test("insufficient evidence returns a refusal preview without calling generator", async () => {
  const r = await previewPathwayReport({
    enabled: true,
    reportId: "rep-5",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: [] }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    generate: async () => {
      throw new Error("must not be called");
    },
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "previewed") {
    assert.equal(r.columns.recommendations.length, 1);
    assert.equal(r.columns.recommendations[0].pillar, "assessment");
    assert.equal(r.per_pillar[0].outcome, "refused");
  }
});
