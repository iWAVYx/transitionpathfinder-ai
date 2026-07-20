/**
 * Health tab for the Operator Console — platform admins only.
 * Renders SLO cards, recent errors, trace explorer, and infrastructure chips.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, AlertCircle, Search, Copy, Check } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getSloStatus,
  listRecentErrors,
  getTrace,
  getInfrastructureHealth,
  type SloRow,
  type ObsEventRow,
  type InfraHealth,
} from "@/lib/obs/health.functions";

const WINDOWS: Array<{ label: string; hours: number }> = [
  { label: "1h", hours: 1 },
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
];

export function HealthTab() {
  const [windowHours, setWindowHours] = useState(24);

  return (
    <div className="space-y-8">
      <div className="flex items-end gap-3">
        <div>
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Time range</Label>
          <div className="mt-1 flex gap-1">
            {WINDOWS.map((w) => (
              <Button
                key={w.hours}
                size="sm"
                variant={windowHours === w.hours ? "default" : "outline"}
                onClick={() => setWindowHours(w.hours)}
              >
                {w.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <InfrastructurePanel />
      <SloCards windowHours={windowHours} />
      <RecentErrorsTable windowHours={windowHours} />
      <TraceExplorer />
    </div>
  );
}

// ---------- Infrastructure ----------

function InfrastructurePanel() {
  const fetchInfra = useServerFn(getInfrastructureHealth);
  const [data, setData] = useState<InfraHealth | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    fetchInfra()
      .then(setData)
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [fetchInfra]);

  if (err) {
    return <p className="text-sm text-destructive">{err}</p>;
  }
  if (!data) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading infrastructure…</div>;
  }

  const chips = [
    { label: "Emails sent (24h)", value: data.email_sent_24h, tone: "ok" as const },
    { label: "Emails failed (24h)", value: data.email_failed_24h, tone: data.email_failed_24h > 0 ? ("warn" as const) : ("ok" as const) },
    { label: "Emails suppressed (24h)", value: data.email_suppressed_24h, tone: "muted" as const },
    { label: "Obs events (24h)", value: data.obs_events_24h, tone: "muted" as const },
    { label: "Obs errors (24h)", value: data.obs_errors_24h, tone: data.obs_errors_24h > 0 ? ("warn" as const) : ("ok" as const) },
  ];

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Infrastructure</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {chips.map((c) => (
          <div key={c.label} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`mt-1 text-2xl font-medium ${c.tone === "warn" ? "text-amber-600" : c.tone === "ok" ? "text-emerald-600" : ""}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ---------- SLO cards ----------

function sloTone(row: SloRow): "ok" | "warn" | "crit" {
  if (row.availability < row.availability_target - 0.01) return "crit";
  if (row.availability < row.availability_target) return "warn";
  if (row.p95_ms && row.p95_ms > row.latency_p95_target * 1.5) return "crit";
  if (row.p95_ms && row.p95_ms > row.latency_p95_target) return "warn";
  return "ok";
}

function SloCards({ windowHours }: { windowHours: number }) {
  const fetchSlo = useServerFn(getSloStatus);
  const [rows, setRows] = useState<SloRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setErr(null);
    fetchSlo({ data: { window_hours: windowHours } })
      .then((r) => setRows(r.rows))
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load"));
  }, [fetchSlo, windowHours]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">SLO Status</h2>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {!rows && !err && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading SLOs…</div>}
      {rows && rows.length === 0 && (
        <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
          No instrumented server functions have reported events in this window yet. Wrap server-side work with <code>withSpan()</code> from <code>@/lib/obs/instrument.server</code> to populate this view.
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const tone = sloTone(r);
            const toneClass = tone === "crit" ? "border-rose-300 bg-rose-50" : tone === "warn" ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50/40";
            return (
              <div key={r.server_fn} className={`rounded-lg border p-4 ${toneClass}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-sm font-semibold">{r.server_fn}</p>
                  <Badge variant={tone === "crit" ? "destructive" : tone === "warn" ? "secondary" : "outline"}>
                    {tone.toUpperCase()}
                  </Badge>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Availability</dt>
                    <dd className="font-medium">{(r.availability * 100).toFixed(2)}% / {(r.availability_target * 100).toFixed(1)}%</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Volume</dt>
                    <dd className="font-medium">{r.total_count} ({r.error_count} err)</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">p50</dt>
                    <dd className="font-medium">{r.p50_ms != null ? `${Math.round(r.p50_ms)}ms` : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">p95 / target</dt>
                    <dd className="font-medium">{r.p95_ms != null ? `${Math.round(r.p95_ms)}ms` : "—"} / {r.latency_p95_target}ms</dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

// ---------- Recent errors ----------

function RecentErrorsTable({ windowHours }: { windowHours: number }) {
  const fetchErrors = useServerFn(listRecentErrors);
  const [rows, setRows] = useState<ObsEventRow[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const reload = useCallback(() => {
    setRows(null);
    fetchErrors({ data: { window_hours: windowHours, limit: 50 } })
      .then((r) => setRows(r.rows))
      .catch(() => setRows([]));
  }, [fetchErrors, windowHours]);
  useEffect(reload, [reload]);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent Errors</h2>
        <Button size="sm" variant="outline" onClick={reload}>Refresh</Button>
      </div>
      {!rows && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>}
      {rows && rows.length === 0 && <p className="text-sm text-muted-foreground">No errors in this window. 🎉</p>}
      {rows && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Server Fn</th>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Duration</th>
                <th className="px-3 py-2">Error</th>
                <th className="px-3 py-2">Trace</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: ObsEventRow) => (
                <>
                  <tr key={r.id} className="border-t hover:bg-muted/20 cursor-pointer" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{new Date(r.ts).toLocaleString()}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.server_fn ?? "—"}</td>
                    <td className="px-3 py-2"><Badge variant="destructive">{r.severity}</Badge></td>
                    <td className="px-3 py-2 text-xs">{r.duration_ms ?? "—"}ms</td>
                    <td className="px-3 py-2 text-xs max-w-[280px] truncate">{r.error?.message ?? "—"}</td>
                    <td className="px-3 py-2">
                      <CopyTraceBtn traceId={r.trace_id} />
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-x`} className="border-t bg-muted/10">
                      <td colSpan={6} className="px-3 py-3">
                        <div className="text-xs space-y-2">
                          {r.error?.stack && (
                            <pre className="whitespace-pre-wrap rounded bg-slate-900 text-slate-100 p-2 overflow-x-auto text-[11px]">{r.error.stack}</pre>
                          )}
                          {Object.keys(r.attributes ?? {}).length > 0 && (
                            <pre className="whitespace-pre-wrap rounded bg-muted/40 p-2 text-[11px]">{JSON.stringify(r.attributes, null, 2)}</pre>
                          )}
                          <div className="text-muted-foreground">trace_id: <code>{r.trace_id}</code> · span_id: <code>{r.span_id}</code></div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function CopyTraceBtn({ traceId }: { traceId: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(traceId);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

// ---------- Trace explorer ----------

function TraceExplorer() {
  const fetchTrace = useServerFn(getTrace);
  const [traceId, setTraceId] = useState("");
  const [rows, setRows] = useState<ObsEventRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onLoad(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setRows(null);
    setBusy(true);
    try {
      const r = await fetchTrace({ data: { trace_id: traceId.trim() } });
      setRows(r.rows);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load trace");
    } finally {
      setBusy(false);
    }
  }

  const totalMs = useMemo(() => {
    if (!rows?.length) return 0;
    return rows.reduce((s, r) => s + (r.duration_ms ?? 0), 0);
  }, [rows]);

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Trace Explorer</h2>
      <form className="flex gap-2" onSubmit={onLoad}>
        <Input
          value={traceId}
          onChange={(e) => setTraceId(e.target.value)}
          placeholder="Paste a trace_id (uuid)"
          className="font-mono text-xs"
        />
        <Button type="submit" disabled={busy || !traceId.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </form>
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
      {rows && rows.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No spans found for that trace.</p>}
      {rows && rows.length > 0 && (
        <div className="mt-4 space-y-1">
          {rows.map((r: ObsEventRow) => {
            const pct = totalMs > 0 && r.duration_ms ? Math.max(2, (r.duration_ms / totalMs) * 100) : 2;
            return (
              <div key={r.id} className="rounded border p-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-mono truncate">{r.server_fn ?? r.route ?? "(unnamed)"}</span>
                  <span className="text-muted-foreground">{r.duration_ms ?? "?"}ms</span>
                </div>
                <div className="mt-1 h-1.5 rounded bg-muted overflow-hidden">
                  <div className={`h-full ${r.status === "ok" ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
