// Role-specific onboarding question sets. Kept intentionally light —
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
    title: "What Matters Most Right Now?",
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
        key: "school_or_district",
        label: "What school or district does your child attend? (optional)",
        help: "Helps us surface local resources and the right team contacts.",
        type: "text",
        placeholder: "e.g. Hartford Public Schools",
        maxLength: 160,
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
    title: "Tell Us A Little About You",
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
        key: "school_or_district",
        label: "What school do you go to? (optional)",
        type: "text",
        placeholder: "e.g. Bulkeley High School",
        maxLength: 160,
      },
      {
        key: "team_contact",
        label: "Who helps you with school planning? (optional)",
        help: "A parent, guardian, case manager, or teacher — we'll suggest inviting them later.",
        type: "text",
        placeholder: "e.g. My mom and my case manager Ms. Rivera",
        maxLength: 200,
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
    title: "How Do You Support Students?",
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
        key: "school",
        label: "What school do you work at? (optional)",
        type: "text",
        placeholder: "e.g. Bulkeley High School",
        maxLength: 160,
      },
      {
        key: "district",
        label: "What district? (optional)",
        type: "text",
        placeholder: "e.g. Hartford Public Schools",
        maxLength: 160,
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
    title: "About Your School",
    body: "We'll set up the right dashboards for school-level oversight.",
    questions: [
      {
        key: "school_name",
        label: "What school do you lead?",
        type: "text",
        placeholder: "e.g. Bulkeley High School",
        maxLength: 200,
      },
      {
        key: "district_name",
        label: "What district is it in? (optional)",
        type: "text",
        placeholder: "e.g. Hartford Public Schools",
        maxLength: 200,
      },
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
    title: "About Your District",
    body: "We'll surface aggregate reporting tuned to your size.",
    questions: [
      {
        key: "district_name",
        label: "What district do you oversee?",
        type: "text",
        placeholder: "e.g. Hartford Public Schools",
        maxLength: 200,
      },
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
    title: "About Your Organization",
    body: "We'll match your programs to students who fit them best.",
    questions: [
      {
        key: "org_name",
        label: "What's your organization called?",
        type: "text",
        placeholder: "e.g. Hartford Workforce Alliance",
        maxLength: 200,
      },
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

// Role-specific "what's next" tips shown as the final onboarding step.
// Pure copy — no input, no schema change. Mirrors the Phase 3 plan's
// chronological flow (consent/document/team prompts) without forcing extra
// inputs that would block finish.
export type RoleTip = {
  title: string;
  body: string;
  items: string[];
};

export const ROLE_TIPS: Record<string, RoleTip> = {
  student: {
    title: "What You Can Do Next",
    body: "Your dashboard is ready. A few things you can try right away:",
    items: [
      "Open Student Voice to record what you want your team to know.",
      "Upload any IEP or transition document so your plan stays in one place.",
      "Invite a parent, guardian, or case manager from your dashboard.",
    ],
  },
  parent: {
    title: "How Sharing Works",
    body: "You control who sees your child's information. By default, only you can see it.",
    items: [
      "Invite a case manager or teacher when you're ready — they only see what you share.",
      "Upload your child's most recent IEP so the team can plan from the same page.",
      "Use Meeting Prep before the next PPT or IEP meeting to gather questions and goals.",
    ],
  },
  educator: {
    title: "Set Up Your Caseload",
    body: "Your caseload view is ready. A few good first steps:",
    items: [
      "Invite your first student or their family from the caseload page.",
      "Upload a planning document or IEP to attach context to a student.",
      "Open Meeting Prep to draft an agenda for an upcoming PPT.",
    ],
  },
  school_admin: {
    title: "What You'll See Next",
    body: "Your school overview lights up as staff and students join your school.",
    items: [
      "Invite educators and case managers so their caseloads roll up to your school view.",
      "Review compliance and outcomes rails as data flows in.",
      "Connect community partners that serve your students.",
    ],
  },
  district_admin: {
    title: "What You'll See Next",
    body: "Your district overview fills in as schools, staff, and students connect.",
    items: [
      "Invite school administrators so school-level data rolls up to the district.",
      "Use the compliance highlights rail to spot gaps early.",
      "Review partner capacity across your district from the partner network page.",
    ],
  },
  partner: {
    title: "How The Partner Network Works",
    body: "Posts you publish are reviewed before going live. Student data stays private.",
    items: [
      "Create your first opportunity from the partner workspace.",
      "Posts move through Draft → In Review → Live → Archived.",
      "PartnerForward incentives and capacity-building resources are in the Partner Hub.",
    ],
  },
};

export function tipsForRole(role: string | null | undefined): RoleTip | null {
  if (!role) return null;
  return ROLE_TIPS[role] ?? null;
}
