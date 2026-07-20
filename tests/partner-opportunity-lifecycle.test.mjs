// Workstream A — opportunity + student-match lifecycle contract.
// Pure-JS unit tests over the allowed state transitions. No DB.
// Run: node --experimental-strip-types --test tests/partner-opportunity-lifecycle.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";

// Opportunity status graph (partner side).
const OPPORTUNITY_TRANSITIONS = {
  draft: ["pending_review", "inactive"],
  pending_review: ["approved", "draft", "inactive"],
  approved: ["inactive", "pending_review"],
  inactive: ["draft"],
};

// Student-match status graph (student side; mirrors DB CHECK constraint).
const MATCH_TRANSITIONS = {
  suggested: ["saved", "dismissed"],
  saved: ["contacted", "dismissed"],
  contacted: ["applied", "dismissed"],
  applied: ["completed", "dismissed"],
  completed: [],
  dismissed: ["saved"], // allow un-dismiss back to saved
};

function canTransition(graph, from, to) {
  return (graph[from] ?? []).includes(to);
}

test("opportunity: draft → pending_review is allowed", () => {
  assert.equal(canTransition(OPPORTUNITY_TRANSITIONS, "draft", "pending_review"), true);
});

test("opportunity: draft → approved is NOT allowed (must go through review)", () => {
  assert.equal(canTransition(OPPORTUNITY_TRANSITIONS, "draft", "approved"), false);
});

test("opportunity: approved → inactive (unpublish) is allowed", () => {
  assert.equal(canTransition(OPPORTUNITY_TRANSITIONS, "approved", "inactive"), true);
});

test("opportunity: inactive → draft (restore) is allowed", () => {
  assert.equal(canTransition(OPPORTUNITY_TRANSITIONS, "inactive", "draft"), true);
});

test("match: suggested → saved → contacted → applied → completed is the happy path", () => {
  let s = "suggested";
  for (const next of ["saved", "contacted", "applied", "completed"]) {
    assert.equal(canTransition(MATCH_TRANSITIONS, s, next), true, `${s} → ${next}`);
    s = next;
  }
});

test("match: completed is terminal — no outbound edges", () => {
  assert.deepEqual(MATCH_TRANSITIONS.completed, []);
});

test("match: skipping stages (suggested → applied) is NOT allowed", () => {
  assert.equal(canTransition(MATCH_TRANSITIONS, "suggested", "applied"), false);
});

test("match: dismissed → saved allows undo", () => {
  assert.equal(canTransition(MATCH_TRANSITIONS, "dismissed", "saved"), true);
});

// Freeze the graphs so regressions are caught if someone widens transitions
// without updating this test.
test("opportunity graph covers all 4 statuses", () => {
  assert.deepEqual(Object.keys(OPPORTUNITY_TRANSITIONS).sort(), [
    "approved",
    "draft",
    "inactive",
    "pending_review",
  ]);
});

test("match graph covers all 6 statuses from the DB CHECK constraint", () => {
  assert.deepEqual(Object.keys(MATCH_TRANSITIONS).sort(), [
    "applied",
    "completed",
    "contacted",
    "dismissed",
    "saved",
    "suggested",
  ]);
});
