import { useEffect, useState } from "react";
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
  const list = useServerFn(listReportVersions);
  const fetchVersion = useServerFn(getReportVersion);
  const update = useServerFn(updateReportContent);
  const [versions, setVersions] = useState<ReportVersionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    list({ data: { report_id: reportId } })
      .then((r) => alive && setVersions(r.versions))
      .catch(() => alive && setVersions([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [list, reportId]);

  async function restore(versionId: string) {
    setBusyId(versionId);
    try {
      const v = await fetchVersion({ data: { version_id: versionId } });
      await update({
        data: {
          report_id: reportId,
          content: v.content,
          change_summary: `Restored version ${v.version_number}`,
        },
      });
      toast.success(`Restored version ${v.version_number}.`);
      const r = await list({ data: { report_id: reportId } });
      setVersions(r.versions);
      onRestored?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore.");
    } finally {
      setBusyId(null);
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
                  disabled={busyId === v.id}
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
