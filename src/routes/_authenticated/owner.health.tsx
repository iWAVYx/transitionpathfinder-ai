import { readDashboardWidget } from "@/lib/dashboard/dashboard-widget-read";
import { parseSystemHealthResult } from "@/lib/owner/system-health-result";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  AlertTriangle,
  CircleDashed,
  RefreshCw,
  Loader2,
  Activity,
  Wrench,
  ChevronDown,
  BrainCircuit,
} from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  runSystemHealth,
  type HealthCheck,
  type HealthStatus,
} from "@/lib/owner/system-health.functions";
import { ManualChecklistSection } from "@/components/owner/SystemHealthChecklist";
import {
  runOwnerAiSmokeTest,
  type OwnerAiSmokeTestResult,
} from "@/lib/owner/ai-smoke-test.functions";

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
  return (
    <OwnerShell
      title="System Health"
      description="At-a-glance status of every core flow. Use this before demos or after a release."
    >
      <SystemHealthWorkspace />
    </OwnerShell>
  );
}

function SystemHealthWorkspace() {
  const probe = useServerFn(runSystemHealth);
  const runAiSmokeTest = useServerFn(runOwnerAiSmokeTest);
  const [data, setData] = useState<{
    results: HealthCheck[];
    summary: {
      working: number;
      attention: number;
      manual: number;
      coming_soon: number;
      total: number;
      checked_at: string;
    };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [rerunning, setRerunning] = useState<Record<string, boolean>>({});
  const [aiSmokeRunning, setAiSmokeRunning] = useState(false);
  const [aiSmokeResult, setAiSmokeResult] = useState<OwnerAiSmokeTestResult | null>(null);
  const [aiSmokeError, setAiSmokeError] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);
  const request = useRef<AbortController | null>(null);
  const live = useRef(true);
  const smokePending = useRef(false);

  const load = useCallback(
    async (key?: string) => {
      request.current?.abort();
      const controller = new AbortController();
      request.current = controller;
      setLoadError(null);
      setRefreshing(!key);
      setRerunning(key ? { [key]: true } : {});
      try {
        const result = await readDashboardWidget(controller.signal, (signal) => probe({ signal }));
        const res = parseSystemHealthResult(result);
        if (!live.current || controller.signal.aborted || request.current !== controller) return;
        setData((prev) => {
          if (!key || !prev) return res;
          const updated = res.results.find((item) => item.key === key);
          if (!updated) return res;
          return {
            ...res,
            results: prev.results.map((item) => (item.key === key ? updated : item)),
          };
        });
      } catch {
        if (live.current && !controller.signal.aborted && request.current === controller)
          setLoadError("System checks could not be loaded. Please try again.");
      } finally {
        if (live.current && request.current === controller) {
          request.current = null;
          setLoading(false);
          setRefreshing(false);
          setRerunning({});
        }
      }
    },
    [probe],
  );

  useEffect(() => {
    live.current = true;
    void load();
    return () => {
      live.current = false;
      request.current?.abort();
    };
  }, [load]);

  const refresh = () => load();
  const rerunOne = (key: string) => load(key);

  async function runSyntheticAiSmokeTest() {
    if (smokePending.current) return;
    smokePending.current = true;
    setAiSmokeRunning(true);
    setAiSmokeResult(null);
    setAiSmokeError(null);
    try {
      const result = await runAiSmokeTest();
      if (live.current) setAiSmokeResult(result);
    } catch (error) {
      if (live.current)
        setAiSmokeError(
          error instanceof Error ? error.message : "Lovable AI smoke test did not complete.",
        );
    } finally {
      smokePending.current = false;
      if (live.current) setAiSmokeRunning(false);
    }
  }

  const grouped = data
    ? (Object.keys(CATEGORY_LABEL) as Array<HealthCheck["category"]>).map((cat) => ({
        category: cat,
        items: data.results.filter((r) => r.category === cat),
      }))
    : [];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={refresh}
          disabled={refreshing || loading || Object.keys(rerunning).length > 0}
        >
          {refreshing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Re-run checks
        </Button>
      </div>
      {loadError && (
        <div role="alert" className="mb-4 rounded-lg border border-amber-500/30 p-4 text-sm">
          <p>{loadError}</p>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            Try Again
          </Button>
        </div>
      )}
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 sm:gap-3">
            <SummaryTile
              label="Total checks"
              value={data.summary.total}
              accent="text-foreground"
              Icon={Activity}
            />
            <SummaryTile
              label="Working"
              value={data.summary.working}
              accent="text-emerald-600 dark:text-emerald-400"
              Icon={CheckCircle2}
            />
            <SummaryTile
              label="Needs attention"
              value={data.summary.attention}
              accent="text-amber-600 dark:text-amber-400"
              Icon={AlertTriangle}
            />
            <SummaryTile
              label="Not connected"
              value={data.summary.manual}
              accent="text-muted-foreground"
              Icon={CircleDashed}
            />
            <SummaryTile
              label="Coming soon"
              value={data.summary.coming_soon}
              accent="text-sky-600 dark:text-sky-400"
              Icon={CircleDashed}
            />
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
                      const showDetails = item.status !== "working";
                      return (
                        <li key={item.key} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                          <Icon className={"mt-0.5 h-4 w-4 shrink-0 " + meta.iconClass} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="text-sm font-medium">{item.label}</span>
                              <Badge
                                variant="outline"
                                className={
                                  "text-[10px] font-medium uppercase tracking-wide " + meta.chip
                                }
                              >
                                {meta.label}
                              </Badge>
                            </div>
                            <p className="mt-0.5 break-words text-xs text-muted-foreground">
                              {item.detail}
                            </p>

                            {showDetails && (
                              <div className="mt-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => rerunOne(item.key)}
                                  disabled={Boolean(rerunning[item.key]) || refreshing}
                                  className="h-7 px-2 text-xs"
                                >
                                  {rerunning[item.key] ? (
                                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="mr-1.5 h-3 w-3" />
                                  )}
                                  Re-run this check
                                </Button>
                              </div>
                            )}

                            {showDetails &&
                              (item.error || (item.fixes && item.fixes.length > 0)) && (
                                <details className="group mt-2 rounded-md border border-border/60 bg-muted/30 open:bg-muted/40">
                                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground">
                                    <span className="inline-flex min-w-0 items-center gap-1.5">
                                      <Wrench className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate">
                                        Error details &amp; suggested fixes
                                      </span>
                                    </span>
                                    <ChevronDown className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-180" />
                                  </summary>
                                  <div className="space-y-3 border-t border-border/60 px-3 py-3">
                                    {item.error && (
                                      <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          Raw output
                                        </p>
                                        <pre className="mt-1 max-h-48 overflow-auto rounded bg-background p-2 text-[11px] leading-snug text-foreground/90 ring-1 ring-border whitespace-pre-wrap break-words">
                                          {item.error}
                                        </pre>
                                      </div>
                                    )}
                                    {item.fixes && item.fixes.length > 0 && (
                                      <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                          Suggested fixes
                                        </p>
                                        <ol className="mt-1 list-decimal space-y-1 pl-4 text-xs text-foreground/90">
                                          {item.fixes.map((f, i) => (
                                            <li key={i} className="break-words">
                                              {f}
                                            </li>
                                          ))}
                                        </ol>
                                      </div>
                                    )}
                                    {!item.error && (!item.fixes || item.fixes.length === 0) && (
                                      <p className="text-xs text-muted-foreground">
                                        No additional details captured for this probe.
                                      </p>
                                    )}
                                  </div>
                                </details>
                              )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            ),
          )}

          <ManualChecklistSection />
        </div>
      )}
      <div className="mt-6">
        <section
          aria-labelledby="owner-ai-smoke-heading"
          className="rounded-lg border border-border bg-background p-4"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary" aria-hidden />
                <h2 id="owner-ai-smoke-heading" className="text-sm font-semibold">
                  Lovable AI live smoke test
                </h2>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                  Platform owner only
                </Badge>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                Sends fixed fictional text through the real privacy-redaction and Lovable AI
                pipeline. It accepts no user text, uploads no file, and creates no student,
                document, Pathway Report, or database record.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={runSyntheticAiSmokeTest}
              disabled={aiSmokeRunning}
            >
              {aiSmokeRunning ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <BrainCircuit className="mr-1.5 h-3.5 w-3.5" />
              )}
              {aiSmokeRunning ? "Running once…" : "Run synthetic AI test"}
            </Button>
          </div>

          <div className="mt-3 text-xs" role="status" aria-live="polite">
            {aiSmokeResult ? (
              <p className="text-emerald-700 dark:text-emerald-300">
                Passed in {aiSmokeResult.latencyMs} ms · {aiSmokeResult.redactionCount} synthetic
                identifiers removed · no records saved · checked{" "}
                {new Date(aiSmokeResult.checkedAt).toLocaleString()}
              </p>
            ) : aiSmokeError ? (
              <p className="text-amber-700 dark:text-amber-300">Failed: {aiSmokeError}</p>
            ) : (
              <p className="text-muted-foreground">
                Not run. This check starts only when the TransitionForward platform owner selects
                the button.
              </p>
            )}
          </div>
        </section>
      </div>
    </>
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
