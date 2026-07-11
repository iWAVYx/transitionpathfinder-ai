import { createFileRoute, Link } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { Users, GraduationCap, FileText, FolderOpen, Mail, ArrowRight, ShieldAlert } from "lucide-react";

import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { RoleValueStrip } from "@/components/value/RoleValueStrip";
import { Button } from "@/components/ui/button";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { JourneyStrip } from "@/components/dashboard/JourneyStrip";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { GradeBandBreakdown } from "@/components/dashboard/GradeBandBreakdown";
import { StatGrid, StatCard } from "@/components/layout/StatGrid";
import { CollapsibleSection } from "@/components/layout/CollapsibleSection";

import { ensureRoleAccess } from "@/lib/route-role-guard";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/school/overview")({
  head: () => ({ meta: [{ title: "School Overview — TransitionForward" }] }),
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  errorComponent: dashboardErrorComponent("school_admin"),
  component: withRoleGuard(["school_admin", "admin"], SchoolOverviewPage),
});

function SchoolOverviewPage() {
  const { data, loading, orgId, reload } = useSchoolDashboard();
  return (
    <SchoolPageShell
      path="/school/overview"
      title="School Overview"
      subtitle="A school-level snapshot of staff, students, and transition planning activity."
      data={data}
      loading={loading}
      orgId={orgId}
      onSwitchOrg={(id) => reload(id)}
    >
      {(org, d) => (
        // PRIMARY → SECONDARY hierarchy: Next Best Action first, then KPIs,
        // then org info / recent students, then secondary breakdown (collapsed
        // on mobile to reduce density).
        <div className="space-y-6 sm:space-y-8">
          <RoleValueStrip role="school" />
          <NextBestAction surface="school_admin" /><div className="mt-4"><JourneyStrip surface="school_admin" /></div>
          <OnboardingChecklist surface="school_admin" />


          <StatGrid cols={4}>
            <StatCard label="Active Staff" value={d.metrics.active_members} icon={<Users className="h-3.5 w-3.5" />} />
            <StatCard label="Pending Invites" value={d.metrics.pending_members} icon={<Mail className="h-3.5 w-3.5" />} />
            <StatCard label="Students" value={d.metrics.students_count} icon={<GraduationCap className="h-3.5 w-3.5" />} />
            <Link
              to="/school/reports"
              hash="reports-list"
              aria-label="Open Pathway Reports list"
              className="rounded-2xl transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <StatCard label="Pathway Reports" value={d.metrics.reports_count} icon={<FileText className="h-3.5 w-3.5" />} />
            </Link>
          </StatGrid>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5 lg:col-span-2 lg:p-6">
              <h2 className="font-display text-lg sm:text-xl">{org.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[org.type, org.city, org.state].filter(Boolean).join(" · ") || "No location on file"}
                {" · "}
                <span className="capitalize">{org.verified_status}</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Use the tabs above to manage your team, review pathway reports, and track
                implementation across your students.
              </p>
              {/* Quick actions — wrap, full-width on mobile to avoid cramped rows */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                  <Link to="/school/team"><Users className="h-4 w-4" /> Manage Team</Link>
                </Button>

                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                  <Link to="/school/reports" hash="compliance-milestones" aria-label="Go to Compliance and Milestones"><ShieldAlert className="h-4 w-4" /> Compliance & Milestones</Link>
                </Button>
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link to="/school/implementation">Implementation <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <FolderOpen className="h-3.5 w-3.5" /> Recent Students
              </div>
              {d.students.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No students yet. Once staff add students to your organization, they'll appear here.
                </p>
              ) : (
                <ul className="mt-3 space-y-2 text-sm">
                  {d.students.slice(0, 6).map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate">
                        {s.preferred_name ?? s.first_name ?? "Student"}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">{s.grade_band ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Secondary: grade-band breakdown collapses on mobile, always open on lg+ */}
          <CollapsibleSection
            title="Grade Band Breakdown"
            description="Distribution of students across transition phases."
            icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
          >
            <GradeBandBreakdown students={d.students} />
          </CollapsibleSection>
        </div>
      )}
    </SchoolPageShell>
  );
}

