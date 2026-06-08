import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CheckCircle2,
  CalendarPlus,
  ClipboardPlus,
  Loader2,
  Sparkles,
  Link as LinkIcon,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createStudentActionItem } from "@/lib/action-items.functions";
import { createCalendarEvent } from "@/lib/calendar.functions";
import type { PathwayReport } from "@/lib/pathway.functions";

type Source =
  | "30-day plan"
  | "Teacher next step"
  | "Family question for PPT"
  | "Pathway action (30 days)"
  | "Pathway action (90 days)";

type ConnectableItem = {
  id: string;
  text: string;
  source: Source;
  category: "family" | "educator" | "student" | "school" | "team";
  /** Days from today to suggest as due date / event date. */
  dueOffsetDays: number;
};

const SOURCE_COLOR: Record<Source, string> = {
  "30-day plan": "bg-primary/10 text-primary border-primary/20",
  "Teacher next step":
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  "Family question for PPT":
    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  "Pathway action (30 days)":
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  "Pathway action (90 days)":
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
};

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function collectItems(report: PathwayReport): ConnectableItem[] {
  const out: ConnectableItem[] = [];

  // 30-day plan: 4 weeks
  for (const w of report.thirty_day_plan ?? []) {
    out.push({
      id: `30d-w${w.week}`,
      text: w.action,
      source: "30-day plan",
      category: "family",
      dueOffsetDays: Math.max(1, w.week * 7),
    });
  }

  // Teacher next steps
  for (let i = 0; i < (report.teacher_next_steps ?? []).length; i++) {
    out.push({
      id: `teacher-${i}`,
      text: report.teacher_next_steps[i],
      source: "Teacher next step",
      category: "educator",
      dueOffsetDays: 14,
    });
  }

  // Family questions for PPT (track them as action items so they make the meeting)
  for (let i = 0; i < (report.family_questions_for_ppt ?? []).length; i++) {
    out.push({
      id: `ppt-${i}`,
      text: report.family_questions_for_ppt[i],
      source: "Family question for PPT",
      category: "family",
      dueOffsetDays: 21,
    });
  }

  // Recommended pathway action steps (best-fit only, 30/90 day)
  const bestFit =
    report.recommended_pathways?.find((p) => p.type === "best-fit") ??
    report.recommended_pathways?.[0];
  if (bestFit?.action_steps) {
    for (let i = 0; i < (bestFit.action_steps.thirty_day ?? []).length; i++) {
      out.push({
        id: `pw30-${i}`,
        text: bestFit.action_steps.thirty_day[i],
        source: "Pathway action (30 days)",
        category: "team",
        dueOffsetDays: 21,
      });
    }
    for (let i = 0; i < (bestFit.action_steps.ninety_day ?? []).length; i++) {
      out.push({
        id: `pw90-${i}`,
        text: bestFit.action_steps.ninety_day[i],
        source: "Pathway action (90 days)",
        category: "team",
        dueOffsetDays: 60,
      });
    }
  }

  return out;
}

type Status = "idle" | "saving-action" | "saving-event" | "added-action" | "added-event";

export function ConnectToPlan({
  report,
  studentId,
  reportId,
}: {
  report: PathwayReport;
  studentId?: string;
  reportId?: string;
}) {
  const addAction = useServerFn(createStudentActionItem);
  const addEvent = useServerFn(createCalendarEvent);
  const items = useMemo(() => collectItems(report), [report]);
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const safeReportId =
    reportId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(reportId)
      ? reportId
      : undefined;

  if (items.length === 0) return null;

  const linked = Boolean(studentId);

  async function handleAddAction(item: ConnectableItem) {
    if (!studentId) return;
    setStatuses((s) => ({ ...s, [item.id]: "saving-action" }));
    try {
      await addAction({
        data: {
          student_id: studentId,
          title: item.text.slice(0, 200),
          description: `From pathway report · ${item.source}`,
          category: item.category,
          priority: "medium",
          due_date: todayPlus(item.dueOffsetDays),
          pathway_report_id: reportId,
        },
      });
      setStatuses((s) => ({ ...s, [item.id]: "added-action" }));
      toast.success("Added to Action Items");
    } catch (e) {
      setStatuses((s) => ({ ...s, [item.id]: "idle" }));
      toast.error(e instanceof Error ? e.message : "Could not add action item");
    }
  }

  async function handleAddEvent(item: ConnectableItem) {
    if (!studentId) return;
    setStatuses((s) => ({ ...s, [item.id]: "saving-event" }));
    try {
      await addEvent({
        data: {
          title: item.text.slice(0, 200),
          detail: `From pathway report · ${item.source}`,
          event_date: todayPlus(item.dueOffsetDays),
          visibility: "student_team",
          event_type: "Pathway Report Review",
          status: "scheduled",
          student_id: studentId,
          related_pathway_report_id: reportId,
          all_day: true,
        },
      });
      setStatuses((s) => ({ ...s, [item.id]: "added-event" }));
      toast.success("Added to Calendar");
    } catch (e) {
      setStatuses((s) => ({ ...s, [item.id]: "idle" }));
      toast.error(e instanceof Error ? e.message : "Could not add calendar event");
    }
  }

  return (
    <section className="no-print report-section mt-10">
      <div className="rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="mr-1 inline h-3 w-3" /> Connect to your plan
            </p>
            <h3 className="mt-1 font-display text-xl text-foreground">
              Turn recommendations into next steps
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {linked
                ? "Send any item below straight into this student's Action Items or shared Calendar."
                : "Save this report to a student profile to push items into Action Items and the Calendar."}
            </p>
          </div>
          {linked && (
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link to="/dashboard">
                  <LinkIcon className="h-3.5 w-3.5" /> Open dashboard
                </Link>
              </Button>
            </div>
          )}
        </div>

        <ul className="grid gap-3">
          {items.map((item) => {
            const st = statuses[item.id] ?? "idle";
            const addedAction = st === "added-action";
            const addedEvent = st === "added-event";
            return (
              <li
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase tracking-wider ${SOURCE_COLOR[item.source]}`}
                    >
                      {item.source}
                    </Badge>
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {item.text}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
                  <Button
                    size="sm"
                    variant={addedAction ? "secondary" : "outline"}
                    disabled={!linked || st === "saving-action" || addedAction}
                    onClick={() => handleAddAction(item)}
                  >
                    {st === "saving-action" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : addedAction ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <ClipboardPlus className="h-3.5 w-3.5" />
                    )}
                    {addedAction ? "Added" : "Add to Actions"}
                  </Button>
                  <Button
                    size="sm"
                    variant={addedEvent ? "secondary" : "outline"}
                    disabled={!linked || st === "saving-event" || addedEvent}
                    onClick={() => handleAddEvent(item)}
                  >
                    {st === "saving-event" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : addedEvent ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <CalendarPlus className="h-3.5 w-3.5" />
                    )}
                    {addedEvent ? "Scheduled" : "Add to Calendar"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>

        {!linked && (
          <p className="mt-4 rounded-lg border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
            Tip: save this report to a student profile to enable one-click
            push into Action Items, Calendar, and the team feed.
          </p>
        )}
      </div>
    </section>
  );
}
