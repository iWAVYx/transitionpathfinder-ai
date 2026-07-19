// Slice D2 — RecommendationV1 schema gate + refusal path.
// Run: node --test tests/recommendation-v1-gate.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseRecommendationV1,
  parseRecommendationBatchV1,
  assessEvidenceSufficiency,
  buildAssessmentRefusal,
  MIN_EVIDENCE_FOR_PILLAR,
} from "../src/lib/pathway-recommendation-v1.ts";

const provenance = {
  rules_version: "rules@2026.07.19-shadow",
  prompt_version: "pathway.v1",
  model_version: "google/gemini-3-flash-preview",
  engine_channel: "shadow",
  knowledge_ref: ["idea-2004", "csde-transition-2024"],
};

const validRec = {
  schema_version: 1,
  id: "rec_1",
  pillar: "employment",
  age_band: "late_high_school",
  title: "Job-shadow at a local vet clinic",
  summary: "Jordan has expressed strong interest in animal-care careers and is ready for exposure.",
  why: "Student Voice + readiness scorecard both indicate readiness for supervised community exposure.",
  next_action: "Case manager contacts 2 local clinics this month to arrange a 4-hour shadow.",
  owner_role: "case_manager",
  timeframe: "30_day",
  confidence: "medium",
  discuss_at_next_meeting: true,
  sources: [
    { kind: "student_voice", label: "Jordan: I want to work with animals" },
    { kind: "readiness", label: "Career awareness: progressing" },
  ],
  provenance,
};

test("parseRecommendationV1 accepts a fully-formed rec", () => {
  const result = parseRecommendationV1(validRec);
  assert.equal(result.ok, true);
});

test("parseRecommendationV1 rejects short title", () => {
  const bad = { ...validRec, title: "hi" };
  const result = parseRecommendationV1(bad);
  assert.equal(result.ok, false);
  if (result.ok === false) {
    assert.equal(result.error_code, "schema_invalid");
    assert.ok(result.issues.some((i) => i.path.includes("title")));
  }
});

test("parseRecommendationV1 rejects missing sources", () => {
  const bad = { ...validRec, sources: [] };
  const result = parseRecommendationV1(bad);
  assert.equal(result.ok, false);
});

test("parseRecommendationV1 rejects unknown pillar", () => {
  const bad = { ...validRec, pillar: "world_domination" };
  const result = parseRecommendationV1(bad);
  assert.equal(result.ok, false);
});

test("parseRecommendationBatchV1 rejects duplicate ids", () => {
  const result = parseRecommendationBatchV1([validRec, { ...validRec }]);
  assert.equal(result.ok, false);
});

test("parseRecommendationBatchV1 accepts unique-id batch", () => {
  const result = parseRecommendationBatchV1([
    validRec,
    { ...validRec, id: "rec_2" },
  ]);
  assert.equal(result.ok, true);
});

test("assessEvidenceSufficiency flags missing signals", () => {
  const result = assessEvidenceSufficiency([{ kind: "profile", count: 1 }]);
  assert.equal(result.sufficient, false);
  if (result.sufficient === false) {
    assert.deepEqual(result.missing, ["student_voice"]);
  }
});

test("assessEvidenceSufficiency passes when all min signals present", () => {
  const signals = MIN_EVIDENCE_FOR_PILLAR.map((k) => ({ kind: k, count: 1 }));
  const result = assessEvidenceSufficiency(signals);
  assert.equal(result.sufficient, true);
});

test("buildAssessmentRefusal produces a rec that passes the schema gate", () => {
  const refusal = buildAssessmentRefusal({
    id: "rec_refusal_1",
    age_band: "early_high_school",
    pillar_asked: "postsecondary_education",
    missing: ["student_voice", "iep_doc"],
    provenance,
  });
  assert.equal(refusal.pillar, "assessment");
  assert.equal(refusal.confidence, "low");
  const gate = parseRecommendationV1(refusal);
  assert.equal(gate.ok, true);
});
