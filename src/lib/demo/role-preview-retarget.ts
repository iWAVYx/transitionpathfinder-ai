import {
  resolveDemoFeatureRoute,
  type DemoRole,
} from "@/lib/demo/feature-routes";
import type { DemoRoleId } from "@/lib/demo/role-previews";

/**
 * Title → featureId map per demo role. Legacy `DemoToolPreviewCard`s on
 * `/demo/<role>` pages used to CTA into a handful of generic tour URLs
 * (`/demo/voice`, `/demo/plan`, `/demo/hub`, `/demo/report`, etc). This
 * map lets the shell re-target each card to its dedicated demo feature
 * page (`/demo/feature/<role>/<featureId>`), so the demo mirrors the
 * signed-in dashboard tile-per-feature contract.
 *
 * Cards whose title has no entry keep their original CTA (e.g. "Family
 * Priorities", "Directory Reach") — safer than dead-ending onto a
 * default page.
 */
const TITLE_TO_FEATURE_ID: Record<DemoRoleId, Record<string, string>> = {
  student: {
    "Student Voice": "student-voice",
    "My Pathway": "pathway-report",
    "Next Action": "action-items",
    "Saved Resources": "saved-resources",
    "Meeting Prep": "meeting-prep",
    "Upcoming Meetings": "calendar",
    "Pathway Report — Student View": "pathway-report",
  },
  family: {
    "Connected Student": "student-profile",
    Documents: "documents",
    "Family Priorities": "student-profile",
    "Pathway Report — Family View": "pathway-report",
    "Meeting Prep": "meeting-prep",
    "Action Items": "action-items",
    "Sharing & Consent": "consent",
    "Recommended Resources": "recommended-resources",
  },
  educator: {
    "Caseload Snapshot": "caseload",
    "Readiness Signals": "readiness",
    "Pending Educator Input": "pending-input",
    "Pathway Reports": "pathway-reports",
    "Meeting Prep": "meeting-prep",
    "Case Notes": "case-notes",
    "Action Items": "action-items",
    Calendar: "calendar",
  },
  "school-admin": {
    "School Overview": "school-overview",
    "Planning Status": "planning-status",
    "Team Activity": "team-access",
    "Report Completion": "report-completion",
    "Readiness Trends": "readiness-trends",
    "Resource Usage": "resource-usage",
    "Support Needs": "support-needs",
  },
  "district-admin": {
    "District Overview": "district-overview",
    "Connected Schools": "connected-schools",
    "School-By-School Progress": "school-progress",
    "Readiness Trend": "readiness-trend",
    "Implementation Progress": "implementation",
    "District Reports": "district-reports",
    "Service Gaps": "service-gaps",
  },
  partner: {
    "Partner Profile": "partner-profile",
    "Active Opportunities": "active-opportunities",
    "Submitted Programs": "submitted-programs",
    "Upcoming Deadlines": "application-windows",
    "Opportunity Management": "opportunity-management",
    PartnerForward: "incentives",
    "Partner Resources": "partner-resources",
  },
};

type Cta = { label: string; to: string };

export function retargetToolPreviewCta(
  roleId: DemoRoleId,
  title: string,
  cta: Cta | undefined,
): Cta | undefined {
  if (!cta) return cta;
  const featureId = TITLE_TO_FEATURE_ID[roleId]?.[title];
  if (!featureId) return cta;
  const to = resolveDemoFeatureRoute(roleId as DemoRole, featureId);
  return { ...cta, to };
}
