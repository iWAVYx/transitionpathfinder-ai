import { createFileRoute } from "@tanstack/react-router";
import {
  Briefcase,
  MapPin,
  CheckCircle2,
  Bookmark,
  ShieldCheck,
  Send,
  Eye,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDemoStudent } from "@/lib/demo-data";
import type { DemoStudentId } from "@/lib/demo-data";
import {
  DEMO_OPPORTUNITIES,
  DEMO_OPPORTUNITY_STATUS,
  OPPORTUNITY_INTRO_STATUS_LABEL,
  type OpportunityIntroStatus,
} from "@/lib/demo-extras";

export const Route = createFileRoute("/demo_/opportunities")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Partner Opportunity Matches — TransitionForward demo" },
      {
        name: "description",
        content:
          "Sample partner opportunities matched to a fictional student — programs, apprenticeships, internships, and community supports.",
      },
      { property: "og:title", content: "Partner Opportunity Matches — TransitionForward demo" },
      {
        property: "og:description",
        content:
          "See how TransitionForward connects a student's voice, goals, and IEP to real-world partner opportunities.",
      },
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
  const { s = "maya" } = Route.useSearch() as { s?: DemoStudentId };
  const bundle = getDemoStudent(s);
  const opps = DEMO_OPPORTUNITIES[s];
  const statuses = DEMO_OPPORTUNITY_STATUS[s];

  return (
    <SiteShell>
      <div className="demo-shell">
        <DemoStepBar current="opportunities" student={s} />
      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Briefcase className="h-3 w-3" /> Opportunity Matches
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Sample partners — fictional
          </Badge>
        </div>
        <h1 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
          Opportunities matched to {bundle.profile.first_name}.
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Each match shows what it is, who it's for, and why it fits. Partners only
          see opportunity-level interest — never private student information.
        </p>

        <div className="mt-8">
        </div>

        {/* Phase 5 — Intro request status legend */}
        <div className="mt-8 rounded-3xl border bg-card p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <Send className="mr-1 inline h-3.5 w-3.5" /> Intro request status
              </p>
              <h2 className="mt-1 font-display text-lg">From shortlist to connection.</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Families and educators drive each intro request. Partners only see matched interest
                counts — never the student name or IEP.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(OPPORTUNITY_INTRO_STATUS_LABEL) as OpportunityIntroStatus[]).map((k) => (
                <span
                  key={k}
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${STATUS_TONE[k]}`}
                >
                  {OPPORTUNITY_INTRO_STATUS_LABEL[k]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {opps.map((o) => {
            const status = statuses?.[o.id] ?? "not_started";
            return (
              <article
                key={o.id}
                className="flex flex-col rounded-3xl border bg-card p-6 shadow-soft"
              >
                <div className="flex items-start justify-between gap-3">
                  <Badge variant="outline">{o.type}</Badge>
                  <div className="flex items-center gap-2">
                    {o.saved ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Bookmark className="h-3.5 w-3.5" /> Saved
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}
                    >
                      {OPPORTUNITY_INTRO_STATUS_LABEL[status]}
                    </span>
                  </div>
                </div>
                <h2 className="mt-3 font-display text-lg">{o.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{o.org}</p>
                <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {o.location}
                </p>

                <dl className="mt-4 space-y-2 text-sm">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Eligibility
                    </dt>
                    <dd className="mt-0.5 text-foreground/85">{o.eligibility}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Why this match
                    </dt>
                    <dd className="mt-0.5 text-foreground/85">{o.why}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Next step
                    </dt>
                    <dd className="mt-0.5 flex items-start gap-1.5 text-foreground/85">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                      <span>{o.nextStep}</span>
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto flex gap-2 pt-5">
                  <Button size="sm" variant="outline" disabled>
                    Save (demo only)
                  </Button>
                  <Button size="sm" disabled>
                    {status === "not_started" || status === "interest_noted"
                      ? "Request intro (sign in)"
                      : "Open (sign in to act)"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {/* Phase 5 — Partner-side view */}
        <div className="mt-10 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6 shadow-soft sm:p-8">
          <div className="flex items-start gap-2">
            <Eye className="mt-0.5 h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
                What the partner sees
              </p>
              <h2 className="mt-1 font-display text-xl">
                Matched interest, never private student data.
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Partners view their own opportunities and aggregate interest signals. They never see
                names, IEPs, intake answers, or voice responses.
              </p>
            </div>
          </div>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {[
              "Opportunity title, eligibility, location",
              "Number of families that flagged interest",
              "Number of formal intro requests received",
              "Aggregate interest by region or grade band (when 5+ families)",
            ].map((line) => (
              <li key={line} className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background px-3 py-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-foreground/85">{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Backed by RLS: <code>partner_opportunities</code> denies SELECT on student-identifying
            columns to the partner role.
          </p>
        </div>

        <DemoStepFooter current="opportunities" student={s} />
      </section>
      </div>
    </SiteShell>
  );
}
