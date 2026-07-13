import { useState } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export type Severity = 0 | 1 | 2 | 3; // 0 = strong, 3 = urgent gap

export interface HeatmapRow {
  studentId: string;
  studentName: string;
  domains: Record<string, { severity: Severity; note?: string; owner?: string; intervention?: string }>;
}

const DEFAULT_DOMAINS = ["Education", "Employment", "Independent Living", "Community", "Self-Advocacy"];

const SAMPLE_ROWS: HeatmapRow[] = [
  {
    studentId: "s1", studentName: "Jordan R.", domains: {
      Education: { severity: 1 },
      Employment: { severity: 3, note: "No job shadow scheduled.", owner: "Ms. Patel", intervention: "Book vet-clinic shadow by Oct 1." },
      "Independent Living": { severity: 2, intervention: "Travel-training referral." },
      Community: { severity: 1 },
      "Self-Advocacy": { severity: 2 },
    },
  },
  {
    studentId: "s2", studentName: "Kai M.", domains: {
      Education: { severity: 0 },
      Employment: { severity: 1 },
      "Independent Living": { severity: 3, note: "Meal-prep skills gap.", owner: "Home ec.", intervention: "Weekly life-skills group." },
      Community: { severity: 2 },
      "Self-Advocacy": { severity: 1 },
    },
  },
  {
    studentId: "s3", studentName: "Priya S.", domains: {
      Education: { severity: 2 },
      Employment: { severity: 2 },
      "Independent Living": { severity: 1 },
      Community: { severity: 0 },
      "Self-Advocacy": { severity: 3, note: "Rarely speaks at PPT.", owner: "Ms. Chen", intervention: "Self-advocacy coaching cycle." },
    },
  },
];

const SEV_CLASS: Record<Severity, string> = {
  0: "bg-primary/15 text-primary",
  1: "bg-primary/25 text-primary",
  2: "bg-peach/40 text-ink",
  3: "bg-destructive/25 text-destructive tf-status-pulse",
};

const SEV_LABEL: Record<Severity, string> = {
  0: "Strong",
  1: "On Track",
  2: "Watch",
  3: "Urgent",
};

interface Props {
  rows?: HeatmapRow[];
  domains?: string[];
  className?: string;
}

/**
 * Educator-facing readiness heatmap. Rows are students, columns are readiness
 * domains. Click a cell to expand its severity, owner, and recommended
 * intervention.
 */
export function ReadinessHeatmap({ rows = SAMPLE_ROWS, domains = DEFAULT_DOMAINS, className }: Props) {
  const [openCell, setOpenCell] = useState<string | null>(null);

  return (
    <section aria-label="Readiness heatmap" className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}>
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg">Readiness Heatmap</h3>
          <p className="text-sm text-muted-foreground">Tap a cell for owner and intervention.</p>
        </div>
        <ul className="flex flex-wrap gap-1.5 text-[10px]">
          {([0, 1, 2, 3] as Severity[]).map((s) => (
            <li key={s} className={cn("rounded-full px-2 py-0.5 font-semibold uppercase tracking-wider", SEV_CLASS[s])}>
              {SEV_LABEL[s]}
            </li>
          ))}
        </ul>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-1 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 bg-card text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
              {domains.map((d) => (
                <th key={d} className="text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.studentId}>
                <th scope="row" className="sticky left-0 bg-card py-2 pr-2 text-left font-medium">{r.studentName}</th>
                {domains.map((d) => {
                  const cell = r.domains[d];
                  const sev = cell?.severity ?? 0;
                  const cellKey = `${r.studentId}:${d}`;
                  const open = openCell === cellKey;
                  return (
                    <td key={d} className="align-top">
                      <button
                        type="button"
                        onClick={() => setOpenCell(open ? null : cellKey)}
                        className={cn(
                          "block w-full rounded-lg px-2 py-2 text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          SEV_CLASS[sev],
                        )}
                        aria-expanded={open}
                        aria-label={`${r.studentName} ${d}: ${SEV_LABEL[sev]}`}
                      >
                        <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider">
                          {sev === 3 ? <AlertTriangle className="h-3 w-3" /> : null}
                          {SEV_LABEL[sev]}
                        </span>
                        {open && cell ? (
                          <div className="mt-2 space-y-1 rounded-md bg-background/70 p-2 text-[11px] text-foreground animate-fade-in">
                            {cell.note ? <p>{cell.note}</p> : null}
                            {cell.owner ? <p><strong>Owner:</strong> {cell.owner}</p> : null}
                            {cell.intervention ? <p><strong>Next:</strong> {cell.intervention}</p> : null}
                          </div>
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
