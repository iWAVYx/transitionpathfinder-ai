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
  ShieldCheck,
  Sparkles,
  Mic,
  FileSearch,
  Briefcase,
  Compass,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
  const dragState = useRef<{ active: boolean; moved: boolean; startX: number; startY: number; startLeft: number; pointerId: number | null; pointerType: string }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    pointerId: null,
    pointerType: "",
  });

  const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
    const el = railRef.current;
    if (!el) return;
    dragState.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startLeft: el.scrollLeft,
      pointerId: e.pointerId,
    };
    el.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const s = dragState.current;
    if (!s.active || !railRef.current) return;
    const dx = e.clientX - s.startX;
    if (Math.abs(dx) > 4) s.moved = true;
    railRef.current.scrollLeft = s.startLeft - dx;
  };
  const endDrag = (e: React.PointerEvent<HTMLElement>) => {
    const s = dragState.current;
    if (!s.active) return;
    if (railRef.current && s.pointerId !== null && railRef.current.hasPointerCapture(s.pointerId)) {
      railRef.current.releasePointerCapture(s.pointerId);
    }
    s.active = false;
    s.pointerId = null;
  };
  const onClickCapture = (e: React.MouseEvent<HTMLElement>) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };


  return (
    <div className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-16 z-30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Top row: student switcher + step counter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Demo workspace
            </Badge>
            <Badge variant="outline" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Fictional student · no real data
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="hidden text-muted-foreground sm:inline">Walking with</span>
            <div className="inline-flex overflow-hidden rounded-full border border-border/60 bg-background">
              {(["maya", "jordan"] as DemoStudentId[]).map((sid) => {
                const currentStep = DEMO_STEPS.find((x) => x.id === current) ?? DEMO_STEPS[0];
                return (
                  <Link
                    key={sid}
                    to={currentStep.to}
                    search={{ s: sid }}
                    className={`px-3 py-1 text-xs font-medium transition-colors ${
                      student === sid
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/70 hover:text-foreground"
                    }`}
                  >
                    {DEMO_STUDENTS[sid].profile.first_name}
                  </Link>
                );
              })}
            </div>

          </div>
        </div>

        {/* Step rail */}
        <nav
          ref={railRef}
          aria-label="Demo walkthrough steps"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClickCapture={onClickCapture}
          className="-mx-1 mt-3 flex flex-nowrap justify-start gap-1 overflow-x-auto overflow-y-hidden scroll-smooth snap-x pb-3 px-1 sm:px-0 [scrollbar-width:thin] select-none cursor-grab active:cursor-grabbing touch-pan-x"
        >

          {DEMO_STEPS.map((s) => {
            const Icon = s.icon;
            const active = s.id === current;
            return (
              <Link
                key={s.id}
                to={s.to}
                {...(preservedStudentSearch ? { search: preservedStudentSearch } : {})}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors snap-start ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
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
