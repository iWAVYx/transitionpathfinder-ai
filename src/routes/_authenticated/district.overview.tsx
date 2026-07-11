import { createFileRoute, Link } from "@tanstack/react-router";
import { withRoleGuard } from "@/components/withRoleGuard";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import {
  School,
  Users,
  GraduationCap,
  FileText,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

import {
  DistrictPageShell,
  useDistrictDashboard,
} from "@/components/district/DistrictPageShell";
import { Button } from "@/components/ui/button";
import { NextBestAction } from "@/components/dashboard/NextBestAction";
import { JourneyStrip } from "@/components/dashboard/JourneyStrip";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import { StatGrid, StatCard } from "@/components/layout/StatGrid";
import { CollapsibleSection } from "@/components/layout/CollapsibleSection";

import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/district/overview")({
  head: () => ({
    meta: [{ title: "District Overview — TransitionForward" }],
  }),
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  errorComponent: dashboardErrorComponent("district_admin"),
  component: withRoleGuard(["district_admin", "admin"], DistrictOverviewPage),
});

function DistrictOverviewPage() {
  const { data, loading, districtId, reload } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/overview"
      title="District Transition Planning Overview"
      subtitle="Aggregate visibility across connected schools, staff, and student transition planning progress."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {(district, d) => (
        <div className="space-y-6 sm:space-y-8">
          <NextBestAction surface="district_admin" /><div className="mt-4"><JourneyStrip surface="district_admin" /></div>
          <OnboardingChecklist surface="district_admin" />

          <StatGrid cols={4}>
            <StatCard
              label="Connected Schools"
              value={d.metrics.schools_count}
              icon={<School className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="School Administrators"
              value={d.metrics.school_admins}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Educators & Case Managers"
              value={d.metrics.educators}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <StatCard
              label="Student Profiles"
              value={d.metrics.students_count}
              icon={<GraduationCap className="h-3.5 w-3.5" />}
            />
          </StatGrid>

          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5 lg:col-span-2 lg:p-6">
              <h2 className="font-display text-lg sm:text-xl">{district.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[district.city, district.state].filter(Boolean).join(", ") ||
                  "No location on file"}
                {" · "}
                <span className="capitalize">{district.verified_status}</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                Use the tabs above to manage schools, oversee district-wide
                transition planning progress, and invite school administrators
                and case managers.
              </p>
              {/* Quick actions: full-width stack on mobile so each tap target is obvious */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                  <Link to="/district/schools">
                    <School className="h-4 w-4" /> Manage Schools
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="w-full sm:w-auto">
                  <Link to="/district/team">
                    <Users className="h-4 w-4" /> People &amp; Access
                  </Link>
                </Button>
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <Link to="/district/reports">
                    District Reports <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5 lg:p-6">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                <TrendingUp className="h-3.5 w-3.5" /> Planning Adoption
              </div>
              <div className="mt-3 space-y-3">
                <ProgressBar
                  label="Pathway Reports"
                  pct={d.metrics.pct_with_report}
                />
                <ProgressBar
                  label="Active Transition Goals"
                  pct={d.metrics.pct_with_goals}
                />
                <ProgressBar
                  label="Action Items In Progress"
                  pct={d.metrics.pct_with_actions}
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Aggregate, non-sensitive metrics across all students in the
                district.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-4 shadow-soft sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h2 className="font-display text-lg sm:text-xl">Schools Needing Follow-Up</h2>
                <p className="text-sm text-muted-foreground">
                  Schools with no connected students or no Pathway Reports yet.
                </p>
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link to="/district/schools" hash="needs-followup" aria-label="Go to all schools needing follow-up">View all</Link>
              </Button>
            </div>
            {d.schools.filter((s) => s.needs_followup).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                Every connected school has at least one student with a Pathway
                Report. Nice work.
              </p>
            ) : (
              <ul className="mt-4 divide-y">
                {d.schools
                  .filter((s) => s.needs_followup)
                  .slice(0, 6)
                  .map((s) => (
                    <li
                      key={s.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.students_count} students · {s.reports_count} reports
                        </p>
                      </div>
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> Needs follow-up
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Secondary: implementation status — collapsed on mobile to reduce density */}
          <CollapsibleSection
            title="Implementation Status"
            description="Aggregate progress across all schools."
            icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <StatusTile
                label="Pathway Reports Created"
                value={d.metrics.reports_count}
                hint={`${d.metrics.pct_with_report}% of students`}
              />
              <StatusTile
                label="Open Action Items"
                value={d.metrics.open_actions}
                hint="Across all schools"
              />
              <StatusTile
                label="Active Staff"
                value={d.metrics.school_admins + d.metrics.educators}
                hint={`${d.metrics.school_admins} admins · ${d.metrics.educators} educators`}
              />
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" />
              District admins see aggregate progress. Individual student
              documents remain protected by family and school permissions.
            </p>
          </CollapsibleSection>
        </div>
      )}
    </DistrictPageShell>
  );
}

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}%</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

function StatusTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

