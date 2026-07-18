import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Sparkles, Users } from "lucide-react";
import { DEMO_PROFILES, DEMO_PROFILE_ORDER, type DemoProfile } from "@/lib/demo/demo-profiles";
import { matchOpportunities, type OpportunityMatch } from "@/lib/demo/opportunity-matcher";

type Framing = "educator" | "district" | "partner";

const FRAMING_COPY: Record<Framing, { title: string; blurb: string; icon: typeof Users }> = {
  educator: {
    title: "Caseload Match Board",
    blurb:
      "Top explainable matches for every student on your demo caseload. Age-safeguards remove options automatically — the hidden count shows how many were filtered.",
    icon: Users,
  },
  district: {
    title: "District Roster Signal",
    blurb:
      "Aggregate view of match quality across the demo cohort. Use this to see who is well-served and where partner supply is thin.",
    icon: Sparkles,
  },
  partner: {
    title: "Prospective Candidates",
    blurb:
      "Students on the demo network whose emphasized themes align with your opportunity catalog. Only fits that pass age-safeguards are surfaced.",
    icon: Users,
  },
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

function summarize(profile: DemoProfile, matches: OpportunityMatch[]) {
  const visible = matches.filter((m) => m.band !== "filtered_out");
  const hidden = matches.filter((m) => m.band === "filtered_out");
  const strong = visible.filter((m) => m.band === "strong").length;
  return { visible, hidden: hidden.length, strong, profile };
}

export function RosterMatchBoard({ framing = "educator" }: { framing?: Framing }) {
  const rows = useMemo(
    () =>
      DEMO_PROFILE_ORDER.map((id) => {
        const profile = DEMO_PROFILES[id];
        return summarize(profile, matchOpportunities(profile));
      }),
    [],
  );

  const copy = FRAMING_COPY[framing];
  const Icon = copy.icon;

  return (
    <section
      className="mt-8 rounded-2xl border border-border bg-card p-5"
      aria-label={copy.title}
    >
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Icon className="h-4 w-4 text-primary" />
            {copy.title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.blurb}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3 w-3" />
          Age-Safeguards Active
        </span>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(({ profile, visible, hidden, strong }) => {
          const top = visible.slice(0, 2);
          return (
            <li
              key={profile.id}
              className="flex flex-col rounded-xl border border-border bg-background p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {profile.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Grade {profile.demographics.grade} · Age {profile.demographics.age} ·{" "}
                    {profile.product === "transitionforward" ? "TransitionForward" : "BridgeForward"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {strong} strong
                </span>
              </div>

              <ul className="mt-3 space-y-2">
                {top.length === 0 && (
                  <li className="rounded-lg border border-dashed border-border bg-muted/30 p-2 text-xs text-muted-foreground">
                    No age-appropriate matches in the demo catalog yet.
                  </li>
                )}
                {top.map((m) => (
                  <li
                    key={m.opportunity.id}
                    className="rounded-lg border border-border bg-card p-2"
                  >
                    <p className="text-xs font-semibold text-foreground">
                      {m.opportunity.title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {m.opportunity.provider} ·{" "}
                      {KIND_LABEL[m.opportunity.kind] ?? m.opportunity.kind} · Score {m.score}
                    </p>
                    {m.fitReasons[0] && (
                      <p className="mt-1 text-[11px] text-foreground/80">
                        {m.fitReasons[0]}
                      </p>
                    )}
                  </li>
                ))}
              </ul>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {visible.length} shown · {hidden} filtered
                </span>
                <Link
                  to="/demo/opportunities"
                  search={{ student: profile.id }}
                  className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                >
                  Open <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
