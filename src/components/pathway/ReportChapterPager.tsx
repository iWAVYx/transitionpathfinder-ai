import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * In-report chapter pager. Floats a slim pill above the Pathway Report
 * with Prev/Next chapter controls and a "Report Page N of M — Title"
 * indicator that smooth-scrolls to the existing chapter section anchors.
 *
 * The Pathway Report's chapter sections already have stable `id="sec-*"`
 * anchors. This component leaves the report content untouched and only
 * adds page-by-page navigation chrome on top of it.
 */
const CHAPTERS = [
  { id: "sec-snapshot",         label: "Student Snapshot" },
  { id: "sec-spin",             label: "Strengths, Preferences, Interests & Needs" },
  { id: "sec-readiness",        label: "Readiness Scorecard" },
  { id: "sec-pathways",         label: "Recommended Pathways" },
  { id: "sec-careers",          label: "Career & Life Pathway Matches" },
  { id: "sec-goals",            label: "Postsecondary Goal Breakdown" },
  { id: "sec-iep-translator",   label: "IEP / Transition Plan Translator" },
  { id: "sec-student-voice",    label: "In The Student's Voice" },
  { id: "sec-family-plan",      label: "Family Action Plan" },
  { id: "sec-meeting-prep",     label: "Questions For The Team" },
  { id: "sec-opportunities",    label: "Opportunities To Explore" },
  { id: "sec-thirty-day",       label: "30 / 60 / 90-Day Plan" },
] as const;

export function ReportChapterPager() {
  const [activeIdx, setActiveIdx] = useState(0);
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
  };

  const current = CHAPTERS[activeIdx];
  const prev = activeIdx > 0;
  const next = activeIdx < total - 1;

  return (
    <div className="mag-reportpager">
      <div className="mag-reportpager-inner">
        <Button
          variant="ghost"
          size="sm"
          disabled={!prev}
          onClick={() => goTo(activeIdx - 1)}
          aria-label="Previous chapter"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <div className="mag-reportpager-folio">
          <span className="mag-reportpager-counter">
            Page {String(activeIdx + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <span className="hidden truncate sm:inline">— <em>{current.label}</em></span>
        </div>

        <Button
          size="sm"
          disabled={!next}
          onClick={() => goTo(activeIdx + 1)}
          aria-label="Next chapter"
        >
          <span className="hidden sm:inline">Next</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
