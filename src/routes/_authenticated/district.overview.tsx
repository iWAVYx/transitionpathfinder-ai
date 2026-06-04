import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/district/overview")({
  head: () => ({
    meta: [{ title: "District Overview — TransitionForward" }],
  }),
  component: DistrictOverviewPage,
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
        <div className="space-y-6">
          <NextBestAction surface="district_admin" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric
              label="Connected Schools"
              value={d.metrics.schools_count}
              icon={<School className="h-3.5 w-3.5" />}
            />
            <Metric
              label="School Administrators"
              value={d.metrics.school_admins}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <Metric
              label="Educators / Case Mgrs"
              value={d.metrics.educators}
              icon={<Users className="h-3.5 w-3.5" />}
            />
            <Metric
              label="Student Profiles"
              value={d.metrics.students_count}
              icon={<GraduationCap className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border bg-card p-5 shadow-soft lg:col-span-2">
              <h2 className="font-display text-lg">{district.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {[district.city, district.state].filter(Boolean).join(", ") ||
                  "No location on file"}
                {" · "}
                <span className="capitalize">{district.verified_status}</span>
              </p>
              <p className="mt-4 text-sm text-muted-foreground">
                Use the tabs above to manage schools, oversee district-wide
                transition planning progress, and invite school administrators
                and case managers.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to="/district/schools">
                    <School className="h-4 w-4" /> Manage Schools
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link to="/district/team">
                    <Users className="h-4 w-4" /> People &amp; Access
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/district/reports">
                    District Reports <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-5 shadow-soft">
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

          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg">Schools Needing Follow-Up</h2>
                <p className="text-sm text-muted-foreground">
                  Schools with no connected students or no Pathway Reports yet.
                </p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to="/district/schools">View all</Link>
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
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <div>
                        <p className="font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.students_count} students · {s.reports_count} reports
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3 w-3" /> Needs follow-up
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
              <ClipboardList className="h-3.5 w-3.5" /> Implementation Status
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
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
          </div>
        </div>
      )}
    </DistrictPageShell>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <div className="mt-1 font-display text-3xl">{value}</div>
    </div>
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
