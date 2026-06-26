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

/**
 * Canonical reader page order — used by both the chrome (prev/next, indicator,
 * TOC) and the cover/closing pages. Indexes are 1-based for display.
 */
export const MAGAZINE_PAGES = [
  { id: "cover",        to: "/demo",               label: "Cover",                  kicker: "Overview",         dek: "An interactive transition-planning report." },
  { id: "intake",       to: "/demo/intake",        label: "Starting Point",         kicker: "Section 01",       dek: "Strengths, interests, supports — three voices." },
  { id: "voice",        to: "/demo/voice",         label: "Student Voice",          kicker: "Section 02",       dek: "In the student's own words — eight short prompts." },
  { id: "documents",    to: "/demo/documents",     label: "Documents & Evidence",   kicker: "Section 03",       dek: "The IEP, evaluations and 504 — organized into one planning companion." },
  { id: "report",       to: "/demo/report",        label: "The Pathway Report",     kicker: "Section 04",       dek: "Pathways, supports, accommodations — written in plain language." },
  { id: "opportunities",to: "/demo/opportunities", label: "Opportunity Matches",    kicker: "Section 05",       dek: "Apprenticeships, internships and community programs that fit." },
  { id: "resources",    to: "/demo/resources",     label: "Resource Matches",       kicker: "Section 06",       dek: "Curated supports — what it is, who it helps, how to use it." },
  { id: "meeting",      to: "/demo/meeting",       label: "Questions For The Team", kicker: "Section 07",       dek: "A PPT-ready packet with agenda, questions and follow-ups." },
  { id: "calendar",     to: "/demo/calendar",      label: "Shared Calendar",        kicker: "Section 08",       dek: "Meetings, deadlines, tours — everyone on one page." },
  { id: "plan",         to: "/demo/plan",          label: "30 / 60 / 90-Day Plan",  kicker: "Section 09",       dek: "Doable steps with named owners and clear success markers." },
  { id: "hub",          to: "/demo/hub",           label: "The Student Hub",        kicker: "Section 10",       dek: "The ongoing workspace for families and the care team." },
  { id: "next",         to: "/demo/next",          label: "What Comes Next",        kicker: "Closing",          dek: "Clear paths for families, educators, schools and partners." },
] as const;

export type MagazinePageId = (typeof MAGAZINE_PAGES)[number]["id"];

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
  const [direction, setDirection] = useState<1 | -1 | 0>(0);
  const prevPathRef = useRef(location.pathname);
  const search = preserveStudent ? { s: student } : undefined;

  const idx = Math.max(0, MAGAZINE_PAGES.findIndex((p) => p.id === currentId));
  const current = MAGAZINE_PAGES[idx];
  const prev = idx > 0 ? MAGAZINE_PAGES[idx - 1] : null;
  const next = idx < MAGAZINE_PAGES.length - 1 ? MAGAZINE_PAGES[idx + 1] : null;
  const total = MAGAZINE_PAGES.length;
  const progressPct = ((idx + 1) / total) * 100;

  // Track direction so the page-turn animation knows which way to slide.
  useEffect(() => {
    const prevIdx = MAGAZINE_PAGES.findIndex((p) => p.to === prevPathRef.current);
    const nowIdx = MAGAZINE_PAGES.findIndex((p) => p.to === location.pathname);
    if (prevIdx >= 0 && nowIdx >= 0 && prevIdx !== nowIdx) {
      setDirection(nowIdx > prevIdx ? 1 : -1);
    }
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
        void navigate({ to: next.to, search });
      } else if (e.key === "ArrowLeft" && prev) {
        e.preventDefault();
        void navigate({ to: prev.to, search });
      } else if (e.key === "Escape" && tocOpen) {
        setTocOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, navigate, search, tocOpen]);

  return (
    <>
      <div className="demo-shell mag-reader-bar sticky top-16 z-30">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-12">
          {/* Prev */}
          <Button
            asChild={!!prev}
            variant="ghost"
            size="sm"
            disabled={!prev}
            className="mag-reader-arrow"
            aria-label={prev ? `Previous page — ${prev.label}` : "No previous page"}
          >
            {prev ? (
              <Link to={prev.to} search={search}>
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Prev</span>
              </Link>
            ) : (
              <span><ArrowLeft className="h-4 w-4" /></span>
            )}
          </Button>

          {/* TOC trigger / page indicator */}
          <button
            type="button"
            onClick={() => setTocOpen((v) => !v)}
            className="mag-reader-indicator group flex-1 min-w-0 text-left"
            aria-expanded={tocOpen}
            aria-controls="mag-toc-drawer"
          >
            <span className="mag-reader-folio">
              <span className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-demo-primary/80">
                {current.kicker} · Page {String(idx + 1).padStart(2, "0")} / {total}
              </span>
              <span className="block truncate font-display text-base font-semibold text-demo-ink">
                {current.label}
              </span>
            </span>
            <ChevronDown
              className={`mag-reader-chev h-4 w-4 shrink-0 transition-transform ${tocOpen ? "rotate-180" : ""}`}
            />
          </button>

          {/* Student switcher (compact) */}
          <div className="tf-audience hidden sm:flex" role="tablist" aria-label="Sample student">
            {(["maya", "jordan"] as DemoStudentId[]).map((sid) => (
              <Link
                key={sid}
                to={current.to}
                search={{ s: sid }}
                role="tab"
                aria-selected={student === sid}
                className={student === sid ? "is-active" : ""}
              >
                {DEMO_STUDENTS[sid].profile.first_name}
              </Link>
            ))}
          </div>

          {/* Next */}
          <Button
            asChild={!!next}
            size="sm"
            disabled={!next}
            className="mag-reader-arrow mag-reader-arrow--next"
            aria-label={next ? `Next page — ${next.label}` : "End of issue"}
          >
            {next ? (
              <Link to={next.to} search={search}>
                <span className="hidden sm:inline">Next</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span><ArrowRight className="h-4 w-4" /></span>
            )}
          </Button>
        </div>

        {/* Hairline progress */}
        <div className="mx-auto h-[2px] max-w-7xl bg-[color:var(--demo-primary)]/10" aria-hidden>
          <div
            className="h-full bg-gradient-to-r from-[color:var(--demo-primary)] to-[color:var(--demo-accent)] transition-transform duration-700 ease-out origin-left"
            style={{ transform: `scaleX(${progressPct / 100})` }}
          />
        </div>

        {/* TOC drawer */}
        {tocOpen && (
          <div
            id="mag-toc-drawer"
            role="dialog"
            aria-label="Table of contents"
            className="mag-reader-drawer"
          >
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-12">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-demo-primary" />
                  <span className="font-display text-sm font-semibold uppercase tracking-[0.22em] text-demo-primary">
                    Contents
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTocOpen(false)}
                  className="rounded-full p-1.5 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
                  aria-label="Close contents"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <ol className="mag-toc-grid">
                {MAGAZINE_PAGES.map((p, i) => {
                  const active = p.id === currentId;
                  return (
                    <li key={p.id}>
                      <Link
                        to={p.to}
                        search={search}
                        onClick={() => setTocOpen(false)}
                        className={`mag-toc-card group ${active ? "is-active" : ""}`}
                      >
                        <span className="mag-toc-card-num">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="mag-toc-card-body">
                          <span className="block font-display text-[10px] font-bold uppercase tracking-[0.22em] text-demo-primary/80">
                            {p.kicker}
                          </span>
                          <span className="block font-display text-base font-semibold leading-tight text-demo-ink">
                            {p.label}
                          </span>
                          <span className="mt-1 block text-xs leading-snug text-foreground/65">
                            {p.dek}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Subtle fade on page change — no slide gimmick. */}
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
  const idx = MAGAZINE_PAGES.findIndex((p) => p.id === currentId);
  const prev = idx > 0 ? MAGAZINE_PAGES[idx - 1] : null;
  const next = idx < MAGAZINE_PAGES.length - 1 ? MAGAZINE_PAGES[idx + 1] : null;
  
  const search = preserveStudent ? { s: student } : undefined;

  return (
    <div className="mx-auto mt-16 max-w-7xl px-4 pb-12 sm:px-6 lg:px-12">
      <div className="mag-pageturn">
        <div className="mag-pageturn-side mag-pageturn-side--prev">
          {prev ? (
            <Link to={prev.to} search={search} className="mag-pageturn-link">
              <span className="mag-pageturn-folio">
                <ArrowLeft className="h-3.5 w-3.5" /> Page {String(idx).padStart(2, "0")}
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
            <Link to={next.to} search={search} className="mag-pageturn-link is-next">
              <span className="mag-pageturn-folio">
                Page {String(idx + 2).padStart(2, "0")} <ArrowRight className="h-3.5 w-3.5" />
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
    </div>
  );
}
