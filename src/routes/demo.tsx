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

const STEPS = [
  {
    n: "1",
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Intake",
    body: "The guided transition-planning interview — strengths, interests, supports, three-voice input.",
    to: "/demo/intake" as const,
  },
  {
    n: "2",
    icon: <Mic className="h-5 w-5" />,
    title: "Student Voice",
    body: "Sample student answers and how each one shapes the recommendations.",
    to: "/demo/voice" as const,
  },
  {
    n: "3",
    icon: <FileSearch className="h-5 w-5" />,
    title: "Document Insights",
    body: "How TransitionForward organizes IEP content as a planning companion — with needs-review flags.",
    to: "/demo/documents" as const,
  },
  {
    n: "4",
    icon: <FileText className="h-5 w-5" />,
    title: "Pathway Report",
    body: "The full report — pathways, IEP translation, accommodations, and a clear plan.",
    to: "/demo/report" as const,
  },
  {
    n: "5",
    icon: <Briefcase className="h-5 w-5" />,
    title: "Opportunity Matches",
    body: "Sample partner programs, apprenticeships, internships, and community supports.",
    to: "/demo/opportunities" as const,
  },
  {
    n: "6",
    icon: <BookOpen className="h-5 w-5" />,
    title: "Resource Matches",
    body: "Curated, student-matched resources with what it is, who it helps, and how to use it.",
    to: "/demo/resources" as const,
  },
  {
    n: "7",
    icon: <Users className="h-5 w-5" />,
    title: "Meeting Prep",
    body: "A PPT/IEP prep packet: agenda, questions to ask, strengths to highlight, follow-ups.",
    to: "/demo/meeting" as const,
  },
  {
    n: "8",
    icon: <CalendarDays className="h-5 w-5" />,
    title: "Calendar",
    body: "One shared calendar — meetings, deadlines, tours, and weekly action steps.",
    to: "/demo/calendar" as const,
  },
  {
    n: "9",
    icon: <CalendarRange className="h-5 w-5" />,
    title: "30 / 60 / 90 Day Plan",
    body: "Doable steps with the responsible role and source labeled.",
    to: "/demo/plan" as const,
  },
  {
    n: "10",
    icon: <LayoutDashboard className="h-5 w-5" />,
    title: "Role Dashboards",
    body: "See the same student plan from student, family, educator, school, district, partner, and platform views.",
    to: "/demo/hub" as const,
  },
  {
    n: "11",
    icon: <Compass className="h-5 w-5" />,
    title: "What's Next",
    body: "Clear paths for families, educators, schools, districts, and partners.",
    to: "/demo/next" as const,
  },
];

function DemoIndex() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preservedStudentSearch = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;

  return (
    <SiteShell>
      <div className="demo-shell">
        <section className="relative overflow-hidden">
          {/* Hero backdrop */}
          <div aria-hidden className="bg-gradient-demo-hero absolute inset-0 -z-10" />
          <div aria-hidden className="pathway-line absolute inset-0 -z-10 opacity-60" />

          <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="demo-reveal flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1 bg-demo-surface-warm border-demo">
                <Sparkles className="h-3 w-3" /> Live demo
              </Badge>
              <Badge variant="outline" className="gap-1 border-demo">
                <ShieldCheck className="h-3 w-3" /> Fictional students · no real data
              </Badge>
            </div>

            <h1 className="demo-reveal demo-reveal-delay-1 mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              See exactly how TransitionForward works.
            </h1>
            <p className="demo-reveal demo-reveal-delay-2 mt-5 max-w-2xl text-base leading-relaxed text-foreground/75 sm:text-lg">
              Pick a fictional student and walk every step — intake, Student Voice,
              the Pathway Report, partner opportunities, role dashboards, and what
              comes next. No account. No setup.
            </p>

            {/* Animated step ribbon */}
            <div className="demo-reveal demo-reveal-delay-3 mt-7 max-w-xl">
              <div className="demo-stepper-track">
                <div className="demo-stepper-fill" />
              </div>
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-demo-primary">
                {STEPS.length} steps · about 5 minutes
              </p>
            </div>

            <div className="demo-reveal demo-reveal-delay-4 mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-demo-primary hover:opacity-90">
                <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                  Start the walkthrough <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-demo">
                <Link to="/waitlist">Join the waitlist</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6 lg:px-8">
          {/* Student picker */}
          <div className="grid gap-4 sm:grid-cols-2">
            {(["maya", "jordan"] as DemoStudentId[]).map((id) => {
              const b = DEMO_STUDENTS[id];
              const active = id === s;
              return (
                <Link
                  key={id}
                  to="/demo"
                  search={{ s: id }}
                  resetScroll={false}
                  className={`demo-lift group rounded-3xl border p-6 bg-card ${
                    active
                      ? "border-demo shadow-demo-lift ring-2 ring-[color:var(--demo-primary)]/25"
                      : "border-demo/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
                        {active ? "Walking with" : "Switch to"}
                      </p>
                      <h2 className="mt-1 text-2xl">{toTitleCase(b.profile.full_name)}</h2>
                      <p className="mt-1 text-xs text-foreground/70">{b.tagline}</p>
                    </div>
                    {active ? (
                      <Badge className="gap-1 bg-demo-primary">Selected</Badge>
                    ) : (
                      <Badge variant="outline" className="border-demo">Switch</Badge>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-foreground/85">{b.headline}</p>
                </Link>
              );
            })}
          </div>

          {/* Selected student card */}
          <div className="mt-8 rounded-3xl border border-demo bg-card p-6 shadow-demo-lift sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
                  You're walking with
                </p>
                <h2 className="mt-2 text-3xl">{toTitleCase(student.full_name)}</h2>
                <p className="mt-1 text-sm text-foreground/70">
                  {student.pronouns} · {student.grade} · {student.school}
                </p>
                <p className="mt-1 text-sm text-foreground/70">
                  {student.disability_category} · Graduating {student.graduation_year}
                </p>
              </div>
              <Badge variant="outline" className="gap-1 border-demo">
                Case manager: {student.case_manager}
              </Badge>
            </div>
            <p className="mt-6 rounded-2xl border border-demo/60 bg-demo-surface-warm/40 p-4 text-sm italic leading-relaxed text-foreground/85">
              "{bundle.report.student_snapshot?.student_voice_quote}"
              <span className="mt-2 block not-italic text-xs text-foreground/70">
                — in {student.first_name}'s voice (from the intake)
              </span>
            </p>
          </div>

          {/* Walkthrough spine */}
          <div className="mt-12">
            <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-demo-primary">
              The full walkthrough
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step, i) => (
                <Link
                  key={step.title}
                  to={step.to}
                  {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                  className={`demo-lift demo-reveal demo-reveal-delay-${Math.min(4, Math.floor(i / 3) + 1)} group block rounded-3xl border border-demo/60 bg-card p-6`}
                >
                  <div className="flex items-center justify-between">
                    <span className="step-marker">{step.n}</span>
                    <span className="text-demo-primary/70" aria-hidden>
                      {step.icon}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-foreground/75">{step.body}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-demo-primary">
                    Open{" "}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-3xl border border-demo bg-gradient-horizon p-6 text-primary-foreground shadow-demo-lift sm:p-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
                Start the walkthrough
              </p>
              <p className="mt-2 text-2xl font-semibold">
                Begin with {student.first_name}'s intake.
              </p>
              <p className="mt-1 text-sm opacity-85">
                You can switch students any time using the bar at the top.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg" variant="secondary" className="bg-[color:var(--demo-accent)] text-[color:var(--demo-primary)] hover:opacity-90">
                <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                  Start the demo <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/40 bg-transparent text-white hover:bg-white/10">
                <Link to="/waitlist">Join the waitlist</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
