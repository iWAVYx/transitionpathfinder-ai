import { Link } from "@tanstack/react-router";
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
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEMO_STUDENTS, type DemoStudentId } from "@/lib/demo-data";

export const DEMO_STEPS = [
  { id: "intake", to: "/demo/intake", label: "Intake", icon: ClipboardList },
  { id: "report", to: "/demo/report", label: "Pathway Report", icon: FileText },
  { id: "meeting", to: "/demo/meeting", label: "Meeting Prep", icon: Users },
  { id: "resources", to: "/demo/resources", label: "Resource Matches", icon: BookOpen },
  { id: "calendar", to: "/demo/calendar", label: "Calendar", icon: CalendarDays },
  { id: "plan", to: "/demo/plan", label: "30-Day Plan", icon: CalendarRange },
  { id: "hub", to: "/demo/hub", label: "Student Hub", icon: LayoutDashboard },
] as const;

export type DemoStepId = (typeof DEMO_STEPS)[number]["id"];

interface Props {
  current: DemoStepId;
  student: DemoStudentId;
}

export function DemoStepBar({ current, student }: Props) {
  const idx = DEMO_STEPS.findIndex((s) => s.id === current);
  const prev = idx > 0 ? DEMO_STEPS[idx - 1] : null;
  const next = idx < DEMO_STEPS.length - 1 ? DEMO_STEPS[idx + 1] : null;
  const bundle = DEMO_STUDENTS[student];
  const otherId: DemoStudentId = student === "maya" ? "jordan" : "maya";
  const other = DEMO_STUDENTS[otherId];

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
        <nav aria-label="Demo walkthrough steps" className="no-scrollbar -mx-1 mt-3 flex flex-nowrap justify-start lg:justify-center gap-1 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-3 px-1 sm:px-0">
          {DEMO_STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = s.id === current;
            const done = i < idx;
            return (
              <Link
                key={s.id}
                to={s.to}
                search={{ s: student }}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors snap-start ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : done
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border/60 bg-background text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                    active
                      ? "bg-primary-foreground/20"
                      : done
                        ? "bg-primary/15"
                        : "bg-muted"
                  }`}
                >
                  {i + 1}
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
  const idx = DEMO_STEPS.findIndex((s) => s.id === current);
  const prev = idx > 0 ? DEMO_STEPS[idx - 1] : null;
  const next = idx < DEMO_STEPS.length - 1 ? DEMO_STEPS[idx + 1] : null;
  const bundle = DEMO_STUDENTS[student];

  return (
    <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-6 sm:px-6 lg:px-8">
      <div className="text-xs text-muted-foreground">
        Walking with{" "}
        <span className="font-medium text-foreground">{bundle.profile.first_name}</span>
        {" · "}
        Step {idx + 1} of {DEMO_STEPS.length}
      </div>
      <div className="flex gap-2">
        {prev ? (
          <Button asChild variant="outline" size="sm">
            <Link to={prev.to} search={{ s: student }}>
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
            <Link to={next.to} search={{ s: student }}>
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
  );
}

/** Shared search validator for `?s=maya|jordan` */
export function validateStudentSearch(s: { s?: unknown }): { s: DemoStudentId } {
  const id = s?.s === "jordan" ? "jordan" : "maya";
  return { s: id };
}
