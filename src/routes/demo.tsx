import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck, Quote, BookOpen } from "lucide-react";

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
      { title: "See A Live Demo — TransitionForward" },
      {
        name: "description",
        content:
          "Walk a fictional Connecticut high school student through a complete TransitionForward Pathway Workbook — Intake, Student Voice, Documents, Pathway Report, and a 30/60/90 Day Plan.",
      },
      { property: "og:title", content: "See A Live Demo — TransitionForward" },
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
  page: string;
  title: string;
  dek: string;
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
  part: "Listen" | "Synthesize" | "Plan" | "Stay Together";
};

const CHAPTERS: Chapter[] = [
  { n: "01", page: "08", title: "Intake And Starting Point",   dek: "The guided planning baseline — strengths, interests, supports, three voices.",        to: "/demo/intake",        part: "Listen" },
  { n: "02", page: "14", title: "Student Voice",                dek: "What the student actually said, in their own words.",                                 to: "/demo/voice",         part: "Listen" },
  { n: "03", page: "22", title: "Documents And Evidence",       dek: "The IEP, evaluations, and progress reports — organized into a planning companion.", to: "/demo/documents",     part: "Listen" },
  { n: "04", page: "30", title: "The Pathway Report",           dek: "Pathways, IEP translation, accommodations, plan — written in plain language.",       to: "/demo/report",        part: "Synthesize" },
  { n: "05", page: "44", title: "Opportunity Matches",          dek: "Apprenticeships, internships, and community programs matched to interest and need.", to: "/demo/opportunities", part: "Synthesize" },
  { n: "06", page: "50", title: "Resource Matches",             dek: "Curated supports — what it is, who it helps, how to use it.",                        to: "/demo/resources",     part: "Synthesize" },
  { n: "07", page: "58", title: "Questions For The Team",       dek: "A PPT-ready packet: agenda, questions to ask, strengths to highlight.",              to: "/demo/meeting",       part: "Plan" },
  { n: "08", page: "64", title: "Shared Calendar",              dek: "Meetings, deadlines, tours, weekly action steps — everyone on one page.",            to: "/demo/calendar",      part: "Plan" },
  { n: "09", page: "70", title: "30 / 60 / 90 Day Plan",        dek: "Doable steps with named owners and clear success markers.",                          to: "/demo/plan",          part: "Plan" },
  { n: "10", page: "78", title: "The Student Hub",              dek: "The ongoing workspace where families and the care team track goals and progress.",  to: "/demo/hub",           part: "Stay Together" },
  { n: "11", page: "84", title: "What Comes Next",              dek: "Clear next steps for families, educators, schools, districts, and partners.",        to: "/demo/next",          part: "Stay Together" },
];

const PARTS: Array<{ key: Chapter["part"]; numeral: string; title: string; dek: string }> = [
  { key: "Listen",        numeral: "One",   title: "Listen",        dek: "Three voices, three lenses. Every recommendation is grounded in what the student, family, and educators have actually said." },
  { key: "Synthesize",    numeral: "Two",   title: "Synthesize",    dek: "The Pathway Report turns intake, voice, and documents into pathways, supports, and a shared next-meeting plan." },
  { key: "Plan",          numeral: "Three", title: "Plan",          dek: "Meeting prep, a shared calendar, and a 30 / 60 / 90 plan move the conversation from a binder into the week ahead." },
  { key: "Stay Together", numeral: "Four",  title: "Stay Together", dek: "A Student Hub and clear next steps keep families, educators, and partners in sync after the meeting ends." },
];

function DemoIndex() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preservedStudentSearch = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;
  const voiceQuote = bundle.report.student_snapshot?.student_voice_quote;

  return (
    <SiteShell>
      <div className="demo-shell eh-issue">

        {/* ============ COVER ============ */}
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 lg:px-8">
          <div className="eh-cover">
            <header className="eh-cover-mast">
              <div>
                <span className="eh-issuenum">TransitionForward · Pathway Workbook</span>
                <p className="eh-edition">Sample Edition · Prepared {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--demo-paper-warm)] px-3 py-1 text-[11px] font-medium text-[color:var(--demo-mute)] ring-1 ring-[color:var(--demo-rule)]">
                <ShieldCheck className="h-3 w-3" /> Fictional Student · No Real Data
              </span>
            </header>

            <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:items-end">
              <div>
                <p className="eh-issuenum">A Personal Planning Workbook · Eleven Sections</p>
                <h1 className="eh-cover-title mt-3">{toTitleCase(student.full_name)}</h1>
                <div className="eh-cover-rule" />
                <p className="eh-cover-dek">
                  A guided planning workbook prepared with {student.first_name}, {student.first_name === "Maya" ? "her" : "his"} family, and the {student.school} team —
                  read it cover to cover or jump to any section.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="bg-[color:var(--demo-ink)] text-white hover:bg-[color:var(--demo-accent)]">
                    <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                      Begin Reading <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="border-[color:var(--demo-rule)] bg-transparent text-[color:var(--demo-ink)] hover:bg-[color:var(--demo-paper-warm)]">
                    <Link to="/waitlist">Join The Waitlist</Link>
                  </Button>
                </div>
              </div>

              <aside>
                <p className="eh-issuenum">In Their Own Words</p>
                {voiceQuote && (
                  <figure className="mt-4 border-l-[3px] border-[color:var(--demo-accent)] pl-5">
                    <Quote className="h-4 w-4 text-[color:var(--demo-accent)]" aria-hidden />
                    <blockquote className="mt-2 font-[Instrument_Serif,Georgia,serif] text-[1.4rem] italic leading-snug text-[color:var(--demo-ink)]">
                      “{voiceQuote}”
                    </blockquote>
                    <figcaption className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--demo-mute)]">
                      — {student.first_name}, {student.grade}
                    </figcaption>
                  </figure>
                )}

                <div className="mt-8">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--demo-mute)]">
                    Switch Featured Student
                  </p>
                  <div className="mt-2 tf-audience" role="tablist" aria-label="Sample student">
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
              </aside>
            </div>

            <div className="eh-cover-foot">
              <div>
                <p className="label">Student</p>
                <p className="value">{toTitleCase(student.full_name)}</p>
              </div>
              <div>
                <p className="label">Grade · School</p>
                <p className="value">{student.grade} · {student.school}</p>
              </div>
              <div>
                <p className="label">Graduating</p>
                <p className="value">{student.graduation_year}</p>
              </div>
              <div>
                <p className="label">Prepared For</p>
                <p className="value">Student · Family · Educators</p>
              </div>
            </div>
          </div>
        </section>

        {/* ============ HOW TO USE THIS WORKBOOK ============ */}
        <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="eh-page">
            <p className="eh-issuenum mb-4">How To Use This Workbook</p>
            <div className="grid gap-10 md:grid-cols-[1.45fr_1fr] lg:gap-14">
              <div className="mag-body has-dropcap">
                <p>
                  Transition planning lives in three or four places at once — binders, inboxes,
                  and a packed IEP meeting that everyone arrives at underprepared. Families
                  don't know what to ask. Students don't see themselves in the documents.
                  Educators duplicate work. Services get missed.
                </p>
                <p>
                  This workbook gathers each voice, organizes the documents, and turns it all
                  into one shared planning document — written in plain language, with named
                  owners and a clear next meeting in view. Read it end to end with {student.first_name},
                  or jump to the section that's most useful right now.
                </p>
              </div>

              <aside className="eh-sidebar">
                <p className="eh-sidebar-label">Reader Controls</p>
                <ul className="eh-sidebar-list">
                  <li>Use the reader bar at the top to move between sections.</li>
                  <li>Open Contents to jump to any section.</li>
                  <li>Each section ends with a clear next step.</li>
                  <li>Use ← and → on your keyboard to turn pages.</li>
                  <li>Switch students at any time — the workbook updates.</li>
                </ul>
              </aside>
            </div>
          </div>
        </section>

        {/* ============ TABLE OF CONTENTS ============ */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="eh-page">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--demo-rule)] pb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-[color:var(--demo-accent)]" />
                <h2 className="font-display text-2xl font-semibold tracking-tight text-[color:var(--demo-ink)] sm:text-3xl">
                  Contents
                </h2>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--demo-mute)]">
                Eleven Sections · One Pathway
              </p>
            </div>

            {PARTS.map((part) => {
              const items = CHAPTERS.filter((c) => c.part === part.key);
              return (
                <div key={part.key} className="mt-8 first:mt-0">
                  <div className="mb-2 flex items-baseline gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--demo-accent)]">
                      Part {part.numeral}
                    </span>
                    <h3 className="font-display text-lg font-semibold tracking-tight text-[color:var(--demo-ink)]">
                      {part.title}
                    </h3>
                  </div>
                  <p className="mb-3 max-w-2xl text-sm leading-relaxed text-[color:var(--demo-mute)]">
                    {part.dek}
                  </p>
                  <div className="mag-toc">
                    {items.map((c) => (
                      <Link
                        key={c.n}
                        to={c.to}
                        {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                        className="mag-toc-row"
                      >
                        <span className="mag-toc-num">{c.n}</span>
                        <span>
                          <span className="mag-toc-title">{c.title}</span>
                          <span className="mag-toc-dek">{c.dek}</span>
                        </span>
                        <span className="mag-toc-page">p. {c.page}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ============ CLOSING ============ */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="tf-band tf-band--ink">
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-end">
              <div>
                <span className="tf-eyebrow">Ready When You Are</span>
                <h3 className="mt-3 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                  Begin {student.first_name}'s Workbook
                </h3>
                <p className="mt-3 max-w-xl text-base leading-relaxed opacity-85">
                  Move between sections from the top reader bar, or jump in from the
                  contents above at any time.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button asChild size="lg" className="bg-[color:var(--demo-accent)] text-white hover:opacity-90">
                  <Link to="/demo/intake" {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                    Begin Reading <ArrowRight className="ml-1 h-4 w-4" />
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
