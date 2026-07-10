import { FileText, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * IepTranslatorCard — plain-language translation of the current IEP.
 * Mirrors the Report v2 `iep_plan_summary` shape (goals, accommodations,
 * services) but framed for families rather than compliance readers.
 */

export interface IepTranslatorData {
  planDates?: string;
  presentLevels?: string;
  transitionGoals?: {
    area: string;
    plainLanguage: string;
    services?: string[];
  }[];
  accommodations?: string[];
  services?: string[];
  documentsHref?: string;
}

const SAMPLE: Required<IepTranslatorData> = {
  planDates: "Active · March – March",
  presentLevels:
    "Jordan does best in project-based classes with visual instructions and short work blocks. Reading long passages is still tiring; math is a strength when problems are grounded in real-world scenarios.",
  transitionGoals: [
    {
      area: "Education",
      plainLanguage:
        "Enroll in a 2-year design or CS program with disability supports in place.",
      services: ["Guidance counseling", "Transition specialist"],
    },
    {
      area: "Employment",
      plainLanguage: "Hold a paid role tied to a real career interest.",
      services: ["Job coach", "Work-based learning"],
    },
    {
      area: "Independent Living",
      plainLanguage:
        "Travel to work and manage a weekly budget with less adult support.",
      services: ["Travel training", "Life skills group"],
    },
  ],
  accommodations: [
    "Extended time on tests and long assignments",
    "Written directions provided alongside spoken ones",
    "Chunked work with brief scheduled breaks",
    "Visual schedules and checklists",
  ],
  services: [
    "Speech-Language (30 min · weekly)",
    "School Counseling (30 min · biweekly)",
    "Job Coach (60 min · weekly during placement)",
  ],
  documentsHref: "/documents",
};

export function IepTranslatorCard({
  data,
  isSample = true,
}: {
  data?: IepTranslatorData;
  isSample?: boolean;
}) {
  const d: Required<IepTranslatorData> = { ...SAMPLE, ...(data ?? {}) };

  return (
    <section
      aria-labelledby="iep-translator-title"
      className="mt-6 rounded-3xl border bg-card p-6 shadow-soft sm:p-8"
      data-testid="iep-translator-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="min-w-0">
          <p className="tf-eyebrow flex items-center gap-1">
            <FileText className="h-3 w-3" aria-hidden /> IEP + Transition Translator
          </p>
          <h2
            id="iep-translator-title"
            className="mt-1 font-display text-2xl font-medium tracking-tight"
          >
            Your Student's IEP, In Plain Language
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            The same IEP the team reads — translated into what it means for
            your student's day, week, and year.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSample && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary ring-1 ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden /> Sample Preview
            </span>
          )}
          <Link
            to={d.documentsHref}
            className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-background px-3 py-1.5 text-xs font-semibold text-primary no-underline transition-colors hover:border-primary hover:bg-primary/10"
          >
            View The IEP <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </header>

      <div className="mt-5 space-y-4">
        <div className="rounded-2xl border bg-background p-4">
          <p className="tf-eyebrow">Present Levels</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            {d.presentLevels}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {d.planDates}
          </p>
        </div>

        <div className="rounded-2xl border bg-background p-4">
          <p className="tf-eyebrow">Postsecondary Goals</p>
          <ul className="mt-3 space-y-3">
            {d.transitionGoals.map((g) => (
              <li
                key={g.area}
                className="rounded-xl border bg-card p-3 shadow-soft"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {g.area}
                </p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {g.plainLanguage}
                </p>
                {g.services && g.services.length > 0 && (
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    Supported by: {g.services.join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border bg-background p-4">
            <p className="tf-eyebrow">Accommodations</p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {d.accommodations.map((a) => (
                <li
                  key={a}
                  className="flex items-start gap-2 border-b border-dashed border-border/60 pb-1.5 last:border-b-0 last:pb-0"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="text-foreground/90">{a}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border bg-background p-4">
            <p className="tf-eyebrow flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" aria-hidden /> Related Services
            </p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {d.services.map((s) => (
                <li
                  key={s}
                  className="flex items-start gap-2 border-b border-dashed border-border/60 pb-1.5 last:border-b-0 last:pb-0"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span className="text-foreground/90">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-5 text-[11px] italic leading-relaxed text-muted-foreground">
        AI-assisted translation of the uploaded IEP — always verify against the
        signed document. Your case manager can correct any wording that doesn't
        match your student's real plan.
      </p>
    </section>
  );
}
