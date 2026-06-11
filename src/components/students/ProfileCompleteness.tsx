import { CheckCircle2, Circle } from "lucide-react";
import type { Student, Goal } from "@/lib/students.functions";
import type { DocumentRow } from "@/lib/documents.functions";

type Props = {
  student: Student | null;
  goals: Goal[];
  docs: DocumentRow[];
};

/**
 * Lightweight Profile Completeness chip for the student page header.
 * Pure derivation from data already loaded on the page — no extra fetches,
 * no schema changes. Encourages families/educators to fill in the basics
 * that make the Pathway Report grounded.
 */
export function ProfileCompleteness({ student, goals, docs }: Props) {
  if (!student) return null;

  const checks: { label: string; done: boolean }[] = [
    { label: "Name", done: !!student.first_name?.trim() },
    { label: "Grade band", done: !!student.grade_band },
    { label: "School", done: !!student.school?.trim() },
    { label: "Date of birth", done: !!student.date_of_birth },
    { label: "Notes / context", done: !!student.notes?.trim() },
    { label: "At least one goal", done: goals.length > 0 },
    { label: "At least one document", done: docs.length > 0 },
  ];

  const done = checks.filter((c) => c.done).length;
  const total = checks.length;
  const pct = Math.round((done / total) * 100);
  const label =
    pct === 100
      ? "Profile complete"
      : pct >= 70
        ? "Looking strong"
        : pct >= 40
          ? "Good start"
          : "Just getting started";

  return (
    <div className="mt-6 rounded-2xl border border-border/60 bg-background p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
            Profile completeness
          </p>
          <p className="mt-1 text-sm font-medium">
            {label} · {done} of {total}
          </p>
        </div>
        <span className="font-display text-2xl font-medium tabular-nums">{pct}%</span>
      </div>
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div
          className="h-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {checks.map((c) => (
          <li
            key={c.label}
            className={
              c.done
                ? "flex items-center gap-1.5 text-foreground"
                : "flex items-center gap-1.5 text-muted-foreground"
            }
          >
            {c.done ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            ) : (
              <Circle className="h-3.5 w-3.5" />
            )}
            {c.label}
          </li>
        ))}
      </ul>
      {pct < 100 && (
        <p className="mt-3 text-xs italic text-muted-foreground">
          The more we know, the more grounded the Pathway Report.
        </p>
      )}
    </div>
  );
}
