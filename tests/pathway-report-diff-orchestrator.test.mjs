// Slice D11 — Pathway shadow-vs-current diff orchestrator (server-only, DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-report-diff-orchestrator.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { previewPathwayReportDiff } from "../src/lib/pathway-report-diff.server.ts";

const RULES_ROW = {
  version: "rules@2026.07.19-shadow",
  engine_channel: "shadow",
  effective_at: "2026-07-19T00:00:00Z",
  retired_at: null,
  ruleset: {},
};

const KNOWLEDGE = [{ slug: "idea-2004", version: "2004", retired_at: null }];

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

function makeRec(pillar, overrides = {}) {
  return {
    schema_version: 1,
    id: `rec-${pillar}`,
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
    ...overrides,
  };
}

function makeCurrentClient(snapshot) {
  return {
    fetchReport: async () => ({ data: snapshot, error: null }),
  };
}

test("flag-off performs zero DB work and never fetches current row", async () => {
  let touched = false;
  const r = await previewPathwayReportDiff({
    enabled: false,
    reportId: "00000000-0000-0000-0000-000000000001",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "p",
    modelVersion: "m",
    registryClient: {
      from: () => {
        touched = true;
        throw new Error("nope");
      },
      fromKnowledge: () => {
        touched = true;
        throw new Error("nope");
      },
    },
    currentClient: {
      fetchReport: async () => {
        touched = true;
        return { data: null, error: null };
      },
    },
    generate: async () => {
      touched = true;
      return [];
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.status, "disabled");
  assert.equal(touched, false);
});

test("identical current + shadow reports diff.identical=true", async () => {
  const rec = makeRec("employment");
  const current = {
    rules_version: RULES_ROW.version,
    prompt_version: "pathway.v1",
    model_version: "google/gemini-3-flash-preview",
    engine_channel: "shadow",
    knowledge_snapshot: { knowledge_ref: ["idea-2004@2004"] },
    recommendations: [rec],
  };
  const r = await previewPathwayReportDiff({
    enabled: true,
    reportId: "00000000-0000-0000-0000-000000000002",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    currentClient: makeCurrentClient(current),
    generate: async ({ pillar }) => [makeRec(pillar)],
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "diffed") {
    assert.equal(r.diff.identical, true);
    assert.equal(r.diff.recommendations.added.length, 0);
    assert.equal(r.diff.recommendations.changed.length, 0);
    assert.equal(r.diff.recommendations.removed.length, 0);
    assert.equal(r.diff.recommendations.unchanged_count, 1);
  }
});

test("drift in a recommendation title surfaces as changed", async () => {
  const currentRec = makeRec("employment", { title: "Old title" });
  const current = {
    rules_version: RULES_ROW.version,
    prompt_version: "pathway.v1",
    model_version: "google/gemini-3-flash-preview",
    engine_channel: "shadow",
    knowledge_snapshot: { knowledge_ref: ["idea-2004@2004"] },
    recommendations: [currentRec],
  };
  const r = await previewPathwayReportDiff({
    enabled: true,
    reportId: "00000000-0000-0000-0000-000000000003",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    currentClient: makeCurrentClient(current),
    generate: async ({ pillar }) => [makeRec(pillar)],
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "diffed") {
    assert.equal(r.diff.identical, false);
    assert.equal(r.diff.recommendations.changed.length, 1);
    assert.ok(r.diff.recommendations.changed[0].changed_fields.includes("title"));
  }
});

test("missing current row surfaces as report_not_found (after preview succeeds)", async () => {
  const r = await previewPathwayReportDiff({
    enabled: true,
    reportId: "00000000-0000-0000-0000-000000000004",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    currentClient: makeCurrentClient(null),
    generate: async ({ pillar }) => [makeRec(pillar)],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "report_not_found");
});

test("current-row query error surfaces as report_query_failed", async () => {
  const r = await previewPathwayReportDiff({
    enabled: true,
    reportId: "00000000-0000-0000-0000-000000000005",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
    registryClient: makeRegistryClient(),
    currentClient: {
      fetchReport: async () => ({ data: null, error: { message: "boom" } }),
    },
    generate: async ({ pillar }) => [makeRec(pillar)],
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error_code, "report_query_failed");
    assert.equal(r.message, "boom");
  }
});

test("preview failure short-circuits before current-row fetch", async () => {
  let fetched = false;
  const r = await previewPathwayReportDiff({
    enabled: true,
    reportId: "00000000-0000-0000-0000-000000000006",
    age_band: "late_high_school",
    pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
    promptVersion: "p",
    modelVersion: "m",
    registryClient: makeRegistryClient({ rulesRow: null }),
    currentClient: {
      fetchReport: async () => {
        fetched = true;
        return { data: null, error: null };
      },
    },
    generate: async () => [],
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "no_active_rules");
  assert.equal(fetched, false);
});
