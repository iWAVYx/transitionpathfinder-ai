// Workstream C, Slice C9 — Verification gate unit tests.
//
// Pure tests over the promotable-state gate in
// src/lib/evidence-writers.functions.ts. No DB, no network. Also exercises
// the writer's early-return contract with a stub supabase client that would
// throw if any query were dispatched — proving the gate short-circuits
// before it can promote an unverified extraction into the evidence graph.
//
// Run with:  node --test tests/evidence-verification-gate.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isEvidencePromotable,
  PROMOTABLE_VERIFICATION_STATES,
  emitEvidenceForConfirmedExtraction,
} from "../src/lib/evidence-writers.functions.ts";

test("promotable set is exactly {human_confirmed, auto_high}", () => {
  assert.deepEqual([...PROMOTABLE_VERIFICATION_STATES].sort(), [
    "auto_high",
    "human_confirmed",
  ]);
});

test("isEvidencePromotable accepts trusted states only", () => {
  assert.equal(isEvidencePromotable("human_confirmed"), true);
  assert.equal(isEvidencePromotable("auto_high"), true);
  for (const bad of ["auto_low", "unverified", "disputed", "", null, undefined, 42]) {
    assert.equal(isEvidencePromotable(bad), false, `expected ${String(bad)} rejected`);
  }
});

// Stub Supabase client that fails loudly if any query is issued. The gate
// must short-circuit before we ever call .from(); if it doesn't, this test
// throws and the assertion below never runs.
function explodingSupabase() {
  return {
    from() {
      throw new Error("supabase.from() should not be called when gate blocks promotion");
    },
  };
}

test("writer short-circuits when EVIDENCE_GRAPH_WRITES is off", async () => {
  const prev = process.env.EVIDENCE_GRAPH_WRITES;
  delete process.env.EVIDENCE_GRAPH_WRITES;
  try {
    const result = await emitEvidenceForConfirmedExtraction({
      supabase: explodingSupabase(),
      userId: "u1",
      extractionId: "e1",
      studentId: "s1",
      documentId: "d1",
      verificationState: "human_confirmed",
    });
    assert.deepEqual(result, { ok: true, skipped: true, reason: "flag_off" });
  } finally {
    if (prev === undefined) delete process.env.EVIDENCE_GRAPH_WRITES;
    else process.env.EVIDENCE_GRAPH_WRITES = prev;
  }
});

test("writer short-circuits on non-promotable verification_state even with flag on", async () => {
  const prev = process.env.EVIDENCE_GRAPH_WRITES;
  process.env.EVIDENCE_GRAPH_WRITES = "true";
  try {
    for (const state of ["unverified", "auto_low", "disputed"]) {
      const result = await emitEvidenceForConfirmedExtraction({
        supabase: explodingSupabase(),
        userId: "u1",
        extractionId: "e1",
        studentId: "s1",
        documentId: "d1",
        verificationState: state,
      });
      assert.equal(result.ok, true);
      assert.equal(result.skipped, true);
      assert.equal(result.reason, `verification_state:${state}`);
    }
  } finally {
    if (prev === undefined) delete process.env.EVIDENCE_GRAPH_WRITES;
    else process.env.EVIDENCE_GRAPH_WRITES = prev;
  }
});
