import { useMemo } from "react";
import { CheckCircle2, ShieldAlert, Sparkles, Info } from "lucide-react";
import { matchOpportunities, type OpportunityMatch } from "@/lib/demo/opportunity-matcher";
import { useDemoStudent } from "@/lib/demo/use-demo-student";

const BAND_LABEL: Record<OpportunityMatch["band"], string> = {
  strong: "Strong Match",
  worth_exploring: "Worth Exploring",
  stretch: "Stretch",
  filtered_out: "Not A Fit Right Now",
};

const BAND_STYLES: Record<OpportunityMatch["band"], string> = {
  strong: "bg-primary/10 text-primary border-primary/30",
  worth_exploring: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  stretch: "bg-muted text-muted-foreground border-border",
  filtered_out: "bg-destructive/5 text-destructive border-destructive/30",
};

const KIND_LABEL: Record<string, string> = {
  paid_work: "Paid Work",
  internship: "Internship",
  school_visit: "School Visit",
  enrichment: "Enrichment",
  agency_intake: "Agency Intake",
  college_program: "College Program",
  life_skills: "Life Skills",
  peer_group: "Peer Group",
};

/**
 * Explainable opportunity matches for the active demo profile.
 *
 * Renders inline on the /demo/opportunities page below the workspace
 * stage content. Every match card shows the raw fit reasons, the gaps,
 * and — when an opportunity is filtered out — the safeguard reason so
 * viewers can see WHY the matcher hid it (age band, product track, or
 * disallowed theme).
 */
export function OpportunityMatches({ compact = false, limit }: { compact?: boolean; limit?: number } = {}) {
  const { profile } = useDemoStudent();
  const matches = useMemo(() => matchOpportunities(profile), [profile]);

  const visibleAll = matches.filter((m) => m.band !== "filtered_out");
  const visible = typeof limit === "number" ? visibleAll.slice(0, limit) : visibleAll;
  const hidden = matches.filter((m) => m.band === "filtered_out");

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5" aria-label="Explainable opportunity matches">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Explainable Matches For {profile.shortName}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked using {profile.shortName}'s emphasized themes, interests, goal areas, and
            environment preferences. All partners are fictional demo data.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3 w-3" />
          {visible.length} shown · {hidden.length} filtered
        </span>
      </header>

      <ul className="space-y-3">
        {visible.map((m) => (
          <li key={m.opportunity.id} className="rounded-xl border border-border bg-background p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">{m.opportunity.title}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {m.opportunity.provider} · {KIND_LABEL[m.opportunity.kind] ?? m.opportunity.kind} · {m.opportunity.region}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BAND_STYLES[m.band]}`}>
                  {BAND_LABEL[m.band]}
                </span>
                <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  Score {m.score}
                </span>
              </div>
            </div>
            <p className="mt-2 text-sm text-foreground/90">{m.opportunity.summary}</p>

            {m.fitReasons.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Why It Fits
                </p>
                <ul className="space-y-1">
                  {m.fitReasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!compact && m.gapReasons.length > 0 && (
              <div className="mt-3">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  What To Watch
                </p>
                <ul className="space-y-1">
                  {m.gapReasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>

      {!compact && hidden.length > 0 && (
        <details className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            {hidden.length} Opportunities Hidden By Age-Safeguards
          </summary>
          <ul className="mt-3 space-y-3">
            {hidden.map((m) => (
              <li key={m.opportunity.id} className="rounded-lg border border-border bg-background p-3">
                <p className="text-sm font-semibold text-foreground">{m.opportunity.title}</p>
                <p className="text-xs text-muted-foreground">{m.opportunity.provider}</p>
                <ul className="mt-2 space-y-1">
                  {m.safeguardReasons.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-destructive">
                      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
