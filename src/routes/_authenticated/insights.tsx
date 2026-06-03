import { createFileRoute } from "@tanstack/react-router";
import { RoleGuard } from "@/components/RoleGuard";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BarChart3, Users, Sparkles, Calendar, FileText, MessageCircle } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { InfoBox } from "@/components/site/InfoBox";
import { getEngagementInsights, type EngagementInsights } from "@/lib/insights.functions";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({ meta: [{ title: "Engagement Insights — TransitionForward" }] }),
  component: () => (<RoleGuard path="/insights"><InsightsPage /></RoleGuard>),
});

function InsightsPage() {
  const fetchInsights = useServerFn(getEngagementInsights);
  const [data, setData] = useState<EngagementInsights | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoadError(null);
    let cancelled = false;
    fetchInsights()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err) => {
        if (!cancelled)
          setLoadError(err instanceof Error ? err.message : "Couldn't load insights.");
      });
    return () => {
      cancelled = true;
    };
  }, [fetchInsights, tick]);

  return (
    <SiteShell>
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 lg:px-8">
        <Breadcrumbs trail={[{ label: "Dashboard", to: "/dashboard" }, { label: "Insights" }]} />
      </div>
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">District Insights</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          See How Transition Planning Is Moving.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          A future-facing view of family engagement, student voice, meeting prep, and common needs
          across your roster.
        </p>

        <InfoBox label="What this view shows" className="mt-6 max-w-2xl">
          Aggregate counts across every student you have access to. Numbers respect privacy — you
          only see data for students you're already connected to.
        </InfoBox>

        {loadError ? (
          <div className="mt-10 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <p className="font-medium text-destructive">{loadError}</p>
            <button
              type="button"
              onClick={() => {
                setData(null);
                setTick((t) => t + 1);
              }}
              className="mt-3 inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Try again
            </button>
          </div>
        ) : !data ? (
          <p className="mt-10 text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Kpi icon={<Sparkles className="h-4 w-4" />} label="Student Voice profiles" value={data.studentVoiceProfiles} />
              <Kpi icon={<Users className="h-4 w-4" />} label="Family Input forms" value={data.familyInputForms} />
              <Kpi icon={<FileText className="h-4 w-4" />} label="Pathway Reports" value={data.pathwayReports} />
              <Kpi icon={<Calendar className="h-4 w-4" />} label="Meetings completed" value={data.meetingsCompleted} />
              <Kpi icon={<Calendar className="h-4 w-4" />} label="Meetings upcoming" value={data.meetingsUpcoming} />
              <Kpi icon={<FileText className="h-4 w-4" />} label="Forms completed" value={data.formsCompleted} />
              <Kpi icon={<MessageCircle className="h-4 w-4" />} label="Messages posted" value={data.messagesPosted} />
              <Kpi icon={<BarChart3 className="h-4 w-4" />} label="Active families (7d)" value={data.activeFamiliesLast7d} />
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <BarList title="Top career interests" items={data.topCareerInterests} />
              <BarList title="Common life-skill needs" items={data.topLifeSkills} />
            </div>
          </>
        )}
      </section>
    </SiteShell>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-primary">{icon}<span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span></div>
      <p className="mt-2 font-display text-3xl font-medium">{value}</p>
    </div>
  );
}

function BarList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="font-display text-lg">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Not enough data yet.</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {items.map((i) => (
            <li key={i.label}>
              <div className="flex items-center justify-between text-sm">
                <span>{i.label}</span>
                <span className="text-muted-foreground">{i.count}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(i.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
