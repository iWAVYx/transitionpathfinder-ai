// Slice D7 — Pathway report writer (server-only, DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-report-writer.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { writePathwayReport } from "../src/lib/pathway-report-writer.server.ts";

const RULES_ROW = {
  version: "rules@2026.07.19-shadow",
  engine_channel: "shadow",
  effective_at: "2026-07-19T00:00:00Z",
  retired_at: null,
  ruleset: {},
};

const KNOWLEDGE = [
  { slug: "idea-2004", version: "2004", retired_at: null },
  { slug: "csde-transition-2024", version: "2024", retired_at: null },
];

const FULL_SIGNALS = [
  { kind: "profile", count: 1 },
  { kind: "student_voice", count: 2 },
];

function makeRegistryClient(overrides = {}) {
  const rulesRow = overrides.rulesRow === undefined ? RULES_ROW : overrides.rulesRow;
  const rulesErr = overrides.rulesErr ?? null;
  const knowledgeRows = overrides.knowledgeRows ?? KNOWLEDGE;
  const knowledgeErr = overrides.knowledgeErr ?? null;

  const rulesBuilder = {
    select: () => rulesBuilder,
    eq: () => rulesBuilder,
    is: () => rulesBuilder,
    order: () => rulesBuilder,
    limit: () => rulesBuilder,
    maybeSingle: async () => ({ data: rulesRow, error: rulesErr }),
  };

  return {
    from: () => rulesBuilder,
    fromKnowledge: () => ({
      select: () => ({
        is: async () => ({ data: knowledgeRows, error: knowledgeErr }),
      }),
    }),
  };
}

function makeWriter(overrides = {}) {
  const calls = [];
  const err = overrides.error ?? null;
  return {
    calls,
    client: {
      updateReport: async (reportId, columns) => {
        calls.push({ reportId, columns });
        return { data: null, error: err };
      },
    },
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
      knowledge_ref: ["idea-2004@2004", "csde-transition-2024@2024"],
    },
  };
}

test("flag-off performs zero DB work", async () => {
  const writer = makeWriter();
  let loaderCalled = false;
  const registryClient = {
    from: () => {
      loaderCalled = true;
      throw new Error("must not query");
    },
    fromKnowledge: () => {
      throw new Error("must not query");
    },
  };
  let generated = false;
  const r = await writePathwayReport({
    enabled: false,
    reportId: "rep-1",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient,
    writerClient: writer.client,
    generate: async () => {
      generated = true;
      return [];
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.status, "disabled");
  assert.equal(loaderCalled, false);
  assert.equal(generated, false);
  assert.equal(writer.calls.length, 0);
});

test("happy path writes provenance columns + recommendations", async () => {
  const writer = makeWriter();
  const r = await writePathwayReport({
    enabled: true,
    reportId: "rep-2",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    writerClient: writer.client,
    generate: async ({ pillar }) => [makeRec(pillar)],
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "written") {
    assert.equal(r.recommendationCount, 1);
    assert.equal(r.knowledge_dropped, 0);
  }
  assert.equal(writer.calls.length, 1);
  const [call] = writer.calls;
  assert.equal(call.reportId, "rep-2");
  assert.equal(call.columns.rules_version, RULES_ROW.version);
  assert.equal(call.columns.engine_channel, "shadow");
  assert.equal(call.columns.prompt_version, "pathway.v1");
  assert.deepEqual(call.columns.knowledge_snapshot, {
    knowledge_ref: ["idea-2004@2004", "csde-transition-2024@2024"],
  });
  assert.equal(call.columns.recommendations.length, 1);
});

test("loader failure short-circuits before generator + writer", async () => {
  const writer = makeWriter();
  let generated = false;
  const r = await writePathwayReport({
    enabled: true,
    reportId: "rep-3",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "p",
    modelVersion: "m",
    registryClient: makeRegistryClient({ rulesRow: null }),
    writerClient: writer.client,
    generate: async () => {
      generated = true;
      return [];
    },
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "no_active_rules");
  assert.equal(generated, false);
  assert.equal(writer.calls.length, 0);
});

test("engine failure (schema-invalid rec) short-circuits before writer", async () => {
  const writer = makeWriter();
  const r = await writePathwayReport({
    enabled: true,
    reportId: "rep-4",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    writerClient: writer.client,
    generate: async ({ pillar }) => [{ ...makeRec(pillar), title: "x" }],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "schema_invalid");
  assert.equal(writer.calls.length, 0);
});

test("writer error surfaces as write_failed", async () => {
  const writer = makeWriter({ error: { message: "conflict" } });
  const r = await writePathwayReport({
    enabled: true,
    reportId: "rep-5",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    writerClient: writer.client,
    generate: async ({ pillar }) => [makeRec(pillar)],
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error_code, "write_failed");
    assert.equal(r.message, "conflict");
  }
  assert.equal(writer.calls.length, 1);
});

test("insufficient evidence still writes a refusal batch", async () => {
  const writer = makeWriter();
  const r = await writePathwayReport({
    enabled: true,
    reportId: "rep-6",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: [] }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    writerClient: writer.client,
    generate: async () => {
      throw new Error("must not be called");
    },
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "written") {
    assert.equal(r.recommendationCount, 1);
    assert.equal(r.per_pillar[0].outcome, "refused");
  }
  assert.equal(writer.calls.length, 1);
  assert.equal(writer.calls[0].columns.recommendations[0].pillar, "assessment");
});
