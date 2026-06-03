import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, TrendingUp, Users, ClipboardList, Mail, FileText, Activity } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { getAdminAnalytics, type AdminAnalytics } from "@/lib/owner/owner.functions";

export const Route = createFileRoute("/_authenticated/owner/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin Hub" }] }),
  component: AnalyticsPage,
});

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: number;
  delta?: string;
  icon: typeof Users;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{value.toLocaleString()}</p>
          {delta && <p className="mt-1 text-xs text-muted-foreground">{delta}</p>}
        </div>
        <div className="rounded-md bg-muted p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data, color = "hsl(var(--primary))" }: { data: { date: string; count: number }[]; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(1, ...data.map((d) => d.count));
  const w = 100;
  const h = 32;
  const step = w / Math.max(1, data.length - 1);
  const points = data
    .map((d, i) => `${(i * step).toFixed(2)},${(h - (d.count / max) * h).toFixed(2)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-10 w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function SeriesCard({
  title,
  series,
  total,
}: {
  title: string;
  series: { date: string; count: number }[];
  total: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
        <span className="text-sm font-semibold">{total}</span>
      </div>
      <div className="mt-3">
        <Sparkline data={series} />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {series[0]?.date} → {series[series.length - 1]?.date}
      </p>
    </div>
  );
}

function StatusTally({ title, map }: { title: string; map: Record<string, number> }) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No data.</p>
      ) : (
        <ul className="mt-3 space-y-1.5">
          {entries.map(([k, v]) => (
            <li key={k} className="flex items-center justify-between text-sm">
              <span className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</span>
              <span className="font-medium">{v}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AnalyticsPage() {
  const fetchAnalytics = useServerFn(getAdminAnalytics);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics({ data: { days } })
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [fetchAnalytics, days]);

  return (
    <OwnerShell
      title="Analytics"
      description="Signups, leads, content publishing, and admin activity."
      actions={
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button
              key={d}
              size="sm"
              variant={days === d ? "default" : "outline"}
              onClick={() => setDays(d as 7 | 30 | 90)}
            >
              {d}d
            </Button>
          ))}
        </div>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading analytics…
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">No analytics available.</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total users" value={data.totals.users} delta={`+${data.recent.users} in ${days}d`} icon={Users} />
            <StatCard label="Waitlist" value={data.totals.waitlist} delta={`+${data.recent.waitlist} in ${days}d`} icon={ClipboardList} />
            <StatCard label="Contacts" value={data.totals.contacts} delta={`+${data.recent.contacts} in ${days}d`} icon={Mail} />
            <StatCard label="Resources published" value={data.totals.resources_published} delta={`${data.totals.resources_pending} pending`} icon={FileText} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <SeriesCard title="Signups" series={data.signup_series} total={data.recent.users} />
            <SeriesCard title="Waitlist" series={data.waitlist_series} total={data.recent.waitlist} />
            <SeriesCard title="Contacts" series={data.contact_series} total={data.recent.contacts} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <StatusTally title="Waitlist by status" map={data.waitlist_by_status} />
            <StatusTally title="Contacts by status" map={data.contacts_by_status} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-border bg-background p-5">
              <h3 className="text-sm font-semibold">Content published</h3>
              <ul className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <li className="flex justify-between"><span className="text-muted-foreground">Blog posts</span><span className="font-medium">{data.totals.blog_published}</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Blog drafts</span><span className="font-medium">{data.totals.blog_drafts}</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">FAQs</span><span className="font-medium">{data.totals.faqs_published}</span></li>
                <li className="flex justify-between"><span className="text-muted-foreground">Testimonials</span><span className="font-medium">{data.totals.testimonials_published}</span></li>
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-background p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Top admin actions ({days}d)</h3>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              {data.action_counts.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No admin activity.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {data.action_counts.slice(0, 10).map((a) => (
                    <li key={a.action_type} className="flex items-center justify-between text-sm">
                      <span className="capitalize text-muted-foreground">{a.action_type.replace(/_/g, " ")}</span>
                      <span className="font-medium">{a.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </OwnerShell>
  );
}
