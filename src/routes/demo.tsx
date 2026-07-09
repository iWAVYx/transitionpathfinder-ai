import { createFileRoute, Link } from "@tanstack/react-router";

import {
  DEMO_STUDENTS,
  getDemoStudent,
  type DemoStudentId,
} from "@/lib/demo-data";
import {
  DEFAULT_DEMO_STUDENT,
  validateStudentSearch,
} from "@/components/site/DemoStepBar";
import { toTitleCase } from "@/lib/title-case";

import { StudioShell, StudioHead, PathwayMap, StudioFrame, StudioAside } from "@/studio/StudioShell";
import {
  CHAPTER_STAGES,
  ACT_META,
} from "@/studio/stages";

export const Route = createFileRoute("/demo")({
  validateSearch: validateStudentSearch,
  head: () => ({
    meta: [
      { title: "Pathway Studio — TransitionForward Demo" },
      {
        name: "description",
        content:
          "Step into the TransitionForward Pathway Studio: a guided workspace that turns scattered transition-planning inputs into a clear, shared pathway forward.",
      },
      { property: "og:title", content: "Pathway Studio — TransitionForward Demo" },
      {
        property: "og:description",
        content:
          "Walk a fictional Connecticut high school student from intake through a 30 / 60 / 90 plan inside the new TransitionForward Pathway Studio.",
      },
      { property: "og:url", content: "/demo" },
    ],
    links: [{ rel: "canonical", href: "/demo" }],
  }),
  component: StudioCover,
});

function StudioCover() {
  const search = Route.useSearch();
  const s = search.s ?? DEFAULT_DEMO_STUDENT;
  const preserve = !!search.s;
  const bundle = getDemoStudent(s);
  const { profile: student } = bundle;
  const voiceQuote = bundle.report.student_snapshot?.student_voice_quote;

  return (
    <StudioShell stage="cover" student={s} preserveStudent={preserve}>
      <StudioHead
        title={
          <>
            {toTitleCase(student.full_name)} — <em>A pathway forward.</em>
          </>
        }
        dek="The Pathway Studio is a guided workspace. The rail on the left is the path itself; this is your starting point — walk it stage by stage, or open the map for a bird's-eye view."
      />

      {/* Cover spread */}
      <div className="st-cover">
        <div className="lead">
          <p className="issue-line">Issue 01 · {student.school} · {student.graduation_year}</p>
          <div className="ctas">
            <Link
              to="/demo/intake"
              {...(preserve ? { search: { s } } : {})}
              className="primary"
            >
              Begin the Pathway →
            </Link>
            <a href="#overview" className="ghost">See the Full Map</a>
          </div>
        </div>

        <aside className="side">
          <h4>Featured student</h4>
          <p style={{ margin: "0 0 18px", fontSize: 14, color: "var(--st-mute)" }}>
            {toTitleCase(student.full_name)} · {student.pronouns} · Grade {student.grade}
          </p>
          {voiceQuote ? (
            <blockquote className="quote">
              “{voiceQuote}”
              <cite>— {student.first_name}, in their own words</cite>
            </blockquote>
          ) : null}

          <h4>Switch sample</h4>
          <div className="swap" role="tablist" aria-label="Sample student">
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
        </aside>
      </div>

      {/* Visual pathway (waypoint route) */}
      <StudioFrame title="The Pathway, at a Glance">
        <p>
          Every stage feeds the next. Intake, student voice, and documents
          become a Pathway Report. The report becomes an agenda, a calendar,
          and a 30 / 60 / 90 plan. The plan keeps living inside a shared
          Student Hub. That's the whole loop.
        </p>
        <PathwayMap activeId="cover" preserveStudent={preserve} student={s} />
      </StudioFrame>

      {/* 11-step horizontal journey strip (locked by `/demo` layout test) */}
      <nav className="tf-journey" aria-label="Eleven-stage pathway">
        {CHAPTER_STAGES.map((stg, i) => (
          <Link
            key={stg.id}
            to={stg.to}
            {...(preserve ? { search: { s } } : {})}
            className="tf-journey-step"
            data-state={i === 0 ? "current" : "future"}
          >
            <span className="j-dot">{i + 1}</span>
            <span className="j-lab">{stg.label}</span>
          </Link>
        ))}
      </nav>

      {/* Acts overview */}
      <StudioFrame title="What you'll walk through">
        <p id="overview">
          The studio is organized into four acts. Each act answers one
          question the team is trying to make progress on together.
        </p>
        <div style={{ display: "grid", gap: 28, marginTop: 16 }}>
          {(["I", "II", "III", "IV"] as const).map((act) => {
            const stages = CHAPTER_STAGES.filter((x) => x.act === act);
            const meta = ACT_META[act];
            return (
              <section key={act} style={{ borderTop: "1px solid var(--st-rule)", paddingTop: 22 }}>
                <p
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "var(--st-map-deep)",
                    margin: 0,
                    fontWeight: 700,
                  }}
                >
                  Act {act}
                </p>
                <h3 style={{ margin: "4px 0 6px", fontFamily: "var(--st-serif)", color: "var(--st-ink)" }}>
                  {meta.title.replace(/^Act [IVX]+ · /, "")}
                </h3>
                <p style={{ color: "var(--st-mute)", margin: "0 0 14px", maxWidth: "62ch" }}>{meta.dek}</p>
                <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 0 }}>
                  {stages.map((stg) => (
                    <li key={stg.id}>
                      <Link
                        to={stg.to}
                        {...(preserve ? { search: { s } } : {})}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "56px 1fr auto",
                          gap: 16,
                          padding: "12px 0",
                          borderTop: "1px solid var(--st-rule-soft)",
                          textDecoration: "none",
                          color: "var(--st-ink)",
                        }}
                      >
                        <span style={{ fontFamily: "var(--st-serif)", fontStyle: "italic", color: "var(--st-mute)" }}>
                          p. {stg.folio}
                        </span>
                        <span>
                          <span style={{ display: "block", fontFamily: "var(--st-serif)", fontSize: "1.1rem", color: "var(--st-ink)" }}>
                            {stg.label}
                          </span>
                          <span style={{ display: "block", fontSize: 13, color: "var(--st-mute)" }}>
                            {stg.produces}
                          </span>
                        </span>
                        <span style={{ alignSelf: "center", color: "var(--st-map)" }}>→</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      </StudioFrame>

      <StudioAside kind="next" label="Begin">
        Start with <strong>Starting Point</strong> — the family-completed
        intake. Everything you'll read later is built on top of those answers.
      </StudioAside>
    </StudioShell>
  );
}
