/**
 * Per-stage "what this means for each role" copy.
 *
 * Powers the compact role-value strip rendered inside every Workspace
 * Tour stage so visitors immediately see the concrete value for their
 * role — parent, student, educator, school admin, district admin, and
 * partner — without leaving the tour.
 *
 * Rules:
 *   - `role` labels are Title Case, one-word where possible.
 *   - `value` copy is sentence case, concrete, and action-oriented.
 *   - No feature dumps — one useful outcome per role per stage.
 */

import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  GraduationCap,
  Handshake,
  School,
  Users,
} from "lucide-react";

import type { StageId } from "./stages";

export type StageRoleId =
  | "student"
  | "family"
  | "educator"
  | "school_admin"
  | "district_admin"
  | "partner";

export interface StageRoleValue {
  role: StageRoleId;
  label: string;
  icon: LucideIcon;
  value: string;
}

const R = {
  student: { role: "student" as const, label: "Student", icon: GraduationCap },
  family: { role: "family" as const, label: "Family", icon: Users },
  educator: { role: "educator" as const, label: "Educator", icon: Briefcase },
  school: { role: "school_admin" as const, label: "School", icon: School },
  district: { role: "district_admin" as const, label: "District", icon: Building2 },
  partner: { role: "partner" as const, label: "Partner", icon: Handshake },
};

export const STAGE_ROLE_VALUES: Record<StageId, StageRoleValue[]> = {
  start: [
    { ...R.student, value: "See my plan in one calm, easy-to-scan place." },
    { ...R.family, value: "Understand who's on our team and what's already in place." },
    { ...R.educator, value: "Skip the intake shuffle — profile, services, and case are pre-loaded." },
    { ...R.school, value: "Know at a glance which students have a plan started." },
  ],
  voice: [
    { ...R.student, value: "Share what matters to me before the meeting, in my words." },
    { ...R.family, value: "Hear our student's own goals before the team weighs in." },
    { ...R.educator, value: "Open every meeting with the student's voice, not a template." },
  ],
  family: [
    { ...R.family, value: "Bring priorities and questions into the next PPT — organized." },
    { ...R.educator, value: "Walk in knowing exactly what the family wants to discuss." },
    { ...R.school, value: "Fewer surprise conversations; more prepared meetings." },
  ],
  school: [
    { ...R.educator, value: "One caseload view — pending inputs, readiness gaps, and prep in one place." },
    { ...R.school, value: "See where teams need support before it becomes a compliance issue." },
    { ...R.district, value: "Track team activity and completion across every building." },
  ],
  evidence: [
    { ...R.family, value: "Upload the IEP once — the whole team can read the highlights." },
    { ...R.educator, value: "Auto-tagged citations save hours on report writing." },
    { ...R.school, value: "See at a glance which student files are complete for audit." },
  ],
  ready: [
    { ...R.student, value: "See my strengths — not just my gaps — across five life areas." },
    { ...R.family, value: "Understand readiness in plain language, without jargon." },
    { ...R.educator, value: "Pinpoint the two focus areas that matter this cycle." },
    { ...R.district, value: "Spot readiness trends across schools and grade bands." },
  ],
  roadmap: [
    { ...R.student, value: "See a real direction — with careers and life goals matched to me." },
    { ...R.family, value: "Get the plain-language Pathway Report you can bring anywhere." },
    { ...R.educator, value: "Ship a defensible, IDEA-aligned pathway with source citations." },
    { ...R.district, value: "Demonstrate real transition outcomes to boards and funders." },
  ],
  action: [
    { ...R.student, value: "Know the two things I actually need to do this month." },
    { ...R.family, value: "See what's ours to do, what's the school's, and what's next." },
    { ...R.educator, value: "Assign owners and due dates once — the plan tracks itself." },
  ],
  connect: [
    { ...R.family, value: "Find vetted resources matched to our student's plan." },
    { ...R.educator, value: "Follow through between meetings without a spreadsheet." },
    { ...R.partner, value: "Reach students whose plans match your programs — with consent." },
    { ...R.district, value: "See which community partners are moving the needle." },
  ],
};

export function getStageRoleValues(id: StageId): StageRoleValue[] {
  return STAGE_ROLE_VALUES[id] ?? [];
}
