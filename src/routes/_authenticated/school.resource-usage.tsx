import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen, Loader2, ExternalLink, Users } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { RoleGuard } from "@/components/RoleGuard";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { SchoolNav } from "@/components/school/SchoolNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { ensureRoleAccess } from "@/lib/route-role-guard";
import {
  getSchoolResourceUsage,
  type SchoolResourceUsage,
} from "@/lib/school-insights.functions";

export const Route = createFileRoute("/_authenticated/school/resource-usage")({
  beforeLoad: () => ensureRoleAccess(["school_admin", "admin"]),
  head: () => ({
    meta: [
      { title: "Resource Usage — TransitionForward" },
      {
        name: "description",
        content:
          "Which transition guides and checklists your school team has bookmarked most — a quick view of what's actually being shared.",
      },
    ],
  }),
  component: () => (
    <RoleGuard path="/school/resource-usage">
      <SchoolResourceUsagePage />
    </RoleGuard>
  ),
});

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

function SchoolResourceUsagePage() {
  const fetchUsage = useServerFn(getSchoolResourceUsage);
  const [data, setData] = useState<SchoolResourceUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchUsage({ data: {} });
        if (alive) setData(d);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [fetchUsage]);

  return (
    <SiteShell>
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <Breadcrumbs
          trail={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "School Administration", to: "/school/overview" },
            { label: "Resource Usage" },
          ]}
        />
        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            School Administrator
          </p>
          <h1 className="mt-1 font-display text-3xl tracking-tight sm:text-4xl">
            Resource Usage
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Top guides and checklists bookmarked by your school team — sorted by save count.
          </p>
        </header>
        <SchoolNav />
        <div className="mt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !data || !data.is_school_admin ? (
            <Empty title="No school linked yet" body="Set up your school in the Overview to track resource usage." />
          ) : data.team_size === 0 ? (
            <Empty title="No team yet" body="Invite school administrators and educators to your school so their saved resources roll up here." />
          ) : data.top_resources.length === 0 ? (
            <Empty
              title="No resources bookmarked yet"
              body={`${data.team_size} team members at ${data.org_name ?? "your school"} — none have saved a resource yet. Encourage the team to bookmark what they share with families.`}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <StatCard label="Team members" value={data.team_size} icon={<Users className="h-4 w-4 text-primary" />} />
                <StatCard label="Total saves" value={data.total_saves} icon={<BookOpen className="h-4 w-4 text-primary" />} />
                <StatCard label="Unique resources" value={data.top_resources.length} icon={<BookOpen className="h-4 w-4 text-primary" />} />
              </div>
              <div className="rounded-2xl border bg-card shadow-soft">
                <div className="flex items-center gap-2 border-b px-5 py-4">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <h2 className="font-medium">Top {data.top_resources.length} resources</h2>
                </div>
                <ul className="divide-y">
                  {data.top_resources.map((r) => (
                    <li key={r.resource_id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{r.title ?? "Untitled resource"}</span>
                          {r.category && <Badge variant="secondary">{r.category}</Badge>}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Last saved {fmtDate(r.last_saved_at)} · {r.savers} teammate{r.savers === 1 ? "" : "s"}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="min-w-[3rem] justify-center">{r.save_count}</Badge>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/resources/saved">
                            Open <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
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

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
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
