import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ShieldAlert, Sparkles } from "lucide-react";
import { DEMO_PROFILES, DEMO_PROFILE_ORDER } from "@/lib/demo/demo-profiles";
import {
  DEMO_OPPORTUNITIES,
  matchOpportunities,
  type OpportunityMatch,
} from "@/lib/demo/opportunity-matcher";

const BAND_LABEL: Record<OpportunityMatch["band"], string> = {
  strong: "Strong Fit",
  worth_exploring: "Worth Exploring",
  stretch: "Stretch",
  filtered_out: "Age-Safeguarded",
};

const BAND_STYLES: Record<OpportunityMatch["band"], string> = {
  strong: "bg-primary/10 text-primary border-primary/30",
  worth_exploring: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  stretch: "bg-muted text-muted-foreground border-border",
  filtered_out: "bg-destructive/5 text-destructive border-destructive/30",
};

// Sample 3 partner offerings — one weighted per grade band.
const SAMPLE_IDS = ["op-animal-care", "op-hs-arts-visit", "op-middle-enrichment"];

/**
 * Marketing preview for /partners: show how a partner's offering would fare
 * across the entire demo cohort using the real matcher — including which
 * students are age-safeguarded away from it.
 */
export function PartnerCohortFit() {
  const perProfile = Object.fromEntries(
    DEMO_PROFILE_ORDER.map((id) => [id, matchOpportunities(DEMO_PROFILES[id])]),
  );

  const rows = SAMPLE_IDS.map((oppId) => {
    const opp = DEMO_OPPORTUNITIES.find((o) => o.id === oppId)!;
    const byProfile = DEMO_PROFILE_ORDER.map((pid) => {
      const match = perProfile[pid].find((m) => m.opportunity.id === oppId)!;
      return { pid, match };
    });
    return { opp, byProfile };
  });

  return (
    <section className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto mb-8 max-w-2xl text-center">
        <p className="inline-flex items-center justify-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          How Your Offering Would Match
        </p>
        <h3 className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
          The Same Explainable Matcher, Across A Real Cohort.
        </h3>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Every partner opportunity is scored against each student's grade,
          goals, and environment fit — and age-safeguarded out when it isn't
          right yet. Below: three sample offerings from our demo directory,
          scored across Jordan, Riley, and Sam.
        </p>
      </div>

      <ul className="space-y-4">
        {rows.map(({ opp, byProfile }) => (
          <li key={opp.id} className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-base font-semibold text-foreground">{opp.title}</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {opp.provider} · {opp.region}
                </p>
                <p className="mt-2 text-sm text-foreground/90">{opp.summary}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {byProfile.map(({ pid, match }) => {
                const p = DEMO_PROFILES[pid];
                const filtered = match.band === "filtered_out";
                return (
                  <div key={pid} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{p.emoji}</span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-foreground">
                          {p.shortName} · {p.demographics.gradeLabel}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BAND_STYLES[match.band]}`}
                    >
                      {BAND_LABEL[match.band]}
                    </span>
                    <ul className="mt-2 space-y-1">
                      {(filtered ? match.safeguardReasons : match.fitReasons)
                        .slice(0, 2)
                        .map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                            {filtered ? (
                              <ShieldAlert className="mt-0.5 h-3 w-3 shrink-0 text-destructive" />
                            ) : (
                              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            )}
                            <span>{r}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex justify-center">
        <Link
          to="/demo/network"
          className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-background px-5 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/5"
        >
          Explore the full Partner Network demo
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
