import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, ArrowRight } from "lucide-react";

import { DistrictPageShell, useDistrictDashboard } from "@/components/district/DistrictPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureRoleAccess } from "@/lib/route-role-guard";

export const Route = createFileRoute("/_authenticated/district/progress")({
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "School-by-School Progress — TransitionForward" },
      {
        name: "description",
        content:
          "Planning status, report completion, and support-needs compared across every school in your district.",
      },
    ],
  }),
  component: DistrictProgressPage,
});

function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}

function DistrictProgressPage() {
  const { data, loading, districtId, reload } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/progress"
      title="School-by-School Progress"
      subtitle="Compare planning activity, report completion, and open actions across every connected school."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {(_district, d) => {
        const rows = [...d.schools].sort(
          (a, b) => pct(a.reports_count, a.students_count) - pct(b.reports_count, b.students_count),
        );
        return (
          <div className="rounded-2xl border bg-card shadow-soft">
            <div className="flex items-center gap-2 border-b px-5 py-4">
              <BarChart3 className="h-4 w-4 text-primary" />
              <h2 className="font-medium">{rows.length} schools — sorted by lowest report completion</h2>
            </div>
            {rows.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No schools connected yet. Invite a school administrator from the Schools tab.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3">School</th>
                      <th className="px-5 py-3">Staff</th>
                      <th className="px-5 py-3">Students</th>
                      <th className="px-5 py-3">Reports</th>
                      <th className="px-5 py-3">Open actions</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((s) => {
                      const p = pct(s.reports_count, s.students_count);
                      return (
                        <tr key={s.id}>
                          <td className="px-5 py-3">
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {[s.city, s.state].filter(Boolean).join(", ") || "—"}
                            </div>
                          </td>
                          <td className="px-5 py-3">{s.active_members}</td>
                          <td className="px-5 py-3">{s.students_count}</td>
                          <td className="px-5 py-3">
                            {s.reports_count}
                            <span className="ml-1 text-xs text-muted-foreground">({p}%)</span>
                          </td>
                          <td className="px-5 py-3">{s.open_actions}</td>
                          <td className="px-5 py-3">
                            {s.needs_followup ? (
                              <Badge variant="destructive">Needs follow-up</Badge>
                            ) : p >= 70 ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-600">On pace</Badge>
                            ) : (
                              <Badge variant="secondary">Ramping</Badge>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button asChild size="sm" variant="ghost">
                              <Link to="/district/schools" hash={s.id}>
                                Open <ArrowRight className="h-3.5 w-3.5" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      }}
    </DistrictPageShell>
  );
}
