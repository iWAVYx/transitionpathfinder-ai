import type { NextStepsTimelineData } from "@/components/dashboard/NextStepsTimeline";

/**
 * Educator-owned 30 / 90 / 180 / 365-day actions to feed
 * NextStepsTimeline on the caseload hub + educator demo preview.
 */
export const EDUCATOR_NEXT_ACTIONS: NextStepsTimelineData = {
  d30: {
    label: "This Month",
    window: "Next 30 Days",
    items: [
      "Close 2 high-priority data gaps flagged by the report",
      "Send the family priorities intake to 3 caseload families",
      "Draft PPT agendas straight from Pathway Reports",
    ],
  },
  d90: {
    label: "This Quarter",
    window: "Next 90 Days",
    items: [
      "Run report-driven PPTs for every 11th + 12th grader",
      "Schedule updated transition assessments for 5 students",
      "Refer 3 seniors to adult services with signed consent",
    ],
  },
  d180: {
    label: "Half Year",
    window: "Next 6 Months",
    items: [
      "Stand up work-based learning placements for 8 students",
      "Complete travel-training baselines for the caseload",
      "Publish an educator playbook of pathway rationales",
    ],
  },
  d365: {
    label: "This Year",
    window: "Next 12 Months",
    items: [
      "Every senior exits with a signed pathway + adult-services plan",
      "Zero PPT held without a current transition assessment",
      "Caseload IEP-compliance audit ready with one click",
    ],
  },
};
