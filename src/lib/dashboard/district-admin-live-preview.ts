import type { DistrictDashboard, DistrictOrg } from "@/lib/district-admin.functions";
import type {
  DistrictAdminFeatureDetail,
  DistrictAdminFeatureId,
} from "@/lib/demo/district-admin/feature-details";

export type DistrictAdminLivePreview = {
  district: DistrictOrg;
  details: Record<DistrictAdminFeatureId, DistrictAdminFeatureDetail>;
};

export function buildDistrictAdminLivePreview(
  data: DistrictDashboard,
  selectedDistrictId?: string,
): DistrictAdminLivePreview | null {
  const district =
    data.districts.find((item) => item.id === selectedDistrictId) ?? data.districts[0];
  if (!district) return null;

  const metrics = data.metrics;
  const schoolsNeedingFollowup = data.schools.filter((school) => school.needs_followup);
  const detail = (
    id: DistrictAdminFeatureId,
    value: Omit<DistrictAdminFeatureDetail, "id">,
  ): DistrictAdminFeatureDetail => ({ id, ...value });
  const schoolRows = data.schools.slice(0, 8).map((school) => ({
    primary: school.name,
    secondary: `${school.students_count} students · ${school.reports_count} report records · ${school.active_members} active staff`,
    meta: school.needs_followup ? "Follow up" : "Current",
    status: school.needs_followup ? ("warning" as const) : ("ok" as const),
  }));

  const details: Record<DistrictAdminFeatureId, DistrictAdminFeatureDetail> = {
    "district-overview": detail("district-overview", {
      title: "District Overview",
      eyebrow: "Live Aggregate Snapshot",
      summary: `Current authorized district aggregates for ${district.name}; no student names or documents.`,
      what: "Review connected schools, students, staff, and Pathway Report coverage without opening individual records.",
      dataSource: "District and school memberships · aggregate roster and report counts",
      primaryAction: { label: "Open District Overview", to: "/district/overview" },
      connectsTo: ["Connected Schools", "School Progress", "District Reports"],
      stats: [
        { label: "Schools", value: String(metrics.schools_count) },
        { label: "Students", value: String(metrics.students_count) },
        { label: "With report", value: `${metrics.pct_with_report}%` },
      ],
      rows: [
        {
          primary: district.name,
          secondary:
            [district.city, district.state].filter(Boolean).join(", ") || "Location not recorded",
          meta: district.verified_status || "Status unavailable",
          status: district.verified_status === "verified" ? "ok" : "muted",
        },
        {
          primary: `${metrics.schools_count} connected school${metrics.schools_count === 1 ? "" : "s"}`,
          secondary: `${metrics.students_count} students represented in aggregate only.`,
          status: metrics.schools_count > 0 ? "ok" : "warning",
        },
        {
          primary: `${schoolsNeedingFollowup.length} school${schoolsNeedingFollowup.length === 1 ? "" : "s"} need follow-up`,
          secondary: `${metrics.open_actions} open district action${metrics.open_actions === 1 ? "" : "s"}.`,
          status: schoolsNeedingFollowup.length > 0 ? "warning" : "ok",
        },
      ],
      emptyHeadline: "No district activity is available yet.",
      emptyBody: "Connect schools to populate the district snapshot.",
    }),
    "connected-schools": detail("connected-schools", {
      title: "Connected Schools",
      eyebrow: "Live School Roster",
      summary: "Authorized school-level aggregates and activation signals across the district.",
      what: "Review school onboarding and open the full workspace for administration.",
      dataSource: "District-to-school relationships · aggregate memberships and roster counts",
      primaryAction: { label: "Open Schools", to: "/district/schools" },
      connectsTo: ["School Progress", "Implementation Progress"],
      stats: [
        { label: "Schools", value: String(metrics.schools_count) },
        { label: "School admins", value: String(metrics.school_admins) },
        { label: "Educators", value: String(metrics.educators) },
      ],
      rows: schoolRows,
      emptyHeadline: "No schools are connected.",
      emptyBody: "Connect a school to begin district implementation tracking.",
    }),
    "school-progress": detail("school-progress", {
      title: "School-by-School Progress",
      eyebrow: "Aggregate School Comparison",
      summary: "School-level roster, report, and follow-up signals without student PII.",
      what: "Compare authorized aggregate progress and identify schools needing support.",
      dataSource: "Per-school aggregate staff, student, report, and open-action counts",
      primaryAction: { label: "Compare Schools", to: "/district/progress" },
      connectsTo: ["Connected Schools", "Service Gaps"],
      stats: [
        {
          label: "On track",
          value: String(Math.max(0, metrics.schools_count - schoolsNeedingFollowup.length)),
        },
        { label: "Follow-up", value: String(schoolsNeedingFollowup.length) },
        { label: "Open actions", value: String(metrics.open_actions) },
      ],
      rows: schoolRows,
      emptyHeadline: "No school progress is available.",
      emptyBody: "Progress appears after schools connect staff, students, and planning activity.",
    }),
    "readiness-trend": detail("readiness-trend", {
      title: "Readiness Trend",
      eyebrow: "District Planning Signals",
      summary:
        "Current district-wide coverage signals available in the authorized aggregate response.",
      what: "Use the full trend workspace for longitudinal analysis while preserving student privacy.",
      dataSource: "Aggregate reports, goals, and action-item coverage; no individual responses",
      primaryAction: { label: "Open Readiness Trend", to: "/district/readiness-trends" },
      connectsTo: ["District Reports", "Service Gaps"],
      stats: [
        { label: "With report", value: `${metrics.pct_with_report}%` },
        { label: "With goals", value: `${metrics.pct_with_goals}%` },
        { label: "With actions", value: `${metrics.pct_with_actions}%` },
      ],
      rows: [
        {
          primary: "Pathway Report coverage",
          secondary: `${metrics.pct_with_report}% of connected students`,
          status: metrics.pct_with_report >= 75 ? "ok" : "warning",
        },
        {
          primary: "Goal coverage",
          secondary: `${metrics.pct_with_goals}% of connected students`,
          status: metrics.pct_with_goals >= 75 ? "ok" : "warning",
        },
        {
          primary: "Action-item coverage",
          secondary: `${metrics.pct_with_actions}% of connected students`,
          status: metrics.pct_with_actions >= 75 ? "ok" : "warning",
        },
      ],
      emptyHeadline: "No aggregate readiness signals are available.",
      emptyBody: "Signals appear after connected schools begin transition planning.",
    }),
    implementation: detail("implementation", {
      title: "Implementation Progress",
      eyebrow: "District Adoption",
      summary: "Live school connection, staffing, and follow-up signals across the district.",
      what: "Identify onboarding gaps and direct support to schools needing follow-up.",
      dataSource: "Connected schools · membership status · aggregate action counts",
      primaryAction: { label: "Open Implementation", to: "/district/implementation" },
      connectsTo: ["Connected Schools", "School Progress"],
      stats: [
        { label: "Schools", value: String(metrics.schools_count) },
        { label: "Follow-up", value: String(schoolsNeedingFollowup.length) },
        { label: "Open actions", value: String(metrics.open_actions) },
      ],
      rows: schoolRows,
      emptyHeadline: "District implementation has not started.",
      emptyBody: "Connect schools to begin implementation tracking.",
    }),
    "district-reports": detail("district-reports", {
      title: "District Reports",
      eyebrow: "Aggregate Report Coverage",
      summary: "Current Pathway Report counts and coverage across connected schools.",
      what: "Open district reports for authorized aggregate analysis and exports.",
      dataSource: "Aggregate Pathway Report counts by connected school",
      primaryAction: { label: "Open Reports", to: "/district/reports" },
      connectsTo: ["School Progress", "Readiness Trend"],
      stats: [
        { label: "Report records", value: String(metrics.reports_count) },
        { label: "Students", value: String(metrics.students_count) },
        { label: "With report", value: `${metrics.pct_with_report}%` },
      ],
      rows: schoolRows.map((row) => ({ ...row, meta: undefined })),
      emptyHeadline: "No district report records are available.",
      emptyBody: "Aggregate reports appear after connected schools publish Pathway Reports.",
    }),
    "service-gaps": detail("service-gaps", {
      title: "Service Gaps",
      eyebrow: "Aggregate Follow-up Signals",
      summary: "Schools and open actions currently flagged for district follow-up.",
      what: "Use current aggregate signals to prioritize district support without exposing student records.",
      dataSource: "Per-school follow-up flag · open-action counts",
      primaryAction: { label: "Open Service Gaps", to: "/district/service-gaps" },
      connectsTo: ["School Progress", "Implementation Progress"],
      stats: [
        { label: "Schools flagged", value: String(schoolsNeedingFollowup.length) },
        { label: "Open actions", value: String(metrics.open_actions) },
        { label: "Schools", value: String(metrics.schools_count) },
      ],
      rows:
        schoolsNeedingFollowup.length > 0
          ? schoolsNeedingFollowup.map((school) => ({
              primary: school.name,
              secondary: `${school.open_actions} open action${school.open_actions === 1 ? "" : "s"} · ${school.pending_members} pending staff`,
              status: "warning" as const,
            }))
          : [
              {
                primary: "No schools are currently flagged for aggregate follow-up.",
                secondary: "Open the full tool to review service coverage details.",
                status: "ok" as const,
              },
            ],
      emptyHeadline: "No aggregate service-gap signals are available.",
      emptyBody: "Service gaps appear as connected schools record needs and open actions.",
    }),
    "partner-network": detail("partner-network", {
      title: "Partner Network",
      eyebrow: "District Community Coverage",
      summary: "Open the Partner Network for verified programs and district-wide opportunities.",
      what: "Search community options without inventing district-specific coverage totals.",
      dataSource:
        "Partner directory; district-specific counts are not included in this hub snapshot",
      primaryAction: { label: "Open Partner Network", to: "/partner-network" },
      connectsTo: ["Service Gaps", "Readiness Trend"],
      rows: [
        {
          primary: "District-specific partner totals are not available in this snapshot.",
          secondary: "Open the directory to search current verified partners and opportunities.",
          status: "muted",
        },
      ],
      emptyHeadline: "No partner coverage total is available.",
      emptyBody: "Use the Partner Network to search verified community options.",
    }),
  };

  return { district, details };
}
