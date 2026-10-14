import { organizationRouteErrorComponent } from "@/components/routing/OrganizationRouteError";
import { districtDashboardNavigation } from "@/lib/organization-dashboard-navigation";
import { createFileRoute } from "@tanstack/react-router";
import { Rocket, Sprout, Waypoints, TrendingUp } from "lucide-react";

import { DistrictPageShell, useDistrictDashboard } from "@/components/district/DistrictPageShell";
import { Badge } from "@/components/ui/badge";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import type { DistrictSchool, DistrictDashboard } from "@/lib/district-admin.functions";
import { RolloutMilestonesCard, type RolloutMilestone } from "@/components/implementation/RolloutMilestonesCard";
import { TrainingScheduleCard } from "@/components/implementation/TrainingScheduleCard";
import { ReportingDeadlinesCard } from "@/components/implementation/ReportingDeadlinesCard";
import { StaffProgressTable, membershipAccessStatus, type StaffProgressRow } from "@/components/implementation/StaffProgressTable";

export const Route = createFileRoute("/_authenticated/district/implementation")({
  ...districtDashboardNavigation,
  errorComponent: organizationRouteErrorComponent("district", "/district/implementation"),
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "Implementation Progress — TransitionForward" },
      {
        name: "description",
        content:
          "Recorded staff access and report coverage across connected schools.",
      },
    ],
  }),
  component: DistrictImplementationPage,
});

type Stage = "onboarding" | "active" | "mature";

function stageFor(s: DistrictSchool): Stage {
  if (s.active_members === 0 || s.students_count === 0) return "onboarding";
  const ratio = s.students_count > 0 ? s.students_with_report / s.students_count : 0;
  if (ratio >= 0.6 && s.active_members >= 3) return "mature";
  return "active";
}

const STAGE_META: Record<
  Stage,
  { label: string; blurb: string; icon: typeof Sprout; tone: string }
> = {
  onboarding: {
    label: "Getting Started",
    blurb: "Staff access or student connections are still needed.",
    icon: Sprout,
    tone: "bg-amber-100 text-amber-900",
  },
  active: {
    label: "Staff and Students Connected",
    blurb: "Active staff access and recorded students; report coverage is shown below.",
    icon: Waypoints,
    tone: "bg-sky-100 text-sky-900",
  },
  mature: {
    label: "Broad Report Coverage",
    blurb: "At least three active staff memberships and recorded reports for at least 60% of students.",
    icon: TrendingUp,
    tone: "bg-emerald-100 text-emerald-900",
  },
};

function DistrictImplementationPage() {
  const { data, loading, districtId, reload, recoverSelection } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/implementation"
      title="Implementation Progress"
      subtitle="Recorded staff access and report coverage across connected schools."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
      onRecoverSelection={recoverSelection}
    >
      {(district, d) => {
        const byStage: Record<Stage, DistrictSchool[]> = {
          onboarding: [],
          active: [],
          mature: [],
        };
        for (const s of d.schools) byStage[stageFor(s)].push(s);
        const milestones = districtMilestones(d);
        const staffRows = districtStaffRows(d);
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                <h2 className="font-medium">Rollout across {d.schools.length} school(s)</h2>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {(Object.keys(STAGE_META) as Stage[]).map((s) => {
                  const meta = STAGE_META[s];
                  const Icon = meta.icon;
                  return (
                    <div key={s} className="rounded-xl border p-4">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${meta.tone}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-sm font-medium">{meta.label}</span>
                      </div>
                      <p className="mt-2 text-2xl font-semibold">{byStage[s].length}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{meta.blurb}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {(Object.keys(STAGE_META) as Stage[]).map((stage) => (
              <div key={stage} className="rounded-2xl border bg-card shadow-soft">
                <div className="flex items-center justify-between border-b px-5 py-4">
                  <h3 className="font-medium">{STAGE_META[stage].label}</h3>
                  <Badge variant="secondary">{byStage[stage].length}</Badge>
                </div>
                {byStage[stage].length === 0 ? (
                  <p className="p-5 text-sm text-muted-foreground">No schools in this stage.</p>
                ) : (
                  <ul className="divide-y">
                    {byStage[stage].map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.active_members} staff · {s.students_count} students · {s.reports_count} reports
                          </div>
                        </div>
                        {s.needs_followup && <Badge variant="destructive">Needs follow-up</Badge>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <RolloutMilestonesCard scope="district" milestones={milestones} />

            <div className="grid gap-6 lg:grid-cols-2">
              <TrainingScheduleCard scopeId={`district:${district.id}`} />
              <ReportingDeadlinesCard scope="district" />
            </div>

            <StaffProgressTable
              title="District Team Access"
              subtitle="Recorded membership status. Training completion is not recorded here."
              rows={staffRows}
              emptyLabel="No district team members yet. Invite school admins and coordinators to get started."
            />
          </div>
        );
      }}
    </DistrictPageShell>
  );
}

function districtMilestones(d: DistrictDashboard): RolloutMilestone[] {
  const m = d.metrics;
  const anySchool = d.schools.length > 0;
  const anyActiveSchool = d.schools.some((s) => s.active_members > 0);
  const anyStudents = m.students_count > 0;
  const anyReports = m.reports_count > 0;
  const majority = m.pct_with_report >= 60;
  const teamComplete = d.team.length >= 3;
  return [
    {
      key: "district-created",
      label: "District workspace created",
      detail: "Your district workspace is set up and ready to connect schools.",
      done: true,
    },
    {
      key: "schools-connected",
      label: "Schools connected",
      detail: "At least one school is linked to your district.",
      done: anySchool,
    },
    {
      key: "school-admins",
      label: "School Staff Access Established",
      detail: "At least one connected school has active staff access.",
      done: anyActiveSchool,
    },
    {
      key: "students-added",
      label: "Students Connected",
      detail: "At least one student is assigned to a connected school.",
      done: anyStudents,
    },
    {
      key: "first-report",
      label: "First Pathway Report Recorded",
      detail: "At least one Pathway Report record is available in this district scope.",
      done: anyReports,
    },
    {
      key: "majority-reports",
      label: "60%+ of students have a Pathway Report",
      detail: "At least 60% of connected students have a recorded Pathway Report.",
      done: majority,
    },
    {
      key: "district-team",
      label: "District Team Access Established",
      detail: "At least three district-level members have active workspace access.",
      done: teamComplete,
    },
  ];
}

function districtStaffRows(d: DistrictDashboard): StaffProgressRow[] {
  return [
    ...d.team.map((t) => ({
      key: `t:${t.membership_id}`,
      name: t.full_name || t.email || "Unnamed member",
      role: t.role_within_org,
      status: membershipAccessStatus(t.status),
      joined: t.joined_at,
      detail: t.email ?? undefined,
    })),
    ...d.pending_team.map((t) => ({
      key: `p:${t.membership_id}`,
      name: t.full_name || t.email || "Unnamed member",
      role: t.role_within_org,
      status: membershipAccessStatus(t.status),
      joined: t.joined_at,
      detail: t.email ?? undefined,
    })),
  ];
}
