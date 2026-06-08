import { createFileRoute, Link } from "@tanstack/react-router";
import { Users, GraduationCap, FileText, FolderOpen, Mail, ArrowRight } from "lucide-react";

import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { Button } from "@/components/ui/button";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { GradeBandBreakdown } from "@/components/dashboard/GradeBandBreakdown";

export const Route = createFileRoute("/_authenticated/school/overview")({
  head: () => ({ meta: [{ title: "School Overview — TransitionForward" }] }),
  component: SchoolOverviewPage,
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
        <div className="space-y-6">
          <NextBestAction surface="school_admin" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Active Staff" value={d.metrics.active_members} icon={<Users className="h-3.5 w-3.5" />} />
            <Metric label="Pending Invites" value={d.metrics.pending_members} icon={<Mail className="h-3.5 w-3.5" />} />
            <Metric label="Students" value={d.metrics.students_count} icon={<GraduationCap className="h-3.5 w-3.5" />} />
            <Metric label="Pathway Reports" value={d.metrics.reports_count} icon={<FileText className="h-3.5 w-3.5" />} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
              <h2 className="font-display text-lg">{org.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[org.type, org.city, org.state].filter(Boolean).join(" · ") || "No location on file"}
                {" · "}
                <span className="capitalize">{org.verified_status}</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Use the tabs above to manage your team, review pathway reports, and track
                implementation across your students.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/school/team"><Users className="h-4 w-4" /> Manage Team</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/school/reports"><FileText className="h-4 w-4" /> View Reports</Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/school/implementation">Implementation <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-soft">
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
                    <li key={s.id} className="flex items-center justify-between">
                      <span className="truncate">
                        {s.preferred_name ?? s.first_name ?? "Student"}
                      </span>
                      <span className="text-xs text-muted-foreground">{s.grade_band ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <GradeBandBreakdown students={d.students} />
        </div>
      )}
    </SchoolPageShell>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
    </div>
  );
}
