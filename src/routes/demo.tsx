import { createFileRoute, Link } from "@tanstack/react-router";

import { IssueShell } from "@/v2/IssueShell";
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
import {
  PUBLICATION_PAGES,
  pagesByPart,
  type PublicationPart,
} from "@/lib/publication/nav";

export const Route = createFileRoute("/demo")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Pathway Issue — TransitionForward Demo" },
      {
        name: "description",
        content:
          "Open the TransitionForward Pathway Issue: a guided publication that walks a fictional Connecticut high school student from Intake through the 30/60/90 Day Plan.",
      },
      { property: "og:title", content: "Pathway Issue — TransitionForward Demo" },
      {
        property: "og:description",
        content:
          "A premium interactive publication that turns scattered transition-planning inputs into a clear pathway forward.",
      },
      { property: "og:url", content: "/demo" },
    ],
    links: [{ rel: "canonical", href: "/demo" }],
  }),
  component: DemoIssueCover,
});

const PART_META: Record<PublicationPart, { numeral: string; dek: string }> = {
  "Listen":        { numeral: "One",   dek: "Three voices, three lenses. Every recommendation is grounded in what the student, family, and educators have said." },
  "Synthesize":    { numeral: "Two",   dek: "The Pathway Report turns intake, voice, and documents into pathways, supports, and a shared next-meeting plan." },
  "Plan":          { numeral: "Three", dek: "Meeting prep, a shared calendar, and a 30 / 60 / 90 plan move the conversation from a binder into the week ahead." },
  "Stay Together": { numeral: "Four",  dek: "A Student Hub and clear next steps keep families, educators, and partners in sync after the meeting ends." },
};

function DemoIssueCover() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preserved = demoStudentSearch(search.s);
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;
  const voiceQuote = bundle.report.student_snapshot?.student_voice_quote;
  const parts = pagesByPart().filter(p => p.pages.some(pg => pg.id !== "cover"));

  return (
    <IssueShell milestone="cover" partLabel="Volume 02 // Cover">
      <div className="tf-v2-spread">
        {/* ---------- Left: navy cover panel + meta ---------- */}
        <div>
          <div className="tf-v2-cover">
            <div style={{ position: "relative", zIndex: 2 }}>
              <p className="tf-v2-cover-kicker">The Personal Planning Issue Of</p>
              <h1 className="tf-v2-cover-title">
                {toTitleCase(student.first_name)}<br />
                {toTitleCase(student.last_name)}
              </h1>
            </div>

            <div>
              {voiceQuote && (
                <blockquote className="tf-v2-cover-quote">“{voiceQuote}”</blockquote>
              )}
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/demo/intake"
                  {...(preserved ? { search: preserved } : {})}
                  className="tf-v2-cover-cta tf-v2-cover-cta--primary"
                >
                  Begin Reading
                </Link>
                <a href="#contents" className="tf-v2-cover-cta tf-v2-cover-cta--ghost">
                  Open Contents
                </a>
              </div>
            </div>
          </div>

          <div className="tf-v2-cover-meta">
            <div>
              <p className="lbl">Student</p>
              <p className="val">{toTitleCase(student.full_name)}</p>
            </div>
            <div>
              <p className="lbl">Grade · School</p>
              <p className="val">{student.grade} · {student.school}</p>
            </div>
            <div>
              <p className="lbl">Graduating</p>
              <p className="val">{student.graduation_year}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[color:var(--v2-teal)]">
              Featured Student
            </p>
            <div className="mt-2 flex gap-2 flex-wrap">
              {(["maya", "jordan"] as DemoStudentId[]).map((id) => (
                <Link
                  key={id}
                  to="/demo"
                  search={{ s: id }}
                  resetScroll={false}
                  className={
                    "px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border " +
                    (id === s
                      ? "bg-[color:var(--v2-ink)] text-[color:var(--v2-paper)] border-[color:var(--v2-ink)]"
                      : "bg-transparent text-[color:var(--v2-ink)] border-[color:var(--v2-rule)] hover:border-[color:var(--v2-ink)]")
                  }
                >
                  {DEMO_STUDENTS[id].profile.first_name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ---------- Right: welcome + contents ---------- */}
        <div>
          {/* Welcome */}
          <section className="tf-v2-welcome">
            <h2>Welcome To Your Pathway</h2>
            <div>
              <p className="lead">
                This publication is a synthesis of {student.first_name}'s goals, documents, and the
                collective voice of {student.first_name === "Maya" ? "her" : "his"} support system.
                It is designed to read like an issue — a contained planning document, not a
                dashboard.
              </p>
              <p className="mt-3" style={{ opacity: 0.8 }}>
                Use the pathway thread above to move between milestones. Each chapter ends with a
                clear next step and a folio number so the team can reference it together.
              </p>
            </div>
            <div>
              <h3 className="how-h">How To Read This Issue</h3>
              <p style={{ opacity: 0.8, fontSize: "0.92rem" }}>
                Read cover to cover, or jump to the section that's useful right now. Switch
                students at any time — the workbook updates.
              </p>
              <ul>
                <li>Pathway thread shows where you are.</li>
                <li>Each chapter is a short magazine spread.</li>
                <li>Editorial sidebars surface evidence and quotes.</li>
                <li>Prev / Next at the foot of every page.</li>
              </ul>
            </div>
          </section>

          {/* Contents */}
          <section id="contents" className="tf-v2-contents">
            <h3 className="tf-v2-contents-h">Table Of Contents</h3>

            {parts.map(({ part, pages }) => {
              const items = pages.filter(p => p.id !== "cover");
              if (!items.length) return null;
              const meta = PART_META[part];
              return (
                <div key={part} className="tf-v2-contents-part">
                  <div className="tf-v2-contents-part-head">
                    <span className="tf-v2-contents-part-num">Part {meta.numeral}</span>
                    <h4 className="tf-v2-contents-part-title">{part}</h4>
                  </div>
                  <p className="tf-v2-contents-part-dek">{meta.dek}</p>
                  <ol className="tf-v2-contents-list" style={{ marginTop: "0.5rem" }}>
                    {items.map((p, idx) => (
                      <li key={p.id}>
                        <Link
                          to={p.route}
                          {...(preserved ? { search: preserved } : {})}
                          className="tf-v2-contents-row"
                        >
                          <span className="num">{String(PUBLICATION_PAGES.indexOf(p)).padStart(2, "0")}</span>
                          <span>
                            <span className="title">{p.title}</span>
                            <span className="dek">{p.dek}</span>
                          </span>
                          <span className="page">p. {String(p.folio).padStart(2, "0")}</span>
                        </Link>
                        {idx === items.length - 1 ? null : null}
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </IssueShell>
  );
}
