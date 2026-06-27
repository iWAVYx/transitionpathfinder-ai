import type { ReactNode } from "react";

/**
 * Editorial Hybrid — magazine-handbook issue system primitives.
 *
 * Used by the Demo Workspace, Demo Pathway Report, and the signed-in
 * Pathway Report so every chapter feels like part of one printed issue:
 *   <MagazinePage> ........ a warm paper sheet that hosts the chapter
 *   <ChapterOpener> ....... full-bleed teal opener with oversized numeral
 *   <SpreadHead> .......... fine rule + folio label at the top of a page
 *   <PullQuote> ........... oversized italic editorial quote
 *   <HandbookCallout> ..... peach-rule "what this means / do next" block
 *   <HandbookSidebar> ..... rule-divided guide column
 *   <Meter> ............... thin horizontal scorecard meter
 *
 * Styles live in src/styles.css under the EDITORIAL HYBRID section and are
 * scoped to `.demo-shell` and `.report-shell` so they never leak globally.
 */

interface MagazinePageProps {
  children: ReactNode;
  /** Page-number badge shown at the foot (folio). */
  folio?: string | number;
  className?: string;
}

export function MagazinePage({ children, folio, className }: MagazinePageProps) {
  return (
    <section className={`mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 ${className ?? ""}`}>
      <div className="eh-page mag-page">
        {children}
        {folio !== undefined ? (
          <div className="eh-folio" aria-hidden>
            <span>{String(folio).padStart(2, "0")}</span>
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface ChapterOpenerProps {
  /** Roman or arabic chapter numeral (e.g. "II" or "06"). */
  numeral: string;
  /** Small uppercase kicker (e.g. "Section Two"). */
  kicker: string;
  title: ReactNode;
  dek?: ReactNode;
  /** Optional handbook sidebar: a "What this chapter covers" block. */
  covers?: string[];
  /** Optional pathway milestone — renders a warm badge above the kicker. */
  milestone?: import("@/lib/publication/chapters").PathwayMilestoneId;
}

/**
 * Chapter opener — used as the first block of every demo step page and
 * before each major section in the Pathway Report. Renders the dark teal
 * page with oversized italic numeral, kicker, headline, dek, and an
 * optional "What This Chapter Covers" handbook checklist.
 */
export function ChapterOpener({ numeral, kicker, title, dek, covers, milestone }: ChapterOpenerProps) {
  return (
    <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6 sm:pt-14">
      <div className="eh-chapter">
        <span className="eh-chapter-num" aria-hidden>
          {numeral}
        </span>
        <div className="eh-chapter-inner">
          <div className="eh-chapter-rule" aria-hidden />
          {milestone ? (
            <div className="mb-3">
              <MilestoneBadge milestone={milestone} size="lg" tone="dark" />
            </div>
          ) : null}
          <span className="eh-chapter-kicker">{kicker}</span>
          <h1>{title}</h1>
          {dek ? <p>{dek}</p> : null}

          {covers && covers.length > 0 ? (
            <div className="mt-8 rounded-md border border-white/15 bg-white/[0.06] p-5 backdrop-blur-sm">
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.22em] text-[color:#ffd9bb]">
                What This Chapter Covers
              </p>
              <ul className="mt-3 space-y-1.5 text-[0.92rem] leading-relaxed text-white/90">
                {covers.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="text-[color:var(--eh-peach)]">/</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

interface SpreadHeadProps {
  left: string;
  right?: string;
}

export function SpreadHead({ left, right = "TransitionForward" }: SpreadHeadProps) {
  return (
    <header className="eh-spread-head">
      <span className="left">{left}</span>
      <span className="right">{right}</span>
    </header>
  );
}

interface PullQuoteProps {
  children: ReactNode;
  cite?: string;
}

export function PullQuote({ children, cite }: PullQuoteProps) {
  return (
    <blockquote className="eh-pullquote">
      {children}
      {cite ? <cite>{cite}</cite> : null}
    </blockquote>
  );
}

interface CalloutProps {
  label: string;
  children: ReactNode;
}

export function HandbookCallout({ label, children }: CalloutProps) {
  return (
    <aside className="eh-callout">
      <p className="eh-callout-label">{label}</p>
      <div className="text-[0.95rem] leading-relaxed text-foreground/85">{children}</div>
    </aside>
  );
}

interface SidebarProps {
  label: string;
  title?: string;
  items: ReactNode[];
}

export function HandbookSidebar({ label, title, items }: SidebarProps) {
  return (
    <aside className="eh-sidebar">
      <p className="eh-sidebar-label">{label}</p>
      {title ? (
        <h3 className="mb-3 font-display text-xl font-semibold text-[color:var(--eh-ink)]">
          {title}
        </h3>
      ) : null}
      <ul className="eh-sidebar-list">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </aside>
  );
}

interface MeterProps {
  label: string;
  /** 0–100 percentage. */
  value: number;
  caption?: string;
  variant?: "teal" | "peach";
}

export function Meter({ label, value, caption, variant = "teal" }: MeterProps) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="space-y-2">
      <h4 className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-[color:var(--eh-mute)]">
        {label}
      </h4>
      <div className={`eh-meter ${variant === "peach" ? "eh-meter--peach" : ""}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
      {caption ? (
        <p className="text-xs italic text-[color:var(--eh-mute)]">{caption}</p>
      ) : null}
    </div>
  );
}
