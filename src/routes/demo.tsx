import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ShieldCheck,
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
  { n: "I",     page: "08", title: "Intake",                 dek: "The guided planning interview — strengths, interests, supports, three voices.",        to: "/demo/intake",        part: "Listen" },
  { n: "II",    page: "14", title: "Student Voice",          dek: "What the student actually said, and how each answer shapes the recommendations.",      to: "/demo/voice",         part: "Listen" },
  { n: "III",   page: "22", title: "Document Insights",      dek: "The IEP, evaluations, and 504 documents — organized into a planning companion.",       to: "/demo/documents",     part: "Listen" },
  { n: "IV",    page: "30", title: "The Pathway Report",     dek: "Pathways, IEP translation, accommodations, and the plan, written in plain language.", to: "/demo/report",        part: "Synthesize" },
  { n: "V",     page: "44", title: "Opportunity Matches",    dek: "Apprenticeships, internships, and community programs matched to interest and need.",   to: "/demo/opportunities", part: "Synthesize" },
  { n: "VI",    page: "50", title: "Resource Matches",       dek: "Curated supports with what it is, who it helps, and how to use it.",                   to: "/demo/resources",     part: "Synthesize" },
  { n: "VII",   page: "58", title: "Meeting Prep",           dek: "A PPT-ready packet: agenda, questions to ask, strengths to highlight, follow-ups.",    to: "/demo/meeting",       part: "Plan" },
  { n: "VIII",  page: "64", title: "Shared Calendar",        dek: "Meetings, deadlines, tours, weekly action steps — everyone on one page.",              to: "/demo/calendar",      part: "Plan" },
  { n: "IX",    page: "70", title: "30 / 60 / 90-Day Plan",  dek: "Doable steps with named owners and clear success markers.",                            to: "/demo/plan",          part: "Plan" },
  { n: "X",     page: "78", title: "The Student Hub",        dek: "The ongoing workspace where families and the care team track goals and progress.",    to: "/demo/hub",           part: "Stay Together" },
  { n: "XI",    page: "84", title: "What Comes Next",        dek: "Clear paths for families, educators, schools, districts, and partners.",               to: "/demo/next",          part: "Stay Together" },
];

const PARTS: Array<{ key: Chapter["part"]; numeral: string; title: string; dek: string }> = [
  { key: "Listen",        numeral: "01", title: "Listen",         dek: "Three voices, three lenses. Every recommendation is grounded in what the student, family, and educators have actually said." },
  { key: "Synthesize",    numeral: "02", title: "Synthesize",     dek: "The Pathway Report turns intake, voice, and documents into pathways, supports, and a shared next-meeting plan." },
  { key: "Plan",          numeral: "03", title: "Plan",           dek: "Meeting prep, a shared calendar, and a 30 / 60 / 90 plan move the conversation from a binder into the week ahead." },
  { key: "Stay Together", numeral: "04", title: "Stay Together",  dek: "A Student Hub and clear next steps keep families, educators, and partners in sync after the meeting ends." },
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

        {/* =========== ISSUE COVER (editorial hybrid) =========== */}
        <section className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 lg:px-12">
          <div className="eh-cover tf-reveal">
            <header className="eh-cover-mast">
              <div>
                <span className="eh-issuenum">TransitionForward · Pathway Report</span>
                <p className="eh-edition">Sample Edition · Academic Year {student.graduation_year}</p>
              </div>
            </header>

            <div className="grid gap-12 lg:grid-cols-[1.45fr_1fr] lg:items-end">
              <div>
                <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--eh-teal)]">
                  An Interactive Planning Report · Eleven Sections
                </p>
                <h1 className="eh-cover-title mt-3">
                  Transition<br />
                  Forward
                </h1>
                <div className="eh-cover-rule" />
                <p className="eh-cover-dek">
                  A personalized roadmap for agency, growth, and post-secondary success —
                  read it cover to cover with {student.first_name}.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="bg-[color:var(--eh-teal)] text-white hover:opacity-90">
                    <Link
                      to="/demo/intake"
                      {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                    >
                      Open Chapter I <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-[color:var(--eh-teal)]/30 bg-transparent text-[color:var(--eh-teal)] hover:bg-[color:var(--eh-teal)]/5"
                  >
                    <Link to="/waitlist">Join The Waitlist</Link>
                  </Button>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[color:var(--eh-paper)] px-3 py-1.5 text-xs font-medium text-foreground/70 ring-1 ring-[color:var(--eh-rule)]">
                    <ShieldCheck className="h-3.5 w-3.5" /> Fictional Student · No Real Data
                  </span>
                </div>
              </div>

              <aside>
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-[color:var(--eh-teal)]">
                  Featured In This Issue
                </p>
                <h3 className="mt-3 font-display text-3xl font-bold leading-tight text-[color:var(--eh-ink)]">
                  {toTitleCase(student.full_name)}
                </h3>
                <p className="mt-1 text-sm text-foreground/70">
                  {student.pronouns} · {student.grade} · {student.school}
                </p>

                {voiceQuote && (
                  <figure className="mt-6 border-l-2 border-[color:var(--eh-peach)] pl-5">
                    <Quote className="h-4 w-4 text-[color:var(--eh-peach)]" aria-hidden />
                    <blockquote className="mt-2 font-display text-lg italic leading-snug text-[color:var(--eh-ink)]">
                      {voiceQuote}
                    </blockquote>
                    <figcaption className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--eh-mute)]">
                      — In {student.first_name}'s Words
                    </figcaption>
                  </figure>
                )}

                <div className="mt-7">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--eh-mute)]">
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
                <p className="label">Student Dossier</p>
                <p className="value">{toTitleCase(student.full_name)}</p>
              </div>
              <div>
                <p className="label">Category</p>
                <p className="value">{student.disability_category}</p>
              </div>
              <div>
                <p className="label">Graduating</p>
                <p className="value">{student.graduation_year}</p>
              </div>
              <div>
                <p className="label">Prepared For</p>
                <p className="value">Families, Educators &amp; Partners</p>
              </div>
              <p className="eh-cover-folio">01</p>
            </div>
          </div>
        </section>

        {/* =========== HOW TO USE THIS GUIDE (handbook welcome) =========== */}
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-12">
          <div className="eh-page">
            
            <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] lg:gap-16">
              <div className="mag-body has-dropcap">
                <p>
                  Transition planning lives in three or four different places at once —
                  binders, inboxes, and a packed PPT meeting that everyone arrives at
                  underprepared. Families don't know what to ask. Students don't see
                  themselves in the documents. Educators duplicate work. Services get missed.
                </p>
                <p>
                  This demo issue walks you through how TransitionForward gathers each
                  voice, organizes the existing documents, and turns it all into one shared
                  planning document — written in plain language, with named owners and a
                  clear next meeting in view.
                </p>
              </div>

              <aside className="eh-sidebar">
                <p className="eh-sidebar-label">How To Use This Guide</p>
                <h3 className="mb-3 font-display text-xl font-semibold text-[color:var(--eh-ink)]">
                  Read It Cover To Cover, Or Jump In
                </h3>
                <ul className="eh-sidebar-list">
                  <li><span>Use the page indicator at the top to turn pages.</span></li>
                  <li><span>Open the Contents panel to jump to any chapter.</span></li>
                  <li><span>Each chapter ends with a "what to do next" callout.</span></li>
                  <li><span>Switch the featured student at any time — the issue updates.</span></li>
                </ul>
              </aside>
            </div>
          </div>
        </section>


        {/* =========== CONTENTS (magazine TOC) =========== */}
        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-4xl font-bold tracking-tight text-demo-ink sm:text-5xl">
              Contents
            </h2>
            <p className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-demo-primary">
              Eleven Chapters · One Pathway
            </p>
          </div>

          {PARTS.map((part) => {
            const items = CHAPTERS.filter((c) => c.part === part.key);
            return (
              <div key={part.key} className="mt-10 first:mt-6">
                <div className="mb-3 flex items-baseline gap-5">
                  <span className="font-display text-3xl font-light italic text-demo-accent">
                    {part.numeral}
                  </span>
                  <h3 className="font-display text-2xl font-bold tracking-tight text-demo-ink">
                    Part {part.numeral} · {part.title}
                  </h3>
                </div>
                <p className="mb-4 max-w-2xl font-display text-base italic text-foreground/70">
                  {part.dek}
                </p>
                <div className="mag-toc">
                  {items.map((c) => (
                    <Link
                      key={c.n}
                      to={c.to}
                      {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                      className="mag-toc-row group"
                    >
                      <span className="mag-toc-num">{c.n}.</span>
                      <span>
                        <span className="mag-toc-title">{c.title}</span>
                        <span className="mag-toc-dek block">{c.dek}</span>
                      </span>
                      <span className="mag-toc-page">p. {c.page}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* =========== CLOSING BAND =========== */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-12">
          <div className="tf-band tf-band--ink tf-reveal">
            <div className="grid gap-8 lg:grid-cols-[2fr_1fr] lg:items-end">
              <div>
                <span className="tf-eyebrow">Ready When You Are</span>
                <h3 className="mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl">
                  Open Chapter I — {student.first_name}'s Intake
                </h3>
                <p className="mt-3 max-w-xl text-base leading-relaxed opacity-85">
                  You can move between chapters or switch students at any time from the
                  page-tab strip above each chapter.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button asChild size="lg" className="bg-[color:var(--demo-accent)] text-white hover:opacity-90">
                  <Link
                    to="/demo/intake"
                    {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                  >
                    Begin The Walkthrough <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white/30 bg-transparent text-white hover:bg-white/10"
                >
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
