/**
 * Pathway Spine — eight planning milestones that thread every publication
 * page (demo workspace + signed-in Pathway Report).
 *
 *   Intake → Voice → Family → Educator → Documents → Readiness → Pathway → Plan
 *
 * The mapping of pages and report sections onto these milestones now lives
 * inside `src/lib/publication/nav.ts` (the single source of truth for
 * publication navigation). This file keeps the milestone registry and the
 * derived backwards-compatible lookup tables so existing imports across the
 * codebase keep working unchanged.
 */

export type PathwayMilestoneId =
  | "intake"
  | "voice"
  | "family"
  | "educator"
  | "documents"
  | "readiness"
  | "pathway"
  | "plan";

export interface PathwayMilestone {
  id: PathwayMilestoneId;
  /** Stage label as it appears on the spine. Title Case. */
  label: string;
  /** One-line contribution shown on hover/tap. Sentence case. */
  contribution: string;
}

export const PATHWAY_SPINE: readonly PathwayMilestone[] = [
  { id: "intake",     label: "Intake",     contribution: "The starting point — who the student is today." },
  { id: "voice",      label: "Voice",      contribution: "Direction and preferences in the student's own words." },
  { id: "family",     label: "Family",     contribution: "Hopes, concerns and the questions families bring." },
  { id: "educator",   label: "Educator",   contribution: "Classroom observations and case-manager insight." },
  { id: "documents",  label: "Documents",  contribution: "IEPs, evaluations and 504s turned into evidence." },
  { id: "readiness",  label: "Readiness",  contribution: "Strengths and growth areas across transition domains." },
  { id: "pathway",    label: "Pathway",    contribution: "The recommended direction, grounded in the evidence." },
  { id: "plan",       label: "Plan",       contribution: "30 / 60 / 90 days of named, doable next steps." },
] as const;

export function milestoneIndex(id: PathwayMilestoneId): number {
  return PATHWAY_SPINE.findIndex((m) => m.id === id);
}

/* --------------- Derived lookup tables (do not hand-edit) ---------------- */
/* These are populated from PUBLICATION_PAGES / REPORT_SECTIONS in nav.ts.   */
/* Imported lazily to avoid a circular module init.                          */

import { PUBLICATION_PAGES, REPORT_SECTIONS } from "@/lib/publication/nav";

export const DEMO_CHAPTER_TO_MILESTONE: Record<string, PathwayMilestoneId> =
  Object.fromEntries(PUBLICATION_PAGES.map((p) => [p.id, p.milestone]));

export const REPORT_SECTION_TO_MILESTONE: Record<string, PathwayMilestoneId> =
  Object.fromEntries(REPORT_SECTIONS.map((s) => [s.id, s.milestone]));
