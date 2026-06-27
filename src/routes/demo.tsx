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

  const evidence = (
    <>
      <div>
        <h4 className="tf-v2-evidence-h">Featured Student</h4>
        <div className="tf-v2-switch">
          {(["maya", "jordan"] as DemoStudentId[]).map((id) => (
            <Link
              key={id}
              to="/demo"
              search={{ s: id }}
              resetScroll={false}
              aria-current={id === s ? "true" : undefined}
            >
              {DEMO_STUDENTS[id].profile.first_name}
            </Link>
          ))}
        </div>
      </div>

      {voiceQuote ? (
        <div>
          <h4 className="tf-v2-evidence-h">Student Voice</h4>
          <blockquote
            style={{
              fontFamily: "var(--v2-serif)",
              fontStyle: "italic",
              fontSize: "1.05rem",
              lineHeight: 1.4,
              borderLeft: "2px solid var(--v2-teal)",
              padding: "0.25rem 0 0.25rem 0.9rem",
              margin: 0,
              color: "var(--v2-ink)",
            }}
          >
            “{voiceQuote}”
          </blockquote>
          <p style={{ marginTop: "0.6rem", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, color: "var(--v2-teal)" }}>
            — {student.first_name}, Grade {student.grade}
          </p>
        </div>
      ) : null}

      <div>
        <h4 className="tf-v2-evidence-h">How To Read</h4>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.55rem", fontSize: "0.9rem" }}>
          <li>Use the rail on the left to move between milestones.</li>
          <li>Each chapter ends with a clear next step.</li>
          <li>The deck below ends with prev / next page foot.</li>
        </ul>
      </div>
    </>
  );

  return (
    <IssueShell milestone="cover" partLabel="Cover · Pathway Issue" evidence={evidence}>
      {/* Hero */}
      <header className="tf-v2-hero">
        <span className="ed">The Personal Planning Issue Of</span>
        <h2>
          {toTitleCase(student.full_name)} <em>—</em> A Pathway Forward
        </h2>
        <p className="dek">
          A synthesis of {student.first_name}'s goals, documents, and the collective voice of {student.first_name === "Maya" ? "her" : "his"} support system — read it like an issue, not a dashboard.
        </p>
        <div className="tf-v2-hero-meta">
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
        <div className="tf-v2-hero-cta">
          <Link
            to="/demo/intake"
            {...(preserved ? { search: preserved } : {})}
            className="tf-v2-btn tf-v2-btn--primary"
          >
            Begin Reading
          </Link>
          <a href="#contents" className="tf-v2-btn tf-v2-btn--ghost">
            Open Contents
          </a>
        </div>
      </header>

      {/* Welcome */}
      <section className="tf-v2-welcome-block">
        <div>
          <h3>Welcome To Your Pathway</h3>
          <p className="lead">
            This workspace is a contained planning document. The navy rail on the left is the
            pathway itself: every milestone, in order, with the active chapter highlighted in
            teal. The deck on the right is where you read.
          </p>
        </div>
        <div>
          <h3>What's Inside</h3>
          <ul>
            <li>Intake, Voice, and Documents — what we heard.</li>
            <li>The Pathway Report — what it means together.</li>
            <li>A 30 / 60 / 90 plan and the next meeting agenda.</li>
            <li>A shared Student Hub for staying in sync after.</li>
          </ul>
        </div>
      </section>

      {/* TOC */}
      <section id="contents" className="tf-v2-toc">
        <h3 className="tf-v2-toc-h">Table Of Contents</h3>

        {parts.map(({ part, pages }) => {
          const items = pages.filter(p => p.id !== "cover");
          if (!items.length) return null;
          const meta = PART_META[part];
          return (
            <div key={part} className="tf-v2-toc-part">
              <div className="tf-v2-toc-part-head">
                <span className="tf-v2-toc-part-num">Part {meta.numeral}</span>
                <h4 className="tf-v2-toc-part-title">{part}</h4>
              </div>
              <p className="tf-v2-toc-part-dek">{meta.dek}</p>
              <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map((p) => (
                  <li key={p.id}>
                    <Link
                      to={p.route}
                      {...(preserved ? { search: preserved } : {})}
                      className="tf-v2-toc-row"
                    >
                      <span className="num">{String(PUBLICATION_PAGES.indexOf(p)).padStart(2, "0")}</span>
                      <span>
                        <span className="title">{p.title}</span>
                        <span className="dek">{p.dek}</span>
                      </span>
                      <span className="page">p. {String(p.folio).padStart(2, "0")}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          );
        })}
      </section>
    </IssueShell>
  );
}
