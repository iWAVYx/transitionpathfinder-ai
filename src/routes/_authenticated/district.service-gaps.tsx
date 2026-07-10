import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, FileText, UserPlus, ArrowRight } from "lucide-react";

import { DistrictPageShell, useDistrictDashboard } from "@/components/district/DistrictPageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import type { DistrictSchool } from "@/lib/district-admin.functions";

export const Route = createFileRoute("/_authenticated/district/service-gaps")({
  beforeLoad: () => ensureRoleAccess(["district_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "Service Gaps — TransitionForward" },
      {
        name: "description",
        content:
          "Schools in your district where transition supports or planning capacity are missing.",
      },
    ],
  }),
  component: DistrictServiceGapsPage,
});

type GapKind = "no_staff" | "no_students" | "no_reports" | "needs_followup";

function gapsFor(s: DistrictSchool): { kind: GapKind; label: string }[] {
  const gaps: { kind: GapKind; label: string }[] = [];
  if (s.active_members === 0) gaps.push({ kind: "no_staff", label: "No active staff" });
  if (s.students_count === 0) gaps.push({ kind: "no_students", label: "No students yet" });
  if (s.students_count > 0 && s.reports_count === 0)
    gaps.push({ kind: "no_reports", label: "No Pathway Reports generated" });
  if (s.needs_followup) gaps.push({ kind: "needs_followup", label: "Flagged: needs follow-up" });
  return gaps;
}

function DistrictServiceGapsPage() {
  const { data, loading, districtId, reload } = useDistrictDashboard();
  return (
    <DistrictPageShell
      path="/district/service-gaps"
      title="Service Gaps"
      subtitle="Schools where transition supports, staff, or planning capacity are missing."
      data={data}
      loading={loading}
      districtId={districtId}
      onSwitchDistrict={(id) => reload(id)}
    >
      {(_district, d) => {
        const flagged = d.schools
          .map((s) => ({ school: s, gaps: gapsFor(s) }))
          .filter((x) => x.gaps.length > 0);
        return (
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-5 shadow-soft">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="font-medium">
                  {flagged.length} of {d.schools.length} schools have open service gaps
                </h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Gaps are derived from staffing, student rosters, and Pathway Report activity — no
                sensitive student content is shown here.
              </p>
            </div>

            {flagged.length === 0 ? (
              <div className="rounded-2xl border bg-emerald-50/60 p-8 text-center shadow-soft">
                <h3 className="font-display text-xl">No service gaps detected</h3>
                <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
                  Every connected school has active staff, students on their roster, and at least
                  one Pathway Report generated.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border bg-card shadow-soft">
                <ul className="divide-y">
                  {flagged.map(({ school: s, gaps }) => (
                    <li key={s.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <div className="font-medium">{s.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.active_members} staff · {s.students_count} students · {s.reports_count} reports
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {gaps.map((g) => (
                            <Badge key={g.kind} variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" /> {g.label}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {gaps.some((g) => g.kind === "no_staff") && (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/district/team">
                              <UserPlus className="h-3.5 w-3.5" /> Invite staff
                            </Link>
                          </Button>
                        )}
                        {gaps.some((g) => g.kind === "no_reports") && (
                          <Button asChild size="sm" variant="outline">
                            <Link to="/district/reports">
                              <FileText className="h-3.5 w-3.5" /> View reports
                            </Link>
                          </Button>
                        )}
                        <Button asChild size="sm">
                          <Link to="/district/schools" hash={s.id}>
                            Open school <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      }}
    </DistrictPageShell>
  );
}
