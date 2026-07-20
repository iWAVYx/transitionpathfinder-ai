/**
 * Age-aware pathway report engine.
 *
 * Pure, deterministic function: given a fictional DemoProfile, produce
 * the report content in the seven required explanation sections. The
 * engine respects `stage.disallowedThemes` — a Grade 7 profile never
 * gets adult employment or agency referrals; a Grade 9 profile never
 * gets rights-transfer or postsecondary application content.
 *
 * All output is derived from the profile — no external calls, no random
 * text — so the demo is stable and screenshot-friendly.
 */

import type {
  DemoGoalArea,
  DemoProfile,
  DemoStage,
} from "@/lib/demo/demo-profiles";

export type PathwayOption = {
  id: string;
  title: string;
  category: "education" | "work_based_learning" | "enrichment" | "independent_living" | "advocacy";
  fitSummary: string; // "why it fits"
  ahead: string; // team walking ahead of the student
  beside: string; // team walking beside the student
  behind: string; // team walking behind the student
  themeTag: string; // internal — used for disallowed-theme filtering
  ageBand: "grade_7_8" | "grade_9_10" | "grade_11_12";
};

export type ReportSection =
  | "what_we_know"
  | "evidence"
  | "unknowns"
  | "why_it_fits"
  | "what_to_do_next"
  | "ahead_beside_behind"
  | "when_to_revisit"
  | "conflicts"
  | "alternative_pathways";

export type ReportBlock = {
  section: ReportSection;
  heading: string;
  body: string;
  bullets?: string[];
  /**
   * When the engine has no supporting evidence for a section, it emits a
   * structured "missing/uncertain" marker instead of filler prose. Renderers
   * MUST show the marker verbatim — never hide the section.
   */
  missing?: {
    reason: string;
    needed: string[];
  };
};

export type NextStep = {
  id: string;
  title: string;
  detail: string;
  owner: "family" | "student" | "school_team" | "shared";
  timeframe: "this_month" | "this_semester" | "this_year";
  /**
   * Per-rec review-by horizon in months from generation. Optional in raw
   * definitions — the engine backfills it from `timeframe` when absent
   * so every emitted step ships with an explicit revisit date.
   */
  reviewByMonths?: number;
};

export type EnrichedNextStep = Omit<NextStep, "reviewByMonths"> & {
  reviewByMonths: number;
};


export type AlternativePathway = {
  id: string;
  title: string;
  whenToConsider: string;
};

export type PathwayConflict = {
  id: string;
  summary: string;
  resolutionOwner: "family" | "student" | "school_team" | "shared";
};

export type GeneratedReport = {
  profileId: DemoProfile["id"];
  headline: string;
  subheadline: string;
  focus: string;
  horizonMonths: number;
  revisitCadenceMonths: number;
  ageBand: "grade_7_8" | "grade_9_10" | "grade_11_12";
  ctTransitionEligible: boolean;
  pathwayOptions: PathwayOption[];
  blocks: ReportBlock[];
  nextSteps: EnrichedNextStep[];
  alternativePathways: AlternativePathway[];
  conflicts: PathwayConflict[];
  disallowedThemesApplied: string[];
};



// ---------------------------------------------------------------------------
// Pathway catalog — every option tagged with theme + age band. The engine
// filters out anything whose themeTag is in the profile's disallowedThemes.
// ---------------------------------------------------------------------------
const PATHWAY_CATALOG: PathwayOption[] = [
  // ---- Grade 7-8 (BridgeForward) ----
  {
    id: "hs-arts-magnet-tour",
    title: "Tour an arts or design magnet high school",
    category: "education",
    fitSummary:
      "Matches strong visual/creative interests and a preference for smaller cohort programs.",
    ahead: "School counselor pulls open-house dates and confirms transportation options.",
    beside: "Family attends the tour together; student brings a short list of questions.",
    behind: "After the visit, note what felt right and what didn't — that shapes the shortlist.",
    themeTag: "high_school_choice",
    ageBand: "grade_7_8",
  },
  {
    id: "hs-theme-academy-visit",
    title: "Visit a themed academy inside a comprehensive high school",
    category: "education",
    fitSummary:
      "Gives structure and identity without committing to a full magnet application.",
    ahead: "Counselor requests a shadow day aligned to student interests.",
    beside: "Student shadows a current 9th grader; family attends parent Q&A.",
    behind: "Debrief within 48 hours while impressions are fresh.",
    themeTag: "high_school_choice",
    ageBand: "grade_7_8",
  },
  {
    id: "middle-enrichment",
    title: "Try one after-school enrichment aligned to your interests",
    category: "enrichment",
    fitSummary:
      "Low-stakes way to build confidence and see how new environments feel.",
    ahead: "Team surfaces 2–3 fit options with realistic transportation.",
    beside: "Family and student pick one to try for a full session.",
    behind: "Reflect at week 4 — is this a keep, tweak, or trade?",
    themeTag: "middle_school_enrichment",
    ageBand: "grade_7_8",
  },
  {
    id: "student-voice-practice",
    title: "Practice describing strengths and support needs at the next PPT",
    category: "advocacy",
    fitSummary:
      "Age-appropriate first step in self-advocacy — student leads one section only.",
    ahead: "Team shares the meeting agenda in advance so the student can prepare.",
    beside: "Family and student rehearse one section together.",
    behind: "Team debriefs with the student — what felt hard, what to try next time.",
    themeTag: "self_advocacy_foundations",
    ageBand: "grade_7_8",
  },
  {
    id: "reading-stamina",
    title: "Build reading stamina with self-selected books",
    category: "independent_living",
    fitSummary:
      "Interest-based reading builds fluency and unlocks more of high school.",
    ahead: "Librarian curates a starter shelf around student interests.",
    beside: "Family reads alongside for the first two weeks.",
    behind: "Check-in monthly — track minutes, not pages, at first.",
    themeTag: "reading_fluency_support",
    ageBand: "grade_7_8",
  },
  // ---- Grade 9-10 (TransitionForward early) ----
  {
    id: "cte-it-explore",
    title: "Explore CTE Information Technology pathway options",
    category: "education",
    fitSummary:
      "Aligns strong logical/technical interests with a structured, project-based track.",
    ahead: "School team maps course sequences at CT technical HS or magnet.",
    beside: "Student attends a program open house with a family member.",
    behind: "Note reactions to the environment (noise, structure, cohort feel).",
    themeTag: "course_alignment",
    ageBand: "grade_9_10",
  },
  {
    id: "career-cluster-explore",
    title: "Complete two career cluster exploration activities this year",
    category: "education",
    fitSummary:
      "Early exploration keeps the door open before narrowing junior year.",
    ahead: "Counselor loads cluster tools; team suggests 3–5 clusters to try.",
    beside: "Student picks two and completes them at a comfortable pace.",
    behind: "Compare results with expressed interests — where do they overlap?",
    themeTag: "career_cluster_exploration",
    ageBand: "grade_9_10",
  },
  {
    id: "informational-tour",
    title: "Do one age-appropriate workplace informational tour",
    category: "work_based_learning",
    fitSummary:
      "Exposure — not placement — is the right work-based learning step at Grade 9.",
    ahead: "Team identifies a low-sensory, structured setting to visit.",
    beside: "Student and one team member visit for 45–60 minutes.",
    behind: "Capture 3 things noticed; add to the interest inventory.",
    themeTag: "early_wbl_exposure",
    ageBand: "grade_9_10",
  },
  {
    id: "extracurricular-club",
    title: "Join one structured extracurricular with a stable coach",
    category: "enrichment",
    fitSummary:
      "A predictable adult and small cohort build belonging in a big new school.",
    ahead: "Team surfaces robotics/coding/tech clubs with adult leadership.",
    beside: "Family helps with logistics for the first month.",
    behind: "Ask at week 6: is this a place to stay?",
    themeTag: "extracurricular_participation",
    ageBand: "grade_9_10",
  },
  {
    id: "sensory-self-advocacy",
    title: "Learn to describe your sensory needs to new teachers each semester",
    category: "advocacy",
    fitSummary:
      "Foundational self-advocacy for a student who benefits from clear structure.",
    ahead: "Case manager drafts a one-page 'about me' the student edits and owns.",
    beside: "Student uses the page at the start of each new class or activity.",
    behind: "Update the page each semester as needs shift.",
    themeTag: "self_advocacy_at_ppt",
    ageBand: "grade_9_10",
  },
  {
    id: "transition-assessment-baseline",
    title: "Complete a baseline transition assessment this year",
    category: "education",
    fitSummary:
      "CT requires transition planning starting at 14 — a baseline anchors the next 3 years.",
    ahead: "Team runs an age-appropriate transition inventory.",
    beside: "Student and family review results together.",
    behind: "Revisit annually — this is a growing document.",
    themeTag: "transition_assessment_baseline",
    ageBand: "grade_9_10",
  },
  // ---- Grade 11-12 (TransitionForward postsecondary) ----
  {
    id: "cc-visit-animal-tech",
    title: "Visit a community college program in animal care or applied tech",
    category: "education",
    fitSummary:
      "Matches expressed interests and a preference for cohort-sized, applied programs.",
    ahead: "Team requests a program tour and asks about disability services.",
    beside: "Family attends the visit; student notes what feels right.",
    behind: "Compare with 1–2 other program formats before senior year.",
    themeTag: "postsecondary_options",
    ageBand: "grade_11_12",
  },
  {
    id: "paid-summer-wbl",
    title: "Complete a paid summer work experience with support",
    category: "work_based_learning",
    fitSummary:
      "Real paycheck + real supervision is the highest-value experience before Grade 12.",
    ahead: "Team coordinates with a partner employer that provides a job coach.",
    beside: "Student works the placement; family reviews weekly.",
    behind: "Document skills gained — add to portfolio for postsecondary applications.",
    themeTag: "paid_work_experience",
    ageBand: "grade_11_12",
  },
  {
    id: "agency-brs",
    title: "Connect with the state vocational rehabilitation agency",
    category: "work_based_learning",
    fitSummary:
      "Agency connection at 17 keeps postsecondary employment supports on the table.",
    ahead: "Case manager makes the referral; family reviews the packet.",
    beside: "Family and student attend the intake meeting.",
    behind: "Keep the file open — the agency partners for years, not weeks.",
    themeTag: "agency_connections",
    ageBand: "grade_11_12",
  },
  {
    id: "transit-independence",
    title: "Practice independent travel on one CT Transit route",
    category: "independent_living",
    fitSummary:
      "One reliable route unlocks work, school, and social independence.",
    ahead: "Team maps the route with landmarks and a plan-B.",
    beside: "Family rides along twice, then shadows once.",
    behind: "Student rides independently; family checks in by text at each stop.",
    themeTag: "independent_living",
    ageBand: "grade_11_12",
  },
  {
    id: "ppt-lead-section",
    title: "Lead one section of the annual PPT meeting",
    category: "advocacy",
    fitSummary:
      "Student voice is the strongest predictor of postsecondary outcomes.",
    ahead: "Team shares the agenda and script template early.",
    beside: "Family rehearses the section with the student.",
    behind: "Debrief after the meeting — what to lead next year.",
    themeTag: "self_advocacy_at_ppt",
    ageBand: "grade_11_12",
  },
  {
    id: "rights-transfer-prep",
    title: "Have the age-of-majority (rights transfer) conversation",
    category: "advocacy",
    fitSummary:
      "Rights transfer at 18 in CT — decision-making options should be discussed before then.",
    ahead: "Team surfaces the range of options (supported decision-making, POA, etc.).",
    beside: "Family and student review together with the case manager.",
    behind: "Document the chosen approach in the IEP.",
    themeTag: "rights_transfer",
    ageBand: "grade_11_12",
  },
];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

function selectPathwayOptions(profile: DemoProfile): PathwayOption[] {
  const allowed = new Set(profile.stage.emphasizedThemes);
  const disallowed = new Set(profile.stage.disallowedThemes);
  const ageBand: PathwayOption["ageBand"] =
    profile.demographics.gradeNumber <= 8
      ? "grade_7_8"
      : profile.demographics.gradeNumber <= 10
        ? "grade_9_10"
        : "grade_11_12";

  return PATHWAY_CATALOG.filter((opt) => {
    if (opt.ageBand !== ageBand) return false;
    if (disallowed.has(opt.themeTag)) return false;
    return allowed.has(opt.themeTag);
  });
}

function buildBlocks(profile: DemoProfile): ReportBlock[] {
  const { learning, environment, family, demographics, readiness, evidence, voice } =
    profile;
  const strengths = learning.strengths.slice(0, 4);
  const interests = learning.interests.slice(0, 4);
  const supports = learning.supportNeeds.slice(0, 4);

  const unknowns = deriveUnknowns(profile);
  const nextSteps = deriveNextSteps(profile);

  return [
    {
      section: "what_we_know",
      heading: "What We Know",
      body: `${profile.shortName} is in ${demographics.gradeLabel} (${demographics.pronouns}) at ${demographics.schoolPlaceholder} in ${demographics.townRegion}. ${family.household}. Family communicates in ${family.languagesAtHome.join(" and ")}. ${profile.stage.focusHeadline}.`,
      bullets: [
        `Strengths — ${strengths.join(", ")}.`,
        `Interests — ${interests.join(", ")}.`,
        `Supports that work — ${supports.join(", ")}.`,
        `Ideal school feel — ${environment.idealSchoolFeel}.`,
      ],
    },
    {
      section: "evidence",
      heading: "Evidence We're Using",
      body: `The pathway below is grounded in ${evidence.length} pieces of evidence and ${voice.length} of ${profile.shortName}'s own responses. Nothing here is speculation.`,
      bullets: evidence.map(
        (e) => `${e.title} — ${e.source}, ${e.date}. ${e.summary}`,
      ),
    },
    {
      section: "unknowns",
      heading: "What We Don't Know Yet",
      body: "Honest unknowns keep the plan credible. The team will close these before the next revisit.",
      bullets: unknowns,
    },
    {
      section: "why_it_fits",
      heading: "Why This Pathway Fits",
      body: fitNarrative(profile),
      bullets: [
        `Age-appropriate for ${demographics.gradeLabel} — no themes that skip past where ${profile.shortName} actually is.`,
        `Readiness overall: ${readinessLabel(readiness.overall)}. By area — education: ${readinessLabel(readiness.byArea.education)}, employment: ${readinessLabel(readiness.byArea.employment)}, living: ${readinessLabel(readiness.byArea.living)}, advocacy: ${readinessLabel(readiness.byArea.advocacy)}.`,
        `Environment fit — seek ${environment.environmentsToSeek.join("; ")}. Avoid ${environment.environmentsToAvoid.join("; ")}.`,
      ],
    },
    {
      section: "what_to_do_next",
      heading: "What To Do Next",
      body: `Concrete steps for the next ${profile.stage.horizonMonths} months. Each step names an owner and a timeframe so it doesn't sit.`,
      bullets: nextSteps.map(
        (s) => `[${timeframeLabel(s.timeframe)} · ${ownerLabel(s.owner)}] ${s.title} — ${s.detail}`,
      ),
    },
    {
      section: "ahead_beside_behind",
      heading: "Ahead, Beside, Behind",
      body: `Every pathway below is written for three stances — the team walks ahead of ${profile.shortName} (preparing the way), beside ${profile.shortName} (in the moment), and behind ${profile.shortName} (following up so nothing drops).`,
    },
    {
      section: "when_to_revisit",
      heading: "When To Revisit",
      body: `Revisit this report every ${profile.stage.revisitCadenceMonths} months, sooner if evidence changes materially (new evaluation, major schedule change, significant new interest, or ${profile.shortName}'s own request).`,
    },
  ];
}

function deriveUnknowns(profile: DemoProfile): string[] {
  const out: string[] = [];
  if (profile.demographics.gradeNumber <= 8) {
    out.push("Which specific high schools will accept out-of-district applications on the family's timeline.");
    out.push("Whether transportation is realistic for each shortlisted school.");
    out.push(`How ${profile.shortName} experiences a full-day visit vs. a short tour.`);
  } else if (profile.demographics.gradeNumber <= 10) {
    out.push("How the current class schedule holds up after the first marking period.");
    out.push("Which extracurriculars have space and a stable adult lead this year.");
    out.push("Baseline transition-assessment data — first inventory not yet on file.");
  } else {
    out.push("Postsecondary program capacity and disability-services detail for the two top options.");
    out.push("Whether the summer work placement offers a job coach continuously.");
    out.push("The family's chosen decision-making approach for the rights-transfer conversation.");
  }
  return out;
}

function deriveNextSteps(profile: DemoProfile): NextStep[] {
  const g = profile.demographics.gradeNumber;
  if (g <= 8) {
    return [
      {
        id: "ns-schedule-tours",
        title: "Schedule two high-school open houses",
        detail: "Prioritize programs matching arts/creative interest with strong bilingual family communication.",
        owner: "shared",
        timeframe: "this_month",
      },
      {
        id: "ns-enrichment-signup",
        title: "Sign up for one after-school enrichment",
        detail: "Try it for a full session, then decide keep / tweak / trade.",
        owner: "family",
        timeframe: "this_month",
      },
      {
        id: "ns-ppt-section",
        title: "Practice one PPT section together",
        detail: `${profile.shortName} leads the 'my strengths' section at the next meeting.`,
        owner: "student",
        timeframe: "this_semester",
      },
      {
        id: "ns-reading-plan",
        title: "Start the interest-based reading plan",
        detail: "Librarian pulls a starter shelf; family reads alongside for two weeks.",
        owner: "school_team",
        timeframe: "this_semester",
      },
    ];
  }
  if (g <= 10) {
    return [
      {
        id: "ns-baseline-assessment",
        title: "Complete the baseline transition assessment",
        detail: "First formal inventory — anchors the next three IEPs.",
        owner: "school_team",
        timeframe: "this_semester",
      },
      {
        id: "ns-cte-visit",
        title: "Visit one CTE / CS pathway program",
        detail: "Include a shadow session; note environment (noise, structure, cohort).",
        owner: "shared",
        timeframe: "this_semester",
      },
      {
        id: "ns-club-join",
        title: "Join one structured extracurricular",
        detail: "Robotics or coding club with a stable adult lead — commit for six weeks.",
        owner: "student",
        timeframe: "this_month",
      },
      {
        id: "ns-about-me-page",
        title: "Draft the 'About Me' one-pager",
        detail: "Student edits and owns it; used with new teachers each semester.",
        owner: "student",
        timeframe: "this_month",
      },
    ];
  }
  return [
    {
      id: "ns-cc-tour",
      title: "Tour the top two community college programs",
      detail: "Ask about disability services, cohort size, and applied-lab availability.",
      owner: "shared",
      timeframe: "this_semester",
    },
    {
      id: "ns-summer-wbl",
      title: "Confirm the paid summer work experience",
      detail: "Verify the job-coach model and weekly review cadence with the employer partner.",
      owner: "school_team",
      timeframe: "this_semester",
    },
    {
      id: "ns-agency-intake",
      title: "Attend the vocational rehab intake meeting",
      detail: "Bring the current IEP, evaluation summary, and interest inventory.",
      owner: "family",
      timeframe: "this_semester",
    },
    {
      id: "ns-rights-transfer",
      title: "Hold the rights-transfer conversation before 18",
      detail: "Review the full range of decision-making options and document the chosen approach.",
      owner: "shared",
      timeframe: "this_year",
    },
    {
      id: "ns-ppt-lead",
      title: `${profile.shortName} leads one section of the annual PPT`,
      detail: "Team shares agenda in advance; family rehearses the section together.",
      owner: "student",
      timeframe: "this_year",
    },
  ];
}

function fitNarrative(profile: DemoProfile): string {
  const g = profile.demographics.gradeNumber;
  if (g <= 8) {
    return `At Grade 7, the right work is high-school exploration and confidence — not adult employment. Every option here is picked to give ${profile.shortName} real experience of what different high schools feel like, in the languages the family uses at home, on transportation that actually works.`;
  }
  if (g <= 10) {
    return `Grade 9 is where CT transition planning formally begins. The right work is exploration, structured belonging in a big new school, and the first self-advocacy skills — not job placement or agency referrals. Every option below is age-appropriate exposure.`;
  }
  return `At Grade 11 with rights transferring next year, the pathway centers on postsecondary direction, meaningful paid work-based learning, and the adult-service connections ${profile.shortName} will lean on for years. Student voice at the PPT is the strongest predictor of outcomes — so ${profile.shortName} leads.`;
}

function readinessLabel(band: string): string {
  switch (band) {
    case "emerging":
      return "Emerging";
    case "developing":
      return "Developing";
    case "progressing":
      return "Progressing";
    case "approaching_independence":
      return "Approaching independence";
    default:
      return band;
  }
}

function timeframeLabel(t: NextStep["timeframe"]): string {
  return t === "this_month"
    ? "This Month"
    : t === "this_semester"
      ? "This Semester"
      : "This Year";
}

function ownerLabel(o: NextStep["owner"]): string {
  return o === "family"
    ? "Family"
    : o === "student"
      ? "Student"
      : o === "school_team"
        ? "School Team"
        : "Shared";
}

export function generatePathwayReport(profile: DemoProfile): GeneratedReport {
  const pathwayOptions = selectPathwayOptions(profile);
  const blocks = buildBlocks(profile);
  const nextSteps = deriveNextSteps(profile);

  return {
    profileId: profile.id,
    headline: `${profile.shortName}'s Pathway Report`,
    subheadline: profile.tagline,
    focus: profile.stage.focusHeadline,
    horizonMonths: profile.stage.horizonMonths,
    revisitCadenceMonths: profile.stage.revisitCadenceMonths,
    pathwayOptions,
    blocks,
    nextSteps,
    disallowedThemesApplied: profile.stage.disallowedThemes,
  };
}

// Exported for tests
export const _internals = {
  PATHWAY_CATALOG,
  selectPathwayOptions,
  deriveUnknowns,
  deriveNextSteps,
};

// Ensure DemoGoalArea import is retained even if reordered
export type _AreaAlias = DemoGoalArea;
export type _StageAlias = DemoStage;
