import type { AppRole } from "@/lib/value-lens";

export type DemoStepValue = {
  question: string;
  storyBeat: string;
  inputs: string[];
  output: string;
  rolesHelped: AppRole[];
};

/**
 * Per-step "In this step" content. Each step answers a specific transition
 * planning question and feeds the next step in the story — Intake →
 * Documents → Voice → Report → Opportunities → Plan → Meeting.
 */
export const DEMO_STEP_VALUE: Record<string, DemoStepValue> = {
  intake: {
    question: "What do we already know about the student?",
    storyBeat:
      "Maya's family answers a guided interview — strengths, interests, supports, and the questions that have been keeping them up at night.",
    inputs: ["Family answers", "Student answers", "Educator notes"],
    output: "A structured profile that anchors every other step.",
    rolesHelped: ["family", "student", "educator"],
  },
  voice: {
    question: "What does the student actually want?",
    storyBeat:
      "Maya answers short prompts in her own words — what she's good at, what she's worried about, and what she wants after high school.",
    inputs: ["Student responses to plain-language prompts"],
    output: "Quotes and themes that show up directly in the Pathway Report.",
    rolesHelped: ["student", "family", "educator"],
  },
  documents: {
    question: "What do the existing documents already say?",
    storyBeat:
      "Maya's IEP and evaluations are uploaded — TransitionForward extracts goals, services, and accommodations so nothing gets re-typed.",
    inputs: ["IEP", "Evaluations", "Outside reports"],
    output: "Organized goals, services, accommodations, and flagged gaps.",
    rolesHelped: ["educator", "family"],
  },
  report: {
    question: "Where is the student now, and what's the path from here?",
    storyBeat:
      "Intake, documents, and Maya's voice come together into one decision-supportive report with what each section means and what to do next.",
    inputs: ["Everything from the previous steps"],
    output:
      "A Pathway Report with What This Means, Why It Matters, Recommended Next Step, and Questions To Bring To The Team.",
    rolesHelped: ["family", "student", "educator", "school"],
  },
  opportunities: {
    question: "Who can the student actually connect with right now?",
    storyBeat:
      "The report's employment and community sections are matched against real partner opportunities — apprenticeships, internships, supported work, agency intakes.",
    inputs: ["Report recommendations", "Partner directory"],
    output: "A short list of opportunities with how to apply and who owns the connection.",
    rolesHelped: ["student", "family", "partner"],
  },
  resources: {
    question: "Which resources actually fit this student?",
    storyBeat:
      "Curated, verified resources are filtered to match Maya's grade band, goals, and family priorities — not a generic catalog.",
    inputs: ["Student profile", "Family priorities"],
    output: "What it is, who it helps, and how to use it — for each resource.",
    rolesHelped: ["family", "student", "educator"],
  },
  meeting: {
    question: "What do we bring to the next PPT?",
    storyBeat:
      "The report's open questions and next steps are organized into a printable prep packet so everyone shows up aligned.",
    inputs: ["Report's questions and next steps", "Family priorities"],
    output: "An agenda, prep questions, strengths to highlight, and assigned follow-ups.",
    rolesHelped: ["family", "educator", "school"],
  },
  calendar: {
    question: "When do all the pieces happen?",
    storyBeat:
      "Meetings, deadlines, tours, and weekly action steps from every other section appear on one shared calendar.",
    inputs: ["Meetings", "Action items", "Application deadlines"],
    output: "One timeline so nothing slips between people.",
    rolesHelped: ["family", "educator", "school"],
  },
  plan: {
    question: "What happens in the next 30 days?",
    storyBeat:
      "The Pathway Report's recommendations are broken into a realistic 30-day plan with owners — not a wish list.",
    inputs: ["Report recommendations", "Owner assignments"],
    output: "A short, sequenced plan with who does what, by when.",
    rolesHelped: ["family", "educator", "student"],
  },
  hub: {
    question: "What does each role see when they sign in?",
    storyBeat:
      "Same student, different command centers — student, family, educator, school, district, and partner each get the view they actually need.",
    inputs: ["Role", "Permissions"],
    output: "Role-specific landing surfaces with the next action ready.",
    rolesHelped: ["student", "family", "educator", "school", "district", "partner"],
  },
  next: {
    question: "What does it look like for our team?",
    storyBeat:
      "From sample story to your own students — how onboarding, pilots, and partner connections start.",
    inputs: ["Your district or family context"],
    output: "Clear starting paths for families, schools, districts, and partners.",
    rolesHelped: ["family", "educator", "school", "district", "partner"],
  },
};
