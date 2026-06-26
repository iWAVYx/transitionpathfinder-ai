import { useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  Users,
  BookOpen,
  CalendarRange,
  CalendarDays,
  Mic,
  FileSearch,
  Briefcase,
  Compass,
} from "lucide-react";

import { type DemoStudentId } from "@/lib/demo-data";
import { FeatureFootnote } from "@/components/demo/FeatureFootnote";
import type { DemoElementId } from "@/lib/demo/feature-map";
import { StepValueHeader } from "@/components/value/StepValueHeader";
import { DEMO_STEP_VALUE } from "@/lib/demo/step-value";
import {
  MagazineReader,
  MagazinePageTurn,
  type MagazinePageId,
} from "@/components/site/MagazineReader";

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

/**
 * Preserved for routes/tests that import this list. Mirrors the chapter
 * subset of the canonical {@link MAGAZINE_PAGES} order.
 */
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
  { id: "hub", to: "/demo/hub", label: "Student Hub", icon: LayoutDashboard },
  { id: "next", to: "/demo/next", label: "What's Next", icon: Compass },
] as const;

export type DemoStepId = (typeof DEMO_STEPS)[number]["id"];

interface Props {
  current: DemoStepId;
  student: DemoStudentId;
}

/**
 * Top reader chrome shown above every demo chapter page. Renders the
 * magazine reader frame (prev/next, page indicator, drawer Table of
 * Contents, keyboard nav) plus the per-step "value header" beneath it.
 *
 * The previous implementation (a horizontally-scrolling tab strip with
 * pointer-driven inertial momentum) was replaced by {@link MagazineReader}
 * to make the demo read page-by-page rather than as a long scroll.
 */
export function DemoStepBar({ current, student }: Props) {
  const location = useLocation();
  const preserveStudent = !!getExplicitDemoStudent(location.search as { s?: unknown });
  const stepValue = DEMO_STEP_VALUE[current];
  return (
    <>
      <MagazineReader
        currentId={current as MagazinePageId}
        student={student}
        preserveStudent={preserveStudent}
      />
      {stepValue && (
        <div className="demo-shell mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-12">
          <StepValueHeader
            question={stepValue.question}
            storyBeat={stepValue.storyBeat}
            inputs={stepValue.inputs}
            output={stepValue.output}
            rolesHelped={stepValue.rolesHelped}
          />
        </div>
      )}
    </>
  );
}

interface FooterProps {
  current: DemoStepId;
  student: DemoStudentId;
}

/**
 * Page-turn spread shown at the foot of every demo chapter page. Replaces
 * the previous minimal prev/next strip with a magazine-style "turn the
 * page" affordance that previews the next chapter.
 */
export function DemoStepFooter({ current, student }: FooterProps) {
  const location = useLocation();
  const preserveStudent = !!getExplicitDemoStudent(location.search as { s?: unknown });
  return (
    <>
      <FeatureFootnote elementId={STEP_FEATURE[current]} className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-12" />
      <MagazinePageTurn
        currentId={current as MagazinePageId}
        student={student}
        preserveStudent={preserveStudent}
      />
    </>
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
