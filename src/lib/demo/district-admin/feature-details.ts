/**
 * Static demo fixtures for the District Admin dashboard feature drawers.
 *
 * Two fictional district profiles the demo can switch between:
 *   - Coastal Regional Educational Network (multi-district network, 24 schools)
 *   - Millbrook Public Schools (local district, 8 schools, ≤ 10 by contract)
 *
 * Aggregate-only — never surface individual student records, IEPs, or
 * Student Voice responses here.
 */

export type DistrictAdminFeatureId =
  | "district-overview"
  | "connected-schools"
  | "school-progress"
  | "readiness-trend"
  | "implementation"
  | "district-reports"
  | "service-gaps"
  | "partner-network";

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

export type DistrictProfileKey = "regional-network" | "local-district";

/* ─────────── REGIONAL: Coastal Regional (24 schools) ─────────── */

const REGIONAL: Record<DistrictAdminFeatureId, DistrictAdminFeatureDetail> = {
  "district-overview": {
    id: "district-overview",
    title: "District Overview",
    eyebrow: "Network Snapshot",
    summary:
      "12,480 students across 24 schools in a multi-district regional network — one aggregate view.",
    what: "See network-wide movement and jump to the school that most needs attention.",
    dataSource: "Roster rollups · Pathway Report versions · staff activity · aggregate readiness",
    primaryAction: { label: "Open District Overview", to: "/district/overview" },
    connectsTo: ["School-by-School Progress", "Readiness Trend", "Implementation"],
    stats: [
      { label: "Connected schools", value: "22 of 24" },
      { label: "IEP population", value: "1,836" },
      { label: "Reports complete", value: "66%" },
    ],
    rows: [
      { primary: "Coastal Regional Educational Network · Fall 2026", secondary: "22 of 24 schools onboarded · 6 counties", status: "ok" },
      { primary: "Next best step: unblock Franklin HS reports", secondary: "42 reports stuck on educator input", status: "warning" },
      { primary: "Readiness trend", secondary: "Self-advocacy +6 pts · employment flat", status: "ok" },
      { primary: "Family engagement", secondary: "62% of families active this month", status: "ok" },
    ],
    emptyHeadline: "Network data is being connected.",
    emptyBody:
      "Once schools onboard and staff activate, this snapshot shows aggregate planning, reports, and readiness.",
  },

  "connected-schools": {
    id: "connected-schools",
    title: "Connected Schools",
    eyebrow: "Every Building",
    summary:
      "24 schools spanning 6 counties — their admins, activation status, and current caseload load.",
    what: "Confirm every school has a lead admin, active staff, and a healthy caseload distribution.",
    dataSource: "Org directory · staff activation · caseload assignments",
    primaryAction: { label: "Open Schools", to: "/district/schools" },
    connectsTo: ["District Overview", "Implementation", "Service Gaps"],
    stats: [
      { label: "Onboarded", value: "22" },
      { label: "Pending", value: "2" },
      { label: "Needs admin", value: "1" },
    ],
    rows: [
      { primary: "Franklin HS (Coastal Central)", secondary: "Admin: Dr. Nguyen · 34 staff · 812 students", status: "ok" },
      { primary: "Lincoln HS (Coastal North)", secondary: "Admin: Ms. Alvarez · 28 staff · 604 students", status: "ok" },
      { primary: "Roosevelt MS (Coastal Central)", secondary: "Admin: Mr. Patel · 19 staff · 411 students", status: "ok" },
      { primary: "Kennedy HS (Coastal South)", secondary: "Admin needed · staff invited Sep 3", status: "warning" },
      { primary: "Adams Academy (Coastal North)", secondary: "Not yet onboarded", status: "muted" },
      { primary: "18 additional schools onboarded", secondary: "Spread across 6 counties", status: "ok" },
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
      "Planning status, report completion, and support-needs — compared across 24 schools. Aggregate only.",
    what: "Spot which schools are ahead, which are behind, and where to send coaching or resources.",
    dataSource: "Aggregate planning milestones · report versions · support flags",
    primaryAction: { label: "Compare Schools", to: "/district/progress" },
    connectsTo: ["Connected Schools", "Readiness Trend", "Service Gaps"],
    stats: [
      { label: "On pace", value: "16" },
      { label: "Behind", value: "5" },
      { label: "Critical", value: "3" },
    ],
    rows: [
      { primary: "Lincoln HS · 92% reports on pace", secondary: "Model building · share playbook regionally", status: "ok" },
      { primary: "Franklin HS · 64% on pace", secondary: "42 reports blocked · educator input", status: "warning" },
      { primary: "Roosevelt MS · 71% on pace", secondary: "Baseline year · on plan", status: "ok" },
      { primary: "Kennedy HS · 38% on pace", secondary: "Admin gap · needs coaching", status: "critical" },
      { primary: "Coastal South cluster average · 58% on pace", secondary: "Cross-school WBL scheduling issue", status: "warning" },
      { primary: "Coastal North cluster average · 79% on pace", secondary: "Strong specialist coverage", status: "ok" },
    ],
    emptyHeadline: "No progress data yet.",
    emptyBody:
      "Once schools begin drafting reports, per-building progress appears here for direct comparison.",
  },

  "readiness-trend": {
    id: "readiness-trend",
    title: "Readiness Trend",
    eyebrow: "Network Growth",
    summary:
      "Network-wide movement across employment, education, independent living, and self-advocacy — aggregated only.",
    what: "See where the network is growing and where cohort-level support is needed.",
    dataSource: "Student Voice rollups · educator input · aggregate scoring · no individual records",
    primaryAction: { label: "Open Readiness Trend", to: "/district/readiness-trends" },
    connectsTo: ["School-by-School Progress", "Service Gaps"],
    stats: [
      { label: "On track", value: "61%" },
      { label: "Needs support", value: "29%" },
      { label: "Critical", value: "10%" },
    ],
    rows: [
      { primary: "Self-advocacy · trending up", secondary: "+6 pts across 24 schools", status: "ok" },
      { primary: "Post-secondary education · strong", secondary: "All grade bands ≥ 70%", status: "ok" },
      { primary: "Employment readiness · flat", secondary: "Coastal South cohort at 54%", status: "warning" },
      { primary: "Independent living · watch", secondary: "Travel training gap across 6 south-cluster schools", status: "warning" },
    ],
    emptyHeadline: "Not enough data for network trends yet.",
    emptyBody:
      "As Student Voice and educator inputs accumulate network-wide, aggregate trends surface here.",
  },

  implementation: {
    id: "implementation",
    title: "Implementation Progress",
    eyebrow: "Rollout Status",
    summary:
      "Where each of the 24 schools is in the rollout — onboarding, active, mature — plus network-level milestones.",
    what: "Confirm each school is progressing and identify buildings that need launch help.",
    dataSource: "Onboarding checklist · staff activation · student connection events",
    primaryAction: { label: "Open Implementation", to: "/district/implementation" },
    connectsTo: ["Connected Schools", "School-by-School Progress"],
    stats: [
      { label: "Mature", value: "9" },
      { label: "Active", value: "10" },
      { label: "Onboarding", value: "5" },
    ],
    rows: [
      { primary: "Lincoln HS · mature", secondary: "All milestones complete · shares playbook", status: "ok" },
      { primary: "Franklin HS · active", secondary: "First cohort of reports published", status: "ok" },
      { primary: "Roosevelt MS · active", secondary: "Staff activated · roster complete", status: "ok" },
      { primary: "Kennedy HS · onboarding", secondary: "Admin gap · needs coaching call", status: "warning" },
      { primary: "Adams Academy · not started", secondary: "Kickoff scheduled Oct 8", status: "muted" },
      { primary: "Coastal South cluster · rollout coach needed", secondary: "3 buildings in early onboarding", status: "warning" },
    ],
    emptyHeadline: "Rollout hasn't started yet.",
    emptyBody:
      "Milestones appear as your network kicks off onboarding, staff activation, and student connection.",
  },

  "district-reports": {
    id: "district-reports",
    title: "District Reports",
    eyebrow: "Aggregate Output",
    summary:
      "1,204 completed, 468 in-progress, and 164 missing Pathway Reports across 22 connected schools.",
    what: "Track network-wide report output and surface completion blockers to fix them at the source.",
    dataSource: "Pathway Report versions · educator input queue · family upload queue",
    primaryAction: { label: "Open District Reports", to: "/district/reports" },
    connectsTo: ["School-by-School Progress", "Service Gaps"],
    stats: [
      { label: "Complete", value: "1,204" },
      { label: "In progress", value: "468" },
      { label: "Missing", value: "164" },
    ],
    rows: [
      { primary: "G12 · 84% complete", secondary: "Franklin & Kennedy behind", status: "warning" },
      { primary: "G11 · 61% complete", secondary: "On pace network-wide", status: "ok" },
      { primary: "G10 · 34% complete", secondary: "Baseline year · on plan", status: "muted" },
      { primary: "Blocker: educator input", secondary: "112 reports across 6 schools", status: "warning" },
      { primary: "Blocker: family document upload", secondary: "58 reports · outreach nudges sent", status: "warning" },
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
      "Programs, providers, or supports missing across a 6-county service area — surfaced by cluster and cohort.",
    what: "Route regional partner outreach, RFPs, or network-level programming where gaps are largest.",
    dataSource: "Aggregate readiness deficits · partner directory · resource-usage gaps",
    primaryAction: { label: "Open Service Gaps", to: "/district/service-gaps" },
    connectsTo: ["Readiness Trend", "Connected Schools"],
    stats: [
      { label: "Open gaps", value: "14" },
      { label: "Critical", value: "4" },
      { label: "Programs needed", value: "8" },
    ],
    rows: [
      { primary: "Employment: no WBL partner in Coastal South", secondary: "Affects 6 schools · G11–G12", status: "critical" },
      { primary: "Independent living: travel training", secondary: "Missing in 4 schools · G11 cohort", status: "warning" },
      { primary: "Adult services warm-handoff coordinator", secondary: "Only 2 buildings have one · scale network-wide", status: "warning" },
      { primary: "Bilingual family navigator", secondary: "Requested in 5 schools · 3 counties", status: "warning" },
      { primary: "Post-secondary tour capacity", secondary: "Under-served in Coastal South cluster", status: "warning" },
      { primary: "38 partners · 6 counties coverage", secondary: "Uneven distribution · south cluster thin", status: "warning" },
    ],
    emptyHeadline: "No service gaps flagged yet.",
    emptyBody:
      "Gaps surface as aggregate readiness deficits, unmet family requests, and unused resources accumulate.",
  },

  "partner-network": {
    id: "partner-network",
    title: "Partner Network",
    eyebrow: "Community Partners",
    summary:
      "District-wide partner coverage — verification status, referral flow, and gaps across 22 connected schools.",
    what: "See which partners serve which regions, verify status, and open the full Partner Network.",
    dataSource: "Verified partner directory · school-level MOUs · aggregate referral flow",
    primaryAction: { label: "Open Partner Network", to: "/partner-network" },
    connectsTo: ["School Progress", "Service Gaps", "Readiness Trend"],
    stats: [
      { label: "Total partners", value: "28" },
      { label: "Verified", value: "24" },
      { label: "Coverage gaps", value: "3" },
    ],
    rows: [
      { primary: "Oakwood Animal Rescue · 3-county footprint", secondary: "12 students placed across 4 schools", meta: "Verified", status: "ok" },
      { primary: "Capital CC · dual enrollment", secondary: "18 juniors enrolled district-wide", meta: "Verified", status: "ok" },
      { primary: "Youth Employment Services · regional", secondary: "Serves 8 schools", meta: "MOU active", status: "ok" },
      { primary: "Coverage gap · independent-living in northern schools", secondary: "3 schools without verified partner", meta: "Recruit", status: "critical" },
    ],
    emptyHeadline: "No partner coverage yet.",
    emptyBody:
      "As schools onboard partners and MOUs post, network coverage will show up here.",
  },
};

/* ─────────── LOCAL: Millbrook Public (8 schools) ─────────── */

const LOCAL: Record<DistrictAdminFeatureId, DistrictAdminFeatureDetail> = {
  "district-overview": {
    id: "district-overview",
    title: "District Overview",
    eyebrow: "District Snapshot",
    summary:
      "3,120 students across 8 schools in a local district — direct oversight, shared specialists.",
    what: "See district-wide movement and confirm every school's next action.",
    dataSource: "Roster rollups · Pathway Report versions · staff activity · aggregate readiness",
    primaryAction: { label: "Open District Overview", to: "/district/overview" },
    connectsTo: ["School-by-School Progress", "Readiness Trend", "Implementation"],
    stats: [
      { label: "Connected schools", value: "8 of 8" },
      { label: "IEP population", value: "412" },
      { label: "Reports complete", value: "72%" },
    ],
    rows: [
      { primary: "Millbrook Public Schools · Fall 2026", secondary: "All 8 schools onboarded · single-town district", status: "ok" },
      { primary: "Next best step: rebalance shared SLP caseload", secondary: "2 elementary buildings over capacity", status: "warning" },
      { primary: "Readiness trend", secondary: "Self-advocacy +4 pts · employment steady", status: "ok" },
      { primary: "Family engagement", secondary: "78% of families active this month", status: "ok" },
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
      "All 8 buildings in Millbrook — 1 HS, 2 MS, 5 ES — with admins, activation status, and caseload load.",
    what: "Confirm every school has a lead admin, active staff, and a healthy caseload distribution.",
    dataSource: "Org directory · staff activation · caseload assignments",
    primaryAction: { label: "Open Schools", to: "/district/schools" },
    connectsTo: ["District Overview", "Implementation", "Service Gaps"],
    stats: [
      { label: "Onboarded", value: "8" },
      { label: "Pending", value: "0" },
      { label: "Shared specialists", value: "4" },
    ],
    rows: [
      { primary: "Millbrook HS", secondary: "Admin: Ms. Whitaker · 14 staff · 640 students · 96 IEPs", status: "ok" },
      { primary: "Central MS", secondary: "Admin: Mr. Ruiz · 9 staff · 420 students · 54 IEPs", status: "ok" },
      { primary: "West MS", secondary: "Admin: Ms. Kaur · 8 staff · 380 students · 49 IEPs", status: "ok" },
      { primary: "Oakview ES", secondary: "Admin: Ms. Chen · 6 staff · 360 students · 42 IEPs", status: "ok" },
      { primary: "Meadow ES", secondary: "Admin: Mr. Jules · 5 staff · 340 students · 38 IEPs", status: "ok" },
      { primary: "3 additional elementary schools", secondary: "Total 980 students · 133 IEPs", status: "ok" },
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
      "Planning status, report completion, and support-needs across 8 buildings. Aggregate only.",
    what: "Spot which schools are ahead and where to redirect shared specialists.",
    dataSource: "Aggregate planning milestones · report versions · support flags",
    primaryAction: { label: "Compare Schools", to: "/district/progress" },
    connectsTo: ["Connected Schools", "Readiness Trend", "Service Gaps"],
    stats: [
      { label: "On pace", value: "6" },
      { label: "Behind", value: "2" },
      { label: "Critical", value: "0" },
    ],
    rows: [
      { primary: "Millbrook HS · 84% reports on pace", secondary: "Transition team fully staffed", status: "ok" },
      { primary: "Central MS · 78% on pace", secondary: "New case manager ramp period", status: "ok" },
      { primary: "West MS · 62% on pace", secondary: "Shared SLP capacity thin", status: "warning" },
      { primary: "Oakview ES · 88% on pace", secondary: "Model elementary building", status: "ok" },
      { primary: "Meadow ES · 68% on pace", secondary: "OT waitlist affecting 6 reports", status: "warning" },
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
      "District-wide movement across the four readiness domains — small-district resolution.",
    what: "See where students are growing and where shared district supports should focus.",
    dataSource: "Student Voice rollups · educator input · aggregate scoring · no individual records",
    primaryAction: { label: "Open Readiness Trend", to: "/district/readiness-trends" },
    connectsTo: ["School-by-School Progress", "Service Gaps"],
    stats: [
      { label: "On track", value: "70%" },
      { label: "Needs support", value: "22%" },
      { label: "Critical", value: "8%" },
    ],
    rows: [
      { primary: "Self-advocacy · trending up", secondary: "+4 pts district-wide", status: "ok" },
      { primary: "Employment readiness · steady", secondary: "HS cohort at 68% · local WBL partner strong", status: "ok" },
      { primary: "Independent living · watch", secondary: "West MS down 3 pts · travel training scarcity", status: "warning" },
      { primary: "Post-secondary education · strong", secondary: "HS at 79% · community college pathway well-worn", status: "ok" },
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
      "Where each of the 8 schools is in the rollout — onboarding, active, mature — plus district-level milestones.",
    what: "Confirm each school is progressing on the same term schedule.",
    dataSource: "Onboarding checklist · staff activation · student connection events",
    primaryAction: { label: "Open Implementation", to: "/district/implementation" },
    connectsTo: ["Connected Schools", "School-by-School Progress"],
    stats: [
      { label: "Mature", value: "5" },
      { label: "Active", value: "3" },
      { label: "Onboarding", value: "0" },
    ],
    rows: [
      { primary: "Millbrook HS · mature", secondary: "All milestones complete", status: "ok" },
      { primary: "Central MS · mature", secondary: "All milestones complete", status: "ok" },
      { primary: "Oakview ES · mature", secondary: "All milestones complete · elementary playbook", status: "ok" },
      { primary: "West MS · active", secondary: "First cohort of reports published", status: "ok" },
      { primary: "Meadow ES · active", secondary: "Staff activated · OT waitlist bottleneck", status: "warning" },
      { primary: "3 additional ES · mature or active", secondary: "All onboarded pre-launch", status: "ok" },
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
      "268 completed, 108 in-progress, and 36 missing Pathway Reports across 8 buildings.",
    what: "Track district-wide report output and surface completion blockers.",
    dataSource: "Pathway Report versions · educator input queue · family upload queue",
    primaryAction: { label: "Open District Reports", to: "/district/reports" },
    connectsTo: ["School-by-School Progress", "Service Gaps"],
    stats: [
      { label: "Complete", value: "268" },
      { label: "In progress", value: "108" },
      { label: "Missing", value: "36" },
    ],
    rows: [
      { primary: "HS · 82% complete", secondary: "22 reports in progress", status: "ok" },
      { primary: "MS · 68% complete", secondary: "West MS behind on educator input", status: "warning" },
      { primary: "ES · 64% complete", secondary: "OT waitlist blocking 9 reports", status: "warning" },
      { primary: "Blocker: OT input", secondary: "Owner: shared OT · 9 reports across 2 ES", status: "warning" },
      { primary: "Blocker: family document upload", secondary: "12 reports · direct outreach in progress", status: "warning" },
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
      "Programs, providers, or supports missing at the district level — small-district specialist capacity is the recurring theme.",
    what: "Route small-scale partner outreach or shared-specialist hiring where gaps are largest.",
    dataSource: "Aggregate readiness deficits · partner directory · resource-usage gaps",
    primaryAction: { label: "Open Service Gaps", to: "/district/service-gaps" },
    connectsTo: ["Readiness Trend", "Connected Schools"],
    stats: [
      { label: "Open gaps", value: "5" },
      { label: "Critical", value: "1" },
      { label: "Programs needed", value: "3" },
    ],
    rows: [
      { primary: "Shared OT capacity", secondary: "1 OT serving 5 elementary buildings · critical bottleneck", status: "critical" },
      { primary: "Independent living: travel training", secondary: "No local partner · HS cohort affected", status: "warning" },
      { primary: "Bilingual family navigator", secondary: "Requested in 3 schools", status: "warning" },
      { primary: "Post-secondary tour capacity", secondary: "1 college visit per year district-wide", status: "warning" },
      { primary: "9 local partners in directory", secondary: "Concentrated near town center", status: "warning" },
    ],
    emptyHeadline: "No service gaps flagged yet.",
    emptyBody:
      "Gaps surface as aggregate readiness deficits, unmet family requests, and unused resources accumulate.",
  },

  "partner-network": {
    id: "partner-network",
    title: "Partner Network",
    eyebrow: "Community Partners",
    summary:
      "Local-district partner coverage across 8 schools — MOUs, referrals, and shared specialist coordination.",
    what: "See which partners serve which Millbrook schools and open the full Partner Network.",
    dataSource: "Verified partner directory · MOU status · shared specialist roster",
    primaryAction: { label: "Open Partner Network", to: "/partner-network" },
    connectsTo: ["School Progress", "Service Gaps", "Readiness Trend"],
    stats: [
      { label: "Total partners", value: "11" },
      { label: "Verified", value: "10" },
      { label: "Coverage gaps", value: "1" },
    ],
    rows: [
      { primary: "Millbrook Public Library · workforce readiness", secondary: "All 8 schools referring", meta: "Verified", status: "ok" },
      { primary: "Regional CTE center · applied pathways", secondary: "4 schools enrolled", meta: "Verified", status: "ok" },
      { primary: "Local BRS office · pre-employment", secondary: "Shared across district", meta: "MOU active", status: "ok" },
      { primary: "Coverage gap · assistive-tech vendor", secondary: "1 school without verified partner", meta: "Recruit", status: "warning" },
    ],
    emptyHeadline: "No partner coverage yet.",
    emptyBody:
      "As Millbrook schools onboard partners and MOUs post, network coverage will show up here.",
  },
};

/* ─────────── Exports ─────────── */

export const DISTRICT_ADMIN_FEATURE_DETAILS_BY_DISTRICT: Record<
  DistrictProfileKey,
  Record<DistrictAdminFeatureId, DistrictAdminFeatureDetail>
> = {
  "regional-network": REGIONAL,
  "local-district": LOCAL,
};

/** Back-compat: default = regional network. */
export const DISTRICT_ADMIN_FEATURE_DETAILS: Record<
  DistrictAdminFeatureId,
  DistrictAdminFeatureDetail
> = REGIONAL;

export function getDistrictAdminFeatureDetails(
  districtId: DistrictProfileKey,
): Record<DistrictAdminFeatureId, DistrictAdminFeatureDetail> {
  return DISTRICT_ADMIN_FEATURE_DETAILS_BY_DISTRICT[districtId] ?? REGIONAL;
}

export const DISTRICT_ADMIN_FEATURE_ORDER: DistrictAdminFeatureId[] = [
  "district-overview",
  "connected-schools",
  "school-progress",
  "readiness-trend",
  "implementation",
  "district-reports",
  "service-gaps",
];

/* ─────────── Tile metadata per district ─────────── */

export type DistrictTileMeta = {
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  bullets: { label: string; value: string }[];
};

export const DISTRICT_ADMIN_TILE_META_BY_DISTRICT: Record<
  DistrictProfileKey,
  Partial<Record<DistrictAdminFeatureId, DistrictTileMeta>>
> = {
  "regional-network": {
    "district-overview": {
      status: "24 schools",
      tone: "default",
      bullets: [
        { label: "IEP population", value: "1,836" },
        { label: "Reports complete", value: "66%" },
      ],
    },
    "connected-schools": {
      status: "2 pending",
      tone: "warning",
      bullets: [
        { label: "Onboarded", value: "22" },
        { label: "Needs admin", value: "1" },
      ],
    },
    "school-progress": {
      status: "5 behind",
      tone: "warning",
      bullets: [
        { label: "On pace", value: "16" },
        { label: "Critical", value: "3" },
      ],
    },
    "readiness-trend": {
      status: "This term",
      tone: "success",
      bullets: [
        { label: "On track", value: "61%" },
        { label: "Needs support", value: "29%" },
      ],
    },
    implementation: {
      status: "5 onboarding",
      tone: "warning",
      bullets: [
        { label: "Mature", value: "9" },
        { label: "Active", value: "10" },
      ],
    },
    "district-reports": {
      status: "View",
      tone: "muted",
      bullets: [
        { label: "Complete", value: "1,204" },
        { label: "Missing", value: "164" },
      ],
    },
    "service-gaps": {
      status: "4 critical",
      tone: "critical",
      bullets: [
        { label: "Open gaps", value: "14" },
        { label: "Programs needed", value: "8" },
      ],
    },
  },
  "local-district": {
    "district-overview": {
      status: "8 schools",
      tone: "default",
      bullets: [
        { label: "IEP population", value: "412" },
        { label: "Reports complete", value: "72%" },
      ],
    },
    "connected-schools": {
      status: "All onboarded",
      tone: "success",
      bullets: [
        { label: "Onboarded", value: "8" },
        { label: "Shared specialists", value: "4" },
      ],
    },
    "school-progress": {
      status: "2 behind",
      tone: "warning",
      bullets: [
        { label: "On pace", value: "6" },
        { label: "Critical", value: "0" },
      ],
    },
    "readiness-trend": {
      status: "This term",
      tone: "success",
      bullets: [
        { label: "On track", value: "70%" },
        { label: "Needs support", value: "22%" },
      ],
    },
    implementation: {
      status: "3 active",
      tone: "success",
      bullets: [
        { label: "Mature", value: "5" },
        { label: "Active", value: "3" },
      ],
    },
    "district-reports": {
      status: "View",
      tone: "muted",
      bullets: [
        { label: "Complete", value: "268" },
        { label: "Missing", value: "36" },
      ],
    },
    "service-gaps": {
      status: "1 critical",
      tone: "warning",
      bullets: [
        { label: "Open gaps", value: "5" },
        { label: "Programs needed", value: "3" },
      ],
    },
  },
};
