import { Bell, ClipboardList, MapPin, Sparkles, Users } from "lucide-react";
import type { DemoStudentBundle } from "@/lib/demo-data";

export type EventKind = "meeting" | "deadline" | "tour" | "action" | "family";

export type CalendarEvent = {
  day: string;
  date: string;
  time: string;
  title: string;
  kind: EventKind;
  owner: string;
};

export const EVENT_KIND_META: Record<
  EventKind,
  { label: string; chip: string; icon: React.ReactNode }
> = {
  meeting: {
    label: "PPT Meeting",
    chip: "bg-primary/15 text-primary",
    icon: <Users className="h-3.5 w-3.5" />,
  },
  deadline: {
    label: "Deadline",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    icon: <Bell className="h-3.5 w-3.5" />,
  },
  tour: {
    label: "Tour / Visit",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    icon: <MapPin className="h-3.5 w-3.5" />,
  },
  action: {
    label: "Action Step",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    icon: <ClipboardList className="h-3.5 w-3.5" />,
  },
  family: {
    label: "Family Time",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    icon: <Sparkles className="h-3.5 w-3.5" />,
  },
};

/**
 * Build the fictional 4-week calendar grounded in the student's Pathway Report.
 * Shared between /demo/calendar, /demo/hub, /demo/meeting so every surface
 * shows the same schedule.
 */
export function buildDemoCalendarEvents(bundle: DemoStudentBundle): CalendarEvent[] {
  const { profile, report, nextMeetingDate } = bundle;
  const plan = report.thirty_day_plan;
  const thisWeek = report.family_action_plan?.this_week ?? [];

  return [
    {
      day: "Mon",
      date: "Mar 9",
      time: "After school",
      title: thisWeek[0] ?? "Read the Pathway Report together",
      kind: "family",
      owner: `${profile.first_name} + family`,
    },
    {
      day: "Wed",
      date: "Mar 11",
      time: "9:00 AM",
      title: thisWeek[1] ?? plan[0]?.action ?? "Reach out to a partner program",
      kind: "action",
      owner: `Family + ${profile.case_manager}`,
    },
    {
      day: "Fri",
      date: "Mar 13",
      time: "2:15 PM",
      title: `Check-in with ${profile.case_manager}`,
      kind: "meeting",
      owner: profile.case_manager,
    },
    {
      day: "Tue",
      date: "Mar 17",
      time: "10:00 AM",
      title: plan[1]?.action ?? "Email case manager about PPT meeting",
      kind: "action",
      owner: "Family",
    },
    {
      day: "Thu",
      date: "Mar 19",
      time: "1:00 PM",
      title: plan[2]?.action ?? "Tour partner program",
      kind: "tour",
      owner: `${profile.first_name} + family`,
    },
    {
      day: "Mon",
      date: "Mar 30",
      time: "End of day",
      title: "BRS referral packet due",
      kind: "deadline",
      owner: profile.case_manager,
    },
    {
      day: "Tue",
      date: "Apr 7",
      time: "3:00 PM",
      title: "Pre-PPT prep call (15 min)",
      kind: "meeting",
      owner: `Family + ${profile.case_manager}`,
    },
    {
      day: "Wed",
      date: "Apr 8",
      time: nextMeetingDate.split("·")[1]?.trim() ?? "3:30 PM",
      title: "Planning & Placement Team meeting",
      kind: "meeting",
      owner: "Full team",
    },
  ];
}
