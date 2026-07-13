import { Sparkles, AlertTriangle, CheckCircle2, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils";
import { toTitleCase } from "@/lib/title-case";

export type ExtractedSignal = {
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
  section?: string;
};

export interface DocumentSignalsCardProps {
  documentTitle?: string;
  signals?: ExtractedSignal[];
  humanReviewNeeded?: boolean;
  fedIntoReport?: boolean;
  className?: string;
}

const DEFAULT_SIGNALS: ExtractedSignal[] = [
  { label: "Primary Disability", value: "Specific Learning Disability", confidence: "high", section: "Eligibility" },
  { label: "Transition Goal (Employment)", value: "Culinary trades apprenticeship", confidence: "medium", section: "Postsecondary Goals" },
  { label: "Accommodations", value: "Extended time · Small-group setting · Read-aloud", confidence: "high", section: "Accommodations" },
  { label: "Reading Level", value: "Grade 6.2 (Winter benchmark)", confidence: "medium", section: "Present Levels" },
  { label: "Self-Determination Skills", value: "Emerging — needs modeling", confidence: "low", section: "Present Levels" },
];

const TONE: Record<ExtractedSignal["confidence"], string> = {
  high: "bg-emerald-100 text-emerald-900",
  medium: "bg-amber-100 text-amber-900",
  low: "bg-destructive/10 text-destructive",
};

export function DocumentSignalsCard({
  documentTitle = "Current IEP (April Draft)",
  signals = DEFAULT_SIGNALS,
  humanReviewNeeded = true,
  fedIntoReport = true,
  className,
}: DocumentSignalsCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-soft sm:p-6",
        className,
      )}
      aria-labelledby="signals-heading"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="tf-eyebrow inline-flex items-center gap-1.5">
            <FileSearch className="h-3 w-3" /> {toTitleCase("Extracted Signals")}
          </p>
          <h3
            id="signals-heading"
            className="mt-1 font-display text-xl leading-tight tracking-tight sm:text-2xl"
          >
            {toTitleCase(documentTitle)}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            What our AI read from this document. Every value can be edited, kept, or rejected in review.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {fedIntoReport && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
              <Sparkles className="h-3 w-3" /> Fed into Pathway Report
            </span>
          )}
          {humanReviewNeeded && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
              <AlertTriangle className="h-3 w-3" /> Human Review Needed
            </span>
          )}
        </div>
      </header>

      <ul className="mt-4 divide-y rounded-xl border">
        {signals.map((s) => (
          <li key={s.label} className="flex flex-wrap items-start justify-between gap-3 p-3 sm:p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{toTitleCase(s.label)}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{s.value}</p>
              {s.section && (
                <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground/80">
                  {s.section}
                </p>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                TONE[s.confidence],
              )}
            >
              {s.confidence === "high" ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {s.confidence} confidence
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] text-muted-foreground">
        AI-assisted extraction. A human on your team should confirm each value before it appears in the final Pathway Report.
      </p>
    </section>
  );
}
