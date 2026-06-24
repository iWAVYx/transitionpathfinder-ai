import { createFileRoute } from "@tanstack/react-router";
import { Briefcase, MapPin, CheckCircle2, Bookmark, ShieldCheck } from "lucide-react";

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
import { DEMO_OPPORTUNITIES } from "@/lib/demo-extras";
import { DemoRoleLens } from "@/components/demo/DemoRoleLens";

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

function DemoOpportunitiesPage() {
  const { s = "maya" } = Route.useSearch() as { s?: DemoStudentId };
  const bundle = getDemoStudent(s);
  const opps = DEMO_OPPORTUNITIES[s];

  return (
    <SiteShell>
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
          <DemoRoleLens step="opportunities" student={s} />
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {opps.map((o) => (
            <article
              key={o.id}
              className="flex flex-col rounded-3xl border bg-card p-6 shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <Badge variant="outline">{o.type}</Badge>
                {o.saved ? (
                  <span className="inline-flex items-center gap-1 text-xs text-primary">
                    <Bookmark className="h-3.5 w-3.5" /> Saved
                  </span>
                ) : null}
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
                  Open (sign in to act)
                </Button>
              </div>
            </article>
          ))}
        </div>

        <DemoStepFooter current="opportunities" student={s} />
      </section>
    </SiteShell>
  );
}
