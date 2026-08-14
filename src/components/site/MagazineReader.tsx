import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronDown,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { DEMO_STUDENTS, type DemoStudentId } from "@/lib/demo-data";
import { PathwaySpine } from "@/components/publication/PathwaySpine";
import {
  PUBLICATION_PAGES,
  pagesByPart,
  prevPage,
  nextPage,
  pageIndex,
  firstPageForMilestone,
  type PublicationPageId,
} from "@/lib/publication/nav";

/**
 * Backwards-compatible export — derived from the canonical
 * {@link PUBLICATION_PAGES} list in `src/lib/publication/nav.ts`. Existing
 * imports and tests (`tests/unit/pathway-spine.test.ts`) iterate this array
 * by shape, so keep the keys `{ id, to, label, kicker, dek }`.
 */
export const MAGAZINE_PAGES = PUBLICATION_PAGES.map((p) => ({
  id: p.id,
  to: p.route,
  label: p.label,
  kicker: p.kicker,
  dek: p.dek,
})) as ReadonlyArray<{
  id: string;
  to: string;
  label: string;
  kicker: string;
  dek: string;
}>;

export type MagazinePageId = PublicationPageId;

interface ReaderProps {
  currentId: MagazinePageId;
  student: DemoStudentId;
  /** Preserve `?s=` only if the URL already carries one. */
  preserveStudent: boolean;
}

/**
 * Magazine reader chrome — top bar with page indicator, drawer Table of
 * Contents, prev/next arrows, keyboard ←/→ binding and a per-route slide
 * transition. Renders only the chrome; the page body is the route content.
 */
export function MagazineReader({ currentId, student, preserveStudent }: ReaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [tocOpen, setTocOpen] = useState(false);
  const prevPathRef = useRef(location.pathname);
  void preserveStudent;
  void student;

  const idx = Math.max(0, pageIndex(currentId));
  const current = PUBLICATION_PAGES[idx];
  const prev = prevPage(currentId);
  const next = nextPage(currentId);
  const total = PUBLICATION_PAGES.length;
  const progressPct = ((idx + 1) / total) * 100;

  useEffect(() => {
    prevPathRef.current = location.pathname;
  }, [location.pathname]);

  // Keyboard navigation — arrow keys turn pages (ignored when typing).
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight" && next) {
        e.preventDefault();
        void navigate({ to: next.route });
      } else if (e.key === "ArrowLeft" && prev) {
        e.preventDefault();
        void navigate({ to: prev.route });
      } else if (e.key === "Escape" && tocOpen) {
        setTocOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, navigate, tocOpen]);

  // Resolve a milestone -> route for the clickable Pathway Spine.
  const resolveSpineHref = (m: Parameters<typeof firstPageForMilestone>[0]) => {
    const p = firstPageForMilestone(m);
    return p ? p.route : undefined;
  };

  return (
    <>
      <nav
        aria-label="Reader navigation"
        className="demo-shell mag-reader-bar sticky top-16 z-30"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 lg:px-12">
          <Button
            asChild={!!prev}
            variant="ghost"
            size="sm"
            disabled={!prev}
            className="mag-reader-arrow min-h-11 shrink-0"
            aria-label={prev ? `Previous: ${prev.label}` : "No previous page"}
          >
            {prev ? (
              <Link to={prev.route}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden md:inline">Prev</span>
              </Link>
            ) : (
              <span><ArrowLeft className="h-4 w-4" /></span>
            )}
          </Button>

          <button
            type="button"
            onClick={() => setTocOpen((v) => !v)}
            className="mag-reader-indicator group flex-1 min-w-0 text-left"
            aria-expanded={tocOpen}
            aria-controls="mag-toc-drawer"
          >
            <span className="mag-reader-folio">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-demo-primary/80">
                {current.kicker} · {String(idx + 1).padStart(2, "0")} / {total}
              </span>
              <span className="block truncate font-display text-sm font-semibold text-demo-ink sm:text-base">
                {current.label}
              </span>
            </span>
            <ChevronDown
              className={`mag-reader-chev h-4 w-4 shrink-0 transition-transform ${tocOpen ? "rotate-180" : ""}`}
            />
          </button>

          <div className="tf-audience hidden lg:flex" role="tablist" aria-label="Sample student">
            {(["maya", "jordan"] as DemoStudentId[]).map((sid) => (
              <Link
                key={sid}
                to={current.route}
                role="tab"
                aria-selected={student === sid}
                className={student === sid ? "is-active" : ""}
              >
                {DEMO_STUDENTS[sid].profile.first_name}
              </Link>
            ))}
          </div>

          <Button
            asChild={!!next}
            size="sm"
            disabled={!next}
            className="mag-reader-arrow mag-reader-arrow--next min-h-11 shrink-0"
            aria-label={next ? `Next: ${next.label}` : "End of report"}
          >
            {next ? (
              <Link to={next.route}>
                <span className="hidden md:inline">Next</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span><ArrowRight className="h-4 w-4" /></span>
            )}
          </Button>
        </div>

        {/* Pathway Spine — clickable. Each milestone jumps to its first page. */}
        <div className="mx-auto max-w-7xl px-3 pb-2 pt-1 sm:px-6 lg:px-12">
          <PathwaySpine
            active={current.milestone}
            resolveHref={resolveSpineHref}
           
          />
        </div>
        <div className="mx-auto h-[1px] max-w-7xl bg-[color:var(--demo-primary)]/10" aria-hidden>
          <div
            className="h-full bg-[color:var(--demo-ink,#0c2340)] transition-transform duration-700 ease-out origin-left"
            style={{ transform: `scaleX(${progressPct / 100})` }}
          />
        </div>

        {/* TOC drawer — magazine-style contents, grouped by Part. */}
        {tocOpen && (
          <div
            id="mag-toc-drawer"
            role="dialog"
            aria-label="Table of contents"
            aria-modal="false"
            className="mag-reader-drawer"
          >
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-12">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-demo-primary" />
                  <span className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-demo-primary">
                    Table Of Contents
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTocOpen(false)}
                  className="rounded-full p-2 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                  aria-label="Close contents"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-6">
                {pagesByPart().map(({ part, pages }) =>
                  pages.length === 0 ? null : (
                    <section key={part} className="border-t border-[color:var(--pub-rule-soft)] pt-4 first:border-t-0 first:pt-0">
                      <p className="mb-3 font-display text-[10px] font-bold uppercase tracking-[0.28em] text-demo-accent">
                        {part}
                      </p>
                      <ol className="divide-y divide-[color:var(--pub-rule-soft)]">
                        {pages.map((p) => {
                          const active = p.id === currentId;
                          const done = pageIndex(p.id) < idx;
                          return (
                            <li key={p.id}>
                              <Link
                                to={p.route}
                               
                                onClick={() => setTocOpen(false)}
                                aria-current={active ? "page" : undefined}
                                className={`group flex items-baseline gap-4 py-3 transition-colors hover:bg-foreground/[0.03] ${
                                  active ? "is-active" : ""
                                }`}
                              >
                                <span
                                  className={`w-10 shrink-0 font-display text-[11px] font-bold uppercase tracking-[0.18em] ${
                                    active
                                      ? "text-demo-ink"
                                      : done
                                        ? "text-demo-accent"
                                        : "text-foreground/45"
                                  }`}
                                >
                                  {p.numeral}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block font-display text-[10px] font-bold uppercase tracking-[0.22em] text-foreground/55">
                                    {p.kicker}
                                  </span>
                                  <span
                                    className={`block font-display text-base font-semibold leading-snug ${
                                      active ? "text-demo-ink" : "text-foreground/90 group-hover:text-demo-ink"
                                    }`}
                                  >
                                    {p.title}
                                  </span>
                                  <span className="mt-0.5 block text-xs leading-snug text-foreground/65">
                                    {p.dek}
                                  </span>
                                </span>
                                <span className="ml-2 shrink-0 font-display text-xs tabular-nums text-foreground/45">
                                  p.&nbsp;{String(p.folio).padStart(2, "0")}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    </section>
                  ),
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Mobile sticky bottom nav — always visible Prev | Contents | Next. */}
      <nav
        aria-label="Reader navigation (mobile)"
        className="demo-shell mag-mobile-nav md:hidden"
      >
        <div className="grid grid-cols-3">
          {prev ? (
            <Link to={prev.route} className="mag-mobile-nav-btn">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span className="mag-mobile-nav-label">{prev.label}</span>
            </Link>
          ) : (
            <span className="mag-mobile-nav-btn is-disabled">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              <span className="mag-mobile-nav-label">Start</span>
            </span>
          )}
          <button
            type="button"
            onClick={() => setTocOpen((v) => !v)}
            className="mag-mobile-nav-btn is-center"
            aria-label="Open contents"
          >
            <BookOpen className="h-4 w-4" aria-hidden />
            <span className="mag-mobile-nav-label">{String(idx + 1).padStart(2, "0")} / {total}</span>
          </button>
          {next ? (
            <Link to={next.route} className="mag-mobile-nav-btn">
              <ArrowRight className="h-4 w-4" aria-hidden />
              <span className="mag-mobile-nav-label">{next.label}</span>
            </Link>
          ) : (
            <span className="mag-mobile-nav-btn is-disabled">
              <ArrowRight className="h-4 w-4" aria-hidden />
              <span className="mag-mobile-nav-label">End</span>
            </span>
          )}
        </div>
      </nav>

      <style>{`
        .mag-page { animation: mag-fade 220ms ease-out both; }
        @keyframes mag-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

interface FooterProps {
  currentId: MagazinePageId;
  student: DemoStudentId;
  preserveStudent: boolean;
}

/**
 * Page-turn spread shown at the end of each reader page. Replaces the old
 * minimal prev/next bar with a magazine-style "Turn The Page" affordance
 * that previews the next chapter's kicker + dek.
 */
export function MagazinePageTurn({ currentId, student, preserveStudent }: FooterProps) {
  const idx = pageIndex(currentId);
  const prev = prevPage(currentId);
  const next = nextPage(currentId);
  void preserveStudent;
  void student;

  return (
    <div className="mx-auto mt-16 max-w-7xl px-4 pb-12 sm:px-6 lg:px-12">
      <div className="mag-pageturn">
        <div className="mag-pageturn-side mag-pageturn-side--prev">
          {prev ? (
            <Link to={prev.route} className="mag-pageturn-link">
              <span className="mag-pageturn-folio">
                <ArrowLeft className="h-3.5 w-3.5" /> Page {String(prev.folio).padStart(2, "0")}
              </span>
              <span className="mag-pageturn-kicker">{prev.kicker}</span>
              <span className="mag-pageturn-title">{prev.label}</span>
            </Link>
          ) : (
            <Link to="/demo" className="mag-pageturn-link">
              <span className="mag-pageturn-folio"><ArrowLeft className="h-3.5 w-3.5" /> Cover</span>
              <span className="mag-pageturn-kicker">Return To</span>
              <span className="mag-pageturn-title">Cover</span>
            </Link>
          )}
        </div>

        <div className="mag-pageturn-side mag-pageturn-side--next">
          {next ? (
            <Link to={next.route} className="mag-pageturn-link is-next">
              <span className="mag-pageturn-folio">
                Page {String(next.folio).padStart(2, "0")} <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <span className="mag-pageturn-kicker">{next.kicker}</span>
              <span className="mag-pageturn-title">{next.label}</span>
              <span className="mag-pageturn-dek">{next.dek}</span>
            </Link>
          ) : (
            <Link to="/waitlist" className="mag-pageturn-link is-next">
              <span className="mag-pageturn-folio">End Of Issue <ArrowRight className="h-3.5 w-3.5" /></span>
              <span className="mag-pageturn-kicker">Subscribe</span>
              <span className="mag-pageturn-title">Join The Waitlist</span>
              <span className="mag-pageturn-dek">Bring this experience to your team.</span>
            </Link>
          )}
        </div>
      </div>
      {/* idx kept for backwards compatibility — used to be page label */}
      <span className="sr-only">Currently on page {idx + 1}.</span>
    </div>
  );
}
