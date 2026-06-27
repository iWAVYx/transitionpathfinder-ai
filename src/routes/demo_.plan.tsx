import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarRange,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Download,
  Printer,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import {
  DemoStepBar,
  DemoStepFooter,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { Button } from "@/components/ui/button";
import { getDemoStudent } from "@/lib/demo-data";
import {
  EXTENDED_PLANS,
  HORIZON_META,
  type PlanHorizon,
} from "@/lib/demo-extended-plans";
import {
  PlanHorizonTabs,
  RichPlanStepCard,
} from "@/components/pathway/PlanHorizon";
import {
  PublicationPage,
  PublicationSpread,
  PublicationCallout,
  PublicationSidebar,
} from "@/components/publication/PublicationPage";

export const Route = createFileRoute("/demo_/plan")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "30 / 60 / 90-Day Action Plan — TransitionForward Demo" },
      {
        name: "description",
        content:
          "Switch between 30-, 60-, and 90-day action plans drawn straight from the Pathway Report — week-by-week, with named owners and clear outcomes.",
      },
      { property: "og:url", content: "/demo/plan" },
    ],
    links: [{ rel: "canonical", href: "/demo/plan" }],
  }),
  component: DemoPlanPage,
});

function DemoPlanPage() {
  const { s = "maya" as const } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile, report } = bundle;
  const familyPlan = report.family_action_plan;

  const studentKey = bundle.id;
  const plans = EXTENDED_PLANS[studentKey];
  const [horizon, setHorizon] = useState<PlanHorizon>("thirty");
  const steps = plans[horizon];
  const meta = HORIZON_META[horizon];

  const counts: Record<PlanHorizon, number> = {
    thirty: plans.thirty.length,
    sixty: plans.sixty.length,
    ninety: plans.ninety.length,
  };

  return (
    <SiteShell>
      <div className="demo-shell eh-issue">
        <DemoStepBar current="plan" student={s} />
        <PublicationPage
          kicker="Step 09"
          chapter="30 / 60 / 90-Day Plan"
          dek="Doable steps with named owners and clear success markers — the three months after the meeting, mapped out together."
          part="Part Three — Plan"
          folio="p. 70"
        >
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">

            <PublicationCallout kind="means">
              Each step has a named owner, a time estimate, and what success looks like —
              so families and educators leave the meeting with a shared, written plan, not just good intentions.
            </PublicationCallout>

            {/* Horizon selector + export */}
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-[color:var(--pub-rule-soft)] pb-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {meta.label}
                </p>
                <h2 className="mt-1 font-display text-2xl">
                  {profile.first_name}'s Next {meta.days} Days
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{meta.tagline}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button size="sm">
                  <Download className="h-4 w-4" /> Export Plan
                </Button>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <PlanHorizonTabs value={horizon} onChange={setHorizon} counts={counts} />
            </div>

            {/* Weekly timeline */}
            <div className="mt-8">
              <ol className="space-y-4">
                {steps.map((step) => (
                  <RichPlanStepCard key={`${horizon}-${step.week}`} step={step} />
                ))}
              </ol>
            </div>

            {/* Then what — editorial spread */}
            {familyPlan && (
              <PublicationSpread
                lead={
                  <section className="mt-10">
                    <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      <Sparkles className="h-3.5 w-3.5" /> Then This School Year
                    </p>
                    <ul>
                      {familyPlan.this_school_year.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 border-b border-[color:var(--pub-rule-soft)] py-4 text-sm leading-relaxed text-foreground/85 last:border-b-0"
                        >
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </section>
                }
                side={
                  <PublicationSidebar label="Before Graduation">
                    <ul>
                      {familyPlan.before_graduation.map((item) => (
                        <li
                          key={item}
                          className="flex items-start gap-2 border-b border-[color:var(--pub-rule-soft)] py-3 text-sm leading-relaxed text-foreground/85 last:border-b-0"
                        >
                          <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </PublicationSidebar>
                }
              />
            )}

            {/* Outro CTA */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-gradient-hero p-6 sm:p-8">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  You've Seen The Full TransitionForward Flow
                </p>
                <p className="mt-1 font-display text-2xl">
                  Workspace → Intake → Pathway Report → Meeting Prep → Resources → Calendar → Plan
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ready to build one for a real student?
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <Link to="/demo">Restart Demo</Link>
                </Button>
                <Button asChild>
                  <Link to="/waitlist">
                    Join The Waitlist <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <DemoStepFooter current="plan" student={s} />
          </div>
        </PublicationPage>
      </div>
    </SiteShell>
  );
}
