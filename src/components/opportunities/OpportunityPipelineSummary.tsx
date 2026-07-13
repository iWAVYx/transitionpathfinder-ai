import { useEffect, useState } from "react";
import { CalendarClock, TrendingUp, AlertTriangle, ExternalLink } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  snapshotForStudent,
  type PipelineSnapshot,
  type LifecycleStage,
} from "@/lib/opportunity-pipeline-store";

const STAGE_LABEL: Record<LifecycleStage, string> = {
  saved: "Saved",
  contacted: "Contacted",
  applied: "Applied",
  enrolled: "Enrolled",
  not_a_fit: "Not a fit",
};

const STAGE_TONE: Record<LifecycleStage, string> = {
  saved: "bg-muted text-foreground",
  contacted: "bg-sky-100 text-sky-900",
  applied: "bg-amber-100 text-amber-900",
  enrolled: "bg-emerald-100 text-emerald-900",
  not_a_fit: "bg-rose-100 text-rose-900",
};

/**
 * OpportunityPipelineSummary — compact block embedded into the Pathway Report
 * and the shared transition plan view. Reads the same client-side pipeline
 * data that /opportunities writes, so status and deadlines follow the report
 * across contexts.
 */
export function OpportunityPipelineSummary({
  studentId,
  partnerName,
  studentDisplayName,
  compact = false,
}: {
  studentId: string;
  /** Optional lookup for partner display names, keyed by partner_id. */
  partnerName?: (partnerId: string) => string | null;
  studentDisplayName?: string;
  compact?: boolean;
}) {
  const [snap, setSnap] = useState<PipelineSnapshot | null>(null);

  useEffect(() => {
    setSnap(snapshotForStudent(studentId));
    function onStorage(e: StorageEvent) {
      if (
        e.key === null ||
        e.key === "tf.opportunity-lifecycle.v1" ||
        e.key === "tf.opportunity-deadlines.v1"
      ) {
        setSnap(snapshotForStudent(studentId));
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [studentId]);

  if (!snap) return null;
  if (snap.totalTracked === 0 && snap.upcoming.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="font-medium text-foreground">Opportunity pipeline</span>
        </div>
        <p className="mt-1 text-xs">
          {studentDisplayName ?? "This student"} has no saved opportunities yet. Save partner
          matches on the Opportunities page to see pipeline progress and deadlines here.
        </p>
      </div>
    );
  }

  const stages: LifecycleStage[] = ["saved", "contacted", "applied", "enrolled", "not_a_fit"];
  const soon = snap.upcoming.filter((u) => u.daysAway >= 0 && u.daysAway <= 30);
  const overdueItems = snap.upcoming.filter((u) => u.daysAway < 0);

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-medium">Opportunity Pipeline</h4>
        </div>
        <div className="text-xs text-muted-foreground">
          {snap.totalTracked} tracked · {snap.activePct}% actively engaged
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {stages.map((s) => (
          <Badge key={s} variant="secondary" className={`${STAGE_TONE[s]} text-[11px]`}>
            {STAGE_LABEL[s]}: {snap.counts[s]}
          </Badge>
        ))}
      </div>

      {!compact && (overdueItems.length > 0 || soon.length > 0) && (
        <div className="mt-4 rounded-xl border bg-background p-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Upcoming Deadlines</p>
            {overdueItems.length > 0 && (
              <Badge variant="destructive" className="gap-1 text-[10px]">
                <AlertTriangle className="h-3 w-3" /> {overdueItems.length} past due
              </Badge>
            )}
          </div>
          <ul className="mt-2 divide-y">
            {[...overdueItems, ...soon].slice(0, 6).map((u) => {
              const label = partnerName?.(u.partnerId) ?? "Saved opportunity";
              const overdue = u.daysAway < 0;
              const soon30 = u.daysAway >= 0 && u.daysAway <= 7;
              return (
                <li
                  key={u.partnerId}
                  className="flex flex-wrap items-center justify-between gap-2 py-2 text-xs"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Due {new Date(u.dueIso).toLocaleDateString()}
                      {u.stage && ` · ${STAGE_LABEL[u.stage]}`}
                    </p>
                  </div>
                  {overdue ? (
                    <Badge variant="destructive" className="text-[10px]">
                      {Math.abs(u.daysAway)}d past due
                    </Badge>
                  ) : soon30 ? (
                    <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 text-[10px]">
                      In {u.daysAway}d
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">
                      In {u.daysAway}d
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
          {snap.upcoming.length > 6 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              +{snap.upcoming.length - 6} more deadlines tracked on the Opportunities page.
            </p>
          )}
        </div>
      )}

      <p className="mt-3 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <ExternalLink className="h-3 w-3" />
        Update stages and deadlines from the Opportunities page.
      </p>
    </div>
  );
}
