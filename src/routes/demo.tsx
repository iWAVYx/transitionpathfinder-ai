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
  Mic,
  FileSearch,
  Briefcase,
  Compass,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DEMO_STUDENTS, getDemoStudent, type DemoStudentId } from "@/lib/demo-data";
import {
  DEFAULT_DEMO_STUDENT,
  demoStudentSearch,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
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

type Step = {
  n: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  to:
    | "/demo/intake"
    | "/demo/voice"
    | "/demo/documents"
    | "/demo/report"
    | "/demo/opportunities"
    | "/demo/resources"
    | "/demo/meeting"
    | "/demo/calendar"
    | "/demo/plan"
    | "/demo/hub"
    | "/demo/next";
};

const FEATURED: Step = {
  n: "1",
  icon: <ClipboardList className="h-5 w-5" />,
  title: "Intake",
  body: "The Guided Transition-Planning Interview — Strengths, Interests, Supports, and Three-Voice Input.",
  to: "/demo/intake",
};

const STEPS: Step[] = [
  {
    n: "2",
    icon: <Mic className="h-5 w-5" />,
    title: "Student Voice",
    body: "Sample Student Answers and How Each One Shapes the Recommendations.",
    to: "/demo/voice",
  },
  {
    n: "3",
    icon: <FileSearch className="h-5 w-5" />,
    title: "Document Insights",
    body: "How TransitionForward Organizes IEP Content as a Planning Companion — With Needs-Review Flags.",
    to: "/demo/documents",
  },
  {
    n: "4",
    icon: <FileText className="h-5 w-5" />,
    title: "Pathway Report",
    body: "The Full Report — Pathways, IEP Translation, Accommodations, and a Clear Plan.",
    to: "/demo/report",
  },
  {
    n: "5",
    icon: <Briefcase className="h-5 w-5" />,
    title: "Opportunity Matches",
    body: "Sample Partner Programs, Apprenticeships, Internships, and Community Supports.",
    to: "/demo/opportunities",
  },
  {
    n: "6",
    icon: <BookOpen className="h-5 w-5" />,
    title: "Resource Matches",
    body: "Curated, Student-Matched Resources With What It Is, Who It Helps, and How to Use It.",
    to: "/demo/resources",
  },
  {
    n: "7",
    icon: <Users className="h-5 w-5" />,
    title: "Meeting Prep",
    body: "A PPT / IEP Prep Packet: Agenda, Questions to Ask, Strengths to Highlight, Follow-Ups.",
    to: "/demo/meeting",
  },
  {
    n: "8",
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Calendar",
    body: "One Shared Calendar — Meetings, Deadlines, Tours, and Weekly Action Steps.",
    to: "/demo/calendar",
  },
  {
    n: "9",
    icon: <CalendarRange className="h-5 w-5" />,
    title: "30 / 60 / 90-Day Plan",
    body: "Doable Steps With the Responsible Role and Source Labeled.",
    to: "/demo/plan",
  },
  {
    n: "10",
    icon: <LayoutDashboard className="h-5 w-5" />,
    title: "Role Dashboards",
    body: "See the Same Plan From Student, Family, Educator, School, District, and Partner Views.",
    to: "/demo/hub",
  },
];

const CLOSER: Step = {
  n: "11",
  icon: <Compass className="h-5 w-5" />,
  title: "What's Next",
  body: "Clear Paths for Families, Educators, Schools, Districts, and Partners.",
  to: "/demo/next",
};

function DemoIndex() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preservedStudentSearch = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;

  return (
    <SiteShell>
      <div className="demo-shell">
        {/* ===== Hero ===== */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="bg-gradient-demo-hero absolute inset-0 -z-10" />
          <div aria-hidden className="pathway-line absolute inset-0 -z-10 opacity-60" />

          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="demo-reveal flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 bg-demo-surface-warm border-demo">
                <Sparkles className="h-3 w-3" /> Live Demo
              </Badge>
              <Badge variant="outline" className="gap-1 border-demo">
                <ShieldCheck className="h-3 w-3" /> Fictional Students · No Real Data
              </Badge>
            </div>

            <h1 className="demo-reveal demo-reveal-delay-1 mt-5 font-display text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              See Exactly How TransitionForward Works.
            </h1>
            <p className="demo-reveal demo-reveal-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-foreground/75 sm:text-lg">
              Pick a fictional student and walk every step — Intake, Student Voice,
              the Pathway Report, partner opportunities, role dashboards, and what
              comes next. No account. No setup.
            </p>

            <div className="demo-reveal demo-reveal-delay-3 mt-7 max-w-xl">
              <div className="demo-stepper-track">
                <div className="demo-stepper-fill" />
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-demo-primary">
                11 Steps · About 5 Minutes
              </p>
            </div>

            <div className="demo-reveal demo-reveal-delay-4 mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-demo-primary hover:opacity-90">
                <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                  Start the Walkthrough <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-demo">
                <Link to="/waitlist">Join the Waitlist</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* ===== Student picker + selected snapshot (single balanced row) ===== */}
        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
            Choose Your Sample Student
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(["maya", "jordan"] as DemoStudentId[]).map((id) => {
              const b = DEMO_STUDENTS[id];
              const active = id === s;
              return (
                <Link
                  key={id}
                  to="/demo"
                  search={{ s: id }}
                  resetScroll={false}
                  className={`demo-lift group flex h-full flex-col rounded-3xl border bg-card p-6 ${
                    active
                      ? "border-demo shadow-demo-lift ring-2 ring-[color:var(--demo-primary)]/25"
                      : "border-demo/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
                        {active ? "Walking With" : "Switch To"}
                      </p>
                      <h2 className="mt-1 truncate text-2xl">{toTitleCase(b.profile.full_name)}</h2>
                      <p className="mt-1 text-xs text-foreground/70">{b.tagline}</p>
                    </div>
                    {active ? (
                      <Badge className="shrink-0 gap-1 bg-demo-primary">Selected</Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 border-demo">Switch</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-foreground/85">{b.headline}</p>
                </Link>
              );
            })}
          </div>

          {/* Selected student document-style band (not a card) */}
          <div className="mt-10 border-l-2 border-[color:var(--demo-accent)] pl-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
              You're Walking With
            </p>
            <h2 className="mt-2 font-display text-3xl">{toTitleCase(student.full_name)}</h2>
            <p className="mt-1 text-sm text-foreground/70">
              {student.pronouns} · {student.grade} · {student.school}
            </p>
            <p className="mt-1 text-sm text-foreground/70">
              {student.disability_category} · Graduating {student.graduation_year}
            </p>
            <blockquote className="mt-5 max-w-2xl text-base italic leading-relaxed text-foreground/85">
              "{bundle.report.student_snapshot?.student_voice_quote}"
              <span className="mt-2 block not-italic text-xs text-foreground/65">
                — In {student.first_name}'s Voice (From the Intake)
              </span>
            </blockquote>
          </div>
        </section>

        {/* ===== The walkthrough ===== */}
        <section className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
              The Full Walkthrough
            </p>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl">
              Eleven Steps, One Sample Plan
            </h2>
          </div>

          {/* Featured step 1 — spotlight tile to break the card grid rhythm */}
          <Link
            to={FEATURED.to}
            {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
            className="demo-lift demo-reveal group mt-8 grid gap-6 overflow-hidden rounded-3xl border border-demo bg-gradient-horizon p-7 text-primary-foreground shadow-demo-lift sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-9"
          >
            <span className="step-marker !h-12 !w-12 !text-base">{FEATURED.n}</span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-85">
                Start Here
              </p>
              <h3 className="mt-1 font-display text-2xl sm:text-3xl">{FEATURED.title}</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed opacity-90">{FEATURED.body}</p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition-transform group-hover:translate-x-0.5">
              Open <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          {/* Steps 2–10: balanced 3-column grid (9 items = 3 perfect rows) */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STEPS.map((step, i) => (
              <Link
                key={step.title}
                to={step.to}
                {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                className={`demo-lift demo-reveal demo-reveal-delay-${Math.min(4, Math.floor(i / 3) + 1)} group flex h-full flex-col rounded-3xl border border-demo/60 bg-card p-6`}
              >
                <div className="flex items-center justify-between">
                  <span className="step-marker">{step.n}</span>
                  <span className="text-demo-primary/70" aria-hidden>
                    {step.icon}
                  </span>
                </div>
                <h3 className="mt-4 text-xl">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground/75">{step.body}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-demo-primary">
                  Open{" "}
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>

          {/* Closing step 11 — full-width band so no orphan tile is left dangling */}
          <Link
            to={CLOSER.to}
            {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
            className="demo-lift demo-reveal group mt-6 flex flex-wrap items-center justify-between gap-6 rounded-3xl border-2 border-dashed border-demo bg-demo-surface-warm/40 p-7"
          >
            <div className="flex items-center gap-5 min-w-0">
              <span className="step-marker shrink-0">{CLOSER.n}</span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
                  Wrap-Up
                </p>
                <h3 className="mt-1 font-display text-2xl">{CLOSER.title}</h3>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-foreground/75">{CLOSER.body}</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-demo bg-card px-4 py-2 text-sm font-medium text-demo-primary transition-transform group-hover:translate-x-0.5">
              Open <ArrowRight className="h-4 w-4" />
            </span>
          </Link>

          {/* Final CTA — equal-size buttons */}
          <div className="mt-12 overflow-hidden rounded-3xl border border-demo bg-gradient-horizon p-7 text-primary-foreground shadow-demo-lift sm:p-9">
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
                  Start the Walkthrough
                </p>
                <p className="mt-2 font-display text-2xl">
                  Begin With {student.first_name}'s Intake.
                </p>
                <p className="mt-1 text-sm opacity-85">
                  You Can Switch Students Any Time Using the Bar at the Top.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="bg-[color:var(--demo-accent)] text-primary-foreground hover:opacity-90">
                  <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                    Start the Demo <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                  <Link to="/waitlist">Join the Waitlist</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
