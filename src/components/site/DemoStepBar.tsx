import { Link, useLocation } from "@tanstack/react-router";
import { useRef } from "react";

import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Users,
  BookOpen,
  CalendarRange,
  CalendarDays,
  ArrowLeft,
  ArrowRight,
  Mic,
  FileSearch,
  Briefcase,
  Compass,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { DEMO_STUDENTS, type DemoStudentId } from "@/lib/demo-data";
import { FeatureFootnote } from "@/components/demo/FeatureFootnote";
import type { DemoElementId } from "@/lib/demo/feature-map";

const STEP_FEATURE: Record<string, DemoElementId> = {
  intake: "intake.categories",
  voice: "voice.prompts",
  documents: "documents.insights",
  report: "report.snapshot",
  opportunities: "opportunities.cards",
  resources: "resources.cards",
  meeting: "meeting.agenda",
  calendar: "calendar.month",
  plan: "plan.timeline",
  hub: "hub.educator",
  next: "cta.getStarted",
};

export const DEMO_STEPS = [
  { id: "intake", to: "/demo/intake", label: "Intake", icon: ClipboardList },
  { id: "voice", to: "/demo/voice", label: "Student Voice", icon: Mic },
  { id: "documents", to: "/demo/documents", label: "Document Insights", icon: FileSearch },
  { id: "report", to: "/demo/report", label: "Pathway Report", icon: FileText },
  { id: "opportunities", to: "/demo/opportunities", label: "Opportunities", icon: Briefcase },
  { id: "resources", to: "/demo/resources", label: "Resource Matches", icon: BookOpen },
  { id: "meeting", to: "/demo/meeting", label: "Meeting Prep", icon: Users },
  { id: "calendar", to: "/demo/calendar", label: "Calendar", icon: CalendarDays },
  { id: "plan", to: "/demo/plan", label: "30-Day Plan", icon: CalendarRange },
  { id: "hub", to: "/demo/hub", label: "Role Dashboards", icon: LayoutDashboard },
  { id: "next", to: "/demo/next", label: "What's Next", icon: Compass },
] as const;

export type DemoStepId = (typeof DEMO_STEPS)[number]["id"];

interface Props {
  current: DemoStepId;
  student: DemoStudentId;
}

export function DemoStepBar({ current, student }: Props) {
  const location = useLocation();
  const explicitStudent = getExplicitDemoStudent(location.search as { s?: unknown });
  const preservedStudentSearch = demoStudentSearch(explicitStudent ? student : undefined);
  const railRef = useRef<HTMLElement | null>(null);
  const dragState = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startLeft: number;
    pointerId: number | null;
    pointerType: string;
    lastX: number;
    lastTime: number;
    velocity: number; // px/ms, positive = moving content left (scrollLeft increasing)
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    pointerId: null,
    pointerType: "",
    lastX: 0,
    lastTime: 0,
    velocity: 0,
  });
  const momentumRaf = useRef<number | null>(null);

  const cancelMomentum = () => {
    if (momentumRaf.current !== null) {
      cancelAnimationFrame(momentumRaf.current);
      momentumRaf.current = null;
    }
  };

  const startMomentum = () => {
    const el = railRef.current;
    if (!el) return;
    let velocity = dragState.current.velocity; // px/ms
    if (Math.abs(velocity) < 0.05) return; // not enough to bother
    const decay = 0.95; // per frame (~16ms)
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (!railRef.current) return;
      // Apply velocity (scaled by dt to stay framerate-independent).
      railRef.current.scrollLeft += velocity * dt;
      // Decay proportional to dt/16 so it feels consistent.
      velocity *= Math.pow(decay, dt / 16);
      const max = railRef.current.scrollWidth - railRef.current.clientWidth;
      if (railRef.current.scrollLeft <= 0 || railRef.current.scrollLeft >= max) {
        momentumRaf.current = null;
        return;
      }
      if (Math.abs(velocity) < 0.02) {
        momentumRaf.current = null;
        return;
      }
      momentumRaf.current = requestAnimationFrame(step);
    };
    momentumRaf.current = requestAnimationFrame(step);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const el = railRef.current;
    if (!el) return;
    cancelMomentum();
    dragState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: el.scrollLeft,
      pointerId: e.pointerId,
      pointerType: e.pointerType,
      lastX: e.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };
    // Don't capture the pointer up front — capturing redirects the subsequent
    // click event to the nav element, preventing Link navigation. We only
    // capture once an actual drag is detected (see onPointerMove).
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = dragState.current;
    if (!s.active || !railRef.current) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (s.pointerType === "touch" && !s.moved) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        s.active = false;
        return;
      }
      try {
        railRef.current.setPointerCapture(s.pointerId!);
      } catch {
        // ignore
      }
    }
    if (Math.abs(dx) > 4 && !s.moved) {
      s.moved = true;
      if (s.pointerType !== "touch" && s.pointerId !== null) {
        try {
          railRef.current.setPointerCapture(s.pointerId);
        } catch {
          // ignore
        }
      }
    }
    railRef.current.scrollLeft = s.startLeft - dx;

    // Track velocity (px/ms). Negative dx => scrollLeft increased => positive velocity.
    const now = performance.now();
    const dt = now - s.lastTime;
    if (dt > 0) {
      const instant = -(e.clientX - s.lastX) / dt;
      // Low-pass smoothing so the final velocity reflects the recent gesture.
      s.velocity = s.velocity * 0.6 + instant * 0.4;
      s.lastX = e.clientX;
      s.lastTime = now;
    }
  };
  const endDrag = (_e: React.PointerEvent<HTMLElement>) => {
    const s = dragState.current;
    if (!s.active) return;
    if (railRef.current && s.pointerId !== null && railRef.current.hasPointerCapture(s.pointerId)) {
      railRef.current.releasePointerCapture(s.pointerId);
    }
    s.active = false;
    s.pointerId = null;
    if (s.moved) startMomentum();
  };
  const onClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  const currentIdx = DEMO_STEPS.findIndex((x) => x.id === current);
  const progressPct = ((currentIdx + 1) / DEMO_STEPS.length) * 100;
  const currentStepObj = DEMO_STEPS[currentIdx] ?? DEMO_STEPS[0];

  return (
    <div className="demo-shell tf-stepbar sticky top-16 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
        {/* Top row: chapter marker + student switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="tf-eyebrow">
              Chapter {String(currentIdx + 1).padStart(2, "0")}
            </span>
            <span className="hidden sm:inline-block h-3 w-px bg-[color:var(--demo-primary)]/25" aria-hidden />
            <span className="hidden truncate font-display text-sm font-semibold sm:inline">
              {currentStepObj.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              to="/demo"
              {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
              className="hidden font-display text-xs font-semibold tracking-wider uppercase text-foreground/55 hover:text-demo-primary md:inline"
            >
              ← Workspace
            </Link>
            <div className="tf-audience" role="tablist" aria-label="Sample student">
              {(["maya", "jordan"] as DemoStudentId[]).map((sid) => {
                const cs = DEMO_STEPS.find((x) => x.id === current) ?? DEMO_STEPS[0];
                return (
                  <Link
                    key={sid}
                    to={cs.to}
                    search={{ s: sid }}
                    role="tab"
                    aria-selected={student === sid}
                    className={student === sid ? "is-active" : ""}
                  >
                    {DEMO_STUDENTS[sid].profile.first_name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hairline progress */}
        <div
          className="mt-3 h-[2px] w-full overflow-hidden rounded-full bg-[color:var(--demo-primary)]/10"
          aria-hidden
        >
          <div
            className="h-full bg-gradient-to-r from-[color:var(--demo-primary)] to-[color:var(--demo-accent)] transition-transform duration-700 ease-out origin-left"
            style={{ transform: `scaleX(${progressPct / 100})` }}
          />
        </div>

        {/* Step rail — slim editorial chips */}
        <nav
          ref={railRef}
          aria-label="Demo walkthrough steps"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          className="-mx-1 mt-2.5 flex flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden scroll-smooth snap-x pb-3 px-1 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing touch-pan-x"
        >
          {DEMO_STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === current;
            const done = i < currentIdx;
            return (
              <Link
                key={s.id}
                to={s.to}
                {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium snap-start transition-all ${
                  active
                    ? "bg-[color:var(--demo-primary)] text-white shadow-[0_8px_18px_-8px_color-mix(in_oklab,var(--demo-primary)_55%,transparent)]"
                    : done
                      ? "text-foreground/75 hover:text-demo-primary"
                      : "text-foreground/55 hover:text-foreground"
                }`}
              >
                <span className={`font-display text-[10px] font-bold tracking-widest ${active ? "opacity-90" : "text-demo-accent"}`}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Icon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{s.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

interface FooterProps {
  current: DemoStepId;
  student: DemoStudentId;
}

export function DemoStepFooter({ current, student }: FooterProps) {
  const location = useLocation();
  const idx = DEMO_STEPS.findIndex((s) => s.id === current);
  const prev = idx > 0 ? DEMO_STEPS[idx - 1] : null;
  const next = idx < DEMO_STEPS.length - 1 ? DEMO_STEPS[idx + 1] : null;
  const bundle = DEMO_STUDENTS[student];
  const explicitStudent = getExplicitDemoStudent(location.search as { s?: unknown });
  const preservedStudentSearch = demoStudentSearch(explicitStudent ? student : undefined);

  return (
    <div className="mx-auto mt-12 max-w-6xl border-t border-border/60 px-4 sm:px-6 lg:px-8">
      <FeatureFootnote elementId={STEP_FEATURE[current]} className="mt-6" />
      <div className="flex flex-wrap items-center justify-between gap-3 py-6">
        <div className="text-xs text-muted-foreground">
          Walking with{" "}
          <span className="font-medium text-foreground">{bundle.profile.first_name}</span>
        </div>
        <div className="flex gap-2">
          {prev ? (
            <Button asChild variant="outline" size="sm">
              <Link to={prev.to} {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                <ArrowLeft className="h-4 w-4" /> {prev.label}
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm">
              <Link to="/demo">
                <ArrowLeft className="h-4 w-4" /> Demo overview
              </Link>
            </Button>
          )}
          {next ? (
            <Button asChild size="sm">
              <Link to={next.to} {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}>
                {next.label} <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link to="/waitlist">
                Join the waitlist <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Default demo student when no `?s=` is present on the URL. */
export const DEFAULT_DEMO_STUDENT: DemoStudentId = "maya";

export function getExplicitDemoStudent(search: { s?: unknown }): DemoStudentId | undefined {
  if (search?.s === "jordan") return "jordan";
  if (search?.s === "maya") return "maya";
  return undefined;
}

export function demoStudentSearch(student?: DemoStudentId): { s: DemoStudentId } | undefined {
  return student ? { s: student } : undefined;
}

/**
 * Shared search validator for `?s=maya|jordan`.
 *
 * Returns `{ s }` ONLY when the URL explicitly carries a valid value, so
 * direct navigation to `/demo/intake` stays clean and is not rewritten to
 * `/demo/intake?s=maya`. Components default to {@link DEFAULT_DEMO_STUDENT}
 * when `s` is omitted.
 */
export function validateStudentSearch(s: { s?: unknown }): { s?: DemoStudentId } {
  const student = getExplicitDemoStudent(s);
  return student ? { s: student } : {};
}
