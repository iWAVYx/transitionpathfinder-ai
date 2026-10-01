import { getSampleCalendarEvents, type CalendarEvent } from "@/lib/calendar/sample-events";
import type { DemoProfile } from "./demo-profiles";
import { listDemoFeatures, type DemoRole } from "./feature-routes";

/** Public calendar previews never send an event click to a live workspace. */
export function demoCalendarEvents(
  role: DemoRole,
  profile: DemoProfile,
  now = new Date(),
): CalendarEvent[] {
  if (role === "student" || role === "family" || role === "educator") {
    const search = new URLSearchParams({ role, student: profile.id }).toString();
    const report = `/demo/report?${search}`;
    const date = (offset: number) => {
      const day = new Date(now);
      day.setDate(day.getDate() + offset);
      day.setHours(15, 0, 0, 0);
      return day.toISOString();
    };
    return [
      {
        id: `${profile.id}-voice`,
        title: `Review ${profile.shortName}'s priorities`,
        type: "action-item",
        start: date(1),
        scope: profile.displayName,
        href: `/demo/voice?${search}`,
        description: "Illustrative date only. Read the sample student's own responses.",
        pathwayGoal: { label: "Student voice", href: report },
      },
      {
        id: `${profile.id}-report`,
        title: `Review ${profile.shortName}'s sample report`,
        type: "report",
        start: date(3),
        scope: profile.displayName,
        href: report,
        description: `Sample planning focus: ${profile.stage.focusHeadline}`,
        pathwayGoal: { label: "Sample Pathway Report", href: report },
      },
      {
        id: `${profile.id}-conversation`,
        title: `Planning conversation for ${profile.shortName}`,
        type: "meeting",
        start: date(5),
        scope: profile.displayName,
        href:
          role === "student"
            ? `/demo/voice?${search}`
            : `/demo/feature/${role}/meeting-prep?student=${profile.id}`,
        description: "Fictional example, not a scheduled meeting or invitation.",
        prep: ["Review current goals and supports", "Choose a question to discuss together"],
        pathwayGoal: { label: profile.goals[0]?.title ?? "Planning priorities", href: report },
      },
    ];
  }
  const features = listDemoFeatures().filter((feature) => feature.role === role);
  const previewHref = (href?: string) => {
    const feature = features.find((item) => item.detail.primaryAction.to === href);
    return feature ? `/demo/feature/${role}/${feature.featureId}` : undefined;
  };
  return getSampleCalendarEvents(role).map((event) => ({
    ...event,
    href: previewHref(event.href),
    pathwayGoal: event.pathwayGoal
      ? { ...event.pathwayGoal, href: previewHref(event.pathwayGoal.href) }
      : undefined,
  }));
}
