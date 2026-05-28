import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Loader2, FileText, FolderOpen, Calendar, Users, ListChecks, MessageSquare } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import {
  getAnalyticsSummary,
  type AnalyticsSummary,
  type AnalyticsPoint,
} from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — TransitionForward" }] }),
  component: AnalyticsPage,
});

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="mt-2 font-display text-3xl font-medium">{value}</p>
    </div>
  );
}

function BarList({ title, points }: { title: string; points: AnalyticsPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h3 className="font-display text-base font-medium">{title}</h3>
      {points.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No data yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {points.map((p) => (
            <li key={p.label} className="text-xs">
              <div className="flex justify-between">
                <span className="font-medium capitalize">{p.label.replace(/_/g, " ")}</span>
                <span className="text-muted-foreground">{p.count}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(p.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Sparkline({ points }: { points: AnalyticsPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.count));
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h3 className="font-display text-base font-medium">Reports — last 14 days</h3>
      <div className="mt-4 flex h-32 items-end gap-1">
        {points.map((p) => (
          <div key={p.label} className="flex flex-1 flex-col items-center justify-end" title={`${p.label}: ${p.count}`}>
            <div
              className="w-full rounded-t bg-primary/80"
              style={{ height: `${(p.count / max) * 100}%`, minHeight: 2 }}
            />
            <span className="mt-1 hidden text-[9px] text-muted-foreground sm:inline">{p.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnalyticsPage() {
  const fetchSummary = useServerFn(getAnalyticsSummary);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary({ data: {} })
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setLoading(false));
  }, [fetchSummary]);

  if (loading) {
    return (
      <SiteShell>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </SiteShell>
    );
  }

  if (!summary || summary.scope === "none") {
    return (
      <SiteShell>
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Analytics" }]} />
          <div className="mt-6 rounded-2xl border border-border/60 bg-card p-8 text-center">
            <BarChart3 className="mx-auto h-8 w-8 text-muted-foreground" />
            <h1 className="mt-3 font-display text-2xl font-medium">Analytics</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Analytics are available to platform admins and school/district admins.
            </p>
          </div>
        </div>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Analytics" }]} />

        <header className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {summary.scope === "platform" ? "Platform" : "Organization"} analytics
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Engagement & outcomes
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live numbers from your {summary.scope === "platform" ? "TransitionForward platform" : "organization"}.
          </p>
        </header>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Students" value={summary.totals.students} icon={Users} />
          <Metric label="Pathway reports" value={summary.totals.reports} icon={FileText} />
          <Metric label="Documents" value={summary.totals.documents} icon={FolderOpen} />
          <Metric label="Meetings" value={summary.totals.meetings} icon={Calendar} />
          <Metric label="Open action items" value={summary.totals.action_items_open} icon={ListChecks} />
          <Metric label="Messages" value={summary.totals.messages} icon={MessageSquare} />
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2">
          <Sparkline points={summary.recent_activity} />
          <BarList title="Reports by status" points={summary.reports_by_status} />
          <BarList title="Documents by category" points={summary.documents_by_category} />
          <BarList title="Action items by status" points={summary.action_items_by_status} />
        </section>
      </div>
    </SiteShell>
  );
}
