import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ClipboardList,
  LayoutDashboard,
  FileText,
  Users,
  BookOpen,
  CalendarRange,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_STUDENTS, getDemoStudent, type DemoStudentId } from "@/lib/demo-data";
import { validateStudentSearch } from "@/components/site/DemoStepBar";
import { toTitleCase } from "@/lib/title-case";

export const Route = createFileRoute("/demo")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "See a live demo — TransitionForward" },
      {
        name: "description",
        content:
          "Walk a fictional student through every step of TransitionForward — Hub, Intake, Pathway Report, Meeting Prep, Resources, shared Calendar, and a 30-Day Plan.",
      },
      { property: "og:title", content: "See a live demo — TransitionForward" },
      {
        property: "og:description",
        content:
          "Pick a fictional student and walk the full TransitionForward pathway — no account required.",
      },
      { property: "og:url", content: "/demo" },
    ],
    links: [{ rel: "canonical", href: "/demo" }],
  }),
  component: DemoIndex,
});

const STEPS = [
  {
    n: "1",
    icon: <LayoutDashboard className="h-5 w-5" />,
    title: "Student Hub",
    body: "The ongoing workspace where the family, case manager, and team see goals, documents, and progress at a glance.",
    to: "/demo/hub" as const,
  },
  {
    n: "2",
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Intake",
    body: "The guided transition-planning interview — strengths, interests, supports, three-voice input.",
    to: "/demo/intake" as const,
  },
  {
    n: "3",
    icon: <FileText className="h-5 w-5" />,
    title: "Pathway Report",
    body: "The full report — pathways, IEP translation, accommodations, and a clear plan.",
    to: "/demo/report" as const,
  },
  {
    n: "4",
    icon: <Users className="h-5 w-5" />,
    title: "Meeting Prep",
    body: "A PPT/IEP prep packet: agenda, questions to ask, strengths to highlight, follow-ups.",
    to: "/demo/meeting" as const,
  },
  {
    n: "5",
    icon: <BookOpen className="h-5 w-5" />,
    title: "Resource Matches",
    body: "Curated, student-matched resources with what it is, who it helps, why it matters, how to use it.",
    to: "/demo/resources" as const,
  },
  {
    n: "6",
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Calendar",
    body: "One shared Calendar for families and educators — meetings, deadlines, tours, and weekly action steps.",
    to: "/demo/calendar" as const,
  },
  {
    n: "7",
    icon: <CalendarRange className="h-5 w-5" />,
    title: "30-Day Plan",
    body: "One focused, doable step per week — small enough to do, big enough to matter.",
    to: "/demo/plan" as const,
  },
];

function DemoIndex() {
  const { s } = Route.useSearch();
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;

  return (
    <SiteShell>
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Live demo
          </Badge>
          <Badge variant="outline" className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Fictional students · no real data
          </Badge>
        </div>
        <h1 className="mt-4 font-display text-4xl font-medium tracking-tight sm:text-5xl">
          See exactly how TransitionForward works.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          Pick a fictional student and walk the full seven-step product spine.
          No account, no setup — everything you'd see on day one with a real student.
        </p>

        {/* Student picker */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(["maya", "jordan"] as DemoStudentId[]).map((id) => {
            const b = DEMO_STUDENTS[id];
            const active = id === s;
            return (
              <Link
                key={id}
                to="/demo"
                search={{ s: id }}
                resetScroll={false}
                className={`group rounded-3xl border p-6 shadow-soft transition-shadow hover:shadow-lift ${
                  active ? "border-primary bg-card ring-2 ring-primary/30" : "bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {active ? "Walking with" : "Switch to"}
                    </p>
                    <h2 className="mt-1 font-display text-2xl">{toTitleCase(b.profile.full_name)}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{b.tagline}</p>
                  </div>
                  {active ? (
                    <Badge className="gap-1">Selected</Badge>
                  ) : (
                    <Badge variant="outline">Switch</Badge>
                  )}
                </div>
                <p className="mt-3 text-sm text-foreground/85">{b.headline}</p>
              </Link>
            );
          })}
        </div>

        {/* Selected student card */}
        <div className="mt-8 rounded-3xl border bg-card p-6 shadow-soft sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                You're walking with
              </p>
              <h2 className="mt-2 font-display text-3xl">{toTitleCase(student.full_name)}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {student.pronouns} · {student.grade} · {student.school}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {student.disability_category} · Graduating {student.graduation_year}
              </p>
            </div>
            <Badge variant="outline" className="gap-1">
              Case manager: {student.case_manager}
            </Badge>
          </div>
          <p className="mt-6 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm italic leading-relaxed text-foreground/80">
            "{bundle.report.student_snapshot?.student_voice_quote}"
            <span className="mt-2 block not-italic text-xs text-muted-foreground">
              — in {student.first_name}'s voice (from the intake)
            </span>
          </p>
        </div>

        {/* 6-step spine */}
        <div className="mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            The six-step spine
          </p>
          <div className="mt-3 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step) => (
              <Link
                key={step.title}
                to={step.to}
                search={{ s }}
                className="group block rounded-3xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift"
              >
                <div className="flex items-center justify-between">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {step.icon}
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Step {step.n}
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Open{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-gradient-hero p-6 sm:p-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              Start the walkthrough
            </p>
            <p className="mt-2 font-display text-2xl">
              Begin with {student.first_name}'s Student Hub.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              You can switch students any time using the bar at the top.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <Link to="/demo/hub" search={{ s }}>
                Start the demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/waitlist">Join the waitlist</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
