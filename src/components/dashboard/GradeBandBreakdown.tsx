import { GraduationCap } from "lucide-react";

type Student = { id: string; grade_band?: string | null };

const ORDER = [
  "Middle School",
  "9th",
  "10th",
  "11th",
  "12th",
  "18-21 Transition",
  "Post-secondary",
];

function normalize(band: string | null | undefined): string {
  if (!band) return "Not set";
  return band;
}

/**
 * Bins already-loaded students by grade band — pure presentational, no
 * server call. Used in school + district overview dashboards to give admins
 * a quick read on where their caseload sits.
 */
export function GradeBandBreakdown({ students }: { students: Student[] }) {
  if (students.length === 0) return null;
  const counts = new Map<string, number>();
  for (const s of students) {
    const key = normalize(s.grade_band);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const total = students.length;
  const entries = Array.from(counts.entries()).sort((a, b) => {
    const ai = ORDER.indexOf(a[0]);
    const bi = ORDER.indexOf(b[0]);
    if (ai === -1 && bi === -1) return a[0].localeCompare(b[0]);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
        <GraduationCap className="h-3.5 w-3.5" /> Students by grade band
      </div>
      <ul className="mt-4 space-y-3">
        {entries.map(([band, n]) => {
          const pct = Math.round((n / total) * 100);
          return (
            <li key={band}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{band}</span>
                <span className="text-muted-foreground">
                  {n} · {pct}%
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
