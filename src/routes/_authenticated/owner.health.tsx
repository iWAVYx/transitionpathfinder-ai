import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  RefreshCw,
  Loader2,
  Activity,
} from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  runSystemHealth,
  type HealthCheck,
  type HealthStatus,
} from "@/lib/owner/system-health.functions";

export const Route = createFileRoute("/_authenticated/owner/health")({
  head: () => ({ meta: [{ title: "System Health — Admin Hub" }] }),
  component: SystemHealthPage,
});

const STATUS_META: Record<
  HealthStatus,
  { label: string; chip: string; Icon: typeof CheckCircle2; iconClass: string }
> = {
  working: {
    label: "Working",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    Icon: CheckCircle2,
    iconClass: "text-emerald-600 dark:text-emerald-400",
  },
  attention: {
    label: "Needs Attention",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    Icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  manual: {
    label: "Not Connected",
    chip: "bg-muted text-muted-foreground border-border",
    Icon: CircleDashed,
    iconClass: "text-muted-foreground",
  },
  coming_soon: {
    label: "Coming Soon",
    chip: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    Icon: CircleDashed,
    iconClass: "text-sky-600 dark:text-sky-400",
  },
};

const CATEGORY_LABEL: Record<HealthCheck["category"], string> = {
  infra: "Infrastructure",
  people: "Auth & roles",
  data: "Student data flows",
  ops: "Inbound forms",
  ui: "Experience",
};

function SystemHealthPage() {
  const probe = useServerFn(runSystemHealth);
  const [data, setData] = useState<{
    results: HealthCheck[];
    summary: { working: number; attention: number; manual: number; total: number; checked_at: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await probe();
    setData(res);
  }, [probe]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const grouped = data
    ? (Object.keys(CATEGORY_LABEL) as Array<HealthCheck["category"]>).map((cat) => ({
        category: cat,
        items: data.results.filter((r) => r.category === cat),
      }))
    : [];

  return (
    <OwnerShell
      title="System Health"
      description="At-a-glance status of every core flow. Use this before demos or after a release."
      actions={
        <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing || loading}>
          {refreshing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Re-run checks
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Running health checks…
        </div>
      ) : !data ? (
        <p className="text-sm text-muted-foreground">No results.</p>
      ) : (
        <div className="space-y-6">
          {/* Summary band */}
          <div className="grid gap-3 sm:grid-cols-4">
            <SummaryTile label="Total checks" value={data.summary.total} accent="text-foreground" Icon={Activity} />
            <SummaryTile label="Working" value={data.summary.working} accent="text-emerald-600 dark:text-emerald-400" Icon={CheckCircle2} />
            <SummaryTile label="Needs attention" value={data.summary.attention} accent="text-amber-600 dark:text-amber-400" Icon={AlertTriangle} />
            <SummaryTile label="Not connected" value={data.summary.manual} accent="text-muted-foreground" Icon={CircleDashed} />
          </div>

          <p className="text-xs text-muted-foreground">
            Last checked {new Date(data.summary.checked_at).toLocaleString()}. Probes confirm the
            backend is reachable and policies allow a platform admin to read each table — they do
            not yet exercise full end-to-end user flows.
          </p>

          {grouped.map(({ category, items }) =>
            items.length === 0 ? null : (
              <section key={category}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {CATEGORY_LABEL[category]}
                </h2>
                <div className="overflow-hidden rounded-lg border border-border bg-background">
                  <ul className="divide-y divide-border">
                    {items.map((item) => {
                      const meta = STATUS_META[item.status];
                      const Icon = meta.Icon;
                      return (
                        <li key={item.key} className="flex flex-wrap items-start gap-3 px-4 py-3 sm:flex-nowrap">
                          <Icon className={"mt-0.5 h-4 w-4 shrink-0 " + meta.iconClass} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{item.label}</span>
                              <Badge variant="outline" className={"text-[10px] font-medium uppercase tracking-wide " + meta.chip}>
                                {meta.label}
                              </Badge>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </OwnerShell>
  );
}

function SummaryTile({
  label,
  value,
  accent,
  Icon,
}: {
  label: string;
  value: number;
  accent: string;
  Icon: typeof CheckCircle2;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <Icon className={"h-4 w-4 " + accent} />
      </div>
      <p className={"mt-2 text-2xl font-semibold tracking-tight " + accent}>{value}</p>
    </div>
  );
}
