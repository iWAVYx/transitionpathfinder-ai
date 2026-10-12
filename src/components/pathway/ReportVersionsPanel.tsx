import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { History, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  listReportVersions,
  getReportVersion,
  updateReportContent,
  type ReportVersionRow,
  type PathwayReport,
} from "@/lib/pathway.functions";

export function ReportVersionsPanel({
  reportId,
  currentContent,
  onRestored,
}: {
  reportId: string;
  currentContent: PathwayReport;
  onRestored?: () => void;
}) {
  return <ReportVersionsReader key={reportId} reportId={reportId} currentContent={currentContent} onRestored={onRestored} />;
}

function ReportVersionsReader({ reportId, currentContent, onRestored }: {
  reportId: string;
  currentContent: PathwayReport;
  onRestored?: () => void;
}) {
  const active = useRef(false);
  const restoring = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const list = useServerFn(listReportVersions);
  const fetchVersion = useServerFn(getReportVersion);
  const update = useServerFn(updateReportContent);
  const [versions, setVersions] = useState<ReportVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setLoadError(false);
    setVersions([]);
    list({ data: { report_id: reportId } })
      .then((r) => {
        if (!alive) return;
        if (r.loadFailed) throw new Error("History unavailable");
        setVersions(r.versions);
      })
      .catch(() => { if (alive) { setVersions([]); setLoadError(true); } })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [list, reportId, loadAttempt]);

  async function restore(versionId: string) {
    if (!active.current || restoring.current || loading || loadError) return;
    restoring.current = true;
    setBusyId(versionId);
    try {
      const v = await fetchVersion({ data: { version_id: versionId } });
      if (!active.current) return;
      if (v.id !== versionId || v.report_id !== reportId) throw new Error("That version does not belong to this report.");
      await update({
        data: {
          report_id: reportId,
          content: v.content,
          change_summary: `Restored version ${v.version_number}`,
        },
      });
      if (!active.current) return;
      toast.success(`Restored version ${v.version_number}.`);
      setLoading(true);
      setVersions([]);
      setLoadAttempt(attempt => attempt + 1);
      onRestored?.();
    } catch (err) {
      if (active.current) toast.error(err instanceof Error ? err.message : "Could not restore.");
    } finally {
      restoring.current = false;
      if (active.current) setBusyId(null);
    }
  }

  // Reference currentContent so consumers can rely on revalidation cadence,
  // even though we don't currently diff against it here.
  void currentContent;

  return (
    <div className="no-print rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
          <History className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Version history
          </p>
          <h2 className="mt-2 font-display text-2xl">Past Versions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every time the report is saved, the previous version is kept here so you can
            look back or restore it.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading versions…</p>
        ) : loadError ? (
          <div role="alert" className="rounded-2xl border bg-background p-4">
            <p className="text-sm">We couldn't load this report's earlier versions. Please try again.</p>
            <Button variant="outline" className="mt-3" onClick={() => { setLoading(true); setLoadAttempt(attempt => attempt + 1); }}>Reload Version History</Button>
          </div>
        ) : versions.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-background/60 px-4 py-6 text-center text-sm text-muted-foreground">
            No earlier versions yet. The first edit you save will start the history.
          </p>
        ) : (
          <ul className="divide-y divide-border/60 rounded-2xl border bg-background">
            {versions.map((v) => (
              <li
                key={v.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Version {v.version_number}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Saved {new Date(v.created_at).toLocaleString()}
                    {v.change_summary ? ` · ${v.change_summary}` : ""}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyId !== null}
                  onClick={() => restore(v.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                  {busyId === v.id ? "Restoring…" : "Restore"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
