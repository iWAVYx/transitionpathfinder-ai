import { createFileRoute, Link } from "@tanstack/react-router";
import {
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
  Quote,
} from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
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
      { title: "See a Live Demo — TransitionForward" },
      {
        name: "description",
        content:
          "Walk a fictional student through every chapter of TransitionForward — Intake, Student Voice, the Pathway Report, partner opportunities, and a 30-Day Plan.",
      },
      { property: "og:title", content: "See a Live Demo — TransitionForward" },
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

type Chapter = {
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
  group: "Foundation" | "Insight" | "Plan" | "Roles";
};

const CHAPTERS: Chapter[] = [
  { n: "01", icon: <ClipboardList className="h-4 w-4" />, title: "Intake", body: "The guided transition-planning interview — strengths, interests, supports, three-voice input.", to: "/demo/intake", group: "Foundation" },
  { n: "02", icon: <Mic className="h-4 w-4" />, title: "Student Voice", body: "Sample student answers and how each one shapes the recommendations.", to: "/demo/voice", group: "Foundation" },
  { n: "03", icon: <FileSearch className="h-4 w-4" />, title: "Document Insights", body: "How TransitionForward organizes IEP content as a planning companion, with needs-review flags.", to: "/demo/documents", group: "Foundation" },
  { n: "04", icon: <FileText className="h-4 w-4" />, title: "Pathway Report", body: "The full report — pathways, IEP translation, accommodations, and a clear plan.", to: "/demo/report", group: "Insight" },
  { n: "05", icon: <Briefcase className="h-4 w-4" />, title: "Opportunity Matches", body: "Sample partner programs, apprenticeships, internships, and community supports.", to: "/demo/opportunities", group: "Insight" },
  { n: "06", icon: <BookOpen className="h-4 w-4" />, title: "Resource Matches", body: "Curated, student-matched resources with what it is, who it helps, and how to use it.", to: "/demo/resources", group: "Insight" },
  { n: "07", icon: <Users className="h-4 w-4" />, title: "Meeting Prep", body: "A PPT / IEP prep packet: agenda, questions to ask, strengths to highlight, follow-ups.", to: "/demo/meeting", group: "Plan" },
  { n: "08", icon: <CalendarDays className="h-4 w-4" />, title: "Calendar", body: "One shared calendar — meetings, deadlines, tours, and weekly action steps.", to: "/demo/calendar", group: "Plan" },
  { n: "09", icon: <CalendarRange className="h-4 w-4" />, title: "30 / 60 / 90-Day Plan", body: "Doable steps with the responsible role and source labeled.", to: "/demo/plan", group: "Plan" },
  { n: "10", icon: <LayoutDashboard className="h-4 w-4" />, title: "Student Hub", body: "The ongoing workspace where families and the care team track goals, documents, and progress together.", to: "/demo/hub", group: "Roles" },
  { n: "11", icon: <Compass className="h-4 w-4" />, title: "What's Next", body: "Clear paths for families, educators, schools, districts, and partners.", to: "/demo/next", group: "Roles" },
];

const GROUP_META: Record<Chapter["group"], { eyebrow: string; tagline: string }> = {
  Foundation: { eyebrow: "Part One", tagline: "Listening — The Foundation That Anchors Every Recommendation." },
  Insight: { eyebrow: "Part Two", tagline: "Synthesis — The Pathway Report That Turns Inputs Into a Plan." },
  Plan: { eyebrow: "Part Three", tagline: "Action — Meeting Prep, Calendar, and a 30 / 60 / 90 Plan." },
  Roles: { eyebrow: "Part Four", tagline: "Together — The Shared Workspace That Keeps Everyone Aligned." },
};

function DemoIndex() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preservedStudentSearch = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;

  const groups: Chapter["group"][] = ["Foundation", "Insight", "Plan", "Roles"];

  return (
    <SiteShell>
      <div className="demo-shell">
        {/* ===================== EDITORIAL MASTHEAD ===================== */}
        <section className="mx-auto max-w-7xl px-4 pt-10 pb-6 sm:px-6 lg:px-12">
          <div className="flex flex-col gap-6 border-b border-[color:var(--demo-primary)]/15 pb-8 md:flex-row md:items-end md:justify-between">
            <div className="tf-reveal">
              <span className="block font-display text-xl italic tracking-tight text-demo-primary">
                TransitionForward
              </span>
              <h1 className="mt-2 font-display text-5xl font-bold leading-[0.95] tracking-tight text-foreground sm:text-6xl">
                Demo Workspace
                <span className="block text-foreground/40">A Live Walk-Through</span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 tf-reveal">
              <div className="tf-audience" role="tablist" aria-label="Sample student">
                {(["maya", "jordan"] as DemoStudentId[]).map((id) => (
                  <Link
                    key={id}
                    to="/demo"
                    search={{ s: id }}
                    resetScroll={false}
                    role="tab"
                    aria-selected={id === s}
                    className={id === s ? "is-active" : ""}
                  >
                    {DEMO_STUDENTS[id].profile.first_name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== THE PLANNING PROBLEM → WHAT CHANGES ===================== */}
        <section className="mx-auto max-w-7xl px-4 pb-2 sm:px-6 lg:px-12">
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-border/60 bg-card/60 p-6 sm:p-8">
              <span className="tf-eyebrow">The Planning Problem</span>
              <p className="mt-3 font-display text-xl leading-snug text-foreground/85 sm:text-2xl">
                Transition planning lives in scattered binders, separate inboxes, and meetings
                that everyone arrives at unprepared.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Families don't know what to ask. Students don't see themselves in the documents.
                Educators duplicate work. Services get missed.
              </p>
            </div>
            <div className="rounded-3xl border border-primary/30 bg-primary/[0.04] p-6 sm:p-8">
              <span className="tf-eyebrow">What Changes With TransitionForward</span>
              <p className="mt-3 font-display text-xl leading-snug text-foreground/85 sm:text-2xl">
                One shared planning surface — intake, voice, documents, and a decision-supportive
                Pathway Report with clear next steps and owners.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Everyone walks into the next meeting with the same list, in the same language,
                with the same next steps.
              </p>
            </div>
          </div>
        </section>



        {/* ===================== EDITORIAL COVER ===================== */}
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-12">
          <div className="tf-cover relative grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.3fr_1fr] lg:p-16 tf-reveal">
            <div className="relative z-10">
              <span className="tf-eyebrow">Issue 01 · Live Demo</span>
              <h2 className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
                A Planning Document<br />Built Around {student.first_name}
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-foreground/75 sm:text-lg">
                Eleven chapters that mirror the real product — intake, voice, documents,
                the Pathway Report, partner matches, meeting prep, and a 30 / 60 / 90 plan.
                No account, no setup.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="bg-demo-primary hover:opacity-90">
                  <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                    Begin Chapter 01 <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-demo">
                  <Link to="/waitlist">Join The Waitlist</Link>
                </Button>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-xs font-medium text-demo-primary">
                  <ShieldCheck className="h-3.5 w-3.5" /> Fictional Student · No Real Data
                </span>
              </div>
            </div>

            {/* Marginalia panel */}
            <div className="relative z-10">
              <div className="tf-inset">
                <span className="tf-eyebrow">You're Walking With</span>
                <h3 className="mt-3 font-display text-2xl font-bold leading-tight">
                  {toTitleCase(student.full_name)}
                </h3>
                <p className="mt-1 text-sm text-foreground/65">
                  {student.pronouns} · {student.grade} · {student.school}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-foreground/10 pt-5">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-demo-primary">Category</p>
                    <p className="mt-1 text-sm font-medium">{student.disability_category}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-demo-primary">Graduating</p>
                    <p className="mt-1 text-sm font-medium">{student.graduation_year}</p>
                  </div>
                </div>
                {bundle.report.student_snapshot?.student_voice_quote && (
                  <figure className="mt-6 border-t border-foreground/10 pt-5">
                    <Quote className="h-4 w-4 text-demo-accent" aria-hidden />
                    <blockquote className="mt-2 font-display text-base italic leading-snug text-foreground/85">
                      "{bundle.report.student_snapshot.student_voice_quote}"
                    </blockquote>
                    <figcaption className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-demo-primary">
                      — In {student.first_name}'s Words
                    </figcaption>
                  </figure>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== JOURNEY RIBBON ===================== */}
        <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-12">
          <div className="flex items-center justify-between gap-4 pb-3">
            <span className="tf-eyebrow">The Journey</span>
            <span className="text-xs text-foreground/60">Eleven Chapters · About 5 Minutes</span>
          </div>
          <div className="tf-journey">
            {CHAPTERS.map((c, i) => (
              <Link
                key={c.n}
                to={c.to}
                {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                className={`tf-journey-step ${i === 0 ? "is-current" : ""}`}
                aria-label={`Chapter ${c.n}: ${c.title}`}
              >
                <span className="tf-journey-dot" aria-hidden />
                <span className="tf-journey-label">{c.title}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ===================== CHAPTERS (editorial groups, not card grid) ===================== */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-12">
          {groups.map((g, gi) => {
            const items = CHAPTERS.filter((c) => c.group === g);
            const meta = GROUP_META[g];
            return (
              <article key={g} className="tf-chapter">
                <div className="tf-chapter-rule" aria-hidden />
                <div className="grid gap-10 lg:grid-cols-[1fr_2fr] lg:gap-16">
                  <header>
                    <span className="tf-eyebrow">{meta.eyebrow}</span>
                    <div className="mt-4 flex items-baseline gap-4">
                      <span className="tf-numeral">{String(gi + 1).padStart(2, "0")}</span>
                      <h3 className="font-display text-3xl font-bold tracking-tight">{g}</h3>
                    </div>
                    <p className="mt-4 max-w-sm text-base leading-relaxed text-foreground/70">
                      {meta.tagline}
                    </p>
                  </header>
                  <ol className="space-y-3">
                    {items.map((c) => (
                      <li key={c.n}>
                        <Link
                          to={c.to}
                          {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                          className="group flex items-start gap-5 rounded-2xl border border-transparent px-4 py-4 transition-all hover:border-[color:var(--demo-primary)]/15 hover:bg-white hover:shadow-[0_18px_40px_-28px_color-mix(in_oklab,var(--demo-primary)_40%,transparent)]"
                        >
                          <span className="mt-0.5 font-display text-2xl font-light italic text-demo-accent">{c.n}</span>
                          <span className="flex-1 min-w-0">
                            <span className="flex items-center gap-2">
                              <span className="text-demo-primary/70" aria-hidden>{c.icon}</span>
                              <span className="font-display text-lg font-semibold leading-tight">{c.title}</span>
                            </span>
                            <span className="mt-1 block text-sm leading-relaxed text-foreground/70">{c.body}</span>
                          </span>
                          <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-demo-primary opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              </article>
            );
          })}

          {/* Closing band */}
          <div className="tf-band tf-band--ink mt-16 tf-reveal">
            <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-end">
              <div>
                <span className="tf-eyebrow">Ready When You Are</span>
                <h3 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
                  Open Chapter 01 — {student.first_name}'s Intake
                </h3>
                <p className="mt-3 max-w-xl text-base leading-relaxed opacity-85">
                  You can switch students or jump between chapters at any time from the bar at the top.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button asChild size="lg" className="bg-[color:var(--demo-accent)] text-white hover:opacity-90">
                  <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                    Begin The Walkthrough <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                  <Link to="/waitlist">Join The Waitlist</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
