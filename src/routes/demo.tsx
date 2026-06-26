import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import {
  DEMO_STUDENTS,
  getDemoStudent,
  type DemoStudentId,
} from "@/lib/demo-data";
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
  { n: "01", page: "08", title: "Intake And Starting Point",   dek: "Strengths, interests, supports — three voices.",                                       to: "/demo/intake",        part: "Listen" },
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
  const issueDate = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <SiteShell>
      <div className="demo-shell eh-issue">
        {/* ============ COVER ============ */}
        <section>
          <div className="pub-cover">
            <header className="pub-cover-mast">
              <span className="pub-cover-mast-brand">TransitionForward · Pathway Workbook</span>
              <span>Sample Edition · {issueDate}</span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3 w-3" /> Fictional Student
              </span>
            </header>

            <div className="pub-cover-grid">
              <div>
                <p className="pub-cover-issue">A Personal Planning Workbook · Eleven Sections</p>
                <h1 className="pub-cover-title">{toTitleCase(student.full_name)}</h1>
                <p className="pub-cover-subtitle">
                  A guided publication prepared with {student.first_name},{" "}
                  {student.first_name === "Maya" ? "her" : "his"} family, and the{" "}
                  {student.school} team.
                </p>

                <div className="pub-cover-rule" />

                <div className="pub-cover-meta">
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

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="bg-[color:var(--pub-ink)] text-white hover:bg-[color:var(--pub-accent)]"
                  >
                    <Link
                      to="/demo/intake"
                      {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                    >
                      Begin Reading <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="border-[color:var(--pub-rule)] bg-transparent text-[color:var(--pub-ink)] hover:bg-[color:var(--pub-rule-soft)]"
                  >
                    <Link to="/waitlist">Join The Waitlist</Link>
                  </Button>
                </div>
              </div>

              <aside>
                <p className="pub-cover-issue">In Their Own Words</p>
                {voiceQuote && (
                  <figure className="pub-cover-feature mt-3">
                    <blockquote>“{voiceQuote}”</blockquote>
                    <figcaption>— {student.first_name}, {student.grade}</figcaption>
                  </figure>
                )}

                <div className="mt-8">
                  <p className="pub-cover-issue">Featured Student</p>
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
          </div>
        </section>

        {/* ============ WELCOME / HOW TO USE THIS GUIDE ============ */}
        <section>
          <article className="pub-page">
            <header className="pub-page-runninghead">
              <span className="pub-page-issue">TransitionForward</span>
              <span className="pub-page-part">Welcome</span>
              <span className="pub-page-folio">p. 02</span>
            </header>
            <div className="pub-page-opener">
              <p className="pub-page-kicker">How To Use This Guide</p>
              <h2 className="pub-page-title">A Planning Document, Not A Dashboard</h2>
              <p className="pub-page-dek">
                Read this workbook the way you'd read an issue — cover to cover, or
                jumping to the section that's useful right now.
              </p>
              <div className="pub-page-rule" />
            </div>

            <div className="pub-spread">
              <div>
                <p>
                  Transition planning lives in three or four places at once — binders,
                  inboxes, and a packed IEP meeting that everyone arrives at
                  underprepared. Families don't know what to ask. Students don't see
                  themselves in the documents. Educators duplicate work. Services
                  get missed.
                </p>
                <p>
                  TransitionForward gathers each voice, organizes the documents, and
                  turns it all into one shared planning document — written in plain
                  language, with named owners and a clear next meeting in view.
                  Every page in this workbook plays a specific role in that flow.
                </p>
              </div>
              <aside className="pub-sidebar">
                <p className="pub-sidebar-label">Reader Controls</p>
                <ul className="space-y-2 text-sm leading-snug">
                  <li>Use the reader bar at the top to move between sections.</li>
                  <li>Open <em>Contents</em> to jump to any section.</li>
                  <li>Each section ends with a clear next step.</li>
                  <li>Use ← and → on your keyboard to turn pages.</li>
                  <li>Switch students at any time — the workbook updates.</li>
                </ul>
              </aside>
            </div>
          </article>
        </section>

        {/* ============ TABLE OF CONTENTS ============ */}
        <section>
          <article className="pub-page">
            <header className="pub-page-runninghead">
              <span className="pub-page-issue">TransitionForward</span>
              <span className="pub-page-part">Contents</span>
              <span className="pub-page-folio">p. 04</span>
            </header>

            <div className="pub-contents-head">
              <h2>Contents</h2>
              <span>Eleven Sections · Four Parts</span>
            </div>

            {PARTS.map((part) => {
              const items = CHAPTERS.filter((c) => c.part === part.key);
              return (
                <div key={part.key} className="pub-contents-part">
                  <div className="pub-contents-part-head">
                    <span className="num">Part {part.numeral}</span>
                    <h3>{part.title}</h3>
                  </div>
                  <p className="pub-contents-part-dek">{part.dek}</p>
                  <ol className="pub-contents-list">
                    {items.map((c) => (
                      <li key={c.n}>
                        <Link
                          to={c.to}
                          {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                          className="pub-contents-row"
                        >
                          <span className="num">{c.n}</span>
                          <span className="title-block">
                            <span className="title">{c.title}</span>
                            <span className="dek">{c.dek}</span>
                          </span>
                          <span className="page">p. {c.page}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </article>
        </section>

        {/* ============ CLOSING / BEGIN ============ */}
        <section>
          <div className="tf-band tf-band--ink">
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr] lg:items-end">
              <div>
                <span className="pub-cover-issue" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Ready When You Are
                </span>
                <h3
                  className="mt-3 leading-tight"
                  style={{
                    fontFamily: "var(--pub-serif)",
                    fontSize: "clamp(1.75rem, 3.2vw, 2.6rem)",
                  }}
                >
                  Begin {student.first_name}'s Workbook
                </h3>
                <p className="mt-3 max-w-xl text-base leading-relaxed opacity-85">
                  Move between sections from the top reader bar, or jump in from the
                  contents above at any time.
                </p>
              </div>
              <div className="flex flex-wrap gap-3 lg:justify-end">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-[color:var(--pub-ink)] hover:bg-white/90"
                >
                  <Link
                    to="/demo/intake"
                    {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                  >
                    Begin Reading <ArrowRight className="ml-1 h-4 w-4" />
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
