import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, List, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PathwaySpine } from "@/components/publication/PathwaySpine";
import { REPORT_SECTION_TO_MILESTONE } from "@/lib/publication/chapters";

/**
 * In-report chapter pager. Sticky bar above the Pathway Report with
 * Prev / Next chapter controls, a "Section N of M" indicator, and a
 * compact Jump-to-section drawer so readers can move anywhere in the
 * report without scrolling end to end.
 *
 * The report sections already have stable `id="sec-*"` anchors; this
 * component only adds navigation chrome on top.
 */
const CHAPTERS = [
  { id: "sec-snapshot",         label: "Student Snapshot",                            part: "Snapshot" },
  { id: "sec-spin",             label: "Strengths, Preferences, Interests & Needs",   part: "Snapshot" },
  { id: "sec-readiness",        label: "Readiness Scorecard",                         part: "Snapshot" },
  { id: "sec-pathways",         label: "Recommended Pathways",                        part: "Pathways" },
  { id: "sec-careers",          label: "Career & Life Pathway Matches",               part: "Pathways" },
  { id: "sec-goals",            label: "Postsecondary Goal Breakdown",                part: "Pathways" },
  { id: "sec-iep-translator",   label: "IEP / Transition Plan Translator",            part: "Translate" },
  { id: "sec-student-voice",    label: "In The Student's Voice",                      part: "Translate" },
  { id: "sec-family-plan",      label: "Family Action Plan",                          part: "Team" },
  { id: "sec-meeting-prep",     label: "Questions For The Team",                      part: "Team" },
  { id: "sec-opportunities",    label: "Opportunities To Explore",                    part: "Next" },
  { id: "sec-thirty-day",       label: "30 / 60 / 90-Day Plan",                       part: "Next" },
] as const;

export function ReportChapterPager() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const total = CHAPTERS.length;

  // Track which chapter is currently in view.
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const inView = new Set<string>();
    const update = () => {
      const visible = CHAPTERS.findIndex((c) => inView.has(c.id));
      if (visible >= 0) setActiveIdx(visible);
    };
    CHAPTERS.forEach((c) => {
      const el = document.getElementById(c.id);
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) inView.add(c.id);
            else inView.delete(c.id);
          }
          update();
        },
        { rootMargin: "-30% 0px -55% 0px", threshold: 0 },
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const goTo = (i: number) => {
    const c = CHAPTERS[Math.max(0, Math.min(total - 1, i))];
    const el = document.getElementById(c.id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpen(false);
  };

  const current = CHAPTERS[activeIdx];
  const prev = activeIdx > 0;
  const next = activeIdx < total - 1;

  // Group chapters by Part for the jump menu.
  const parts = CHAPTERS.reduce<Record<string, { id: string; label: string; idx: number }[]>>(
    (acc, c, i) => {
      (acc[c.part] ??= []).push({ id: c.id, label: c.label, idx: i });
      return acc;
    },
    {},
  );

  const activeMilestone = REPORT_SECTION_TO_MILESTONE[current.id] ?? "intake";

  return (
    <div className="mag-reportpager">
      <div className="mx-auto max-w-7xl px-3 pt-2 sm:px-6 lg:px-12">
        <PathwaySpine active={activeMilestone} />
      </div>
      <div className="mag-reportpager-inner">
        <Button
          variant="ghost"
          size="sm"
          disabled={!prev}
          onClick={() => goTo(activeIdx - 1)}
          className="min-h-11"
          aria-label="Previous section"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <button
          type="button"
          onClick={() => setTocOpen((v) => !v)}
          className="mag-reportpager-folio min-w-0 flex-1 cursor-pointer text-left hover:opacity-80"
          aria-expanded={tocOpen}
          aria-controls="report-toc-drawer"
        >
          <span className="mag-reportpager-counter">
            Section {String(activeIdx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="hidden truncate sm:inline">— <em>{current.label}</em></span>
          <List className="ml-2 inline h-3.5 w-3.5 opacity-60" aria-hidden />
        </button>

        <Button
          size="sm"
          disabled={!next}
          onClick={() => goTo(activeIdx + 1)}
          className="min-h-11"
          aria-label="Next section"
        >
          <span className="hidden sm:inline">Next</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>

      {tocOpen && (
        <div
          id="report-toc-drawer"
          role="dialog"
          aria-label="Jump to section"
          className="mag-reportpager-drawer"
        >
          <div className="mag-reportpager-drawer-inner">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[color:var(--demo-mute,#5b6770)]">
                Jump To Section
              </span>
              <button
                type="button"
                onClick={() => setTocOpen(false)}
                aria-label="Close"
                className="rounded-full p-1.5 text-foreground/60 hover:bg-foreground/5 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {Object.entries(parts).map(([part, items]) => (
              <div key={part} className="mb-4 last:mb-0">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--demo-accent,#2d8a9e)]">
                  {part}
                </p>
                <ul className="space-y-0.5">
                  {items.map((it) => (
                    <li key={it.id}>
                      <button
                        type="button"
                        onClick={() => goTo(it.idx)}
                        className={`block w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/5 ${
                          it.idx === activeIdx
                            ? "font-semibold text-[color:var(--demo-ink,#0c2340)]"
                            : "text-foreground/80"
                        }`}
                        aria-current={it.idx === activeIdx ? "true" : undefined}
                      >
                        <span className="mr-2 text-[10px] font-bold tracking-[0.22em] opacity-50">
                          {String(it.idx + 1).padStart(2, "0")}
                        </span>
                        {it.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
