import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, TrendingUp, FileText, ClipboardList, Download, FileDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { DistrictDashboard, DistrictOrg } from "@/lib/district-admin.functions";


import {
  DistrictPageShell,
  useDistrictDashboard,
} from "@/components/district/DistrictPageShell";

export const Route = createFileRoute("/_authenticated/district/reports")({
  head: () => ({ meta: [{ title: "District Reports — TransitionForward" }] }),
  component: DistrictReportsPage,
});

function DistrictReportsPage() {
  const { data, loading, districtId, reload } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/reports"
      title="District Reports"
      subtitle="District-wide transition planning trends, Pathway Report adoption, and implementation progress."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {(district, d) => (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => exportCsv(district, d)}>
              <Download className="h-3.5 w-3.5" /> Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => exportPdf(district, d)}>
              <FileDown className="h-3.5 w-3.5" /> Export PDF
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Students Across District"
              value={d.metrics.students_count}
              icon={<TrendingUp className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Pathway Reports"
              value={d.metrics.reports_count}
              icon={<FileText className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Open Action Items"
              value={d.metrics.open_actions}
              icon={<ClipboardList className="h-3.5 w-3.5" />}
            />
            <Stat
              label="Connected Schools"
              value={d.metrics.schools_count}
              icon={<BarChart3 className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="Pathway Report Adoption" pct={d.metrics.pct_with_report}>
              Percentage of students in the district with at least one Pathway
              Report created.
            </Card>
            <Card title="Active Transition Goals" pct={d.metrics.pct_with_goals}>
              Percentage of students with at least one active (non-met) goal.
            </Card>
            <Card title="Action Item Engagement" pct={d.metrics.pct_with_actions}>
              Percentage of students with open action items being tracked.
            </Card>
          </div>

          <div className="rounded-2xl border bg-card shadow-soft">
            <div className="border-b p-5">
              <h2 className="font-display text-lg">School-by-School Progress</h2>
              <p className="text-sm text-muted-foreground">
                Aggregate counts only. Individual student records remain
                protected — district admins do not have automatic access to
                private documents.
              </p>
            </div>
            {d.schools.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">
                Connect schools from the Schools tab to see progress trends.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">School</th>
                      <th className="px-4 py-3">Students</th>
                      <th className="px-4 py-3">Reports</th>
                      <th className="px-4 py-3">Open Actions</th>
                      <th className="px-4 py-3">% with Report</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {d.schools.map((s) => {
                      const pct =
                        s.students_count > 0
                          ? Math.round((s.reports_count / s.students_count) * 100)
                          : 0;
                      return (
                        <tr key={s.id}>
                          <td className="px-4 py-3 font-medium">{s.name}</td>
                          <td className="px-4 py-3">{s.students_count}</td>
                          <td className="px-4 py-3">{s.reports_count}</td>
                          <td className="px-4 py-3">{s.open_actions}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full bg-primary"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </DistrictPageShell>
  );
}

function Stat({
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

function Card({
  title,
  pct,
  children,
}: {
  title: string;
  pct: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <h3 className="font-display text-base">{title}</h3>
      <div className="mt-3 flex items-end gap-2">
        <div className="font-display text-3xl">{pct}%</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{children}</p>
    </div>
  );
}
