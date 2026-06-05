import { useMemo } from "react";
import { useFormContext, useWatch } from "react-hook-form";

const TRACKED = [
  "student_first_name",
  "grade_band",
  "strengths",
  "interests",
  "needs",
  "supports",
  "transportation",
  "communication",
  "current_goals",
  "student_voice",
  "family_voice",
  "educator_input",
  "family_concerns",
] as const;

/**
 * Live progress bar for the pathway intake form.
 * Shows percent of optional + required fields the user has filled.
 * Required: student_first_name. Everything else is encouraged.
 */
export function FormProgress() {
  const { control } = useFormContext();
  const values = useWatch({ control, name: TRACKED as unknown as string[] }) as
    | (string | undefined)[]
    | undefined;

  const { filled, total, pct } = useMemo(() => {
    const arr = values ?? [];
    const total = TRACKED.length;
    const filled = arr.filter((v) => typeof v === "string" && v.trim().length > 0).length;
    return { filled, total, pct: Math.round((filled / total) * 100) };
  }, [values]);

  const label =
    pct === 0
      ? "Start anywhere — even one or two fields is fine."
      : pct < 40
        ? "Nice start. The more you share, the more grounded the report."
        : pct < 80
          ? "Looking good. You can generate now or keep adding voices."
          : "Plenty to work with. Hit generate whenever you're ready.";

  return (
    <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-foreground">
          Pathway intake · {filled} of {total} fields
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div
        className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Form completion"
      >
        <div
          className="h-full bg-primary transition-[width] duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-xs italic text-muted-foreground">{label}</p>
    </div>
  );
}
