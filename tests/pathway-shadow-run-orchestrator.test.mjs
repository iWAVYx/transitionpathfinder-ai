// Slice D13 — Pathway shadow-run orchestrator (server-only, DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-shadow-run-orchestrator.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { runShadowDiffAndRecord } from "../src/lib/pathway-shadow-run-orchestrator.server.ts";

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
      select: () => ({ is: async () => ({ data: KNOWLEDGE, error: null }) }),
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
  return { fetchReport: async () => ({ data: snapshot, error: null }) };
}

function makeLogClient() {
  const rows = [];
  return {
    rows,
    insertRow: async (row) => {
      rows.push(row);
      return { data: row, error: null };
    },
  };
}

const baseInput = (overrides = {}) => ({
  reportId: "00000000-0000-0000-0000-000000000042",
  age_band: "late_high_school",
  pillars: [{ pillar: "employment", signals: FULL_SIGNALS }],
  promptVersion: "pathway.v1",
  modelVersion: "google/gemini-3-flash-preview",
  registryClient: makeRegistryClient(),
  generate: async ({ pillar }) => [makeRec(pillar)],
  ...overrides,
});

test("flag-off performs zero I/O across diff + record", async () => {
  let touched = false;
  const log = makeLogClient();
  const r = await runShadowDiffAndRecord({
    ...baseInput({
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
      generate: async () => {
        touched = true;
        return [];
      },
    }),
    enabled: false,
    currentClient: {
      fetchReport: async () => {
        touched = true;
        return { data: null, error: null };
      },
    },
    logClient: {
      insertRow: async () => {
        touched = true;
        return { data: null, error: null };
      },
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.status, "disabled");
  assert.equal(touched, false);
  assert.equal(log.rows.length, 0);
});

test("identical snapshots record a row with identical=true", async () => {
  const rec = makeRec("employment");
  const current = {
    rules_version: RULES_ROW.version,
    prompt_version: "pathway.v1",
    model_version: "google/gemini-3-flash-preview",
    engine_channel: "shadow",
    knowledge_snapshot: { knowledge_ref: ["idea-2004@2004"] },
    recommendations: [rec],
  };
  const log = makeLogClient();
  const r = await runShadowDiffAndRecord({
    ...baseInput(),
    enabled: true,
    currentClient: makeCurrentClient(current),
    logClient: log,
    actorId: "actor-1",
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "completed") {
    assert.equal(r.diff.ok, true);
    if (r.diff.ok && r.diff.status === "diffed") {
      assert.equal(r.diff.diff.identical, true);
    }
    assert.equal(r.record.ok, true);
    if (r.record.ok && r.record.status === "recorded") {
      assert.equal(r.record.row.identical, true);
      assert.equal(r.record.row.actor_id, "actor-1");
      assert.equal(r.record.row.added_count, 0);
      assert.equal(r.record.row.changed_count, 0);
    }
  }
  assert.equal(log.rows.length, 1);
  assert.equal(log.rows[0].identical, true);
});

test("drift in title records a row with changed_count=1", async () => {
  const current = {
    rules_version: RULES_ROW.version,
    prompt_version: "pathway.v1",
    model_version: "google/gemini-3-flash-preview",
    engine_channel: "shadow",
    knowledge_snapshot: { knowledge_ref: ["idea-2004@2004"] },
    recommendations: [makeRec("employment", { title: "Old title" })],
  };
  const log = makeLogClient();
  const r = await runShadowDiffAndRecord({
    ...baseInput(),
    enabled: true,
    currentClient: makeCurrentClient(current),
    logClient: log,
  });
  assert.equal(r.ok, true);
  assert.equal(log.rows.length, 1);
  assert.equal(log.rows[0].identical, false);
  assert.equal(log.rows[0].changed_count, 1);
  assert.equal(log.rows[0].actor_id, null);
});

test("upstream diff error surfaces via .diff and skips log write", async () => {
  const log = makeLogClient();
  const r = await runShadowDiffAndRecord({
    ...baseInput({ registryClient: makeRegistryClient({ rulesRow: null }) }),
    enabled: true,
    currentClient: makeCurrentClient(null),
    logClient: log,
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "completed") {
    assert.equal(r.diff.ok, false);
    if (!r.diff.ok) assert.equal(r.diff.error_code, "no_active_rules");
    assert.equal(r.record.ok, true);
    if (r.record.ok) {
      assert.equal(r.record.status, "skipped");
      if (r.record.status === "skipped") {
        assert.equal(r.record.reason, "diff_not_ok");
      }
    }
  }
  assert.equal(log.rows.length, 0);
});

test("log write failure surfaces on .record while diff succeeds", async () => {
  const rec = makeRec("employment");
  const current = {
    rules_version: RULES_ROW.version,
    prompt_version: "pathway.v1",
    model_version: "google/gemini-3-flash-preview",
    engine_channel: "shadow",
    knowledge_snapshot: { knowledge_ref: ["idea-2004@2004"] },
    recommendations: [rec],
  };
  const r = await runShadowDiffAndRecord({
    ...baseInput(),
    enabled: true,
    currentClient: makeCurrentClient(current),
    logClient: {
      insertRow: async () => ({ data: null, error: { message: "log boom" } }),
    },
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "completed") {
    assert.equal(r.diff.ok, true);
    assert.equal(r.record.ok, false);
    if (!r.record.ok) {
      assert.equal(r.record.error_code, "log_write_failed");
      assert.equal(r.record.message, "log boom");
    }
  }
});
