import { createFileRoute } from "@tanstack/react-router";
import { StudioPage } from "@/studio/StudioPage";
import { Briefcase, MapPin, CheckCircle2, Bookmark, Send, Eye } from "lucide-react";

import { validateStudentSearch } from "@/components/site/DemoStepBar";
import { Button } from "@/components/ui/button";
import { getDemoStudent } from "@/lib/demo-data";
import type { DemoStudentId } from "@/lib/demo-data";
import {
  DEMO_OPPORTUNITIES, DEMO_OPPORTUNITY_STATUS, OPPORTUNITY_INTRO_STATUS_LABEL, type OpportunityIntroStatus,
} from "@/lib/demo-extras";
import {
  PublicationCallout, PublicationSource,
} from "@/components/publication/PublicationPage";
export const Route = createFileRoute("/demo_/opportunities")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Partner Opportunity Matches — TransitionForward demo" },
      { name: "description", content: "Sample partner opportunities matched to a fictional student — programs, apprenticeships, internships, and community supports." },
      { property: "og:title", content: "Partner Opportunity Matches — TransitionForward demo" },
      { property: "og:description", content: "See how TransitionForward connects a student's voice, goals, and IEP to real-world partner opportunities." },
      { property: "og:url", content: "/demo/opportunities" },
    ],
    links: [{ rel: "canonical", href: "/demo/opportunities" }],
  }),
  component: DemoOpportunitiesPage,
});

const STATUS_TONE: Record<OpportunityIntroStatus, string> = {
  not_started: "border-border/60 bg-background text-muted-foreground",
  interest_noted: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  intro_requested: "border-primary/30 bg-primary/10 text-primary",
  awaiting_partner: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  connected: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
};

function DemoOpportunitiesPage() {
  const search = Route.useSearch(); const s = (search.s ?? "maya") as DemoStudentId;
  const bundle = getDemoStudent(s);
  const opps = DEMO_OPPORTUNITIES[s];
  const statuses = DEMO_OPPORTUNITY_STATUS[s];

  return (
    <StudioPage stage="opportunities" student={s} preserveStudent={!!search.s} title={"Opportunity Matches"} dek={"Apprenticeships, internships, and community programs matched to the student's interests, needs, and supports."}>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">

            <PublicationCallout kind="means">
              Each match shows what it is, who it's for, and why it fits this student's interests, strengths, and
              goals. Partner organizations only see opportunity-level interest — never private student information.
            </PublicationCallout>

            {/* Intro request status legend */}
            <div className="mt-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Send className="mr-1 inline h-3.5 w-3.5" /> Intro Request Status
              </p>
              <p className="mt-1 text-sm font-[\'Instrument_Serif\',Georgia,serif] text-foreground">From Shortlist To Connection</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Families and educators drive each intro request. Partner organizations only see how many families
                flagged interest — never names or private plans.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(Object.keys(OPPORTUNITY_INTRO_STATUS_LABEL) as OpportunityIntroStatus[]).map((k) => (
                  <span key={k} className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[k]}`}>
                    {OPPORTUNITY_INTRO_STATUS_LABEL[k]}
                  </span>
                ))}
              </div>
            </div>

            {/* Opportunity rows */}
            <div className="mt-8">
              {opps.map((o) => {
                const status = statuses?.[o.id] ?? "not_started";
                return (
                  <article key={o.id} className="border-b border-[color:var(--pub-rule-soft)] py-6 last:border-b-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {o.type}
                        </p>
                        <h2 className="mt-1 font-[\'Instrument_Serif\',Georgia,serif] text-xl leading-snug text-foreground">
                          {o.name}
                        </h2>
                        <p className="mt-0.5 text-xs text-muted-foreground">{o.org}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {o.saved && (
                          <span className="inline-flex items-center gap-1 text-xs text-primary">
                            <Bookmark className="h-3.5 w-3.5" /> Saved
                          </span>
                        )}
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}>
                          {OPPORTUNITY_INTRO_STATUS_LABEL[status]}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {o.location}
                    </p>

                    <dl className="mt-4 space-y-2 text-sm">
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Eligibility</dt>
                        <dd className="mt-0.5 text-foreground/85">{o.eligibility}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Why This Match</dt>
                        <dd className="mt-0.5 text-foreground/85">{o.why}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Next Step</dt>
                        <dd className="mt-0.5 flex items-start gap-1.5 text-foreground/85">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                          <span>{o.nextStep}</span>
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" disabled>Save (Demo Only)</Button>
                      <Button size="sm" disabled>
                        {status === "not_started" || status === "interest_noted"
                          ? "Request Intro (Sign In)"
                          : "Open (Sign In To Act)"}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Partner-side view */}
            <PublicationCallout kind="means" title="What The Partner Sees">
              <div className="flex items-start gap-2">
                <Eye className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="font-[\'Instrument_Serif\',Georgia,serif] text-base">Matched Interest, Never Private Student Data</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Partner organizations view their own opportunities and aggregate interest signals. They never see
                    student names, IEPs, intake answers, or Student Voice responses.
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-foreground/85">
                    {[
                      "Opportunity title, eligibility, and location",
                      "Number of families that flagged interest",
                      "Number of formal intro requests received",
                      "Aggregate interest by region or grade band (when 5+ families)",
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </PublicationCallout>
            <PublicationSource>Student identifying details are never shared with partner organizations.</PublicationSource>
          </div>
        </StudioPage>
  );
}
