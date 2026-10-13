import { expect, it } from "vitest";
import { transitionCalendarIcs } from "@/components/calendar/TransitionCalendar";
import { buildIcsForEvents, calendarRecordForExport, buildGoogleCalendarUrl } from "@/lib/calendar-events";

it("shared calendar exports all-day dates without converting them to midnight appointments", () => {
  const result = transitionCalendarIcs([{ id: "day", title: "Review Day", type: "deadline", start: "2026-10-31T00:00:00", allDay: true }]);
  expect(result).toContain("DTSTART;VALUE=DATE:20261031\r\n");
  expect(result).not.toContain("DTSTART:20261031T");
  expect(result).not.toContain("DTEND");
});
it("shared calendar preserves the supplied exclusive end date for multi-day all-day examples", () => {
  const result = transitionCalendarIcs([{ id: "days", title: "Planning Window", type: "milestone", start: "2026-12-31T00:00:00", end: "2027-01-03T00:00:00", allDay: true }]);
  expect(result).toContain("DTSTART;VALUE=DATE:20261231");
  expect(result).toContain("DTEND;VALUE=DATE:20270103");
});
it("dashboard export uses date values and an exclusive next-day end across a year boundary", () => {
  const result = buildIcsForEvents([{ id: "saved-day", date: new Date(2026, 11, 31), allDay: true, title: "School Review", detail: "Recorded all-day event", kind: "meeting" }], "America/New_York");
  expect(result).toContain("DTSTART;VALUE=DATE:20261231");
  expect(result).toContain("DTEND;VALUE=DATE:20270101");
  expect(result).not.toContain("DTSTART;TZID=");
});
it("timed shared exports and legacy dashboard reminders retain their existing date-time format", () => {
  const timed = transitionCalendarIcs([{ id: "meeting", title: "Meeting", type: "meeting", start: "2026-10-13T14:00:00Z", end: "2026-10-13T15:00:00Z" }]);
  expect(timed).toContain("DTSTART:20261013T140000Z");
  expect(timed).toContain("DTEND:20261013T150000Z");
  const legacy = buildIcsForEvents([{ id: "reminder", date: new Date(2026, 9, 13), title: "Check In", detail: "Date-only reminder", kind: "prep" }], "America/New_York");
  expect(legacy).toContain("DTSTART;TZID=America/New_York:20261013T090000");
  expect(legacy).not.toContain("DTSTART;VALUE=DATE");
});

it("saved all-day records retain their date through the real dashboard export adapter", () => {
  const event = calendarRecordForExport({ id: "day", event_date: "2026-12-31", start_time: null, end_time: null, all_day: true, title: "Review Day", detail: "Recorded date", kind: "deadline" });
  expect(buildIcsForEvents([event])).toContain("DTSTART;VALUE=DATE:20261231");
  expect(new URL(buildGoogleCalendarUrl(event)).searchParams.get("dates")).toBe("20261231/20270101");
});
it("saved timed records retain their recorded start and end in ICS and Google Calendar exports", () => {
  const event = calendarRecordForExport({ id: "meeting", event_date: "2026-10-13", start_time: "14:15:00", end_time: "15:45:00", all_day: false, title: "Team Meeting", detail: "Recorded times", kind: "meeting" });
  const result = buildIcsForEvents([event], "America/New_York");
  expect(result).toContain("DTSTART;TZID=America/New_York:20261013T141500");
  expect(result).toContain("DTEND;TZID=America/New_York:20261013T154500");
  expect(result).not.toContain("T090000");
  const url = new URL(buildGoogleCalendarUrl(event, "America/New_York"));
  expect(url.searchParams.get("dates")).toBe("20261013T141500/20261013T154500");
  expect(url.searchParams.get("ctz")).toBe("America/New_York");
});
