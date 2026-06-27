/**
 * V2 Pathway Thread — 9 visible stops shown across the top of every page.
 * Maps onto the 8-milestone PATHWAY_SPINE plus a terminal "Next" cap so the
 * thread reads as a beginning, middle, and end.
 */
import { PATHWAY_SPINE, type PathwayMilestoneId } from "@/lib/publication/chapters";
import { PUBLICATION_PAGES, type PublicationPage } from "@/lib/publication/nav";

export type ThreadState = "passed" | "current" | "future";

export interface ThreadStop {
  id: PathwayMilestoneId | "next";
  label: string;
  route: string;
}

/** First demo route that introduces each milestone. */
function routeForMilestone(m: PathwayMilestoneId): string {
  const page: PublicationPage | undefined = PUBLICATION_PAGES.find(p => p.milestone === m);
  return page?.route ?? "/demo";
}

export const THREAD_STOPS: readonly ThreadStop[] = [
  ...PATHWAY_SPINE.map(m => ({
    id: m.id,
    // "Intake" reads as "Start" on the thread per the locked design.
    label: m.id === "intake" ? "Start" : m.label,
    route: routeForMilestone(m.id),
  })),
  { id: "next", label: "Next", route: "/demo/next" },
] as const;

export function threadStateFor(
  activeMilestone: PathwayMilestoneId | "cover" | "next",
): ThreadState[] {
  if (activeMilestone === "cover") {
    return THREAD_STOPS.map(() => "future");
  }
  if (activeMilestone === "next") {
    return THREAD_STOPS.map((s) => (s.id === "next" ? "current" : "passed"));
  }
  const activeIdx = THREAD_STOPS.findIndex(s => s.id === activeMilestone);
  return THREAD_STOPS.map((_, i) => {
    if (i < activeIdx) return "passed";
    if (i === activeIdx) return "current";
    return "future";
  });
}
