/**
 * Guardrails for the canonical pathway lifecycle.
 *
 * The lifecycle is a lens over the nine workspace stages — never a fork.
 * These tests keep that true:
 *   - seven phases, ordered 1..7, single all-caps labels
 *   - every workspace stage maps to exactly one phase
 *   - every phase names owners and contributors that are real audiences
 *   - recommendations must cite evidence their phase requires
 */
import { describe, it, expect } from "vitest";
import {
  LIFECYCLE_PHASES,
  getPhase,
  phaseForStage,
  stagesForPhase,
  participantsForPhase,
  phasesForAudience,
  nextPhase,
  previousPhase,
  recommendationIsGrounded,
  missingEvidenceFor,
  stagesWithPhase,
} from "../../src/lib/workspace/lifecycle";
import { WORKSPACE_STAGES } from "../../src/lib/workspace/stages";

const AUDIENCES = [
  "student",
  "family",
  "educator",
  "school_admin",
  "district_admin",
  "admin",
  "partner",
];

describe("pathway lifecycle", () => {
  it("has seven phases ordered 1..7", () => {
    expect(LIFECYCLE_PHASES).toHaveLength(7);
    expect(LIFECYCLE_PHASES.map((p) => p.order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(LIFECYCLE_PHASES.map((p) => p.id)).toEqual([
      "understand",
      "identify",
      "build",
      "coordinate",
      "connect",
      "track",
      "update",
    ]);
  });

  it("labels stay one all-caps word", () => {
    for (const p of LIFECYCLE_PHASES) {
      expect(p.label).toMatch(/^[A-Z]+$/);
      expect(p.description.length).toBeGreaterThan(20);
    }
  });

  it("maps every workspace stage to exactly one phase", () => {
    const mapped = LIFECYCLE_PHASES.flatMap((p) => p.stages);
    expect(new Set(mapped).size).toBe(mapped.length);
    for (const stage of WORKSPACE_STAGES) {
      expect(phaseForStage(stage.id), `stage ${stage.id}`).not.toBeNull();
    }
    expect(stagesWithPhase().every((s) => s.phase !== null)).toBe(true);
  });

  it("returns phase stages in journey order", () => {
    const stages = stagesForPhase("identify");
    expect(stages.map((s) => s.id)).toEqual(["family", "school", "evidence"]);
  });

  it("names real participants without duplicates", () => {
    for (const p of LIFECYCLE_PHASES) {
      expect(p.owners.length).toBeGreaterThan(0);
      const people = participantsForPhase(p.id);
      expect(new Set(people).size).toBe(people.length);
      for (const role of people) expect(AUDIENCES).toContain(role);
    }
  });

  it("gives every planning audience a place in the lifecycle", () => {
    for (const role of ["student", "family", "educator", "school_admin"] as const) {
      expect(phasesForAudience(role).length).toBeGreaterThan(0);
    }
    // Partners only ever participate in CONNECT — never in private planning.
    expect(phasesForAudience("partner").map((p) => p.id)).toEqual(["connect"]);
  });

  it("walks forward and backward", () => {
    expect(nextPhase("understand")?.id).toBe("identify");
    expect(previousPhase("identify")?.id).toBe("understand");
    expect(previousPhase("understand")).toBeNull();
    expect(nextPhase("update")).toBeNull();
  });

  it("requires recommendations to cite the phase's evidence", () => {
    expect(recommendationIsGrounded("understand", ["student_voice"])).toBe(true);
    expect(recommendationIsGrounded("understand", ["document"])).toBe(false);
    expect(missingEvidenceFor("understand", [])).toEqual(["student_voice"]);
    expect(missingEvidenceFor("build", ["readiness_score"])).toEqual([
      "assessment",
    ]);
  });

  it("keeps every phase's evidence requirement non-empty", () => {
    for (const p of LIFECYCLE_PHASES) {
      expect(getPhase(p.id).requiredEvidence.length).toBeGreaterThan(0);
    }
  });
});
