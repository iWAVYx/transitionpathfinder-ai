import { useMemo } from "react";
import { FileCheck2 } from "lucide-react";
import { ProgressRing } from "@/components/effects/ProgressRing";
import { cn } from "@/lib/utils";

export interface DocumentReadinessItem {
  key: string;
  label: string;
  status: "complete" | "missing" | "in_review";
}

const SAMPLE: DocumentReadinessItem[] = [
  { key: "iep", label: "Current IEP", status: "complete" },
  { key: "eval", label: "Latest Evaluation", status: "complete" },
  { key: "consent", label: "Signed Release", status: "in_review" },
  { key: "transcript", label: "High-School Transcript", status: "missing" },
  { key: "voice", label: "Student Voice Summary", status: "complete" },
];

interface Props {
  items?: DocumentReadinessItem[];
  className?: string;
}

/**
 * Compact document-readiness meter. The ring animates once on mount (motion-
 * safe) so families can see progress at a glance without hunting through the
 * checklist below.
 */
export function DocumentReadinessMeter({ items = SAMPLE, className }: Props) {
  const stats = useMemo(() => {
    const complete = items.filter((i) => i.status === "complete").length;
    const total = items.length || 1;
    return {
      complete,
      total,
      pct: Math.round((complete / total) * 100),
      missing: items.filter((i) => i.status === "missing"),
    };
  }, [items]);

  return (
    <section
      aria-label="Document readiness"
      className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5">
        <ProgressRing value={stats.pct} label="Ready" sublabel="docs" />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 shrink-0 text-primary" />
            <h3 className="truncate font-display text-lg">Document Readiness</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {stats.complete} of {stats.total} key documents on file.
          </p>
          {stats.missing.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {stats.missing.map((m) => (
                <li
                  key={m.key}
                  className="rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive"
                >
                  Missing: {m.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs font-medium text-primary">All key docs collected. Nice work.</p>
          )}
        </div>
      </div>
    </section>
  );
}
