import type { DemoProfile } from "./demo-profiles";
import { generatePathwayReport } from "./pathway-engine";
import { demoCalendarEvents } from "./calendar-preview";

export function planningWidgetContent(
  role: "student" | "family" | "educator",
  profile: DemoProfile,
) {
  const search = new URLSearchParams({ role, student: profile.id }).toString();
  const report = `/demo/report?${search}`;
  const owner = role === "educator" ? "school_team" : role;
  const events = demoCalendarEvents(role, profile);
  const entry = (event: (typeof events)[number]) => ({
    id: event.id,
    title: event.title,
    detail: "Illustrative sample — not a scheduled event or invitation.",
    to: event.href ?? null,
  });
  return {
    actions: {
      entries: generatePathwayReport(profile)
        .nextSteps.filter((step) => step.owner === owner || step.owner === "shared")
        .slice(0, 5)
        .map((step) => ({
          id: step.id,
          title: step.title,
          detail: `${profile.shortName}'s sample report: ${step.detail}`,
          to: report,
        })),
      toolDestination: report,
    },
    calendar: {
      entries: events.map(entry),
      toolDestination: `/demo/feature/${role}/calendar?student=${profile.id}`,
    },
    meetings: {
      entries:
        role === "student" ? [] : events.filter((event) => event.type === "meeting").map(entry),
      toolDestination:
        role === "student" ? null : `/demo/feature/${role}/meeting-prep?student=${profile.id}`,
    },
  };
}
