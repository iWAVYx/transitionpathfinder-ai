import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { ShieldCheck, MapPin, Users } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { PageSection } from "@/components/layout/PageSection";
import { Breadcrumbs } from "@/components/site/Breadcrumbs";
import { StudentSwitcher } from "@/components/demo/StudentSwitcher";
import { useDemoStudent } from "@/lib/demo/use-demo-student";
import {
  DEMO_OPPORTUNITIES,
  matchOpportunities,
  type OpportunityMatch,
} from "@/lib/demo/opportunity-matcher";
import { DEMO_PROFILES, DEMO_PROFILE_ORDER } from "@/lib/demo/demo-profiles";

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

const BAND_STYLES: Record<OpportunityMatch["band"], string> = {
  strong: "bg-primary/10 text-primary border-primary/30",
  worth_exploring: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
  stretch: "bg-muted text-muted-foreground border-border",
  filtered_out: "bg-destructive/5 text-destructive border-destructive/30",
};

const BAND_LABEL: Record<OpportunityMatch["band"], string> = {
  strong: "Strong",
  worth_exploring: "Worth Exploring",
  stretch: "Stretch",
  filtered_out: "Hidden",
};

export const Route = createFileRoute("/demo_/network")({
  head: () => ({
    meta: [
      { title: "Partner Network — TransitionForward Demo" },
      {
        name: "description",
        content:
          "Browse the fictional Partner Network catalog and see how every opportunity maps to each demo student with explainable age-safeguards.",
      },
      { property: "og:title", content: "Partner Network — TransitionForward Demo" },
      {
        property: "og:description",
        content:
          "Every opportunity in the demo network scored against Jordan, Riley, and Sam with age-appropriate safeguards.",
      },
    ],
  }),
  component: PartnerNetworkPage,
});

function PartnerNetworkPage() {
  const { profile } = useDemoStudent();

  // Precompute matches for all three profiles so each opportunity card can
  // show which students it fits.
  const perProfileMatches = useMemo(() => {
    const map: Record<string, Record<string, OpportunityMatch>> = {};
    for (const id of DEMO_PROFILE_ORDER) {
      const list = matchOpportunities(DEMO_PROFILES[id]);
      map[id] = Object.fromEntries(list.map((m) => [m.opportunity.id, m]));
    }
    return map;
  }, []);

  return (
    <SiteShell>
      <PageSection size="default">
        <Breadcrumbs
          trail={[
            { label: "Demo", to: "/demo" },
            { label: "Partner Network" },
          ]}
        />
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              Partner Network · Fictional Demo
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
              Every Opportunity, Scored For Every Student
            </h1>
            <p className="mt-3 text-sm text-muted-foreground sm:text-base">
              This is the full catalog of fictional partners in the demo network.
              Each card shows how well the opportunity fits {profile.shortName} and
              which of the other demo students it would surface for. Age-safeguards
              are always on.
            </p>
          </div>
          <StudentSwitcher />
        </div>
      </PageSection>

      <PageSection size="default">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
          <ShieldCheck className="h-3 w-3" />
          Age-Safeguards Active For {profile.shortName}
        </div>

        <ul className="grid gap-4 md:grid-cols-2">
          {DEMO_OPPORTUNITIES.map((opp) => {
            const activeMatch = perProfileMatches[profile.id]?.[opp.id];
            return (
              <li
                key={opp.id}
                className="flex flex-col rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-foreground">
                      {opp.title}
                    </h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {opp.provider}
                    </p>
                  </div>
                  {activeMatch && (
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${BAND_STYLES[activeMatch.band]}`}
                    >
                      {BAND_LABEL[activeMatch.band]}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {KIND_LABEL[opp.kind] ?? opp.kind}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {opp.region}
                  </span>
                  <span>
                    Grades {opp.minGrade}–{opp.maxGrade}
                  </span>
                </div>

                <p className="mt-3 text-sm text-foreground/85">{opp.summary}</p>

                {activeMatch && activeMatch.fitReasons[0] && (
                  <p className="mt-3 rounded-lg border border-border bg-muted/40 p-2 text-xs text-foreground/85">
                    <span className="font-semibold text-foreground">
                      Why for {profile.shortName}:
                    </span>{" "}
                    {activeMatch.fitReasons[0]}
                  </p>
                )}
                {activeMatch && activeMatch.band === "filtered_out" && activeMatch.safeguardReasons[0] && (
                  <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                    <span className="font-semibold">Hidden for {profile.shortName}:</span>{" "}
                    {activeMatch.safeguardReasons[0]}
                  </p>
                )}

                <div className="mt-4 border-t border-border pt-3">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fits Across The Demo Cohort
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {DEMO_PROFILE_ORDER.map((id) => {
                      const m = perProfileMatches[id]?.[opp.id];
                      const p = DEMO_PROFILES[id];
                      const band = m?.band ?? "filtered_out";
                      return (
                        <li
                          key={id}
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${BAND_STYLES[band]}`}
                        >
                          {p.shortName} · {BAND_LABEL[band]}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ul>
      </PageSection>
    </SiteShell>
  );
}
