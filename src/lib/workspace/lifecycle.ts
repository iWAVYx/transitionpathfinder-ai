/**
 * Pathway Lifecycle — the seven phases of the TransitionForward pathway.
 *
 * There is ONE canonical pathway. Roles differ only in which phases they
 * can act in and what they contribute; they never get a parallel journey.
 *
 * This module is a lens over the nine canonical workspace stages in
 * `./stages.ts` — it does NOT fork them. Every stage belongs to exactly
 * one phase, and every phase names:
 *   - the participants who own or contribute to it,
 *   - the evidence a recommendation produced in that phase must cite.
 *
 * Guarded by tests/unit/pathway-lifecycle.test.ts.
 */

import type { RoleAudience } from "@/lib/role-policy";
import {
  WORKSPACE_STAGES,
  getStage,
  type StageId,
  type WorkspaceStage,
} from "./stages";

/** Seven phases, in journey order. */
export type LifecyclePhaseId =
  | "understand"
  | "identify"
  | "build"
  | "coordinate"
  | "connect"
  | "track"
  | "update";

/**
 * Kinds of evidence a recommendation can cite. A recommendation with no
 * evidence of any kind its phase requires is not publishable.
 */
export type EvidenceKind =
  | "student_voice"
  | "family_input"
  | "school_input"
  | "document"
  | "assessment"
  | "readiness_score"
  | "action_progress"
  | "partner_match";

export interface LifecyclePhase {
  id: LifecyclePhaseId;
  /** ONE all-caps word, matching the stage label style. */
  label: string;
  /** Title Case heading. */
  title: string;
  /** Sentence case narrative. */
  description: string;
  /** Position in the lifecycle, 1-indexed. */
  order: number;
  /** Workspace stages that make up this phase, in stage order. */
  stages: StageId[];
  /** Roles that lead the work in this phase. */
  owners: RoleAudience[];
  /** Roles that contribute but do not own it. */
  contributors: RoleAudience[];
  /** Evidence kinds a recommendation from this phase must cite. */
  requiredEvidence: EvidenceKind[];
}

export const LIFECYCLE_PHASES: readonly LifecyclePhase[] = [
  {
    id: "understand",
    label: "UNDERSTAND",
    title: "Understand The Student",
    description:
      "Establish who the student is and what they want, in their own words, before any planning begins.",
    order: 1,
    stages: ["start", "voice"],
    owners: ["student"],
    contributors: ["family", "educator"],
    requiredEvidence: ["student_voice"],
  },
  {
    id: "identify",
    label: "IDENTIFY",
    title: "Identify Needs And Gaps",
    description:
      "Bring in family priorities, the school team's view, and the documents that already exist to surface what is missing.",
    order: 2,
    stages: ["family", "school", "evidence"],
    owners: ["educator", "family"],
    contributors: ["student", "school_admin", "district_admin"],
    requiredEvidence: ["family_input", "school_input", "document"],
  },
  {
    id: "build",
    label: "BUILD",
    title: "Build The Pathway",
    description:
      "Score readiness and turn everything gathered so far into postsecondary goals and a personalized pathway.",
    order: 3,
    stages: ["ready", "roadmap"],
    owners: ["educator"],
    contributors: ["student", "family", "school_admin"],
    requiredEvidence: ["readiness_score", "assessment"],
  },
  {
    id: "coordinate",
    label: "COORDINATE",
    title: "Coordinate The Team",
    description:
      "Assign owners and due dates so every next step belongs to a named person, not the plan in general.",
    order: 4,
    stages: ["action"],
    owners: ["educator", "school_admin"],
    contributors: ["student", "family", "district_admin"],
    requiredEvidence: ["action_progress"],
  },
  {
    id: "connect",
    label: "CONNECT",
    title: "Connect To Opportunities",
    description:
      "Match the student to resources, community programs, and partner opportunities the family has agreed to share.",
    order: 5,
    stages: ["connect"],
    owners: ["educator", "family"],
    contributors: ["student", "partner", "school_admin"],
    requiredEvidence: ["partner_match"],
  },
  {
    id: "track",
    label: "TRACK",
    title: "Track Progress",
    description:
      "Watch what actually moves — completed steps, changed readiness, and follow-through after each meeting.",
    order: 6,
    stages: [],
    owners: ["educator", "family"],
    contributors: ["student", "school_admin", "district_admin"],
    requiredEvidence: ["action_progress", "readiness_score"],
  },
  {
    id: "update",
    label: "UPDATE",
    title: "Update The Plan",
    description:
      "Re-run the pathway when new evidence arrives so the plan reflects the student today, not the student last spring.",
    order: 7,
    stages: [],
    owners: ["educator"],
    contributors: ["student", "family", "school_admin"],
    requiredEvidence: ["document", "student_voice"],
  },
] as const;

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

const BY_ID = new Map<LifecyclePhaseId, LifecyclePhase>(
  LIFECYCLE_PHASES.map((p) => [p.id, p]),
);

const STAGE_TO_PHASE = new Map<StageId, LifecyclePhaseId>(
  LIFECYCLE_PHASES.flatMap((p) => p.stages.map((s) => [s, p.id] as const)),
);

export function getPhase(id: LifecyclePhaseId): LifecyclePhase {
  const p = BY_ID.get(id);
  if (!p) throw new Error(`Unknown lifecycle phase: ${id}`);
  return p;
}

/** The phase a workspace stage belongs to, or null when unmapped. */
export function phaseForStage(id: StageId): LifecyclePhase | null {
  const phaseId = STAGE_TO_PHASE.get(id);
  return phaseId ? getPhase(phaseId) : null;
}

/** Full stage objects for a phase, in journey order. */
export function stagesForPhase(id: LifecyclePhaseId): WorkspaceStage[] {
  return getPhase(id)
    .stages.map(getStage)
    .sort((a, b) => a.order - b.order);
}

/** Every role that participates in a phase, owners first. */
export function participantsForPhase(id: LifecyclePhaseId): RoleAudience[] {
  const p = getPhase(id);
  return [...p.owners, ...p.contributors.filter((c) => !p.owners.includes(c))];
}

/** Phases a role participates in, in lifecycle order. */
export function phasesForAudience(audience: RoleAudience): LifecyclePhase[] {
  return LIFECYCLE_PHASES.filter((p) =>
    participantsForPhase(p.id).includes(audience),
  );
}

export function nextPhase(id: LifecyclePhaseId): LifecyclePhase | null {
  return LIFECYCLE_PHASES[getPhase(id).order] ?? null;
}

export function previousPhase(id: LifecyclePhaseId): LifecyclePhase | null {
  const p = getPhase(id);
  return p.order <= 1 ? null : (LIFECYCLE_PHASES[p.order - 2] ?? null);
}

/**
 * True when a recommendation produced in a phase cites at least one of
 * the evidence kinds that phase requires. Recommendations that fail this
 * check are unexplainable and must not be surfaced as guidance.
 */
export function recommendationIsGrounded(
  phase: LifecyclePhaseId,
  citedEvidence: readonly EvidenceKind[],
): boolean {
  const required = getPhase(phase).requiredEvidence;
  if (required.length === 0) return true;
  return required.some((kind) => citedEvidence.includes(kind));
}

/** Missing evidence kinds for a recommendation, for operator messaging. */
export function missingEvidenceFor(
  phase: LifecyclePhaseId,
  citedEvidence: readonly EvidenceKind[],
): EvidenceKind[] {
  return getPhase(phase).requiredEvidence.filter(
    (kind) => !citedEvidence.includes(kind),
  );
}

/** Every stage, annotated with its lifecycle phase. */
export function stagesWithPhase(): Array<{
  stage: WorkspaceStage;
  phase: LifecyclePhase | null;
}> {
  return WORKSPACE_STAGES.map((stage) => ({
    stage,
    phase: phaseForStage(stage.id),
  }));
}
