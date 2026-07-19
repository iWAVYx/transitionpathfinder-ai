// Slice D4 — PathwayEngineInvocation provenance resolver.
// Run: node --test tests/pathway-engine-invocation.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolvePathwayEngineInvocation,
  provenanceToReportColumns,
  knowledgeRefFor,
} from "../src/lib/pathway-engine-invocation.ts";

const rulesRow = {
  version: "rules@2026.07.19-shadow",
  engine_channel: "shadow",
  effective_at: "2026-07-19T00:00:00Z",
  retired_at: null,
  ruleset: {},
};

const knowledge = [
  { slug: "idea-2004", version: "2004", retired_at: null },
  { slug: "csde-transition-2024", version: "2024", retired_at: null },
  { slug: "retired-source", version: "1999", retired_at: "2025-01-01T00:00:00Z" },
];

test("resolver returns validated provenance for a live shadow ruleset", () => {
  const r = resolvePathwayEngineInvocation({
    rulesRow,
    knowledgeRows: knowledge,
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.provenance.rules_version, rulesRow.version);
    assert.equal(r.provenance.engine_channel, "shadow");
    assert.deepEqual(r.provenance.knowledge_ref, ["idea-2004@2004", "csde-transition-2024@2024"]);
    assert.equal(r.knowledge_dropped, 0);
  }
});

test("resolver excludes retired knowledge sources", () => {
  const r = resolvePathwayEngineInvocation({
    rulesRow,
    knowledgeRows: knowledge,
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.ok(!r.provenance.knowledge_ref.some((k) => k.startsWith("retired-source")));
});

test("resolver refuses when no rules row supplied", () => {
  const r = resolvePathwayEngineInvocation({
    rulesRow: null,
    knowledgeRows: [],
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "no_active_rules");
});

test("resolver refuses when rules row is retired", () => {
  const r = resolvePathwayEngineInvocation({
    rulesRow: { ...rulesRow, retired_at: "2026-08-01T00:00:00Z" },
    knowledgeRows: [],
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "rules_retired");
});

test("resolver rejects an unknown engine channel", () => {
  const r = resolvePathwayEngineInvocation({
    rulesRow: { ...rulesRow, engine_channel: "wild-west" },
    knowledgeRows: [],
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "invalid_channel");
});

test("channelOverride wins over the row's channel", () => {
  const r = resolvePathwayEngineInvocation({
    rulesRow,
    knowledgeRows: [],
    promptVersion: "p",
    modelVersion: "m",
    channelOverride: "canary",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.provenance.engine_channel, "canary");
});

test("knowledge_ref list is capped and dropped count is reported", () => {
  const many = Array.from({ length: 25 }, (_, i) => ({
    slug: `src-${i}`,
    version: "1",
    retired_at: null,
  }));
  const r = resolvePathwayEngineInvocation({
    rulesRow,
    knowledgeRows: many,
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.provenance.knowledge_ref.length, 20);
    assert.equal(r.knowledge_dropped, 5);
  }
});

test("knowledgeRefFor omits @version when version is null", () => {
  assert.equal(knowledgeRefFor({ slug: "x", version: null, retired_at: null }), "x");
  assert.equal(knowledgeRefFor({ slug: "x", version: "2", retired_at: null }), "x@2");
});

test("provenanceToReportColumns maps to pathway_reports column shape", () => {
  const r = resolvePathwayEngineInvocation({
    rulesRow,
    knowledgeRows: knowledge,
    promptVersion: "pathway.v1",
    modelVersion: "m",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    const cols = provenanceToReportColumns(r.provenance);
    assert.equal(cols.rules_version, rulesRow.version);
    assert.equal(cols.engine_channel, "shadow");
    assert.deepEqual(cols.knowledge_snapshot, {
      knowledge_ref: ["idea-2004@2004", "csde-transition-2024@2024"],
    });
  }
});
