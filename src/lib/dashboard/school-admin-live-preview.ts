import type { SchoolDashboard, SchoolOrg } from "@/lib/school-admin.functions";
import type {
  SchoolAdminFeatureDetail,
  SchoolAdminFeatureId,
} from "@/lib/demo/school-admin/feature-details";

export type SchoolAdminLivePreview = {
  organization: SchoolOrg;
  details: Record<SchoolAdminFeatureId, SchoolAdminFeatureDetail>;
};

function percent(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function countByGrade(data: SchoolDashboard) {
  const counts = new Map<string, number>();
  for (const student of data.students) {
    const grade = student.grade_band?.trim() || "Grade not recorded";
    counts.set(grade, (counts.get(grade) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export function buildSchoolAdminLivePreview(
  data: SchoolDashboard,
  selectedOrgId?: string,
): SchoolAdminLivePreview | null {
  const organization = data.orgs.find((org) => org.id === selectedOrgId) ?? data.orgs[0];
  if (!organization) return null;

  const metrics = data.metrics;
  const staffActivation = percent(metrics.active_members, metrics.total_members);
  const reportCoverage = percent(metrics.reports_count, metrics.students_count);
  const gradeRows = countByGrade(data).map(([grade, count]) => ({
    primary: `${grade} · ${count} student${count === 1 ? "" : "s"}`,
    secondary: "Authorized roster count; no student names or documents shown.",
    status: "muted" as const,
  }));
  const staffRows = [
    {
      primary: `${metrics.active_members} active staff member${metrics.active_members === 1 ? "" : "s"}`,
      secondary: `${staffActivation}% of ${metrics.total_members} connected staff are active.`,
      status: metrics.pending_members > 0 ? ("warning" as const) : ("ok" as const),
    },
    ...(metrics.pending_members > 0
      ? [
          {
            primary: `${metrics.pending_members} invitation${metrics.pending_members === 1 ? "" : "s"} pending`,
            secondary: "Open Team / Staff Access to review and resend invitations.",
            status: "warning" as const,
          },
        ]
      : []),
  ];

  const detail = (
    id: SchoolAdminFeatureId,
    value: Omit<SchoolAdminFeatureDetail, "id">,
  ): SchoolAdminFeatureDetail => ({ id, ...value });

  const details: Record<SchoolAdminFeatureId, SchoolAdminFeatureDetail> = {
    "school-overview": detail("school-overview", {
      title: "School Overview",
      eyebrow: "Live Building Snapshot",
      summary: `Current authorized aggregate data for ${organization.name}.`,
      what: "Review connected students, active staff, report records, and the next operational gaps without opening private student documents.",
      dataSource: "Authorized organization roster · staff memberships · Pathway Report counts",
      primaryAction: { label: "Open School Overview", to: "/school/overview" },
      connectsTo: ["Report Completion", "Team Access", "Implementation Progress"],
      stats: [
        { label: "Students", value: String(metrics.students_count) },
        { label: "Active staff", value: String(metrics.active_members) },
        { label: "Report records", value: String(metrics.reports_count) },
      ],
      rows: [
        {
          primary: organization.name,
          secondary:
            [organization.city, organization.state].filter(Boolean).join(", ") ||
            "Location not recorded",
          meta: organization.verified_status || "Status unavailable",
          status: organization.verified_status === "verified" ? "ok" : "muted",
        },
        ...staffRows,
        {
          primary: `${metrics.students_count} connected student${metrics.students_count === 1 ? "" : "s"}`,
          secondary: `${metrics.reports_count} Pathway Report record${metrics.reports_count === 1 ? "" : "s"} currently visible to this school scope.`,
          status: metrics.students_count > 0 && metrics.reports_count === 0 ? "warning" : "ok",
        },
      ],
      emptyHeadline: "No school activity is available yet.",
      emptyBody: "Connect staff and students to populate the building snapshot.",
    }),
    "team-access": detail("team-access", {
      title: "Team / Staff Access",
      eyebrow: "Live Staff Access",
      summary: "Authorized membership counts and pending invitations for this school.",
      what: "Review active access, resolve pending invitations, and manage school roles.",
      dataSource: "Organization memberships · invitation status",
      primaryAction: { label: "Manage Staff", to: "/school/team" },
      connectsTo: ["School Overview", "Implementation Progress"],
      stats: [
        { label: "Active", value: String(metrics.active_members) },
        { label: "Pending", value: String(metrics.pending_members) },
        { label: "Total", value: String(metrics.total_members) },
      ],
      rows: staffRows,
      emptyHeadline: "No staff have been connected.",
      emptyBody: "Invite authorized school staff to begin coordinating implementation.",
    }),
    "planning-status": detail("planning-status", {
      title: "Student Planning Status",
      eyebrow: "Aggregate Roster View",
      summary:
        "Current roster counts grouped by recorded grade band, without student names or private records.",
      what: "Use the full planning workspace for authorized follow-up after reviewing this aggregate glance.",
      dataSource: "Authorized school roster · grade-band fields",
      primaryAction: { label: "Open Planning Status", to: "/school/planning-status" },
      connectsTo: ["Report Completion", "Team Access"],
      stats: [
        { label: "Students", value: String(metrics.students_count) },
        { label: "Grade groups", value: String(gradeRows.length) },
        { label: "Report records", value: String(metrics.reports_count) },
      ],
      rows: gradeRows,
      emptyHeadline: "No students are connected to this school.",
      emptyBody: "Connect or import the authorized roster to view planning status.",
    }),
    "report-completion": detail("report-completion", {
      title: "Report Completion",
      eyebrow: "Live Report Coverage",
      summary: "A current count of Pathway Report records visible within this school scope.",
      what: "Open the report workspace to review authorized report status and follow up on gaps.",
      dataSource: "RLS-scoped Pathway Report counts · authorized school roster",
      primaryAction: { label: "Open Reports", to: "/school/reports" },
      connectsTo: ["Planning Status", "School Overview"],
      stats: [
        { label: "Report records", value: String(metrics.reports_count) },
        { label: "Students", value: String(metrics.students_count) },
        { label: "Coverage signal", value: `${reportCoverage}%` },
      ],
      rows: [
        {
          primary: `${metrics.reports_count} Pathway Report record${metrics.reports_count === 1 ? "" : "s"}`,
          secondary:
            "Counts may include report versions; open the full tool for student-level authorized status.",
          status: metrics.reports_count > 0 ? "ok" : "warning",
        },
      ],
      emptyHeadline: "No report records are visible yet.",
      emptyBody: "Reports will appear after authorized teams begin the Pathway Report workflow.",
    }),
    "readiness-trends": detail("readiness-trends", {
      title: "Readiness Trends",
      eyebrow: "Aggregate Trend Workspace",
      summary:
        "Open the full tool for school-level readiness trends when enough authorized data is available.",
      what: "Review aggregate readiness movement without exposing individual responses.",
      dataSource:
        "Authorized aggregate readiness signals; not included in the hub snapshot response",
      primaryAction: { label: "Open Readiness Trends", to: "/school/readiness-trends" },
      connectsTo: ["Planning Status", "Support Needs"],
      stats: [{ label: "Students in scope", value: String(metrics.students_count) }],
      rows: [
        {
          primary: "Trend details are available in the full readiness workspace.",
          secondary:
            "This hub does not invent percentages when no aggregate trend payload is present.",
          status: "muted",
        },
      ],
      emptyHeadline: "No aggregate readiness trend is available.",
      emptyBody: "Readiness trends appear after sufficient authorized planning signals exist.",
    }),
    "resource-usage": detail("resource-usage", {
      title: "Resource Usage",
      eyebrow: "Resource Engagement",
      summary: "Open the full tool for authorized resource engagement and gap analysis.",
      what: "See which resources are reaching staff and families once usage analytics are available.",
      dataSource: "Resource engagement analytics; not included in the hub snapshot response",
      primaryAction: { label: "Open Resource Usage", to: "/school/resource-usage" },
      connectsTo: ["Readiness Trends", "Support Needs"],
      rows: [
        {
          primary: "No resource-usage totals were returned for this hub snapshot.",
          secondary: "Open the full workspace for current authorized analytics.",
          status: "muted",
        },
      ],
      emptyHeadline: "No resource activity is available.",
      emptyBody:
        "Resource engagement will appear after staff and families begin using the library.",
    }),
    calendar: detail("calendar", {
      title: "Calendar",
      eyebrow: "Implementation Dates",
      summary: "Open the school calendar for current meetings, deadlines, and rollout dates.",
      what: "Coordinate authorized school dates in the full calendar workflow.",
      dataSource: "School calendar; not included in the hub snapshot response",
      primaryAction: { label: "Open Calendar", to: "/school/calendar" },
      connectsTo: ["Implementation Progress", "Team Access"],
      rows: [
        {
          primary: "Calendar totals are not part of this hub snapshot.",
          secondary: "Open Calendar to view current authorized dates.",
          status: "muted",
        },
      ],
      emptyHeadline: "No school dates are available.",
      emptyBody: "Schedule meetings or milestones in the full calendar tool.",
    }),
    "support-needs": detail("support-needs", {
      title: "Support Needs",
      eyebrow: "Operational Follow-up",
      summary:
        "Immediate access and implementation signals derived from the authorized school snapshot.",
      what: "Resolve pending access and open the full workspace for broader support planning.",
      dataSource: "Pending memberships · roster/report aggregate counts",
      primaryAction: { label: "Open Support Needs", to: "/school/support-needs" },
      connectsTo: ["Team Access", "Implementation Progress"],
      stats: [
        { label: "Pending staff", value: String(metrics.pending_members) },
        { label: "Students", value: String(metrics.students_count) },
        { label: "Report records", value: String(metrics.reports_count) },
      ],
      rows:
        metrics.pending_members > 0
          ? [
              {
                primary: `${metrics.pending_members} staff access item${metrics.pending_members === 1 ? "" : "s"} need follow-up`,
                secondary: "Review pending invitations in Team / Staff Access.",
                status: "warning",
              },
            ]
          : [
              {
                primary: "No pending staff access items",
                secondary: "Open the full tool for other implementation support needs.",
                status: "ok",
              },
            ],
      emptyHeadline: "No immediate support signal is available.",
      emptyBody: "Support needs will appear as authorized operational data is recorded.",
    }),
    implementation: detail("implementation", {
      title: "Implementation Progress",
      eyebrow: "Live Adoption Snapshot",
      summary: "Current staff activation, connected roster, and Pathway Report activity.",
      what: "Use these live signals to decide the next onboarding or adoption step.",
      dataSource: "Staff memberships · connected students · Pathway Report counts",
      primaryAction: { label: "Open Implementation", to: "/school/implementation" },
      connectsTo: ["Team Access", "School Overview", "Report Completion"],
      stats: [
        { label: "Staff active", value: `${metrics.active_members}/${metrics.total_members}` },
        { label: "Students", value: String(metrics.students_count) },
        { label: "Report records", value: String(metrics.reports_count) },
      ],
      rows: [
        ...staffRows,
        {
          primary: `${metrics.students_count} students connected`,
          secondary: `${metrics.reports_count} Pathway Report records in the authorized school scope.`,
          status: metrics.students_count > 0 ? "ok" : "warning",
        },
      ],
      emptyHeadline: "Implementation activity has not started.",
      emptyBody: "Invite staff and connect a roster to begin implementation tracking.",
    }),
    "partner-network": detail("partner-network", {
      title: "Partner Network",
      eyebrow: "Community Connections",
      summary: "Open the Partner Network for current verified programs and opportunities.",
      what: "Find community partners without inventing school-specific coverage totals.",
      dataSource: "Partner directory; school-specific counts are not included in this hub snapshot",
      primaryAction: { label: "Open Partner Network", to: "/partner-network" },
      connectsTo: ["Planning Status", "Support Needs"],
      rows: [
        {
          primary: "School-specific partner totals are not available in this snapshot.",
          secondary: "Open the directory to search current verified partners and opportunities.",
          status: "muted",
        },
      ],
      emptyHeadline: "No partner coverage total is available.",
      emptyBody: "Use the Partner Network to search verified community options.",
    }),
  };

  return { organization, details };
}
