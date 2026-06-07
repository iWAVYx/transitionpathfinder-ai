// Shared helpers for the Dashboard Calendar.
// Aggregates events from the dashboard snapshot — action item due dates,
// the upcoming PPT/IEP meeting, and a derived prep-deadline timeline that
// mirrors the Meeting Prep page — and provides Google Calendar + .ics export.

import type { DashboardSnapshot, ActionItemRow } from "@/lib/golden-path.functions";

export type CalendarEventKind =
  | "action"
  | "meeting"
  | "prep"
  | "goal";

export type CalendarEvent = {
  id: string;
  date: Date;
  title: string;
  detail: string;
  kind: CalendarEventKind;
  // For action items: which audience
  category?: ActionItemRow["category"];
  // For action items: priority badge
  priority?: ActionItemRow["priority"];
  // For action items: status (drives strikethrough)
  status?: ActionItemRow["status"];
  // Deep link inside the app, if applicable
  href?: string;
};

// ---- Date helpers ----------------------------------------------------------

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}
export function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
export function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
export function isPast(d: Date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime() < today.getTime();
}

function parseLocalDate(input: string): Date | null {
  // Accept ISO date (YYYY-MM-DD) and full timestamps. For YYYY-MM-DD we want
  // a local-midnight Date so it shows on the intended day in the user's TZ.
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ---- PPT prep deadline timeline (matches MeetingPrepPartners) -------------

const PREP_STEPS: Array<{ offsetDays: number; label: string; detail: string }> = [
  {
    offsetDays: 14,
    label: "Request records & draft documents",
    detail:
      "Ask the school for the proposed IEP draft, evaluations, and progress reports.",
  },
  {
    offsetDays: 7,
    label: "Contact partner organizations",
    detail:
      "Reach out to top partner contacts to confirm services, eligibility, and availability.",
  },
  {
    offsetDays: 3,
    label: "Review with the student",
    detail:
      "Walk through goals, concerns, and what they want to say in their own words.",
  },
  {
    offsetDays: 1,
    label: "Pack the meeting folder",
    detail:
      "Print the agenda, questions, evidence list, and partner contacts. Confirm time and location.",
  },
];

function prepEventsFor(meetingISO: string | null | undefined): CalendarEvent[] {
  if (!meetingISO) return [];
  const meeting = parseLocalDate(meetingISO);
  if (!meeting) return [];
  return PREP_STEPS.map((s) => {
    const d = new Date(meeting);
    d.setDate(d.getDate() - s.offsetDays);
    return {
      id: `prep-${s.offsetDays}`,
      date: d,
      title: `PPT Prep: ${s.label}`,
      detail: s.detail,
      kind: "prep" as const,
      href: "/ppt-prep",
    };
  });
}

// ---- Aggregate snapshot → events ------------------------------------------

export function eventsFromSnapshot(snap: DashboardSnapshot): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const a of snap.actionItems) {
    if (!a.due_date) continue;
    const d = parseLocalDate(a.due_date);
    if (!d) continue;
    events.push({
      id: `action-${a.id}`,
      date: d,
      title: a.title,
      detail: a.description ?? "",
      kind: "action",
      category: a.category,
      priority: a.priority,
      status: a.status,
      href: "/goals",
    });
  }

  const meeting = snap.upcomingMeeting;
  if (meeting?.scheduled_at) {
    const d = parseLocalDate(meeting.scheduled_at);
    if (d) {
      events.push({
        id: `meeting-${meeting.id}`,
        date: d,
        title: meeting.title || "PPT/IEP meeting",
        detail: meeting.location ? `Location: ${meeting.location}` : "Upcoming meeting",
        kind: "meeting",
        href: "/meetings",
      });
      // Add derived prep deadlines.
      events.push(...prepEventsFor(meeting.scheduled_at));
    }
  }

  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  return events;
}

// ---- Google Calendar URL ---------------------------------------------------

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function gcalDate(d: Date) {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

export function buildGoogleCalendarUrl(ev: CalendarEvent, tz?: string) {
  const start = gcalDate(ev.date);
  const end = new Date(ev.date);
  end.setDate(end.getDate() + 1);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${start}/${gcalDate(end)}`,
    details: ev.detail || "From TransitionForward",
  });
  if (tz) params.set("ctz", tz);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ---- ICS export (all events) ----------------------------------------------

function icsStamp() {
  const d = new Date();
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}
function icsEscape(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

export function buildIcsForEvents(events: CalendarEvent[], tz?: string) {
  const stamp = icsStamp();
  const vevents = events.map((ev, idx) => {
    const start = gcalDate(ev.date);
    const end = new Date(ev.date);
    end.setDate(end.getDate() + 1);
    return [
      "BEGIN:VEVENT",
      `UID:${ev.id}-${idx}@transitionforward`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${gcalDate(end)}`,
      `SUMMARY:${icsEscape(ev.title)}`,
      `DESCRIPTION:${icsEscape(ev.detail || "")}`,
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      `DESCRIPTION:Reminder: ${icsEscape(ev.title)}`,
      "TRIGGER:-P1D",
      "END:VALARM",
      "END:VEVENT",
    ].join("\r\n");
  });
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TransitionForward//Dashboard Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (tz) lines.push(`X-WR-TIMEZONE:${tz}`);
  lines.push(...vevents, "END:VCALENDAR", "");
  return lines.join("\r\n");
}

export function downloadDashboardIcs(
  events: CalendarEvent[],
  tz?: string,
  filename = "transitionforward-calendar.ics",
) {
  const ics = buildIcsForEvents(events, tz);
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
