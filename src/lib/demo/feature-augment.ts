/**
 * Deterministic enrichment layer for the demo feature-detail pages.
 *
 * The per-role registries under `src/lib/demo/<role>/feature-details.ts`
 * already carry the core content (summary, rows, stats, connectsTo,
 * primaryAction, etc.). This module derives the four additional slots the
 * feature-depth audit requires, without forcing a rewrite of ~2000 lines
 * of hand-authored copy:
 *
 *   - secondaryAction: a role-shaped follow-up action tied to the primary
 *   - nextStep:        one concrete next step for the current user
 *   - permissionNote:  who can see this content, in role-specific language
 *   - feedsInto:       which other platform primitives this feature affects
 *   - pathwayRelation: "feeds" | "generated-from" | "reviews" | "acts-on"
 *                      | "tracks" — the Pathway-Report-centrality tag
 *
 * The DemoFeatureShell renders these values; the audit tests assert that
 * every (role, featureId) pair yields non-trivial output.
 *
 * All logic is data-driven off the registry entry so new features get
 * enriched automatically the moment they're added. Per-role overrides
 * fine-tune the language where a generic derivation would sound flat.
 */

import type { DemoRole } from "@/lib/demo/feature-routes";
// Structural shape only — avoid importing the union to keep this module
// framework-free and easy to unit-test.
export interface BaseDetail {
  id: string;
  title: string;
  eyebrow: string;
  summary: string;
  what: string;
  primaryAction: { label: string; to: string };
  connectsTo: string[];
  rows: { primary: string; secondary?: string; meta?: string; status?: string }[];
  stats?: { label: string; value?: string }[];
  dataSource: string;
}

export type PathwayRelation =
  | "feeds"
  | "generated-from"
  | "reviews"
  | "acts-on"
  | "tracks"
  | "supports";

export interface AugmentedFeature {
  secondaryAction: { label: string; to: string };
  nextStep: string;
  permissionNote: string;
  feedsInto: string[];
  pathwayRelation: PathwayRelation;
  pathwayRelationCopy: string;
}

// ---------------------------------------------------------------- Owner /
// Platform Admin support. Owner is treated as a first-class demo role for
// the feature-depth audit even though the real Owner Hub is admin-only.

export type ExtendedDemoRole = DemoRole | "owner";

// ------------------------------------------------------------ Permission
// notes — role-shaped, more specific than the shell's fallback strings.

const PERMISSION_NOTES: Record<ExtendedDemoRole, string> = {
  student:
    "You. Your family and case manager can see this too; no other student, family, educator, or partner can.",
  family:
    "Family members you've invited plus your student's caseload team. Never partners, never other families.",
  educator:
    "You and staff assigned to this student's caseload. Family sees a family-friendly version. Partners never see student PII.",
  "school-admin":
    "School-level roll-ups for your school only. No individual student record leaves the caseload team.",
  "district-admin":
    "District aggregates only. Student-level records stay with the school teams; you see counts, trends, and coverage.",
  partner:
    "Your organization only. Partners never see student PII, IEPs, Voice, Pathway Reports, or family notes.",
  owner:
    "Platform Admins only. Tenant-level operations; never a channel to view a specific student's plan.",
};

// -------------------------------------------------------- Pathway-Report
// centrality. Every feature is tagged with how it relates to the report
// so the shell can render it explicitly and the audit can enforce it.

const RELATION_OVERRIDES: Partial<
  Record<`${ExtendedDemoRole}:${string}`, PathwayRelation>
> = {
  // Student
  "student:pathway-report": "reviews",
  "student:student-voice": "feeds",
  "student:action-items": "acts-on",
  "student:saved-resources": "supports",
  "student:meeting-prep": "acts-on",
  "student:calendar": "tracks",
  "student:documents": "feeds",
  // Family
  "family:student-profile": "feeds",
  "family:pathway-report": "reviews",
  "family:documents": "feeds",
  "family:recommended-resources": "generated-from",
  "family:action-items": "acts-on",
  "family:calendar": "tracks",
  "family:meeting-prep": "acts-on",
  "family:consent": "supports",
  "family:invite-team": "supports",
  // Educator
  "educator:caseload": "tracks",
  "educator:readiness": "feeds",
  "educator:pending-input": "feeds",
  "educator:pathway-reports": "reviews",
  "educator:meeting-prep": "acts-on",
  "educator:case-notes": "feeds",
  "educator:action-items": "acts-on",
  "educator:calendar": "tracks",
  "educator:documents": "feeds",
  // School Admin
  "school-admin:school-overview": "tracks",
  "school-admin:team-access": "supports",
  "school-admin:planning-status": "tracks",
  "school-admin:report-completion": "tracks",
  "school-admin:readiness-trends": "tracks",
  "school-admin:resource-usage": "tracks",
  "school-admin:calendar": "tracks",
  "school-admin:support-needs": "acts-on",
  "school-admin:implementation": "supports",
  // District Admin
  "district-admin:district-overview": "tracks",
  "district-admin:connected-schools": "supports",
  "district-admin:school-progress": "tracks",
  "district-admin:readiness-trend": "tracks",
  "district-admin:implementation": "supports",
  "district-admin:district-reports": "tracks",
  "district-admin:service-gaps": "acts-on",
  // Partner
  "partner:partner-profile": "supports",
  "partner:active-opportunities": "supports",
  "partner:submitted-programs": "supports",
  "partner:application-windows": "supports",
  "partner:opportunity-management": "supports",
  "partner:incentives": "supports",
  "partner:partner-resources": "supports",
};

const RELATION_COPY: Record<PathwayRelation, (title: string, connectsTo: string[]) => string> = {
  feeds: (t, c) =>
    `${t} feeds directly into the Pathway Report. Updates you make here show up in ${c.slice(0, 2).join(" and ") || "the next report draft"}.`,
  "generated-from": (t) =>
    `${t} is generated from the current Pathway Report — priorities, readiness signals, and interests are the inputs.`,
  reviews: (t) =>
    `${t} is where the team reviews the Pathway Report itself: sections complete, what's missing, and what to bring to the next PPT.`,
  "acts-on": (t) =>
    `${t} is how the team acts on the Pathway Report between meetings — items map to specific report sections and readiness gaps.`,
  tracks: (t) =>
    `${t} tracks progress against the Pathway Report over time so families, schools, and districts can see momentum.`,
  supports: (t) =>
    `${t} keeps the Pathway Report trustworthy — access, consent, and coordination that let the report be shared safely.`,
};

// ---------------------------------------------------------- Secondary
// action derivations — role-shaped fallbacks that add a real follow-up.

const SECONDARY_ACTION_OVERRIDES: Partial<
  Record<`${ExtendedDemoRole}:${string}`, { label: string; to: string }>
> = {
  "student:pathway-report": { label: "Answer Voice Prompts", to: "/student-voice" },
  "student:student-voice": { label: "See My Report", to: "/pathway/student" },
  "student:action-items": { label: "Prep My Next Meeting", to: "/ppt-prep" },
  "student:meeting-prep": { label: "Open My Calendar", to: "/meetings" },
  "student:calendar": { label: "Start Meeting Prep", to: "/ppt-prep" },
  "student:documents": { label: "Open My Report", to: "/pathway/student" },
  "student:saved-resources": { label: "Browse Recommended", to: "/resources" },

  "family:pathway-report": { label: "Prep For Next Meeting", to: "/ppt-prep" },
  "family:documents": { label: "Review Sharing", to: "/family/consent" },
  "family:recommended-resources": { label: "Open Pathway Report", to: "/pathway/family" },
  "family:action-items": { label: "Open Calendar", to: "/meetings" },
  "family:calendar": { label: "Start Meeting Prep", to: "/ppt-prep" },
  "family:meeting-prep": { label: "Open Pathway Report", to: "/pathway/family" },
  "family:consent": { label: "Invite A Team Member", to: "/students" },
  "family:invite-team": { label: "Review Sharing", to: "/family/consent" },
  "family:student-profile": { label: "Open Pathway Report", to: "/pathway/family" },

  "educator:caseload": { label: "Open Readiness", to: "/readiness" },
  "educator:readiness": { label: "Review A Pathway Report", to: "/pathway/educator" },
  "educator:pending-input": { label: "Open Caseload", to: "/caseload" },
  "educator:pathway-reports": { label: "Prep For A PPT", to: "/ppt-prep" },
  "educator:meeting-prep": { label: "Open Calendar", to: "/meetings" },
  "educator:case-notes": { label: "Open Caseload", to: "/caseload" },
  "educator:action-items": { label: "Open Meeting Prep", to: "/ppt-prep" },
  "educator:calendar": { label: "Start Meeting Prep", to: "/ppt-prep" },
  "educator:documents": { label: "Open A Pathway Report", to: "/pathway/educator" },

  "school-admin:school-overview": { label: "Open Report Completion", to: "/school" },
  "school-admin:team-access": { label: "Open School Overview", to: "/school" },
  "school-admin:planning-status": { label: "Open Readiness Trends", to: "/school" },
  "school-admin:report-completion": { label: "Open Support Needs", to: "/school" },
  "school-admin:readiness-trends": { label: "Open Support Needs", to: "/school" },
  "school-admin:resource-usage": { label: "Open Report Completion", to: "/school" },
  "school-admin:calendar": { label: "Open Planning Status", to: "/school" },
  "school-admin:support-needs": { label: "Open Implementation", to: "/school" },
  "school-admin:implementation": { label: "Open Team Access", to: "/school" },

  "district-admin:district-overview": { label: "Open School Progress", to: "/district" },
  "district-admin:connected-schools": { label: "Open Implementation", to: "/district" },
  "district-admin:school-progress": { label: "Open Readiness Trend", to: "/district" },
  "district-admin:readiness-trend": { label: "Open Service Gaps", to: "/district" },
  "district-admin:implementation": { label: "Open District Reports", to: "/district" },
  "district-admin:district-reports": { label: "Open School Progress", to: "/district" },
  "district-admin:service-gaps": { label: "Open Implementation", to: "/district" },

  "partner:partner-profile": { label: "Open Opportunities", to: "/partners-manage" },
  "partner:active-opportunities": { label: "Manage An Opportunity", to: "/partners-manage" },
  "partner:submitted-programs": { label: "Open Application Windows", to: "/partners-manage" },
  "partner:application-windows": { label: "Open Opportunity Management", to: "/partners-manage" },
  "partner:opportunity-management": { label: "Open Active Opportunities", to: "/partners-manage" },
  "partner:incentives": { label: "Open Partner Profile", to: "/partners-manage" },
  "partner:partner-resources": { label: "Open Partner Profile", to: "/partners-manage" },
};

function secondaryFallback(role: ExtendedDemoRole): { label: string; to: string } {
  switch (role) {
    case "student":
      return { label: "Back To My Dashboard", to: "/dashboard" };
    case "family":
      return { label: "Back To Family Dashboard", to: "/dashboard" };
    case "educator":
      return { label: "Back To Caseload", to: "/caseload" };
    case "school-admin":
      return { label: "Back To School Overview", to: "/school" };
    case "district-admin":
      return { label: "Back To District Overview", to: "/district" };
    case "partner":
      return { label: "Back To Partner Hub", to: "/partners-manage" };
    case "owner":
      return { label: "Back To Owner Hub", to: "/owner" };
  }
}

// ---------------------------------------------------------------- Next-
// step derivations — a one-liner action tied to the feature.

const NEXT_STEP_OVERRIDES: Partial<Record<`${ExtendedDemoRole}:${string}`, string>> = {
  "student:pathway-report":
    "Star one recommendation to bring to your next PPT so your team knows what matters to you.",
  "student:student-voice":
    "Answer the two prompts you haven't touched yet — each one takes under two minutes.",
  "student:action-items":
    "Pick the item due soonest and either complete it or add a note about what's blocking you.",
  "student:meeting-prep":
    "Add one question you want answered at the next PPT before your team locks the agenda.",
  "student:calendar":
    "Add the next PPT to your personal calendar and set a two-day reminder.",
  "student:documents":
    "If your latest IEP isn't here, ask your case manager to share it.",
  "student:saved-resources":
    "Open the resource with the most recent date and skim it before your next meeting.",

  "family:pathway-report":
    "Read the family view together this week and star one recommendation to raise at the next PPT.",
  "family:documents":
    "Upload the latest IEP or evaluation so the Pathway Report reflects current evidence.",
  "family:recommended-resources":
    "Save two resources that match your student's interests so they're ready before the next meeting.",
  "family:action-items":
    "Complete the family-owned items due this week; new ones appear after each PPT.",
  "family:calendar":
    "Add the upcoming PPT to your personal calendar so nothing surprises you.",
  "family:meeting-prep":
    "Add the three questions your family wants answered at the next PPT.",
  "family:consent":
    "Review who has access and revoke anyone who no longer needs it.",
  "family:invite-team":
    "Invite the one advocate or coach who should be at the next PPT.",
  "family:student-profile":
    "Update strengths, interests, or supports if anything has changed this semester.",

  "educator:caseload":
    "Pick one student flagged for pending input and complete their missing readiness section.",
  "educator:readiness":
    "Open the student with the largest readiness gap and note one action for the next PPT.",
  "educator:pending-input":
    "Clear the two oldest pending-input items so their Pathway Reports can regenerate.",
  "educator:pathway-reports":
    "Review the report queued for the earliest PPT and approve or send back for edits.",
  "educator:meeting-prep":
    "Draft the agenda for your next PPT and share it with family 72 hours in advance.",
  "educator:case-notes":
    "Log a case note against the most recent readiness change so context stays in one place.",
  "educator:action-items":
    "Reassign any overdue action item that belongs to another role.",
  "educator:calendar":
    "Confirm PPT invitees for meetings in the next 14 days.",
  "educator:documents":
    "Request the missing evaluation you flagged in the readiness scorecard.",

  "school-admin:school-overview":
    "Open the caseload with the lowest completion and message the case manager.",
  "school-admin:team-access":
    "Audit who has editor access to Pathway Reports and revoke anyone off the team.",
  "school-admin:planning-status":
    "Reach out to case managers with plans overdue for annual review.",
  "school-admin:report-completion":
    "Post a plan for the two students whose reports are >30 days stale.",
  "school-admin:readiness-trends":
    "Message case managers whose readiness has slipped in the last 30 days.",
  "school-admin:resource-usage":
    "Feature one under-used resource in this month's staff meeting.",
  "school-admin:calendar":
    "Confirm room assignments for PPTs in the next two weeks.",
  "school-admin:support-needs":
    "Open the top support need and route it to the district for implementation help.",
  "school-admin:implementation":
    "Schedule the next PD block from the implementation checklist.",

  "district-admin:district-overview":
    "Open the school with the largest readiness gap and start an implementation review.",
  "district-admin:connected-schools":
    "Onboard the one school still marked pending activation.",
  "district-admin:school-progress":
    "Message the school with the slowest completion trend to offer PD support.",
  "district-admin:readiness-trend":
    "Compare this quarter to last quarter and note which domain is trending down.",
  "district-admin:implementation":
    "Schedule the next implementation milestone with the two lagging schools.",
  "district-admin:district-reports":
    "Export the current district report for your next board meeting.",
  "district-admin:service-gaps":
    "Escalate the top service gap and pair it with a partner match request.",

  "partner:partner-profile":
    "Update your program description and eligibility so students see accurate matches.",
  "partner:active-opportunities":
    "Refresh application deadlines for opportunities open in the next 30 days.",
  "partner:submitted-programs":
    "Respond to families who applied in the last 7 days.",
  "partner:application-windows":
    "Publish next season's application window so it appears in matched recommendations.",
  "partner:opportunity-management":
    "Archive the two opportunities whose dates have passed.",
  "partner:incentives":
    "Confirm participation incentives that expire in the next 60 days.",
  "partner:partner-resources":
    "Add one partner-facing guide the whole organization can share.",
};

function nextStepFallback(detail: BaseDetail): string {
  const focus = detail.connectsTo[0] || "the Pathway Report";
  return `Open ${detail.title} and pick one item to move forward this week — it will show up in ${focus} for the rest of the team.`;
}

// -------------------------------------------------------- Feeds-into
// derivations. Uses connectsTo unless the feature's Pathway relation
// says otherwise — e.g. reports don't "feed into" themselves.

function deriveFeedsInto(
  role: ExtendedDemoRole,
  detail: BaseDetail,
  relation: PathwayRelation,
): string[] {
  // Reports are consumed by the team, not "fed" further; show their consumers.
  if (relation === "reviews" || relation === "tracks") {
    const consumers = new Set<string>();
    for (const c of detail.connectsTo) consumers.add(c);
    if (role === "student" || role === "family") {
      consumers.add("Meeting Prep");
      consumers.add("Action Items");
    }
    if (role === "educator") {
      consumers.add("Case Notes");
      consumers.add("Meeting Prep");
    }
    return Array.from(consumers).slice(0, 4);
  }
  // Consent/support features "feed" trust rather than a data pipeline.
  if (relation === "supports") {
    return ["Pathway Report", "Sharing & Consent", ...detail.connectsTo].slice(0, 4);
  }
  // Default: what this feature updates downstream.
  const feeds = ["Pathway Report", ...detail.connectsTo.filter((c) => c !== "Pathway Report")];
  return Array.from(new Set(feeds)).slice(0, 4);
}

// -------------------------------------------------------- Public API

export function augmentFeature(
  role: ExtendedDemoRole,
  detail: BaseDetail,
): AugmentedFeature {
  const key = `${role}:${detail.id}` as const;
  const relation: PathwayRelation = RELATION_OVERRIDES[key] ?? "supports";
  const secondaryAction =
    SECONDARY_ACTION_OVERRIDES[key] ?? secondaryFallback(role);
  const nextStep = NEXT_STEP_OVERRIDES[key] ?? nextStepFallback(detail);
  const permissionNote = PERMISSION_NOTES[role];
  const feedsInto = deriveFeedsInto(role, detail, relation);
  const pathwayRelationCopy = RELATION_COPY[relation](detail.title, detail.connectsTo);
  return {
    secondaryAction,
    nextStep,
    permissionNote,
    feedsInto,
    pathwayRelation: relation,
    pathwayRelationCopy,
  };
}
