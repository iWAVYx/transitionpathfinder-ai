import { Link } from "@tanstack/react-router";
import { AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type MissingInput = {
  id: string;
  label: string;
  detail: string;
  ctaLabel: string;
  to: string;
  severity?: "critical" | "recommended";
  done?: boolean;
};

const DEFAULT_INPUTS: MissingInput[] = [
  {
    id: "student-voice",
    label: "Student Voice Missing",
    detail: "Capture what the student wants next in their own words.",
    ctaLabel: "Add Student Voice",
    to: "/voice",
    severity: "critical",
  },
  {
    id: "iep-upload",
    label: "IEP Not Uploaded",
    detail: "Upload the current IEP so the report can translate goals into plain language.",
    ctaLabel: "Upload IEP",
    to: "/documents",
    severity: "critical",
  },
  {
    id: "intake",
    label: "Intake Incomplete",
    detail: "A few intake questions are blank — completing them sharpens matches.",
    ctaLabel: "Finish Intake",
    to: "/onboarding",
    severity: "recommended",
  },
  {
    id: "meeting",
    label: "No Meeting Scheduled",
    detail: "Plan your next PPT / transition meeting so follow-ups don't slip.",
    ctaLabel: "Schedule Meeting",
    to: "/calendar",
    severity: "recommended",
    done: true,
  },
];

interface Props {
  inputs?: MissingInput[];
  className?: string;
}

export function MissingInputsPanel({ inputs = DEFAULT_INPUTS, className }: Props) {
  const open = inputs.filter((i) => !i.done);
  const complete = inputs.length - open.length;

  return (
    <section
      aria-label="Missing inputs"
      className={cn("rounded-3xl border bg-card p-5 shadow-soft sm:p-6", className)}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-lg">Missing Inputs</h3>
          <p className="text-sm text-muted-foreground">
            Fill these to strengthen the Pathway Report.
          </p>
        </div>
        <span className="rounded-full border px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {complete}/{inputs.length} complete
        </span>
      </header>

      {open.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-dashed bg-background/60 p-4 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
          Every input is in — the report is running on full information.
        </div>
      ) : (
        <ul className="space-y-2">
          {open.map((i) => (
            <li
              key={i.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border bg-background/60 p-3"
            >
              <div className="flex min-w-0 items-start gap-2">
                <AlertCircle
                  className={cn(
                    "mt-0.5 h-4 w-4 shrink-0",
                    i.severity === "critical" ? "text-destructive" : "text-amber-600",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{i.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{i.detail}</p>
                </div>
              </div>
              <Link
                to={i.to}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium text-primary transition hover:border-primary/60 hover:bg-primary/5"
              >
                {i.ctaLabel} <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
