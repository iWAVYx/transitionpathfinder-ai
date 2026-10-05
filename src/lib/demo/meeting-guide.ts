import type { PptAgenda } from "@/lib/ppt.functions";
import type { DemoProfile } from "./demo-profiles";

/** Prepared fictional content; no AI request, document extraction or saved record. */
export function demoMeetingGuide(profile: DemoProfile, role: "family" | "educator"): PptAgenda {
  const name = profile.shortName;
  const goal = profile.goals[0]?.title ?? "the student's priorities";
  const support = profile.learning.supportNeeds[0] ?? "helpful classroom supports";
  return {
    opening_note: `Fictional sample guide for ${name}. ${role === "family" ? "Bring your family’s priorities and questions" : "Bring dated classroom observations and the student’s priorities"} so the team can discuss ${goal.toLowerCase()}. This is prepared demo content, not an assessment, agreed IEP or generated recommendation.`,
    agenda: [
      { title: "Start With Strengths", minutes: 5, purpose: `Invite ${name} to share interests, what is working and what they want to try next.` },
      { title: "Review Current Evidence", minutes: 10, purpose: "Compare dated observations with the current plan. Identify missing information without assuming progress." },
      { title: "Discuss Goals and Supports", minutes: 10, purpose: `Discuss ${goal} and the support need: ${support}. Agree what to measure and how to check whether support helps.` },
      { title: "Agree on Follow-Up", minutes: 5, purpose: "Record the next step, the person responsible and a review date. Confirm how the family and school will share updates." },
    ],
    questions_to_ask: [
      `What does ${name} want the team to understand?`,
      `What dated evidence helps us understand progress toward ${goal}?`,
      `What have we tried to address ${support}, and what did we observe?`,
      "Who will collect the missing information, and when will we review it together?",
    ],
    evidence_to_bring: ["The current agreed plan and the questions you want to discuss", "Dated work samples or observations, with context about the support provided", "The student's priorities and any family or educator observations to compare"],
    language_that_works: role === "family" ? [
      "Family: Could we look at the dated evidence together before deciding on the next step?",
      "Family: I would like our concern recorded, along with what the team will try and when we will review it.",
      "Family: Could you explain how we will know whether this support is helping?",
    ] : [
      "Educator: Here is what we observed, when it happened and which supports were available. What are you noticing at home?",
      "Educator: Let’s record the family’s concern and identify the information we still need.",
      "Educator: Could we agree on a measurable next step and a date to review the evidence together?",
    ],
    if_things_get_stuck: "Pause and restate the shared question. Ask the team to distinguish what is documented from what still needs checking, then record the next step and a time to revisit it. Use the school's established process for any unresolved concern.",
  };
}
