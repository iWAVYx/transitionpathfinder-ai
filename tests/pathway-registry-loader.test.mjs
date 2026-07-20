// Slice D5 — Pathway registry loader (server-only, DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-registry-loader.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPathwayEngineInvocation } from "../src/lib/pathway-registry-loader.server.ts";

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

/** Build a stub client that records every call it receives. */
function makeClient(overrides = {}) {
  const calls = { rulesEq: [], rulesIs: [], knowledgeIs: [] };
  const rulesRow = overrides.rulesRow === undefined ? RULES_ROW : overrides.rulesRow;
  const rulesErr = overrides.rulesErr ?? null;
  const knowledgeRows = overrides.knowledgeRows ?? KNOWLEDGE;
  const knowledgeErr = overrides.knowledgeErr ?? null;

  const rulesBuilder = {
    select: () => rulesBuilder,
    eq: (col, val) => {
      calls.rulesEq.push([col, val]);
      return rulesBuilder;
    },
    is: (col, val) => {
      calls.rulesIs.push([col, val]);
      return rulesBuilder;
    },
    order: () => rulesBuilder,
    limit: () => rulesBuilder,
    maybeSingle: async () => ({ data: rulesRow, error: rulesErr }),
  };

  const client = {
    from: (table) => {
      if (table !== "pathway_rules_versions") throw new Error(`unexpected table ${table}`);
      return rulesBuilder;
    },
    fromKnowledge: () => ({
      select: () => ({
        is: async (col, val) => {
          calls.knowledgeIs.push([col, val]);
          return { data: knowledgeRows, error: knowledgeErr };
        },
      }),
    }),
  };

  return { client, calls };
}

test("loader returns validated provenance for the shadow channel", async () => {
  const { client, calls } = makeClient();
  const r = await loadPathwayEngineInvocation({
    client,
    promptVersion: "pathway.v1",
    modelVersion: "google/gemini-3-flash-preview",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.provenance.rules_version, RULES_ROW.version);
    assert.equal(r.provenance.engine_channel, "shadow");
    assert.deepEqual(r.provenance.knowledge_ref, [
      "idea-2004@2004",
      "csde-transition-2024@2024",
    ]);
    assert.equal(r.knowledge_dropped, 0);
    assert.equal(r.rulesRow.version, RULES_ROW.version);
    assert.equal(r.knowledgeRows.length, 2);
  }
  // Confirms the query is scoped to (channel, not retired).
  assert.deepEqual(calls.rulesEq, [["engine_channel", "shadow"]]);
  assert.deepEqual(calls.rulesIs, [["retired_at", null]]);
  assert.deepEqual(calls.knowledgeIs, [["retired_at", null]]);
});

test("channel override routes to canary and stamps it on provenance", async () => {
  const { client, calls } = makeClient({
    rulesRow: { ...RULES_ROW, engine_channel: "canary", version: "rules@canary" },
  });
  const r = await loadPathwayEngineInvocation({
    client,
    promptVersion: "p",
    modelVersion: "m",
    channel: "canary",
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.provenance.engine_channel, "canary");
  assert.deepEqual(calls.rulesEq, [["engine_channel", "canary"]]);
});

test("missing rules row surfaces a structured no_active_rules refusal", async () => {
  const { client } = makeClient({ rulesRow: null });
  const r = await loadPathwayEngineInvocation({
    client,
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.error_code, "no_active_rules");
});

test("rules query error is reported without throwing", async () => {
  const { client } = makeClient({ rulesRow: null, rulesErr: { message: "boom" } });
  const r = await loadPathwayEngineInvocation({
    client,
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error_code, "rules_query_failed");
    assert.equal(r.message, "boom");
  }
});

test("knowledge query error is reported without throwing", async () => {
  const { client } = makeClient({ knowledgeRows: null, knowledgeErr: { message: "kaboom" } });
  const r = await loadPathwayEngineInvocation({
    client,
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error_code, "knowledge_query_failed");
    assert.equal(r.message, "kaboom");
  }
});

test("empty knowledge set still yields a valid (empty knowledge_ref) provenance", async () => {
  const { client } = makeClient({ knowledgeRows: [] });
  const r = await loadPathwayEngineInvocation({
    client,
    promptVersion: "p",
    modelVersion: "m",
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual(r.provenance.knowledge_ref, []);
    assert.equal(r.knowledge_dropped, 0);
  }
});
