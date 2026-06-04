// Role-specific onboarding question sets. Kept intentionally small —
// these are the lightest set of prompts that personalize the dashboard
// and Next Best Action without making setup feel heavy.

export type OnboardingQuestion = {
  key: string;
  label: string;
  help?: string;
  type: "single" | "multi" | "text";
  options?: { value: string; label: string }[];
  placeholder?: string;
  maxLength?: number;
};

export type RoleQuestionSet = {
  role: string;
  title: string;
  body: string;
  questions: OnboardingQuestion[];
};

export const ROLE_QUESTION_SETS: Record<string, RoleQuestionSet> = {
  parent: {
    role: "parent",
    title: "What matters most right now?",
    body: "We'll tailor your dashboard so the most useful tools show up first.",
    questions: [
      {
        key: "stage",
        label: "Where are you in the transition journey?",
        type: "single",
        options: [
          { value: "exploring", label: "Just starting to explore options" },
          { value: "planning", label: "Actively planning for the next IEP" },
          { value: "transitioning", label: "Within 12 months of graduation" },
          { value: "post_secondary", label: "Already post-secondary" },
        ],
      },
      {
        key: "priorities",
        label: "What are your top priorities?",
        help: "Pick any that apply.",
        type: "multi",
        options: [
          { value: "college", label: "College or training" },
          { value: "employment", label: "Employment" },
          { value: "independent_living", label: "Independent living" },
          { value: "community", label: "Community connection" },
          { value: "benefits", label: "Benefits / waivers" },
          { value: "self_advocacy", label: "Self-advocacy skills" },
        ],
      },
      {
        key: "concern",
        label: "What's your biggest worry right now? (optional)",
        type: "text",
        placeholder: "e.g. We don't know what's realistic after graduation.",
        maxLength: 280,
      },
    ],
  },
  student: {
    role: "student",
    title: "Tell us a little about you",
    body: "Your answers help us suggest pathways and people who fit who you are.",
    questions: [
      {
        key: "grade",
        label: "What grade are you in?",
        type: "single",
        options: [
          { value: "middle", label: "Middle school" },
          { value: "9-10", label: "9th–10th" },
          { value: "11-12", label: "11th–12th" },
          { value: "post", label: "Post-secondary" },
        ],
      },
      {
        key: "after_hs",
        label: "What are you thinking about doing after high school?",
        help: "Pick any that sound interesting — you can change this later.",
        type: "multi",
        options: [
          { value: "college", label: "College" },
          { value: "trade", label: "Trade / technical training" },
          { value: "work", label: "Get a job" },
          { value: "military", label: "Military / service" },
          { value: "living", label: "Live more independently" },
          { value: "unsure", label: "Not sure yet" },
        ],
      },
      {
        key: "interests",
        label: "What are you into? (optional)",
        type: "text",
        placeholder: "e.g. video games, music, animals, helping people",
        maxLength: 200,
      },
    ],
  },
  educator: {
    role: "educator",
    title: "How do you support students?",
    body: "We'll set up your caseload tools to match how you work.",
    questions: [
      {
        key: "role_type",
        label: "Your primary role",
        type: "single",
        options: [
          { value: "special_ed", label: "Special education teacher" },
          { value: "case_manager", label: "Case manager" },
          { value: "transition_coord", label: "Transition coordinator" },
          { value: "general_ed", label: "General education teacher" },
          { value: "related_service", label: "Related service provider" },
        ],
      },
      {
        key: "caseload_size",
        label: "About how many students do you support?",
        type: "single",
        options: [
          { value: "1-10", label: "1–10" },
          { value: "11-25", label: "11–25" },
          { value: "26-50", label: "26–50" },
          { value: "50+", label: "50+" },
        ],
      },
      {
        key: "focus_areas",
        label: "Where do you want to focus first?",
        type: "multi",
        options: [
          { value: "iep_writing", label: "Writing transition goals" },
          { value: "meeting_prep", label: "Meeting prep" },
          { value: "family_comms", label: "Family communication" },
          { value: "resources", label: "Finding resources" },
          { value: "data", label: "Tracking progress" },
        ],
      },
    ],
  },
  school_admin: {
    role: "school_admin",
    title: "About your school",
    body: "We'll set up the right dashboards for school-level oversight.",
    questions: [
      {
        key: "school_level",
        label: "What level is your school?",
        type: "single",
        options: [
          { value: "middle", label: "Middle school" },
          { value: "high", label: "High school" },
          { value: "k12", label: "K–12 / combined" },
          { value: "transition_program", label: "Transition / 18–21 program" },
        ],
      },
      {
        key: "students_on_iep",
        label: "About how many students have IEPs?",
        type: "single",
        options: [
          { value: "0-50", label: "0–50" },
          { value: "51-150", label: "51–150" },
          { value: "151-300", label: "151–300" },
          { value: "300+", label: "300+" },
        ],
      },
      {
        key: "priorities",
        label: "What do you want better visibility into?",
        type: "multi",
        options: [
          { value: "compliance", label: "Compliance / indicator 13" },
          { value: "outcomes", label: "Post-school outcomes" },
          { value: "family_engagement", label: "Family engagement" },
          { value: "staff_capacity", label: "Staff capacity" },
          { value: "partners", label: "Community partners" },
        ],
      },
    ],
  },
  district_admin: {
    role: "district_admin",
    title: "About your district",
    body: "We'll surface aggregate reporting tuned to your size.",
    questions: [
      {
        key: "schools_count",
        label: "How many schools do you oversee for transition?",
        type: "single",
        options: [
          { value: "1-3", label: "1–3" },
          { value: "4-10", label: "4–10" },
          { value: "11-25", label: "11–25" },
          { value: "25+", label: "25+" },
        ],
      },
      {
        key: "reporting_focus",
        label: "What reports matter most?",
        type: "multi",
        options: [
          { value: "indicator_13", label: "Indicator 13 compliance" },
          { value: "indicator_14", label: "Indicator 14 post-school outcomes" },
          { value: "graduation", label: "Graduation rates" },
          { value: "equity", label: "Equity / disproportionality" },
          { value: "partner_capacity", label: "Partner capacity" },
        ],
      },
    ],
  },
  partner: {
    role: "partner",
    title: "About your organization",
    body: "We'll match your programs to students who fit them best.",
    questions: [
      {
        key: "org_type",
        label: "What kind of organization?",
        type: "single",
        options: [
          { value: "employer", label: "Employer / work-based learning" },
          { value: "training", label: "Training / certification provider" },
          { value: "college", label: "College or university" },
          { value: "cbo", label: "Community-based organization" },
          { value: "agency", label: "State or county agency" },
        ],
      },
      {
        key: "serves",
        label: "Who do your programs serve?",
        type: "multi",
        options: [
          { value: "iep", label: "Students with IEPs" },
          { value: "504", label: "Students with 504 plans" },
          { value: "any_youth", label: "Any transition-age youth" },
          { value: "adults", label: "Adults with disabilities" },
        ],
      },
      {
        key: "regions",
        label: "What regions do you serve? (optional)",
        type: "text",
        placeholder: "e.g. Hartford, New Haven, statewide",
        maxLength: 200,
      },
    ],
  },
};

export function questionsForRole(role: string | null | undefined): RoleQuestionSet | null {
  if (!role) return null;
  return ROLE_QUESTION_SETS[role] ?? null;
}
