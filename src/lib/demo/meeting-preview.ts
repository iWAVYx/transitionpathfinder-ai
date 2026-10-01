import type { FamilyMeetingPrepData } from "@/components/dashboard/FamilyMeetingPrepCard";
import { tokensForProfile } from "./student-tokens";
import type { DemoProfile } from "./demo-profiles";

/** Illustrative discussion prompts, not extracted IEP findings or legal recommendations. */
export function demoFamilyMeetingPrep(profile: DemoProfile): Required<FamilyMeetingPrepData> {
  return {
    meetingLabel: `Suggested discussion prompts for ${profile.shortName}`,
    meetingDate: `Fictional meeting: ${tokensForProfile(profile).nextMeetingDate}`,
    prepHref: "/ppt-prep",
    groups: [
      {
        forAudience: "case_manager",
        label: "Questions for the case manager",
        questions: [
          {
            question: `What current evidence shows ${profile.shortName}'s progress on this goal: “${profile.goals[0]?.title ?? "the agreed goals"}”?`,
            why: "Ask the team to review dated observations and identify what is still missing.",
          },
          {
            question: `How will we address this current need: “${profile.learning.supportNeeds[0] ?? "the current learning priorities"}”?`,
            why: "Discuss what has been tried and how the team will check whether it helps.",
          },
        ],
      },
      {
        forAudience: "student",
        label: `Questions for ${profile.shortName}`,
        questions: [
          {
            question: `What would you like the team to understand about your interest in ${profile.learning.interests[0]?.toLowerCase() ?? "your next steps"}?`,
          },
          { question: "What feels helpful at school, and what would you like to try differently?" },
        ],
      },
      {
        forAudience: "school",
        label: "Agree on a next step together",
        questions: [
          {
            question: `What is one realistic next step for ${profile.shortName}, who will help, and when will we review it?`,
            why: `Keep the conversation appropriate to ${profile.demographics.gradeLabel} and document the team's agreed action.`,
          },
        ],
      },
    ],
  };
}
