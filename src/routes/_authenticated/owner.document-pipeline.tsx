import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { OwnerShell } from "@/components/owner/OwnerShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  listDocumentPipelineRuns,
  type PipelineRunRow,
  type PipelineRunSummary,
  type PipelineStage,
  type PipelineStatus,
} from "@/lib/owner/document-pipeline-runs.functions";

export const Route = createFileRoute("/_authenticated/owner/document-pipeline")({
  head: () => ({ meta: [{ title: "Document Pipeline — Admin Hub" }] }),
  component: DocumentPipelinePage,
});

const STAGES: PipelineStage[] = ["upload", "sniff", "hash", "extract", "verify", "publish"];
const STATUSES: PipelineStatus[] = [
  "pending",
  "running",
  "succeeded",
  "failed",
  "quarantined",
  "skipped",
];

const STATUS_CHIP: Record<PipelineStatus, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  running: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
  succeeded: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  failed: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
  quarantined: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
  skipped: "bg-muted text-muted-foreground border-border",
};

function DocumentPipelinePage() {
  const load = useServerFn(listDocumentPipelineRuns);
  const [rows, setRows] = useState<PipelineRunRow[]>([]);
  const [summary, setSummary] = useState<PipelineRunSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<PipelineStage | "">("");
  const [status, setStatus] = useState<PipelineStatus | "">("");
  const [windowHours, setWindowHours] = useState(72);

  const fetchRuns = useCallback(async () => {
    setError(null);
    try {
      const res = await load({
        data: {
          stage: stage || undefined,
          status: status || undefined,
          window_hours: windowHours,
          limit: 200,
        },
      });
      setRows(res.runs);
      setSummary(res.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [load, stage, status, windowHours]);

  useEffect(() => {
    setLoading(true);
    fetchRuns().finally(() => setLoading(false));
  }, [fetchRuns]);

  async function refresh() {
    setRefreshing(true);
    try {
      await fetchRuns();
    } finally {
      setRefreshing(false);
    }
  }

  const grouped = useMemo(() => {
    const byCorr = new Map<string, PipelineRunRow[]>();
    for (const r of rows) {
      const list = byCorr.get(r.correlation_id) ?? [];
      list.push(r);
      byCorr.set(r.correlation_id, list);
    }
    return Array.from(byCorr.entries())
      .map(([correlation_id, items]) => ({
        correlation_id,
        items: items.sort((a, b) => (a.created_at < b.created_at ? -1 : 1)),
        latest: items.reduce((max, r) => (r.created_at > max ? r.created_at : max), items[0].created_at),
      }))
      .sort((a, b) => (a.latest < b.latest ? 1 : -1));
  }, [rows]);

  return (
    <OwnerShell
      title="Document Pipeline"
      description="Live view of every upload → sniff → hash → extract → verify → publish attempt. Watch quarantines and failed extracts in real time."
      actions={
        <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing || loading}>
          {refreshing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          )}
          Refresh
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading pipeline runs…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-700 dark:text-red-300">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="space-y-6">
          {summary && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 sm:gap-3">
              <SummaryTile label="Total runs" value={summary.total} accent="text-foreground" />
              <SummaryTile label="Succeeded" value={summary.by_status.succeeded} accent="text-emerald-600 dark:text-emerald-400" />
              <SummaryTile label="Failed" value={summary.failed} accent="text-red-600 dark:text-red-400" />
              <SummaryTile label="Quarantined" value={summary.quarantined} accent="text-amber-600 dark:text-amber-400" />
              <SummaryTile label="Skipped" value={summary.by_status.skipped} accent="text-muted-foreground" />
              <SummaryTile label={`Window (h)`} value={summary.window_hours} accent="text-foreground" />
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-background p-3">
            <FilterSelect
              label="Stage"
              value={stage}
              onChange={(v) => setStage(v as PipelineStage | "")}
              options={[{ value: "", label: "All stages" }, ...STAGES.map((s) => ({ value: s, label: s }))]}
            />
            <FilterSelect
              label="Status"
              value={status}
              onChange={(v) => setStatus(v as PipelineStatus | "")}
              options={[{ value: "", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: s }))]}
            />
            <FilterSelect
              label="Window"
              value={String(windowHours)}
              onChange={(v) => setWindowHours(Number(v))}
              options={[
                { value: "24", label: "Last 24h" },
                { value: "72", label: "Last 72h" },
                { value: "168", label: "Last 7d" },
                { value: "720", label: "Last 30d" },
              ]}
            />
          </div>

          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pipeline runs in the selected window.</p>
          ) : (
            <div className="space-y-3">
              {grouped.map((group) => (
                <details
                  key={group.correlation_id}
                  className="group overflow-hidden rounded-lg border border-border bg-background"
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2 hover:bg-muted/40">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {group.correlation_id}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(group.latest).toLocaleString()} · {group.items.length} row{group.items.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {group.items.map((r) => (
                        <Badge
                          key={r.id}
                          variant="outline"
                          className={`text-[10px] font-medium uppercase tracking-wide ${STATUS_CHIP[r.status]}`}
                        >
                          {r.stage}·{r.status}
                        </Badge>
                      ))}
                    </div>
                  </summary>
                  <div className="border-t border-border/60">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          <th className="px-3 py-1.5">Stage</th>
                          <th className="px-3 py-1.5">Status</th>
                          <th className="px-3 py-1.5">Attempt</th>
                          <th className="px-3 py-1.5">Latency</th>
                          <th className="px-3 py-1.5">Error</th>
                          <th className="px-3 py-1.5">When</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((r) => (
                          <tr key={r.id} className="border-t border-border/60 align-top">
                            <td className="px-3 py-1.5 font-medium">{r.stage}</td>
                            <td className="px-3 py-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-medium uppercase tracking-wide ${STATUS_CHIP[r.status]}`}
                              >
                                {r.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-1.5">{r.attempt}</td>
                            <td className="px-3 py-1.5">{r.latency_ms != null ? `${r.latency_ms} ms` : "—"}</td>
                            <td className="px-3 py-1.5">
                              {r.error_code ? (
                                <span className="font-mono text-[11px] text-red-600 dark:text-red-400">
                                  {r.error_code}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                              {r.error_message && (
                                <div className="mt-0.5 max-w-md truncate text-[11px] text-muted-foreground" title={r.error_message}>
                                  {r.error_message}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {new Date(r.created_at).toLocaleTimeString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="border-t border-border/60 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                      Document{" "}
                      <span className="font-mono text-foreground/80">{group.items[0].document_id}</span>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      )}
    </OwnerShell>
  );
}

function SummaryTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-tight ${accent}`}>{value}</p>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border bg-background px-2 text-xs"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
