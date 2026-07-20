// Workstream B — explainable-match contract.
// Pure-JS unit tests over the explanation schema + builder. No DB.
// Run: node --experimental-strip-types --test tests/partner-match-explanation.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildMatchExplanation,
  partnerMatchExplanationSchema,
  confidenceBandLabel,
} from "../src/lib/partner-match-explanation.ts";

test("schema accepts a minimal valid explanation", () => {
  const parsed = partnerMatchExplanationSchema.parse({
    reasons: ["Age fit (14–18)"],
    evidenceIds: [],
    confidence: "medium",
    conflicts: [],
  });
  assert.equal(parsed.confidence, "medium");
});

test("schema rejects an unknown confidence band", () => {
  assert.throws(() =>
    partnerMatchExplanationSchema.parse({
      reasons: [],
      evidenceIds: [],
      confidence: "extreme",
      conflicts: [],
    }),
  );
});

test("builder assigns confidence by raw score", () => {
  const low = buildMatchExplanation({ rawScore: 5, reasons: ["a"] });
  const mid = buildMatchExplanation({ rawScore: 30, reasons: ["a"] });
  const high = buildMatchExplanation({ rawScore: 55, reasons: ["a"] });
  assert.equal(low.confidence, "low");
  assert.equal(mid.confidence, "medium");
  assert.equal(high.confidence, "high");
});

test("builder deduplicates reasons case-insensitively and trims blanks", () => {
  const e = buildMatchExplanation({
    rawScore: 20,
    reasons: [" Age fit ", "Age Fit", "", "Age fit", "Other reason"],
  });
  assert.deepEqual(e.reasons, ["Age fit", "Other reason"]);
});

test("builder emits an age conflict when studentAge is out of range", () => {
  const e = buildMatchExplanation({
    rawScore: 15,
    reasons: ["Local match"],
    ageOutOfRange: { studentAge: 13, partnerRange: "16-21" },
  });
  assert.ok(e.conflicts.some((c) => c.includes("13") && c.includes("16-21")));
});

test("builder emits a verification conflict for needs_review + outdated", () => {
  const needsReview = buildMatchExplanation({
    rawScore: 12,
    reasons: ["x"],
    verificationStatus: "needs_review",
  });
  assert.ok(needsReview.conflicts.some((c) => /reviewed/i.test(c)));

  const outdated = buildMatchExplanation({
    rawScore: 12,
    reasons: ["x"],
    verificationStatus: "outdated",
  });
  assert.ok(outdated.conflicts.some((c) => /outdated/i.test(c)));
});

test("builder truncates very long reason strings to 240 chars", () => {
  const long = "x".repeat(500);
  const e = buildMatchExplanation({ rawScore: 10, reasons: [long] });
  assert.ok(e.reasons[0].length <= 240);
  assert.ok(e.reasons[0].endsWith("..."));
});

test("builder caps evidenceIds at 20 entries", () => {
  const ids = Array.from({ length: 30 }, (_, i) => `ev-${i}`);
  const e = buildMatchExplanation({ rawScore: 10, reasons: ["x"], evidenceIds: ids });
  assert.equal(e.evidenceIds.length, 20);
});

test("confidenceBandLabel formats human-readable labels", () => {
  assert.equal(confidenceBandLabel("high"), "High confidence");
  assert.equal(confidenceBandLabel("medium"), "Medium confidence");
  assert.equal(confidenceBandLabel("low"), "Low confidence");
});
