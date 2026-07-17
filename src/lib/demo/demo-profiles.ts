/**
 * Centralized, typed demo profile source.
 *
 * All three profiles are FICTIONAL demonstration data. Never confuse with
 * real students. No real names, schools, contacts, or documents are used.
 *
 * These profiles feed the age-aware pathway generator, role previews,
 * intake, documents, student voice, opportunities, calendar, and next
 * actions. The existing `DEMO_STUDENT` (src/lib/demo-fixture.ts) is
 * preserved for downstream consumers that already reference Jordan;
 * this module re-exports Jordan in the new schema and adds Sam + Riley.
 */

export type DemoProfileId = "jordan" | "sam" | "riley";
export type DemoProduct = "transitionforward" | "bridgeforward";

export type DemoTransportation =
  | "family_car"
  | "school_bus"
  | "public_transit"
  | "walk_or_bike"
  | "rideshare";

export type DemoReadinessBand =
  | "emerging"
  | "developing"
  | "progressing"
  | "approaching_independence";

export type DemoEvidenceKind =
  | "iep"
  | "evaluation"
  | "work_sample"
  | "interest_inventory"
  | "assessment"
  | "family_note"
  | "teacher_observation"
  | "report_card";

export type DemoEvidenceItem = {
  id: string;
  kind: DemoEvidenceKind;
  title: string;
  date: string; // ISO YYYY-MM-DD
  source: string; // e.g. "School team", "Family upload"
  summary: string;
  fictional: true;
};

export type DemoVoiceResponse = {
  prompt: string;
  answer: string;
};

export type DemoDemographics = {
  pronouns: string;
  age: number;
  gradeLabel: string; // "Grade 7", "Grade 9", "Grade 11"
  gradeNumber: 7 | 9 | 11;
  schoolPlaceholder: string; // fictional school; never a real name
  townRegion: string; // fictional CT region
};

export type DemoFamilyContext = {
  household: string;
  languagesAtHome: string[];
  transportation: DemoTransportation[];
  transportationNote?: string;
  workingParentSchedule?: string;
  keyConsiderations: string[];
};

export type DemoLearningProfile = {
  diagnosis: string[]; // fictional
  strengths: string[];
  interests: string[];
  supportNeeds: string[];
  learningPreferences: string[];
  sensoryNotes?: string[];
  communicationStyle: string;
};

export type DemoEnvironmentPreference = {
  idealSchoolFeel: string;
  classSizePreference: string;
  environmentsToAvoid: string[];
  environmentsToSeek: string[];
};

export type DemoGoalArea = "education" | "employment" | "living" | "advocacy";
export type DemoPathwayGoal = {
  area: DemoGoalArea;
  title: string;
  horizon: "next_semester" | "this_year" | "next_year" | "2_to_3_years";
  status: "not_started" | "in_progress" | "on_track" | "needs_review";
};

export type DemoReadiness = {
  overall: DemoReadinessBand;
  byArea: Record<DemoGoalArea, DemoReadinessBand>;
  notes?: string;
};

/**
 * Age-aware framing that the pathway engine uses to pick the correct
 * report variant, opportunity filters, and role narrative.
 */
export type DemoStage = {
  product: DemoProduct;
  focusHeadline: string;
  horizonMonths: number; // planning horizon this profile is oriented around
  revisitCadenceMonths: number;
  disallowedThemes: string[]; // themes the pathway engine must NOT surface
  emphasizedThemes: string[];
};

export type DemoProfile = {
  id: DemoProfileId;
  fictional: true;
  displayName: string; // "Jordan Rivera"
  shortName: string; // "Jordan"
  product: DemoProduct;
  accent: "primary" | "warm-sand" | "sage";
  emoji: string; // small visual for switcher
  tagline: string; // one-line differentiator
  demographics: DemoDemographics;
  family: DemoFamilyContext;
  learning: DemoLearningProfile;
  environment: DemoEnvironmentPreference;
  goals: DemoPathwayGoal[];
  readiness: DemoReadiness;
  stage: DemoStage;
  voice: DemoVoiceResponse[];
  evidence: DemoEvidenceItem[];
};

// ---------------------------------------------------------------------------
// Profile: Jordan Rivera — Grade 11, TransitionForward (existing student)
// Preserved: matches src/lib/demo-fixture.ts. Extended with the new schema
// so the age-aware pathway engine can render a mature postsecondary report.
// ---------------------------------------------------------------------------
const jordan: DemoProfile = {
  id: "jordan",
  fictional: true,
  displayName: "Jordan Rivera",
  shortName: "Jordan",
  product: "transitionforward",
  accent: "primary",
  emoji: "🎧",
  tagline: "Grade 11 · Postsecondary planning",
  demographics: {
    pronouns: "they/them",
    age: 17,
    gradeLabel: "Grade 11",
    gradeNumber: 11,
    schoolPlaceholder: "Hartford Regional High (Demo)",
    townRegion: "Greater Hartford, CT",
  },
  family: {
    household: "Lives with mom and younger cousin",
    languagesAtHome: ["English", "Spanish (mom)"],
    transportation: ["family_car", "public_transit"],
    transportationNote:
      "Mom works second shift; Jordan is comfortable taking CT Transit with a familiar route.",
    workingParentSchedule: "Parent works 2pm–10pm weekdays",
    keyConsiderations: [
      "Turning 18 during senior year — rights transfer conversation upcoming",
      "Considering community college pathway with animal care interest",
      "Wants meaningful summer work experience before Grade 12",
    ],
  },
  learning: {
    diagnosis: ["Autism Spectrum Disorder (fictional)", "ADHD (fictional)"],
    strengths: [
      "Strong visual memory",
      "Detail-oriented with patterns",
      "Patient with younger kids and animals",
      "Skilled with hands-on building",
    ],
    interests: [
      "Video game design",
      "Working with animals (especially dogs)",
      "Music production",
      "Cooking with family",
    ],
    supportNeeds: [
      "Quiet workspace for focus",
      "Written multi-step instructions",
      "Extra time on assessments",
      "Scheduled breaks in meetings over 45 min",
    ],
    learningPreferences: [
      "Visual step-by-step guides",
      "Hands-on practice before independent work",
      "Advance notice of transitions",
    ],
    sensoryNotes: ["Fluorescent lighting is tiring", "Prefers headphones in busy spaces"],
    communicationStyle:
      "Direct and honest; may need a moment to organize a longer answer.",
  },
  environment: {
    idealSchoolFeel: "Small program cohort inside a larger campus",
    classSizePreference: "Under 20; more structured is better",
    environmentsToAvoid: ["Large lectures", "Loud open shop floors without breaks"],
    environmentsToSeek: [
      "Applied labs with a coach nearby",
      "Roles with a defined checklist",
    ],
  },
  goals: [
    {
      area: "education",
      title: "Explore community college programs in animal care or applied tech",
      horizon: "this_year",
      status: "in_progress",
    },
    {
      area: "employment",
      title: "Complete a paid summer work experience with support",
      horizon: "next_semester",
      status: "in_progress",
    },
    {
      area: "living",
      title: "Practice independent travel on one CT Transit route",
      horizon: "this_year",
      status: "on_track",
    },
    {
      area: "advocacy",
      title: "Lead one section of the annual PPT meeting",
      horizon: "next_semester",
      status: "not_started",
    },
  ],
  readiness: {
    overall: "developing",
    byArea: {
      education: "developing",
      employment: "developing",
      living: "progressing",
      advocacy: "emerging",
    },
    notes: "Age of majority conversation is a near-term milestone.",
  },
  stage: {
    product: "transitionforward",
    focusHeadline: "Postsecondary direction, work-based learning, and agency links",
    horizonMonths: 18,
    revisitCadenceMonths: 6,
    disallowedThemes: ["high_school_choice", "middle_school_enrichment"],
    emphasizedThemes: [
      "postsecondary_options",
      "paid_work_experience",
      "agency_connections",
      "independent_living",
      "self_advocacy_at_ppt",
      "rights_transfer",
    ],
  },
  voice: [
    {
      prompt: "What do you want after high school?",
      answer:
        "I want to keep learning about computers and maybe work with animals too.",
    },
    {
      prompt: "What are you good at?",
      answer:
        "I notice small details other people miss, and I'm really patient.",
    },
    {
      prompt: "What support helps you the most?",
      answer:
        "When teachers write things down for me instead of just saying them.",
    },
  ],
  evidence: [
    {
      id: "j-iep-2024",
      kind: "iep",
      title: "Current IEP — annual review",
      date: "2024-10-14",
      source: "School team (Demo)",
      summary:
        "Goals in reading fluency, math problem solving, and social communication. Extended time and small-group testing accommodations.",
      fictional: true,
    },
    {
      id: "j-cbi-shadow",
      kind: "work_sample",
      title: "Job shadow reflection — small-animal veterinary clinic",
      date: "2025-03-02",
      source: "Family upload (Demo)",
      summary:
        "Positive reflection; asked good questions; wanted more time with technicians.",
      fictional: true,
    },
    {
      id: "j-interests",
      kind: "interest_inventory",
      title: "O*NET Interest Profiler",
      date: "2025-01-11",
      source: "School team (Demo)",
      summary:
        "Realistic + Investigative dominant. Consistent with animal care and applied tech.",
      fictional: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Profile: Sam Alvarez — Grade 7, BridgeForward (new)
// High-school exploration + magnet/arts interest. Bilingual household.
// ---------------------------------------------------------------------------
const sam: DemoProfile = {
  id: "sam",
  fictional: true,
  displayName: "Sam Alvarez",
  shortName: "Sam",
  product: "bridgeforward",
  accent: "warm-sand",
  emoji: "🎨",
  tagline: "Grade 7 · High school exploration",
  demographics: {
    pronouns: "she/her",
    age: 13,
    gradeLabel: "Grade 7",
    gradeNumber: 7,
    schoolPlaceholder: "Elm City Middle (Demo)",
    townRegion: "New Haven area, CT",
  },
  family: {
    household: "Lives with mom, dad, and 10th-grade brother",
    languagesAtHome: ["Spanish (primary at home)", "English"],
    transportation: ["school_bus", "walk_or_bike"],
    transportationNote:
      "No second car; family relies on school bus and neighborhood walking distance for after-school programs.",
    keyConsiderations: [
      "First in family to navigate CT high-school choice process",
      "Older brother's magnet school experience is a reference point",
      "Family prefers documents in Spanish and English",
    ],
  },
  learning: {
    diagnosis: ["ADHD, combined presentation (fictional)"],
    strengths: [
      "Vivid visual imagination",
      "Confident presenter in small groups",
      "Curious science observer",
      "Kind peer mediator",
    ],
    interests: [
      "Drawing and digital art",
      "Marine biology and animals",
      "Musical theater",
      "Cooking with abuela",
    ],
    supportNeeds: [
      "Support with reading fluency and stamina",
      "Movement breaks every 20–30 minutes",
      "Checklists that break big projects into small pieces",
      "Bilingual family communication",
    ],
    learningPreferences: [
      "Hands-on projects over long readings",
      "Talking through ideas before writing",
      "Working in pairs or trios, not big groups",
    ],
    sensoryNotes: [
      "Fidgets help focus; not disruptive",
      "Prefers seated near the front, away from the door",
    ],
    communicationStyle:
      "Bright and expressive verbally; writing takes longer and benefits from voice-to-text.",
  },
  environment: {
    idealSchoolFeel: "Creative program with visible student work",
    classSizePreference: "Small cohort; project-based classes",
    environmentsToAvoid: ["Silent all-day seatwork", "Very large impersonal buildings"],
    environmentsToSeek: [
      "Art/design magnet or theme academy",
      "Schools with strong bilingual family communication",
    ],
  },
  goals: [
    {
      area: "education",
      title: "Tour 3 high-school options that fit her interests and support needs",
      horizon: "this_year",
      status: "not_started",
    },
    {
      area: "advocacy",
      title: "Practice describing her strengths and support needs at the next PPT",
      horizon: "next_semester",
      status: "in_progress",
    },
    {
      area: "education",
      title: "Try one after-school enrichment aligned to art or marine science",
      horizon: "next_semester",
      status: "in_progress",
    },
    {
      area: "living",
      title: "Build reading stamina to 20 minutes of self-selected books",
      horizon: "this_year",
      status: "on_track",
    },
  ],
  readiness: {
    overall: "emerging",
    byArea: {
      education: "developing",
      employment: "emerging",
      living: "emerging",
      advocacy: "emerging",
    },
    notes:
      "Postsecondary and employment are age-inappropriate as primary focus — engine should not surface adult employment.",
  },
  stage: {
    product: "bridgeforward",
    focusHeadline: "High-school exploration, confidence, and school-fit conversations",
    horizonMonths: 24,
    revisitCadenceMonths: 4,
    disallowedThemes: [
      "adult_employment",
      "agency_referrals",
      "rights_transfer",
      "postsecondary_applications",
    ],
    emphasizedThemes: [
      "high_school_choice",
      "middle_school_enrichment",
      "self_advocacy_foundations",
      "family_information_sessions",
      "reading_fluency_support",
      "school_visits",
    ],
  },
  voice: [
    {
      prompt: "What high school might feel right for you?",
      answer:
        "Somewhere I can draw and do plays and it's not too huge. My brother's school is big and I don't want that.",
    },
    {
      prompt: "What are you really good at?",
      answer:
        "I'm good at drawing and I can explain things to my little cousins so they understand.",
    },
    {
      prompt: "What makes school hard sometimes?",
      answer:
        "Reading long chapters is really hard and I get tired. I do better if I can move around.",
    },
  ],
  evidence: [
    {
      id: "s-iep-2025",
      kind: "iep",
      title: "Current IEP — mid-year check",
      date: "2025-02-06",
      source: "School team (Demo)",
      summary:
        "Reading fluency and executive-function goals. Accommodations: chunked assignments, movement breaks, extended time on reading tasks.",
      fictional: true,
    },
    {
      id: "s-report",
      kind: "report_card",
      title: "Grade 7 Q2 report card",
      date: "2025-01-24",
      source: "School team (Demo)",
      summary:
        "Strong in art and science. Reading pace flagged; ELA teacher recommends interest-based reading choices.",
      fictional: true,
    },
    {
      id: "s-interest",
      kind: "interest_inventory",
      title: "Middle school interest inventory",
      date: "2024-11-19",
      source: "School counselor (Demo)",
      summary:
        "Artistic + Investigative dominant. Consistent with art magnet and marine science themes.",
      fictional: true,
    },
    {
      id: "s-family-note",
      kind: "family_note",
      title: "Family goals note (bilingual)",
      date: "2025-03-01",
      source: "Family upload (Demo)",
      summary:
        "Family wants tours of arts magnets and a school that communicates in Spanish. Transportation is a real factor.",
      fictional: true,
    },
  ],
};

// ---------------------------------------------------------------------------
// Profile: Riley Chen — Grade 9, TransitionForward (new)
// Early HS planning + coding/transit interest. Autism, sensory-sensitive.
// ---------------------------------------------------------------------------
const riley: DemoProfile = {
  id: "riley",
  fictional: true,
  displayName: "Riley Chen",
  shortName: "Riley",
  product: "transitionforward",
  accent: "sage",
  emoji: "🚆",
  tagline: "Grade 9 · Early high school planning",
  demographics: {
    pronouns: "he/him",
    age: 14,
    gradeLabel: "Grade 9",
    gradeNumber: 9,
    schoolPlaceholder: "Silver Lane High (Demo)",
    townRegion: "Manchester area, CT",
  },
  family: {
    household: "Lives with dad; grandmother nearby for after-school pickups",
    languagesAtHome: ["English", "Mandarin (grandmother)"],
    transportation: ["family_car", "school_bus"],
    transportationNote:
      "Dad works evenings; grandmother handles pickups. Riley knows the local bus route but is not yet independent on it.",
    workingParentSchedule: "Parent works 3pm–11pm weekdays",
    keyConsiderations: [
      "First year of high school — building predictable routines matters",
      "Very strong specific interests; risk of narrow course selection",
      "Sensory sensitivity to noise affects lunch and hallway transitions",
    ],
  },
  learning: {
    diagnosis: ["Autism Spectrum (fictional)"],
    strengths: [
      "Exceptional focus on topics of interest",
      "Precise, logical thinker",
      "Strong memory for systems and schedules",
      "Reliable and honest",
    ],
    interests: [
      "Coding (Python, small games)",
      "Trains, transit maps, and rail systems",
      "Model building",
      "Documentary videos",
    ],
    supportNeeds: [
      "Predictable daily schedule with advance notice of changes",
      "Quiet lunch alternative option",
      "Explicit teaching of social/pragmatic expectations",
      "Support with organization across 4+ classes",
    ],
    learningPreferences: [
      "Written instructions with examples",
      "Independent work with clear rubric",
      "Interest-based projects when offered",
    ],
    sensoryNotes: [
      "Cafeteria and pep-rally noise is overwhelming",
      "Prefers noise-canceling headphones in hallways",
    ],
    communicationStyle:
      "Precise and factual; sarcasm and idioms may need clarification.",
  },
  environment: {
    idealSchoolFeel: "Structured routine with a small predictable adult team",
    classSizePreference: "Small class or clear structure; hates chaos",
    environmentsToAvoid: [
      "Loud unstructured settings",
      "Fast group discussions without turn-taking",
    ],
    environmentsToSeek: [
      "CTE programs in IT / computer science",
      "Robotics or tech club with a stable coach",
    ],
  },
  goals: [
    {
      area: "education",
      title: "Explore CTE / computer science pathways available at CT technical HS or magnet",
      horizon: "this_year",
      status: "in_progress",
    },
    {
      area: "advocacy",
      title: "Learn to describe his sensory needs to new teachers each semester",
      horizon: "next_semester",
      status: "in_progress",
    },
    {
      area: "education",
      title: "Join one structured extracurricular (robotics or coding club)",
      horizon: "next_semester",
      status: "not_started",
    },
    {
      area: "employment",
      title: "Complete one age-appropriate career exploration activity (informational tour)",
      horizon: "this_year",
      status: "not_started",
    },
  ],
  readiness: {
    overall: "emerging",
    byArea: {
      education: "developing",
      employment: "emerging",
      living: "emerging",
      advocacy: "emerging",
    },
    notes:
      "Employment focus is age-appropriate only as exposure/exploration, not as job placement.",
  },
  stage: {
    product: "transitionforward",
    focusHeadline: "Early HS planning, career exploration, self-advocacy foundations",
    horizonMonths: 36,
    revisitCadenceMonths: 6,
    disallowedThemes: [
      "agency_referrals",
      "rights_transfer",
      "adult_supported_employment",
      "postsecondary_applications",
    ],
    emphasizedThemes: [
      "course_alignment",
      "career_cluster_exploration",
      "self_advocacy_at_ppt",
      "extracurricular_participation",
      "early_wbl_exposure",
      "transition_assessment_baseline",
    ],
  },
  voice: [
    {
      prompt: "What are you hoping high school is like?",
      answer:
        "I want a schedule that stays the same each week and teachers who tell me clearly what to do.",
    },
    {
      prompt: "What are you really into?",
      answer:
        "I like coding little games in Python and I know a lot about the Metro-North schedule.",
    },
    {
      prompt: "What makes a school day hard?",
      answer:
        "Loud lunch and when things change without warning. I need a quieter place sometimes.",
    },
  ],
  evidence: [
    {
      id: "r-iep-2025",
      kind: "iep",
      title: "Current IEP — Grade 9 transition-planning start",
      date: "2025-09-08",
      source: "School team (Demo)",
      summary:
        "Includes first Grade 9 transition planning statement. Accommodations: preferential seating, noise-reducing headphones, advance notice of schedule changes.",
      fictional: true,
    },
    {
      id: "r-eval",
      kind: "evaluation",
      title: "Triennial re-evaluation summary",
      date: "2024-05-15",
      source: "School team (Demo)",
      summary:
        "Cognitive strengths in logical reasoning and memory; pragmatic-language supports recommended.",
      fictional: true,
    },
    {
      id: "r-interest",
      kind: "interest_inventory",
      title: "Career cluster inventory",
      date: "2025-09-25",
      source: "School counselor (Demo)",
      summary:
        "Information Technology and Transportation clusters dominant. Consistent with expressed interests.",
      fictional: true,
    },
  ],
};

export const DEMO_PROFILES: Record<DemoProfileId, DemoProfile> = {
  jordan,
  sam,
  riley,
};

export const DEMO_PROFILE_ORDER: DemoProfileId[] = ["jordan", "riley", "sam"];

export const DEFAULT_DEMO_PROFILE_ID: DemoProfileId = "jordan";

export function getDemoProfile(id: string | null | undefined): DemoProfile {
  if (id && (id in DEMO_PROFILES)) return DEMO_PROFILES[id as DemoProfileId];
  return DEMO_PROFILES[DEFAULT_DEMO_PROFILE_ID];
}

export function isDemoProfileId(id: unknown): id is DemoProfileId {
  return typeof id === "string" && id in DEMO_PROFILES;
}
