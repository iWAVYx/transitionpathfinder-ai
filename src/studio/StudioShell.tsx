import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";

import type { DemoStudentId } from "@/lib/demo-data";
import {
  STUDIO_STAGES,
  CHAPTER_STAGES,
  ACT_META,
  neighbors,
  progressPct,
  stageById,
  type StudioStageId,
} from "./stages";

interface Props {
  stage: StudioStageId;
  student?: DemoStudentId;
  /** Optional explicit student in URL — when set, links carry ?s=. */
  preserveStudent?: boolean;
  /** Hide the left workbench rail and let the canvas take the full width. */
  hideRail?: boolean;
  children: ReactNode;
}

/**
 * StudioShell — the brand-new from-scratch Pathway Studio chrome.
 *
 * Layout: left workbench rail (vertical wizard) + right canvas + sticky
 * footer with prev / next + an "Open Map" pill that reveals the
 * full overview map overlay. Replaces SiteShell + DemoStepBar +
 * PublicationPage chrome wholesale for the demo and signed-in report.
 */
export function StudioShell({ stage, student, preserveStudent, hideRail, children }: Props) {
  const [mapOpen, setMapOpen] = useState(false);
  const [railOpen, setRailOpen] = useState(false);
  const current = stageById(stage);
  const { prev, next } = neighbors(stage);
  void preserveStudent;
  void student;
  const currentIdx = STUDIO_STAGES.findIndex((x) => x.id === stage);

  const railBody = (
    <>
      <p className="rail-kicker">The Pathway · Walk It in Order</p>
      <h2 className="rail-title">
        From Scattered Inputs to a Plan Everyone Shares.
      </h2>
      <div
        className="rail-progress"
        role="progressbar"
        aria-valuenow={progressPct(stage)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progressPct(stage)}%` }} />
      </div>
      <ol>
        {STUDIO_STAGES.map((s, i) => {
          const state =
            s.id === stage ? "current" : i < currentIdx ? "done" : "future";
          return (
            <li key={s.id}>
              <Link
                to={s.to}
                className="stage"
                data-state={state}
                aria-current={state === "current" ? "step" : undefined}
                onClick={() => setRailOpen(false)}
              >
                <span className="dot" aria-hidden />
                <span className="body">
                  <span className="lbl">{s.label}</span>
                  <span className="sub">{s.produces}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </>
  );

  return (
    <div className="tf-studio">
      <div className={`tf-studio-app${hideRail ? " tf-studio-app--norail" : ""}`}>
        {/* Brand strip */}
        <header className="tf-studio-brand">
          <Link to="/" className="mark">
            TransitionForward <em>· Pathway Studio</em>
          </Link>

          <div className="meta">
            <button
              type="button"
              className="rail-toggle"
              aria-expanded={railOpen}
              aria-controls="tf-studio-rail-sheet"
              onClick={() => setRailOpen((v) => !v)}
            >
              <span className="rt-num">{currentIdx + 1}</span>
              <span className="rt-lbl">{current.label}</span>
              <span className="rt-caret" aria-hidden>▾</span>
            </button>
            <span className="pill st-hide-mobile">Issue No. 01 · Demo</span>
            <span className="st-hide-mobile">Read time ≈ 12 min</span>
          </div>
        </header>

        {/* Left workbench rail (desktop) + mobile bottom sheet */}
        {hideRail ? null : (
          <>
            <aside
              id="tf-studio-rail-sheet"
              className="tf-studio-rail"
              aria-label="Pathway stages"
              data-lenis-prevent
              data-open={railOpen ? "true" : "false"}
            >
              {railBody}
            </aside>
            {railOpen ? (
              <button
                type="button"
                className="tf-studio-rail-scrim"
                aria-label="Close stages menu"
                onClick={() => setRailOpen(false)}
              />
            ) : null}
          </>
        )}


        {/* Canvas */}
        <main className="tf-studio-canvas" id="studio-canvas">
          <header className="st-stagehead">
            <div>
              <p className="slate">
                <span className="sq" aria-hidden /> {current.slate}
              </p>
              {/* h1/h2/dek/folio are filled by page-level <StudioHead /> below */}
              <StudioHeadSlot />
            </div>
            <p className="folio">p. {current.folio}</p>
          </header>
          {children}
        </main>

        {/* Footer wizard */}
        <footer className="tf-studio-foot">
          {prev ? (
            <Link
              to={prev.to}
              className="nav prev"
            >
              <span className="arrow" aria-hidden>←</span>
              <span className="label">
                <span className="lbl-kicker">Previous</span>
                <span className="lbl-title">{prev.label}</span>
              </span>
            </Link>
          ) : (
            <span className="nav prev disabled" aria-hidden />
          )}

          <div className="step-pill">
            <span>
              Stage {STUDIO_STAGES.findIndex((s) => s.id === stage)} of{" "}
              {STUDIO_STAGES.length - 1}
            </span>
            <button type="button" onClick={() => setMapOpen(true)}>
              Open Map
            </button>
          </div>

          {next ? (
            <Link
              to={next.to}
              className="nav next"
            >
              <span className="label">
                <span className="lbl-kicker">Continue</span>
                <span className="lbl-title">{next.label}</span>
              </span>
              <span className="arrow" aria-hidden>→</span>
            </Link>
          ) : (
            <span className="nav next disabled" aria-hidden />
          )}
        </footer>
      </div>

      {/* Overview map overlay */}
      <div
        className="tf-studio-map"
        role="dialog"
        aria-label="Pathway overview map"
        aria-modal="true"
        hidden={!mapOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMapOpen(false);
        }}
      >
        <div className="panel">
          <div className="panel-head">
            <h2>Pathway Overview</h2>
            <button
              className="close"
              type="button"
              onClick={() => setMapOpen(false)}
              aria-label="Close overview map"
            >
              ×
            </button>
          </div>

          <PathwayMap activeId={stage} preserveStudent={!!preserveStudent} student={student} />

          <div style={{ marginTop: 24, display: "grid", gap: 18 }}>
            {(["I", "II", "III", "IV"] as const).map((act) => {
              const stages = CHAPTER_STAGES.filter((s) => s.act === act);
              const meta = ACT_META[act];
              return (
                <section key={act}>
                  <h3 style={{ fontFamily: "var(--st-serif)", margin: "0 0 4px", color: "var(--st-ink)" }}>
                    {meta.title}
                  </h3>
                  <p style={{ color: "var(--st-mute)", margin: "0 0 10px", maxWidth: "62ch" }}>
                    {meta.dek}
                  </p>
                  <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 2 }}>
                    {stages.map((s) => (
                      <li key={s.id}>
                        <Link
                          to={s.to}
                                    onClick={() => setMapOpen(false)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "44px 1fr auto",
                            gap: 14,
                            padding: "10px 8px",
                            borderTop: "1px solid var(--st-rule-soft)",
                            textDecoration: "none",
                            color: "var(--st-ink)",
                          }}
                        >
                          <span style={{ fontFamily: "var(--st-serif)", fontStyle: "italic", color: "var(--st-mute)" }}>
                            p. {s.folio}
                          </span>
                          <span>
                            <span style={{ display: "block", fontFamily: "var(--st-serif)", fontSize: "1.05rem" }}>
                              {s.label}
                            </span>
                            <span style={{ display: "block", fontSize: 12.5, color: "var(--st-mute)" }}>
                              {s.produces}
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
        </div>
      </div>
    </div>
  );
}

/**
 * Place this at the very top of a stage page's children to fill in the
 * stage head (title, dek, optional kicker override). Designed to live
 * inside the StudioShell's pre-rendered slate header.
 */
export function StudioHead({
  title,
  dek,
}: {
  title: ReactNode;
  dek?: ReactNode;
}) {
  // Render into the document order; the .st-stagehead from StudioShell
  // already holds the slate + folio. We render the title + dek inline
  // here so authors can compose them with the rest of the page body.
  return (
    <header style={{ marginBottom: 40 }}>
      <h1>{title}</h1>
      {dek ? <p className="dek" style={{
        fontFamily: "var(--st-serif)",
        fontStyle: "italic",
        fontSize: "1.18rem",
        lineHeight: 1.55,
        color: "var(--st-mute)",
        margin: "16px 0 0",
        maxWidth: "58ch",
      }}>{dek}</p> : null}
    </header>
  );
}

function StudioHeadSlot() {
  // Decorative placeholder beneath the slate; the real h1 is rendered
  // by the page body via <StudioHead />. Kept here so the slate has a
  // consistent vertical rhythm even when a page omits StudioHead.
  return <span style={{ display: "block", height: 0 }} aria-hidden />;
}

/* ---------- Compact editorial primitives ---------- */

export function StudioAside({
  kind = "default",
  label,
  children,
}: {
  kind?: "default" | "next" | "source";
  label?: string;
  children: ReactNode;
}) {
  return (
    <aside className={`st-aside ${kind === "next" ? "is-next" : ""} ${kind === "source" ? "is-source" : ""}`.trim()}>
      {label ? <p className="lbl">{label}</p> : null}
      {children}
    </aside>
  );
}

export function StudioPull({ quote, attribution }: { quote: ReactNode; attribution?: string }) {
  return (
    <blockquote className="st-pull">
      “{quote}”
      {attribution ? <cite>— {attribution}</cite> : null}
    </blockquote>
  );
}

export function StudioFrame({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="st-frame">
      {title ? <h2>{title}</h2> : null}
      {children}
    </section>
  );
}

/* ---------- Visual route (waypoints) ---------- */

export function PathwayMap({
  activeId,
  preserveStudent,
  student,
}: {
  activeId: StudioStageId;
  preserveStudent: boolean;
  student?: DemoStudentId;
}) {
  const activeIdx = STUDIO_STAGES.findIndex((s) => s.id === activeId);
  void preserveStudent;
  void student;
  return (
    <nav className="st-route" aria-label="Visual pathway route">
      {STUDIO_STAGES.map((s, i) => {
        const state =
          s.id === activeId ? "current" : i < activeIdx ? "done" : "future";
        return (
          <Link
            key={s.id}
            to={s.to}
            data-state={state}
            aria-current={state === "current" ? "step" : undefined}
          >
            <span className="wp">{i}</span>
            <span className="lab">{s.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
