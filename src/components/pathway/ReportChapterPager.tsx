import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, List, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PathwaySpine } from "@/components/publication/PathwaySpine";
import {
  REPORT_SECTIONS,
  reportSectionsByPart,
  type ReportSection,
} from "@/lib/publication/nav";
import type { PathwayMilestoneId } from "@/lib/publication/chapters";

/**
 * In-report chapter pager. Sticky bar above the Pathway Report with
 * Prev / Next chapter controls, a "Section N of M" indicator, a compact
 * Jump-to-section drawer, and the clickable Pathway Spine.
 *
 * Section order and labels are sourced from `src/lib/publication/nav.ts`
 * (the single source of truth for publication navigation), so the demo
 * workspace and the signed-in Pathway Report stay aligned automatically.
 *
 * The report sections already render with stable `id="sec-*"` anchors;
 * this component only adds navigation chrome on top.
 */
export function ReportChapterPager() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const total = REPORT_SECTIONS.length;

  // Track which chapter is currently in view.
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const inView = new Set<string>();
    const update = () => {
      const visible = REPORT_SECTIONS.findIndex((c) => inView.has(c.id));
      if (visible >= 0) setActiveIdx(visible);
    };
    REPORT_SECTIONS.forEach((c) => {
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

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpen(false);
  };

  const goTo = (i: number) => {
    const c = REPORT_SECTIONS[Math.max(0, Math.min(total - 1, i))];
    scrollToSection(c.id);
  };

  // Click a milestone on the spine -> scroll to the first section
  // tagged with that milestone. Falls back silently when no match.
  const handleMilestone = (m: PathwayMilestoneId) => {
    const target = REPORT_SECTIONS.find((s) => s.milestone === m);
    if (target) scrollToSection(target.id);
  };

  const current = REPORT_SECTIONS[activeIdx];
  const prev = activeIdx > 0;
  const next = activeIdx < total - 1;

  const parts = useMemo(() => reportSectionsByPart(), []);

  return (
    <div className="mag-reportpager">
      <div className="mx-auto max-w-7xl px-3 pt-2 sm:px-6 lg:px-12">
        <PathwaySpine active={current.milestone} onSelect={handleMilestone} />
      </div>
      <div className="mag-reportpager-inner">
        <Button
          variant="ghost"
          size="sm"
          disabled={!prev}
          onClick={() => goTo(activeIdx - 1)}
          className="min-h-11"
          aria-label={prev ? `Previous: ${REPORT_SECTIONS[activeIdx - 1].label}` : "No previous section"}
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
          aria-label={next ? `Next: ${REPORT_SECTIONS[activeIdx + 1].label}` : "End of report"}
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
                Table Of Contents
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
            {parts.map(({ part, sections }) =>
              sections.length === 0 ? null : (
                <div key={part} className="mb-4 last:mb-0">
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--demo-accent,#2d8a9e)]">
                    {part}
                  </p>
                  <ul className="space-y-0.5">
                    {sections.map((it: ReportSection) => {
                      const i = REPORT_SECTIONS.findIndex((s) => s.id === it.id);
                      return (
                        <li key={it.id}>
                          <button
                            type="button"
                            onClick={() => goTo(i)}
                            className={`block w-full rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-foreground/5 ${
                              i === activeIdx
                                ? "font-semibold text-[color:var(--demo-ink,#0c2340)]"
                                : "text-foreground/80"
                            }`}
                            aria-current={i === activeIdx ? "true" : undefined}
                          >
                            <span className="mr-2 text-[10px] font-bold tracking-[0.22em] opacity-50">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            {it.label}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
