import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ClipboardList, Loader2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { SchoolNav } from "@/components/school/SchoolNav";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import {
  getSchoolPlanningStatus,
  type SchoolPlanningStatus,
} from "@/lib/school-insights.functions";

export const Route = createFileRoute("/_authenticated/school/planning-status")({
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "Planning Status by Grade — TransitionForward" },
      {
        name: "description",
        content:
          "Which grade bands at your school are on-pace on Pathway Report completion, and which need a push.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/school/planning-status">
      <SchoolPlanningStatusPage />
    </RoleGuard>
  ),
});

function SchoolPlanningStatusPage() {
  const fetchStatus = useServerFn(getSchoolPlanningStatus);
  const [data, setData] = useState<SchoolPlanningStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchStatus({ data: {} });
        if (alive) setData(d);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchStatus]);

  const totalPct =
    data && data.total_students > 0
      ? Math.round((data.total_with_report / data.total_students) * 100)
      : 0;

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "School Administration", to: "/school/overview" },
            { label: "Planning Status by Grade" },
          ]}
        />

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            School Administrator
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            Planning Status by Grade
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Percentage of students in each grade band with a Pathway Report started.
          </p>
        </header>

        <SchoolNav />

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data || !data.is_school_admin ? (
            <Empty
              title="No school linked yet"
              body="Set up your school in the Overview to see planning status here."
            />
          ) : data.total_students === 0 ? (
            <Empty
              title="No students yet"
              body="Once staff invite students or link families to your school, they'll appear here."
            />
          ) : (
            <div className="space-y-6">
              <div className="rounded-2xl border bg-card p-5 shadow-soft">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Overall report completion
                    </p>
                    <p className="mt-1 font-display text-3xl">
                      {totalPct}%
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {data.total_with_report} of {data.total_students} students at{" "}
                    {data.org_name ?? "your school"}
                  </p>
                </div>
                <Progress value={totalPct} className="mt-3 h-2" />
              </div>

              <div className="rounded-2xl border bg-card shadow-soft">
                <div className="flex items-center gap-2 border-b px-5 py-4">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  <h2 className="font-medium">
                    Grade Bands — {data.by_grade.length} total
                  </h2>
                </div>
                <ul className="divide-y">
                  {data.by_grade.map((g) => (
                    <li
                      key={g.grade_band}
                      className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center"
                    >
                      <div className="font-medium">{g.grade_band}</div>
                      <div className="text-xs text-muted-foreground sm:text-right">
                        {g.with_report} of {g.total} students
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress value={g.pct} className="h-2" />
                        <Badge
                          variant={
                            g.pct >= 70
                              ? "default"
                              : g.pct >= 40
                                ? "secondary"
                                : "destructive"
                          }
                          className="min-w-[3rem] justify-center"
                        >
                          {g.pct}%
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
