/**
 * Static demo fixtures for the District Admin dashboard feature drawers
 * and the /demo/district-admin preview. Aggregate-only — never surface
 * individual student records, IEPs, or Student Voice responses here.
 * Fictional district: Riverbend Public Schools.
 */

export type DistrictAdminFeatureId =
  | "district-overview"
  | "connected-schools"
  | "school-progress"
  | "readiness-trend"
  | "implementation"
  | "district-reports"
  | "service-gaps";

export type FeatureBullet = { label: string; value?: string; hint?: string };

export type FeatureRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  status?: "ok" | "warning" | "critical" | "muted";
};

export type DistrictAdminFeatureDetail = {
  id: DistrictAdminFeatureId;
  title: string;
  eyebrow: string;
  summary: string;
  what: string;
  dataSource: string;
  primaryAction: { label: string; to: string };
  connectsTo: string[];
  rows: FeatureRow[];
  stats?: FeatureBullet[];
  emptyHeadline: string;
  emptyBody: string;
};

export const DISTRICT_ADMIN_FEATURE_DETAILS: Record<
  DistrictAdminFeatureId,
  DistrictAdminFeatureDetail
> = {
  "district-overview": {
    id: "district-overview",
    title: "District Overview",
    eyebrow: "District Snapshot",
    summary:
      "Students, schools, staff, and Pathway Report activity across every connected building — one aggregate view.",
    what: "See district-wide movement and jump to the school that most needs attention.",
    dataSource: "Roster rollups · Pathway Report versions · staff activity · aggregate readiness",
    primaryAction: { label: "Open District Overview", to: "/district/overview" },
    connectsTo: ["School-by-School Progress", "Readiness Trend", "Implementation"],
    stats: [
      { label: "Connected schools", value: "12" },
      { label: "Students", value: "1,842" },
      { label: "Reports complete", value: "58%" },
    ],
    rows: [
      { primary: "Riverbend Public Schools · Fall 2026", secondary: "12 of 14 schools onboarded", status: "ok" },
      { primary: "Next best step: unblock Franklin HS reports", secondary: "18 reports stuck on educator input", status: "warning" },
      { primary: "Readiness trend", secondary: "Self-advocacy +7 pts · Employment flat", status: "ok" },
      { primary: "Family engagement", secondary: "68% of families active this month", status: "ok" },
    ],
    emptyHeadline: "District data is being connected.",
    emptyBody:
      "Once schools onboard and staff activate, this snapshot shows aggregate planning, reports, and readiness.",
  },

  "connected-schools": {
    id: "connected-schools",
    title: "Connected Schools",
    eyebrow: "Every Building",
    summary:
      "Every school onboarded to your district, its admin, activation status, and current caseload load.",
    what: "Confirm every school has a lead admin, active staff, and a healthy caseload distribution.",
    dataSource: "Org directory · staff activation · caseload assignments",
    primaryAction: { label: "Open Schools", to: "/district/schools" },
    connectsTo: ["District Overview", "Implementation", "Service Gaps"],
    stats: [
      { label: "Onboarded", value: "12" },
      { label: "Pending", value: "2" },
      { label: "Needs admin", value: "1" },
    ],
    rows: [
      { primary: "Franklin HS", secondary: "Admin: Dr. Nguyen · 14 staff · 312 students", status: "ok" },
      { primary: "Lincoln HS", secondary: "Admin: Ms. Alvarez · 11 staff · 268 students", status: "ok" },
      { primary: "Roosevelt MS", secondary: "Admin: Mr. Patel · 9 staff · 214 students", status: "ok" },
      { primary: "Kennedy HS", secondary: "Admin needed · staff invited Sep 3", status: "warning" },
      { primary: "Adams Academy", secondary: "Not yet onboarded", status: "muted" },
    ],
    emptyHeadline: "No schools connected yet.",
    emptyBody:
      "Invite each school's admin to onboard. They'll appear here with activation status and caseload load.",
  },

  "school-progress": {
    id: "school-progress",
    title: "School-by-School Progress",
    eyebrow: "Compare Buildings",
    summary:
      "Planning status, report completion, and support-needs — compared across every school. Aggregate only.",
    what: "Spot which schools are ahead, which are behind, and where to send coaching or resources.",
    dataSource: "Aggregate planning milestones · report versions · support flags",
    primaryAction: { label: "Compare Schools", to: "/district/progress" },
    connectsTo: ["Connected Schools", "Readiness Trend", "Service Gaps"],
    stats: [
      { label: "On pace", value: "8" },
      { label: "Behind", value: "3" },
      { label: "Critical", value: "1" },
    ],
    rows: [
      { primary: "Lincoln HS · 92% reports on pace", secondary: "Model building · share playbook", status: "ok" },
      { primary: "Franklin HS · 68% on pace", secondary: "18 reports blocked · educator input", status: "warning" },
      { primary: "Roosevelt MS · 71% on pace", secondary: "Baseline year · on plan", status: "ok" },
      { primary: "Kennedy HS · 42% on pace", secondary: "Admin gap · needs coaching", status: "critical" },
      { primary: "Jefferson HS · 78% on pace", secondary: "Growing steadily", status: "ok" },
    ],
    emptyHeadline: "No progress data yet.",
    emptyBody:
      "Once schools begin drafting reports, per-building progress appears here for direct comparison.",
  },

  "readiness-trend": {
    id: "readiness-trend",
    title: "Readiness Trend",
    eyebrow: "District Growth",
    summary:
      "District-wide movement across employment, education, independent living, and self-advocacy — aggregated only.",
    what: "See where the district is growing and where cohort-level support is needed.",
    dataSource: "Student Voice rollups · educator input · aggregate scoring · no individual records",
    primaryAction: { label: "Open Readiness Trend", to: "/district/readiness-trends" },
    connectsTo: ["School-by-School Progress", "Service Gaps"],
    stats: [
      { label: "On track", value: "64%" },
      { label: "Needs support", value: "27%" },
      { label: "Critical", value: "9%" },
    ],
    rows: [
      { primary: "Self-advocacy · trending up", secondary: "+7 pts across district", status: "ok" },
      { primary: "Post-secondary education · strong", secondary: "All grade bands ≥ 71%", status: "ok" },
      { primary: "Employment readiness · flat", secondary: "G12 cohort at 58%", status: "warning" },
      { primary: "Independent living · watch", secondary: "G11 down 3 pts vs last term", status: "warning" },
    ],
    emptyHeadline: "Not enough data for district trends yet.",
    emptyBody:
      "As Student Voice and educator inputs accumulate district-wide, aggregate trends surface here.",
  },

  implementation: {
    id: "implementation",
    title: "Implementation Progress",
    eyebrow: "Rollout Status",
    summary:
      "Where each school is in the rollout — onboarding, active, mature — plus district-level milestones.",
    what: "Confirm each school is progressing and identify buildings that need launch help.",
    dataSource: "Onboarding checklist · staff activation · student connection events",
    primaryAction: { label: "Open Implementation", to: "/district/implementation" },
    connectsTo: ["Connected Schools", "School-by-School Progress"],
    stats: [
      { label: "Mature", value: "5" },
      { label: "Active", value: "6" },
      { label: "Onboarding", value: "3" },
    ],
    rows: [
      { primary: "Lincoln HS · mature", secondary: "All milestones complete · shares playbook", status: "ok" },
      { primary: "Franklin HS · active", secondary: "First cohort of reports published", status: "ok" },
      { primary: "Roosevelt MS · active", secondary: "Staff activated · roster complete", status: "ok" },
      { primary: "Kennedy HS · onboarding", secondary: "Admin gap · needs coaching call", status: "warning" },
      { primary: "Adams Academy · not started", secondary: "Kickoff scheduled Oct 8", status: "muted" },
    ],
    emptyHeadline: "Rollout hasn't started yet.",
    emptyBody:
      "Milestones appear as your district kicks off onboarding, staff activation, and student connection.",
  },

  "district-reports": {
    id: "district-reports",
    title: "District Reports",
    eyebrow: "Aggregate Output",
    summary:
      "Aggregate Pathway Report generation, outcomes, and completion — sliced by school and grade band. No individual records.",
    what: "Track district-wide report output and surface completion blockers to fix them at the source.",
    dataSource: "Pathway Report versions · educator input queue · family upload queue",
    primaryAction: { label: "Open District Reports", to: "/district/reports" },
    connectsTo: ["School-by-School Progress", "Service Gaps"],
    stats: [
      { label: "Complete", value: "1,070" },
      { label: "In progress", value: "612" },
      { label: "Missing", value: "160" },
    ],
    rows: [
      { primary: "G12 · 88% complete", secondary: "Franklin & Kennedy behind", status: "warning" },
      { primary: "G11 · 62% complete", secondary: "On pace district-wide", status: "ok" },
      { primary: "G10 · 34% complete", secondary: "Baseline year · on plan", status: "muted" },
      { primary: "Blocker: educator input", secondary: "44 reports across 3 schools", status: "warning" },
      { primary: "Blocker: family document upload", secondary: "28 reports · outreach nudges sent", status: "warning" },
    ],
    emptyHeadline: "No reports drafted yet.",
    emptyBody:
      "District report output appears once schools begin publishing first drafts of Pathway Reports.",
  },

  "service-gaps": {
    id: "service-gaps",
    title: "Service Gaps",
    eyebrow: "What's Missing Where",
    summary:
      "Programs, providers, or supports missing where students need them — surfaced by cohort and geography.",
    what: "Route new partner outreach, RFPs, or district-level programming where gaps are largest.",
    dataSource: "Aggregate readiness deficits · partner directory · resource-usage gaps",
    primaryAction: { label: "Open Service Gaps", to: "/district/service-gaps" },
    connectsTo: ["Readiness Trend", "Connected Schools"],
    stats: [
      { label: "Open gaps", value: "9" },
      { label: "Critical", value: "3" },
      { label: "Programs needed", value: "5" },
    ],
    rows: [
      { primary: "Employment: no WBL partner in north cluster", secondary: "Affects 3 schools · G11–G12", status: "critical" },
      { primary: "Independent living: travel training", secondary: "Missing in 2 schools · G11 cohort", status: "warning" },
      { primary: "Adult services warm-handoff coordinator", secondary: "Only 1 building has one · scale district-wide", status: "warning" },
      { primary: "Bilingual family navigator", secondary: "Requested in 2 schools", status: "warning" },
      { primary: "Post-secondary tour capacity", secondary: "Under-served in south cluster", status: "warning" },
    ],
    emptyHeadline: "No service gaps flagged yet.",
    emptyBody:
      "Gaps surface as aggregate readiness deficits, unmet family requests, and unused resources accumulate.",
  },
};

export const DISTRICT_ADMIN_FEATURE_ORDER: DistrictAdminFeatureId[] = [
  "district-overview",
  "connected-schools",
  "school-progress",
  "readiness-trend",
  "implementation",
  "district-reports",
  "service-gaps",
];
