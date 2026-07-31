import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw } from "lucide-react";

import { OwnerShell } from "@/components/owner/OwnerShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getContentHealth, type ContentHealthReport } from "@/lib/owner/content-health.functions";
import { dashboardErrorComponent } from "@/components/dashboard/DashboardErrorFallback";

export const Route = createFileRoute("/_authenticated/owner/content-health")({
  head: () => ({
    meta: [
      { title: "Content Health — Admin Hub — TransitionForward" },
      {
        name: "description",
        content:
          "One rollup of decaying content across the resource library, partner network, and opportunity catalogue.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  errorComponent: dashboardErrorComponent("owner"),
  component: ContentHealthPage,
});

const SEVERITY_META = {
  critical: { label: "Critical", icon: AlertTriangle, tone: "text-destructive" },
  warning: { label: "Warning", icon: AlertTriangle, tone: "text-amber-600" },
  info: { label: "Info", icon: Info, tone: "text-muted-foreground" },
} as const;

function ContentHealthPage() {
  const fetchHealth = useServerFn(getContentHealth);
  const navigate = useNavigate();
  const [report, setReport] = useState<ContentHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchHealth()
      .then((r) => {
        if (active) setReport(r as ContentHealthReport);
      })
      .catch(() => {
        if (active) setReport(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchHealth, nonce]);

  const clean = report && report.checks.every((c) => c.count === 0);

  return (
    <OwnerShell
      title="Content Health"
      description="Everything decaying across the resource library, partner network, and opportunity catalogue — in one place."
    >
      <div className="space-y-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {report && (
              <>
                <Badge variant={report.totals.critical > 0 ? "destructive" : "secondary"}>
                  {report.totals.critical} Critical
                </Badge>
                <Badge variant="outline">{report.totals.warning} Warning</Badge>
                <Badge variant="outline">{report.totals.info} Info</Badge>
                <span className="text-xs text-muted-foreground">
                  Checked {new Date(report.generatedAt).toLocaleString()}
                </span>
              </>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setNonce((n) => n + 1)}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-Run Checks
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Scanning content for gaps, staleness, and broken links…</span>
          </div>
        ) : !report ? (
          <p className="text-sm text-muted-foreground">
            Content health checks could not run. Confirm you still hold platform admin access, then
            re-run the checks.
          </p>
        ) : clean ? (
          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 p-4 text-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>No content issues detected. Every published record is complete and current.</span>
          </div>
        ) : (
          <ul className="divide-y divide-border border-y border-border/70">
            {report.checks
              .filter((c) => c.count > 0)
              .map((c) => {
                const meta = SEVERITY_META[c.severity];
                const Icon = meta.icon;
                return (
                  <li key={c.key} className="py-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:justify-between">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${meta.tone}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight">{c.title}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{c.description}</p>
                          {c.samples.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {c.samples.map((s) => (
                                <li key={s.id} className="truncate text-[11px] text-muted-foreground">
                                  • {s.label}
                                  {s.detail ? ` — ${s.detail}` : ""}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <span className={`font-display text-2xl ${meta.tone}`}>{c.count}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate({ to: c.to })}
                          aria-label={`Resolve ${c.title}`}
                        >
                          Resolve
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </OwnerShell>
  );
}
