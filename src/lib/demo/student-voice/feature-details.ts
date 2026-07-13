/**
 * Static demo fixtures powering the Student Voice dashboard module and its
 * drawer previews. Aggregated by the module itself — no PII in fixtures.
 * Sample data only; the signed-in surface uses these for the tile preview
 * footers when live counts aren't yet available.
 */

export type StudentVoiceFeatureId =
  | "goals"
  | "preferences"
  | "strengths"
  | "progress"
  | "next-step";

export type FeatureBullet = { label: string; value?: string; hint?: string };

export type FeatureRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  status?: "ok" | "warning" | "critical" | "muted";
};

export type StudentVoiceFeatureDetail = {
  id: StudentVoiceFeatureId;
  title: string;
  eyebrow: string;
  summary: string;
  what: string;
  dataSource: string;
  primaryAction: { label: string; to: string };
  connectsTo: string[];
  rows: FeatureRow[];
  stats?: FeatureBullet[];
  emptyHeadline: string;
  emptyBody: string;
};

export const STUDENT_VOICE_FEATURE_DETAILS: Record<
  StudentVoiceFeatureId,
  StudentVoiceFeatureDetail
> = {
  goals: {
    id: "goals",
    title: "My Goals",
    eyebrow: "What I Want",
    summary:
      "What you want to do after high school — jobs, school, where you want to live, and how you want to spend your time.",
    what: "Add a goal, edit it later, or mark one as your top priority for the next PPT.",
    dataSource: "You · updated anytime · surfaced in the Pathway Report",
    primaryAction: { label: "Answer Goal Prompts", to: "/student-voice" },
    connectsTo: ["Pathway Report", "Meeting Prep", "Action Items"],
    stats: [
      { label: "Goals captured", value: "4" },
      { label: "Top priority", value: "1" },
      { label: "Updated", value: "This week" },
    ],
    rows: [
      { primary: "Work with animals after graduation", secondary: "Top priority for next PPT", meta: "Employment", status: "ok" },
      { primary: "Take a culinary class at community college", secondary: "Explore in G12", meta: "Education", status: "ok" },
      { primary: "Live with a roommate, not alone", secondary: "Talk with family", meta: "Independent living", status: "warning" },
      { primary: "Keep playing music with friends", secondary: "Something that matters to me", meta: "Community", status: "ok" },
    ],
    emptyHeadline: "No goals captured yet.",
    emptyBody:
      "Start with one thing you want after high school. It can be small. You can always change it.",
  },

  preferences: {
    id: "preferences",
    title: "My Preferences",
    eyebrow: "How I Learn Best",
    summary:
      "How you like to learn, work, and be supported — so your team can match the plan to how you actually do best.",
    what: "Tell the team what environments, supports, and communication styles work for you.",
    dataSource: "You · Student Voice prompts · optional short surveys",
    primaryAction: { label: "Set Preferences", to: "/student-voice" },
    connectsTo: ["Pathway Report", "Meeting Prep", "Recommended Resources"],
    stats: [
      { label: "Preferences set", value: "6" },
      { label: "Categories", value: "3" },
      { label: "Shared with team", value: "Yes" },
    ],
    rows: [
      { primary: "Small groups over whole class", secondary: "Learning setting", meta: "Environment", status: "ok" },
      { primary: "Written directions with pictures", secondary: "Prefer visual + text", meta: "Communication", status: "ok" },
      { primary: "Warning before transitions", secondary: "Give me 5 minutes", meta: "Support", status: "ok" },
      { primary: "Text me — don't call", secondary: "How I want reminders", meta: "Communication", status: "ok" },
      { primary: "Hands-on tasks over lectures", secondary: "How I work best", meta: "Environment", status: "ok" },
    ],
    emptyHeadline: "No preferences set yet.",
    emptyBody:
      "Even one preference helps — like 'text me, don't call.' Small things add up.",
  },

  strengths: {
    id: "strengths",
    title: "My Strengths",
    eyebrow: "What I'm Good At",
    summary:
      "Things you're good at, proud of, or people count on you for. Your team sees these before writing goals.",
    what: "Add a strength anytime — school, work, sports, art, family, community.",
    dataSource: "You · Student Voice prompts · educator observations you approve",
    primaryAction: { label: "Add Strengths", to: "/student-voice" },
    connectsTo: ["Pathway Report", "Recommended Resources", "Partner Matches"],
    stats: [
      { label: "Strengths listed", value: "7" },
      { label: "Educator-observed", value: "3" },
      { label: "My own words", value: "4" },
    ],
    rows: [
      { primary: "Reliable — I show up on time", secondary: "Employer-ready trait", meta: "Work", status: "ok" },
      { primary: "Great with younger kids", secondary: "Neighbors ask me to babysit", meta: "Community", status: "ok" },
      { primary: "Strong memory for details", secondary: "Ms. Reyes noted this in math", meta: "Academic", status: "ok" },
      { primary: "Patient when I explain things", secondary: "Tutor after school", meta: "Interpersonal", status: "ok" },
      { primary: "Careful with tools and materials", secondary: "Wood shop teacher noted", meta: "Vocational", status: "ok" },
    ],
    emptyHeadline: "No strengths captured yet.",
    emptyBody:
      "What's one thing you're good at? Big or small. It doesn't have to be school-related.",
  },

  progress: {
    id: "progress",
    title: "My Progress",
    eyebrow: "How I'm Growing",
    summary:
      "How your answers have grown across the four readiness domains — a private view of your own movement.",
    what: "See what you added recently, what's newly filled in, and what still feels blank.",
    dataSource: "Your Voice responses over time · aggregated only to you and your shared team",
    primaryAction: { label: "See Full Progress", to: "/student-voice" },
    connectsTo: ["Pathway Report", "Meeting Prep"],
    stats: [
      { label: "Prompts answered", value: "12 of 18" },
      { label: "This month", value: "+4" },
      { label: "Domains touched", value: "4 of 4" },
    ],
    rows: [
      { primary: "Employment", secondary: "3 answers · +1 this week", meta: "Growing", status: "ok" },
      { primary: "Education & training", secondary: "4 answers", meta: "Growing", status: "ok" },
      { primary: "Independent living", secondary: "2 answers · 2 still blank", meta: "Needs more", status: "warning" },
      { primary: "Self-advocacy", secondary: "3 answers · stable", meta: "Growing", status: "ok" },
    ],
    emptyHeadline: "No responses yet.",
    emptyBody:
      "Once you answer a few Student Voice prompts, your progress across domains shows up here.",
  },

  "next-step": {
    id: "next-step",
    title: "Next-Step Capture",
    eyebrow: "One Small Step",
    summary:
      "Turn a goal, preference, or strength into a single next step you can actually take — with a timeline.",
    what: "Draft one action, pick who owns it (you, family, or your team), and send it to your Action Items.",
    dataSource: "Drafted here · saved to Action Items · reviewed at your next PPT",
    primaryAction: { label: "Draft A Next Step", to: "/action-items" },
    connectsTo: ["Action Items", "Meeting Prep", "Pathway Report"],
    stats: [
      { label: "Open steps", value: "3" },
      { label: "Owned by me", value: "2" },
      { label: "Due this month", value: "1" },
    ],
    rows: [
      { primary: "Email Mr. Kim about the animal shelter volunteer program", secondary: "Owned by me · due Sep 22", meta: "Employment", status: "warning" },
      { primary: "Tour community college culinary class", secondary: "Owned by family · this month", meta: "Education", status: "ok" },
      { primary: "Ask case manager about travel training", secondary: "Owned by team · before Oct PPT", meta: "Independent living", status: "ok" },
    ],
    emptyHeadline: "No next steps yet.",
    emptyBody:
      "Pick one goal or strength above and turn it into a single action you can do this month.",
  },
};

export const STUDENT_VOICE_FEATURE_ORDER: StudentVoiceFeatureId[] = [
  "goals",
  "preferences",
  "strengths",
  "progress",
  "next-step",
];
