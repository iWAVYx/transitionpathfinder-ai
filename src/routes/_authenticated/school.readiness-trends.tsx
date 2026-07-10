import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TrendingUp, Loader2 } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { SchoolNav } from "@/components/school/SchoolNav";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import {
  getSchoolReadinessTrends,
  type ReadinessTrendData,
} from "@/lib/school-insights.functions";

export const Route = createFileRoute("/_authenticated/school/readiness-trends")({
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "Readiness Trends — TransitionForward" },
      {
        name: "description",
        content:
          "Average readiness score per pillar across every student at your school — sorted worst-first.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/school/readiness-trends">
      <ReadinessTrendsPage />
    </RoleGuard>
  ),
});

function ReadinessTrendsPage() {
  const fetchTrends = useServerFn(getSchoolReadinessTrends);
  const [data, setData] = useState<ReadinessTrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchTrends({ data: {} });
        if (alive) setData(d);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [fetchTrends]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "School Administration", to: "/school/overview" },
            { label: "Readiness Trends" },
          ]}
        />
        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            School Administrator
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            Readiness Trends
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where your school is strongest and where the most students are stuck — averaged across every readiness pillar.
          </p>
        </header>
        <SchoolNav />
        <div className="mt-6">
          <TrendsView data={data} loading={loading} scopeLabel="school" />
        </div>
      </section>
    </SiteShell>
  );
}

export function TrendsView({
  data,
  loading,
  scopeLabel,
}: {
  data: ReadinessTrendData | null;
  loading: boolean;
  scopeLabel: string;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!data || !data.is_admin) {
    return (
      <EmptyCard
        title={`No ${scopeLabel} linked yet`}
        body={`Set up your ${scopeLabel} in the Overview to see readiness trends here.`}
      />
    );
  }
  if (data.total_students === 0) {
    return (
      <EmptyCard
        title="No students yet"
        body="Once students are added, their readiness pillar scores will roll up here."
      />
    );
  }
  if (data.pillar_averages.length === 0) {
    return (
      <EmptyCard
        title="No readiness scores yet"
        body={`${data.total_students} students at ${data.org_name ?? "your " + scopeLabel} but none have readiness pillar scores yet. Scores populate as teams complete assessments.`}
      />
    );
  }
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-card p-5 shadow-soft">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Students with readiness scores
            </p>
            <p className="mt-1 font-display text-3xl">
              {data.scored_students}
              <span className="text-base text-muted-foreground"> / {data.total_students}</span>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            {data.org_name ?? `Your ${scopeLabel}`}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-card shadow-soft">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="font-medium">
            Pillar Averages — sorted lowest to highest
          </h2>
        </div>
        <ul className="divide-y">
          {data.pillar_averages.map((p) => {
            const avg = p.avg_score ?? 0;
            return (
              <li key={p.category} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-medium">{p.category}</div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={avg >= 70 ? "default" : avg >= 55 ? "secondary" : "destructive"}
                      className="min-w-[3rem] justify-center"
                    >
                      {p.avg_score ?? "—"}
                    </Badge>
                  </div>
                </div>
                <Progress value={avg} className="mt-2 h-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  {p.scored_students} students scored ·{" "}
                  <span className="text-amber-600">{p.below_60} below 60</span> ·{" "}
                  <span className="text-destructive">{p.below_50} below 50</span>
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
      <h2 className="font-display text-xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
