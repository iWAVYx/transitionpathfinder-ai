import { createFileRoute } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, TrendingUp, Target, FileText, ClipboardList } from "lucide-react";

import { SchoolPageShell, useSchoolDashboard } from "@/components/school/SchoolPageShell";
import { getSchoolReadiness, type SchoolReadiness, type SchoolDashboard, type SchoolOrg } from "@/lib/school-admin.functions";
import { RolloutMilestonesCard, type RolloutMilestone } from "@/components/implementation/RolloutMilestonesCard";
import { TrainingScheduleCard } from "@/components/implementation/TrainingScheduleCard";
import { ReportingDeadlinesCard } from "@/components/implementation/ReportingDeadlinesCard";
import { StaffProgressTable, type StaffProgressRow } from "@/components/implementation/StaffProgressTable";

export const Route = createFileRoute("/_authenticated/school/implementation")({
  head: () => ({ meta: [{ title: "Implementation — TransitionForward" }] }),
  component: withRoleGuard(["school_admin", "admin"], SchoolImplementationPage),
});

function SchoolImplementationPage() {
  const { data, loading, orgId, reload } = useSchoolDashboard();
  return (
    <SchoolPageShell
      path="/school/implementation"
      title="Implementation"
      subtitle="Track how transition planning is rolling out across your students."
      data={data}
      loading={loading}
      orgId={orgId}
      onSwitchOrg={(id) => reload(id)}
    >
      {(org, dash) => (
        <div className="space-y-6">
          <ReadinessScorecard orgId={org.id} />
          <SchoolImplementationExtras org={org} dash={dash} />
        </div>
      )}
    </SchoolPageShell>
  );
}

function ReadinessScorecard({ orgId }: { orgId: string }) {
  const fetchReadiness = useServerFn(getSchoolReadiness);
  const [stats, setStats] = useState<SchoolReadiness | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setStats(await fetchReadiness({ data: { organization_id: orgId } }));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (stats.total_students === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
        <TrendingUp className="mx-auto h-7 w-7 text-muted-foreground" />
        <h3 className="mt-3 font-display text-lg">No Students Yet</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Implementation metrics will appear once students are added to your organization.
        </p>
      </div>
    );
  }

  const pct = (n: number) => Math.round((n / stats.total_students) * 100);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={stats.total_students} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Avg Open Actions" value={stats.avg_open_actions_per_student} icon={<ClipboardList className="h-4 w-4" />} />
        <StatCard label="With Pathway Report" value={`${pct(stats.with_pathway_report)}%`} icon={<FileText className="h-4 w-4" />} hint={`${stats.with_pathway_report} of ${stats.total_students}`} />
        <StatCard label="With Active Goals" value={`${pct(stats.with_active_goals)}%`} icon={<Target className="h-4 w-4" />} hint={`${stats.with_active_goals} of ${stats.total_students}`} />
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <h2 className="font-display text-lg">Implementation Coverage</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Percent of students in your organization who have started each planning artifact.
        </p>
        <ul className="mt-5 space-y-4">
          <Bar label="Pathway Report Created" value={pct(stats.with_pathway_report)} />
          <Bar label="Active Goals Defined" value={pct(stats.with_active_goals)} />
          <Bar label="At Least One Open Action Item" value={pct(stats.with_open_action_items)} />
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, hint }: { label: string; value: React.ReactNode; icon: React.ReactNode; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-2xl">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <li>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value}%</span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-[width]" style={{ width: `${Math.max(value, 2)}%` }} />
      </div>
    </li>
  );
}

function SchoolImplementationExtras({ org, dash }: { org: SchoolOrg; dash: SchoolDashboard }) {
  const m = dash.metrics;
  const milestones: RolloutMilestone[] = [
    {
      key: "school-created",
      label: "School workspace created",
      detail: "Your school workspace is ready for staff and students.",
      done: true,
    },
    {
      key: "staff-invited",
      label: "Staff invited",
      detail: "Educators and case managers have been invited to the workspace.",
      done: m.total_members > 1,
    },
    {
      key: "staff-active",
      label: "Staff onboarded",
      detail: "At least 3 staff members are active and using the platform.",
      done: m.active_members >= 3,
    },
    {
      key: "students-added",
      label: "Students added",
      detail: "Students have been added to educator caseloads.",
      done: m.students_count > 0,
    },
    {
      key: "documents-uploaded",
      label: "IEP & evaluation documents uploaded",
      detail: "Source documents are in place so Pathway Reports can be generated.",
      done: m.documents_count > 0,
    },
    {
      key: "first-report",
      label: "First Pathway Report generated",
      detail: "Your team has produced its first Pathway Report from a student's records.",
      done: m.reports_count > 0,
    },
    {
      key: "majority-reports",
      label: "Majority of students have a Pathway Report",
      detail: "At least 60% of students on caseloads have an active Pathway Report.",
      done: m.students_count > 0 && m.reports_count / m.students_count >= 0.6,
    },
  ];

  const rows: StaffProgressRow[] = [
    ...dash.members.map((mem) => ({
      key: `m:${mem.membership_id}`,
      name: mem.full_name || mem.email || "Unnamed member",
      role: mem.role_within_org,
      status: "active" as const,
      joined: mem.joined_at,
      progress: 100,
      detail: mem.email ?? undefined,
    })),
    ...dash.pending_members.map((mem) => ({
      key: `p:${mem.membership_id}`,
      name: mem.full_name || mem.email || "Pending invite",
      role: mem.role_within_org,
      status: "pending" as const,
      joined: mem.joined_at,
      progress: 25,
      detail: mem.email ?? undefined,
    })),
  ];

  return (
    <>
      <RolloutMilestonesCard scope="school" milestones={milestones} />
      <div className="grid gap-6 lg:grid-cols-2">
        <TrainingScheduleCard scopeId={`school:${org.id}`} />
        <ReportingDeadlinesCard scope="school" />
      </div>
      <StaffProgressTable
        title="Staff Onboarding Progress"
        subtitle="Active and pending members of your school workspace."
        rows={rows}
        emptyLabel="No staff invited yet. Invite educators and case managers to get started."
      />
    </>
  );
}
