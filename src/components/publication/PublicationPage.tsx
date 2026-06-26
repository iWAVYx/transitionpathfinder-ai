/**
 * Publication primitives — the building blocks for the magazine-handbook
 * pages used by the Demo Workspace and Pathway Report. They produce the
 * editorial chrome (running head, folio, chapter mark, side rules) that
 * makes each route feel like a page inside a contained publication
 * rather than another dashboard view.
 *
 * Pure presentation. No data fetching, no router coupling. All visual
 * behavior lives in the `.pub-*` CSS layer in `src/styles.css`, scoped to
 * the `.eh-issue` shell that already wraps demo + report routes.
 */
import type { ReactNode } from "react";

interface PublicationPageProps {
  /** Issue title shown in the upper running head (e.g. "Pathway Workbook"). */
  issue?: string;
  /** Part / section group (e.g. "Part Two — Synthesize"). */
  part?: string;
  /** Chapter / page title (e.g. "Student Voice"). */
  chapter: string;
  /** One-line page purpose shown under the title. */
  dek?: string;
  /** Folio / page number, e.g. "14" or "p. 14". */
  folio?: string;
  /** Optional kicker shown above the chapter title (e.g. "Section 02"). */
  kicker?: string;
  /** Page body. */
  children: ReactNode;
}

/** A single publication page with running head, chapter mark, and folio. */
export function PublicationPage({
  issue = "TransitionForward · Pathway Workbook",
  part,
  chapter,
  dek,
  folio,
  kicker,
  children,
}: PublicationPageProps) {
  return (
    <article className="pub-page">
      <header className="pub-page-runninghead" aria-hidden={false}>
        <span className="pub-page-issue">{issue}</span>
        {part && <span className="pub-page-part">{part}</span>}
        {folio && <span className="pub-page-folio">{folio}</span>}
      </header>

      <div className="pub-page-opener">
        {kicker && <p className="pub-page-kicker">{kicker}</p>}
        <h1 className="pub-page-title">{chapter}</h1>
        {dek && <p className="pub-page-dek">{dek}</p>}
        <div className="pub-page-rule" aria-hidden />
      </div>

      <div className="pub-page-body">{children}</div>
    </article>
  );
}

/** Two-column editorial spread; collapses to a single column on mobile. */
export function PublicationSpread({
  lead,
  side,
}: {
  lead: ReactNode;
  side: ReactNode;
}) {
  return (
    <div className="pub-spread">
      <div className="pub-spread-lead">{lead}</div>
      <aside className="pub-spread-side">{side}</aside>
    </div>
  );
}

/** Editorial pull quote with optional attribution. */
export function PublicationPullQuote({
  children,
  attribution,
}: {
  children: ReactNode;
  attribution?: string;
}) {
  return (
    <figure className="pub-pullquote">
      <blockquote>{children}</blockquote>
      {attribution && <figcaption>— {attribution}</figcaption>}
    </figure>
  );
}

/** Handbook sidebar — used for "What This Means", "Why It Matters", etc. */
export function PublicationSidebar({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <aside className="pub-sidebar">
      <p className="pub-sidebar-label">{label}</p>
      <div className="pub-sidebar-body">{children}</div>
    </aside>
  );
}

/** "What this means" handbook callout — single column, left rule. */
export function PublicationCallout({
  kind = "means",
  title,
  children,
}: {
  kind?: "means" | "matters" | "next" | "source";
  title?: string;
  children: ReactNode;
}) {
  const defaults = {
    means:   { label: "What This Means" },
    matters: { label: "Why It Matters" },
    next:    { label: "What To Do Next" },
    source:  { label: "Source Note" },
  } as const;
  return (
    <div className={`pub-callout pub-callout--${kind}`}>
      <p className="pub-callout-label">{title ?? defaults[kind].label}</p>
      <div className="pub-callout-body">{children}</div>
    </div>
  );
}

/** Handbook checklist. */
export function PublicationChecklist({
  items,
  title,
}: {
  items: string[];
  title?: string;
}) {
  return (
    <div className="pub-checklist">
      {title && <p className="pub-checklist-title">{title}</p>}
      <ul>
        {items.map((it) => (
          <li key={it}>
            <span className="pub-checklist-tick" aria-hidden>✓</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Source / evidence annotation — small print, end of page. */
export function PublicationSource({ children }: { children: ReactNode }) {
  return <p className="pub-source">{children}</p>;
}
