import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { LifeBuoy, Loader2, AlertTriangle, FileText } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { SchoolNav } from "@/components/school/SchoolNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import {
  getSchoolSupportNeeds,
  type SchoolSupportNeeds,
} from "@/lib/school-insights.functions";

export const Route = createFileRoute("/_authenticated/school/support-needs")({
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "Support Needs — TransitionForward" },
      {
        name: "description",
        content:
          "Students at your school flagged as needing additional transition support — sorted by lowest readiness.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/school/support-needs">
      <SchoolSupportNeedsPage />
    </RoleGuard>
  ),
});

function SchoolSupportNeedsPage() {
  const fetchNeeds = useServerFn(getSchoolSupportNeeds);
  const [data, setData] = useState<SchoolSupportNeeds | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchNeeds({ data: {} });
        if (alive) setData(d);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchNeeds]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "School Administration", to: "/school/overview" },
            { label: "Support Needs" },
          ]}
        />

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            School Administrator
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            Support Needs
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Students flagged as needing additional support — missing a Pathway
            Report, or a readiness score below threshold.
          </p>
        </header>

        <SchoolNav />

        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data || !data.is_school_admin ? (
            <EmptyCard
              title="No school linked yet"
              body="Set up your school in the Overview to see students on your caseload here."
            />
          ) : data.total_students === 0 ? (
            <EmptyCard
              title="No students yet"
              body="Once staff invite students or link families to your school, they'll appear here."
            />
          ) : data.needing_support.length === 0 ? (
            <EmptyCard
              title="Nobody flagged right now"
              body={`All ${data.total_students} students at ${data.org_name ?? "your school"} have a Pathway Report and readiness scores above the support threshold.`}
              tone="success"
            />
          ) : (
            <div className="rounded-2xl border bg-card shadow-soft">
              <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <LifeBuoy className="h-4 w-4 text-primary" />
                  <h2 className="font-medium">
                    {data.needing_support.length} of {data.total_students} flagged
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Threshold: avg &lt; 60 or any pillar &lt; 50, or no report yet.
                </p>
              </div>
              <ul className="divide-y">
                {data.needing_support.map((r) => {
                  const name =
                    r.preferred_name?.trim() ||
                    r.first_name ||
                    "Unnamed student";
                  return (
                    <li
                      key={r.student_id}
                      className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{name}</span>
                          {r.grade_band && (
                            <Badge variant="secondary">{r.grade_band}</Badge>
                          )}
                          {!r.has_report && (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" /> No report
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Owner: {r.owner_name ?? "—"}
                          {r.avg_score != null && (
                            <>
                              {" · "}Avg readiness: {r.avg_score}
                            </>
                          )}
                          {r.weakest_category && r.weakest_score != null && (
                            <>
                              {" · "}Lowest: {r.weakest_category} (
                              {r.weakest_score})
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link
                            to="/students/$studentId"
                            params={{ studentId: r.student_id }}
                          >
                            Open student
                          </Link>
                        </Button>
                        {!r.has_report && (
                          <Button asChild size="sm">
                            <Link to="/pathway">
                              <FileText className="h-3.5 w-3.5" /> Start report
                            </Link>
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}

function EmptyCard({
  title,
  body,
  tone = "muted",
}: {
  title: string;
  body: string;
  tone?: "muted" | "success";
}) {
  return (
    <div
      className={
        "rounded-2xl border p-8 text-center shadow-soft " +
        (tone === "success" ? "bg-emerald-50/60" : "bg-card")
      }
    >
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
