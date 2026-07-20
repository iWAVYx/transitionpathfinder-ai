// Slice D15 — Pathway shadow-run reader (server-only, DORMANT).
// Run: node --experimental-strip-types --test tests/pathway-shadow-run-reader.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { listShadowRuns } from "../src/lib/pathway-shadow-run-reader.server.ts";

function makeRow(overrides = {}) {
  return {
    id: "00000000-0000-0000-0000-000000000aaa",
    report_id: "00000000-0000-0000-0000-000000000111",
    run_at: "2026-07-20T00:00:00Z",
    channel: "shadow",
    rules_version: "rules@2026.07.19-shadow",
    prompt_version: "pathway.v1",
    model_version: "google/gemini-3-flash-preview",
    identical: false,
    added_count: 1,
    removed_count: 0,
    changed_count: 0,
    unchanged_count: 0,
    knowledge_added: [],
    knowledge_removed: [],
    provenance_changed: [],
    diff: {
      identical: false,
      provenance: {
        rules_version: { changed: false, current: null, shadow: null },
        prompt_version: { changed: false, current: null, shadow: null },
        model_version: { changed: false, current: null, shadow: null },
        engine_channel: { changed: false, current: null, shadow: null },
      },
      knowledge_ref: { changed: false, added: [], removed: [], unchanged: [] },
      recommendations: { added: [], removed: [], changed: [], unchanged_count: 0 },
    },
    actor_id: null,
    created_at: "2026-07-20T00:00:00Z",
    ...overrides,
  };
}

test("flag-off performs zero DB work", async () => {
  let touched = false;
  const r = await listShadowRuns({
    enabled: false,
    logReader: {
      list: async () => {
        touched = true;
        return { data: [], error: null };
      },
    },
  });
  assert.equal(r.ok, true);
  if (r.ok) assert.equal(r.status, "disabled");
  assert.equal(touched, false);
});

test("happy path returns normalized query + rows", async () => {
  const rows = [makeRow(), makeRow({ id: "00000000-0000-0000-0000-000000000bbb" })];
  let seenQuery = null;
  const r = await listShadowRuns({
    enabled: true,
    reportId: "00000000-0000-0000-0000-000000000111",
    driftOnly: true,
    logReader: {
      list: async (q) => {
        seenQuery = q;
        return { data: rows, error: null };
      },
    },
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "listed") {
    assert.equal(r.rows.length, 2);
    assert.equal(r.query.reportId, "00000000-0000-0000-0000-000000000111");
    assert.equal(r.query.driftOnly, true);
    assert.equal(r.query.limit, 50);
    assert.equal(r.query.channel, null);
    assert.equal(r.query.rulesVersion, null);
  }
  assert.ok(seenQuery);
});

test("limit is clamped to 1..200 with default 50", async () => {
  const cases = [
    [undefined, 50],
    [0, 1],
    [-5, 1],
    [1000, 200],
    [75, 75],
  ];
  for (const [input, expected] of cases) {
    const r = await listShadowRuns({
      enabled: true,
      limit: input,
      logReader: { list: async () => ({ data: [], error: null }) },
    });
    assert.equal(r.ok, true);
    if (r.ok && r.status === "listed") assert.equal(r.query.limit, expected);
  }
});

test("reader error surfaces as log_query_failed", async () => {
  const r = await listShadowRuns({
    enabled: true,
    logReader: {
      list: async () => ({ data: null, error: { message: "boom" } }),
    },
  });
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.error_code, "log_query_failed");
    assert.equal(r.message, "boom");
  }
});

test("null data from reader normalizes to empty rows", async () => {
  const r = await listShadowRuns({
    enabled: true,
    logReader: { list: async () => ({ data: null, error: null }) },
  });
  assert.equal(r.ok, true);
  if (r.ok && r.status === "listed") assert.deepEqual(r.rows, []);
});

test("all optional filters pass through into normalized query", async () => {
  let seen = null;
  await listShadowRuns({
    enabled: true,
    reportId: "00000000-0000-0000-0000-000000000222",
    rulesVersion: "rules@x",
    channel: "canary",
    driftOnly: false,
    limit: 10,
    logReader: {
      list: async (q) => {
        seen = q;
        return { data: [], error: null };
      },
    },
  });
  assert.deepEqual(seen, {
    reportId: "00000000-0000-0000-0000-000000000222",
    rulesVersion: "rules@x",
    channel: "canary",
    driftOnly: false,
    limit: 10,
  });
});
