import type { NextStepsTimelineData } from "@/components/dashboard/NextStepsTimeline";

/**
 * Partner-owned outreach 30 / 90 / 180 / 365-day actions to feed
 * NextStepsTimeline on the partner hub + partner demo preview.
 */
export const PARTNER_OUTREACH_ACTIONS: NextStepsTimelineData = {
  d30: {
    label: "This Month",
    window: "Next 30 Days",
    items: [
      "Confirm 3 top matches for the Spring cohort",
      "Send site logistics + mentor bios to case managers",
      "Publish 2 new opportunities to the district feed",
    ],
  },
  d90: {
    label: "This Quarter",
    window: "Next 90 Days",
    items: [
      "Host 2 informational site visits with student cohorts",
      "Close feedback loop with schools after week-4 check-in",
      "Run one mentor-training refresh with partner staff",
    ],
  },
  d180: {
    label: "Half Year",
    window: "Next 6 Months",
    items: [
      "Convert 2 internships into paid part-time roles",
      "Expand to a second grade band with matched supports",
      "Publish an outcomes brief for district partners",
    ],
  },
  d365: {
    label: "This Year",
    window: "Next 12 Months",
    items: [
      "Sustain a full cohort every semester with waitlist",
      "Add a second partner site with the same playbook",
      "Report annual employment + retention outcomes to the state",
    ],
  },
};
