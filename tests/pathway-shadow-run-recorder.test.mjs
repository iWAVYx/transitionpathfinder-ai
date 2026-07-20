// Slice D12 — Pathway shadow-run recorder (server-only, DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-shadow-run-recorder.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { recordShadowRun } from "../src/lib/pathway-shadow-run-recorder.server.ts";

function baseShadow() {
  return {
    rules_version: "rules@2026.07.19-shadow",
    prompt_version: "pathway.v1",
    model_version: "google/gemini-3-flash-preview",
    engine_channel: "shadow",
    knowledge_snapshot: { knowledge_ref: ["idea-2004@2004"] },
    recommendations: [],
  };
}

function diffedResult(overrides = {}) {
  return {
    ok: true,
    status: "diffed",
    reportId: "00000000-0000-0000-0000-000000000042",
    current: {
      rules_version: "rules@2026.07.19-shadow",
      prompt_version: "pathway.v1",
      model_version: "google/gemini-3-flash-preview",
      engine_channel: "shadow",
      knowledge_snapshot: { knowledge_ref: ["idea-2004@2004"] },
      recommendations: [],
    },
    shadow: baseShadow(),
    diff: {
      identical: true,
      provenance: {
        rules_version: { changed: false, current: null, shadow: null },
        prompt_version: { changed: false, current: null, shadow: null },
        model_version: { changed: false, current: null, shadow: null },
        engine_channel: { changed: false, current: null, shadow: null },
      },
      knowledge_ref: { changed: false, added: [], removed: [], unchanged: [] },
      recommendations: { added: [], removed: [], changed: [], unchanged_count: 0 },
    },
    ...overrides,
  };
}

test("flag-off performs zero DB work", async () => {
  let called = false;
  const r = await recordShadowRun({
    enabled: false,
    diffResult: diffedResult(),
    logClient: {
      insertRow: async () => {
        called = true;
        return { data: null, error: null };
      },
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.status, "disabled");
  assert.equal(called, false);
});

test("skips (does not write) when upstream diff is not ok", async () => {
  let called = false;
  const r = await recordShadowRun({
    enabled: true,
    diffResult: { ok: false, error_code: "no_active_rules", message: "x" },
    logClient: {
      insertRow: async () => {
        called = true;
        return { data: null, error: null };
      },
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.status, "skipped");
  assert.equal(called, false);
});

test("skips (does not write) when upstream diff was itself disabled", async () => {
  let called = false;
  const r = await recordShadowRun({
    enabled: true,
    diffResult: { ok: true, status: "disabled", reason: "flag_off" },
    logClient: {
      insertRow: async () => {
        called = true;
        return { data: null, error: null };
      },
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.status, "skipped");
  assert.equal(called, false);
});

test("identical diff records a row with all-zero counts and empty provenance_changed", async () => {
  let captured = null;
  const r = await recordShadowRun({
    enabled: true,
    diffResult: diffedResult(),
    actorId: "00000000-0000-0000-0000-0000000000aa",
    logClient: {
      insertRow: async (row) => {
        captured = row;
        return { data: {}, error: null };
      },
    },
  });
  assert.equal(r.ok, true);
  assert.ok(captured);
  assert.equal(captured.report_id, "00000000-0000-0000-0000-000000000042");
  assert.equal(captured.channel, "shadow");
  assert.equal(captured.identical, true);
  assert.equal(captured.added_count, 0);
  assert.equal(captured.removed_count, 0);
  assert.equal(captured.changed_count, 0);
  assert.equal(captured.unchanged_count, 0);
  assert.deepEqual(captured.provenance_changed, []);
  assert.deepEqual(captured.knowledge_added, []);
  assert.deepEqual(captured.knowledge_removed, []);
  assert.equal(captured.actor_id, "00000000-0000-0000-0000-0000000000aa");
});

test("drift diff records counts, knowledge ref delta, and provenance_changed list", async () => {
  const drift = diffedResult({
    diff: {
      identical: false,
      provenance: {
        rules_version: { changed: true, current: "old", shadow: "new" },
        prompt_version: { changed: false, current: "p", shadow: "p" },
        model_version: { changed: true, current: "m1", shadow: "m2" },
        engine_channel: { changed: false, current: "shadow", shadow: "shadow" },
      },
      knowledge_ref: {
        changed: true,
        added: ["csde-2024@2024"],
        removed: ["idea-2004@2004"],
        unchanged: [],
      },
      recommendations: {
        added: [{ id: "a", status: "added", changed_fields: [] }],
        removed: [
          { id: "b", status: "removed", changed_fields: [] },
          { id: "c", status: "removed", changed_fields: [] },
        ],
        changed: [{ id: "d", status: "changed", changed_fields: ["title"] }],
        unchanged_count: 3,
      },
    },
  });
  let captured = null;
  const r = await recordShadowRun({
    enabled: true,
    diffResult: drift,
    logClient: {
      insertRow: async (row) => {
        captured = row;
        return { data: {}, error: null };
      },
    },
  });
  assert.equal(r.ok, true);
  assert.equal(captured.identical, false);
  assert.equal(captured.added_count, 1);
  assert.equal(captured.removed_count, 2);
  assert.equal(captured.changed_count, 1);
  assert.equal(captured.unchanged_count, 3);
  assert.deepEqual(captured.knowledge_added, ["csde-2024@2024"]);
  assert.deepEqual(captured.knowledge_removed, ["idea-2004@2004"]);
  assert.deepEqual(captured.provenance_changed, ["rules_version", "model_version"]);
  assert.equal(captured.actor_id, null);
});

test("writer error surfaces as log_write_failed", async () => {
  const r = await recordShadowRun({
    enabled: true,
    diffResult: diffedResult(),
    logClient: {
      insertRow: async () => ({ data: null, error: { message: "denied" } }),
    },
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error_code, "log_write_failed");
    assert.equal(r.message, "denied");
  }
});
