// Slice D10 — Pathway shadow-vs-current diff (DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-report-diff.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { diffPathwayReport } from "../src/lib/pathway-report-diff.ts";

const PROV = {
  rules_version: "rules@2026.07.19-shadow",
  prompt_version: "prompt@1",
  model_version: "google/gemini-3-flash-preview",
  engine_channel: "shadow",
};

function makeRec(id, overrides = {}) {
  return {
    schema_version: 1,
    id,
    pillar: "postsecondary_education",
    age_band: "late_high_school",
    title: "Title for " + id,
    summary: "Summary for " + id + " with enough detail.",
    why: "Because the evidence indicates this is a priority.",
    next_action: "Take the next step.",
    owner_role: "student",
    timeframe: "30_day",
    confidence: "medium",
    discuss_at_next_meeting: true,
    sources: [{ kind: "profile", label: "profile" }],
    provenance: { ...PROV, knowledge_ref: ["idea-2004@2004"] },
    ...overrides,
  };
}

function snapshot(overrides = {}) {
  return {
    rules_version: PROV.rules_version,
    prompt_version: PROV.prompt_version,
    model_version: PROV.model_version,
    engine_channel: PROV.engine_channel,
    knowledge_snapshot: { knowledge_ref: ["idea-2004@2004"] },
    recommendations: [makeRec("rec-1"), makeRec("rec-2")],
    ...overrides,
  };
}

test("identical snapshots → identical=true, no diffs", () => {
  const d = diffPathwayReport(snapshot(), snapshot());
  assert.equal(d.identical, true);
  assert.equal(d.recommendations.unchanged_count, 2);
  assert.equal(d.recommendations.added.length, 0);
  assert.equal(d.recommendations.removed.length, 0);
  assert.equal(d.recommendations.changed.length, 0);
  assert.equal(d.knowledge_ref.changed, false);
});

test("provenance field change is detected", () => {
  const d = diffPathwayReport(
    snapshot(),
    snapshot({ rules_version: "rules@2026.08.01-shadow" }),
  );
  assert.equal(d.identical, false);
  assert.equal(d.provenance.rules_version.changed, true);
  assert.equal(d.provenance.rules_version.current, PROV.rules_version);
  assert.equal(d.provenance.rules_version.shadow, "rules@2026.08.01-shadow");
  assert.equal(d.provenance.prompt_version.changed, false);
});

test("knowledge_ref add/remove reported as sets", () => {
  const d = diffPathwayReport(
    snapshot({ knowledge_snapshot: { knowledge_ref: ["idea-2004@2004", "csde@v1"] } }),
    snapshot({ knowledge_snapshot: { knowledge_ref: ["idea-2004@2004", "wioa@v2"] } }),
  );
  assert.equal(d.knowledge_ref.changed, true);
  assert.deepEqual(d.knowledge_ref.added, ["wioa@v2"]);
  assert.deepEqual(d.knowledge_ref.removed, ["csde@v1"]);
  assert.deepEqual(d.knowledge_ref.unchanged, ["idea-2004@2004"]);
});

test("recommendations added / removed / changed classified by id", () => {
  const current = snapshot({
    recommendations: [makeRec("rec-1"), makeRec("rec-2", { title: "Old title" })],
  });
  const shadow = snapshot({
    recommendations: [
      makeRec("rec-2", { title: "New title" }),
      makeRec("rec-3"),
    ],
  });
  const d = diffPathwayReport(current, shadow);
  assert.equal(d.identical, false);
  assert.deepEqual(d.recommendations.added.map((r) => r.id), ["rec-3"]);
  assert.deepEqual(d.recommendations.removed.map((r) => r.id), ["rec-1"]);
  assert.equal(d.recommendations.changed.length, 1);
  assert.equal(d.recommendations.changed[0].id, "rec-2");
  assert.ok(d.recommendations.changed[0].changed_fields.includes("title"));
  assert.equal(d.recommendations.unchanged_count, 0);
});

test("nested provenance change surfaces dotted field path", () => {
  const current = snapshot({ recommendations: [makeRec("rec-1")] });
  const shadow = snapshot({
    recommendations: [
      makeRec("rec-1", {
        provenance: { ...PROV, knowledge_ref: ["idea-2004@2004", "csde@v1"] },
      }),
    ],
  });
  const d = diffPathwayReport(current, shadow);
  assert.equal(d.recommendations.changed.length, 1);
  const fields = d.recommendations.changed[0].changed_fields;
  assert.ok(
    fields.some((f) => f.startsWith("provenance.knowledge_ref")),
    "expected provenance.knowledge_ref path, got: " + fields.join(","),
  );
});

test("null-vs-value provenance is a change; null-vs-null is not", () => {
  const nullSnap = {
    rules_version: null,
    prompt_version: null,
    model_version: null,
    engine_channel: null,
    knowledge_snapshot: null,
    recommendations: null,
  };
  const both = diffPathwayReport(nullSnap, nullSnap);
  assert.equal(both.identical, true);
  const oneSided = diffPathwayReport(nullSnap, snapshot());
  assert.equal(oneSided.identical, false);
  assert.equal(oneSided.provenance.rules_version.changed, true);
  assert.equal(oneSided.provenance.rules_version.current, null);
  assert.equal(oneSided.recommendations.added.length, 2);
});

test("recommendation order does not affect equality", () => {
  const current = snapshot({ recommendations: [makeRec("a"), makeRec("b")] });
  const shadow = snapshot({ recommendations: [makeRec("b"), makeRec("a")] });
  const d = diffPathwayReport(current, shadow);
  assert.equal(d.identical, true);
  assert.equal(d.recommendations.unchanged_count, 2);
});
