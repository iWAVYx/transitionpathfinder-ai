/**
 * Explainable opportunity matching for the public demo.
 *
 * Pure function: given a DemoProfile, rank a fictional catalog of
 * partner opportunities and return per-opportunity explanations that
 * make the match legible (fit reasons, gaps, and age-safeguard reasons
 * when an opportunity is filtered out entirely).
 *
 * All opportunities are FICTIONAL. No real partner names.
 */

import type {
  DemoGoalArea,
  DemoProduct,
  DemoProfile,
} from "@/lib/demo/demo-profiles";

export type DemoOpportunityKind =
  | "paid_work"
  | "internship"
  | "school_visit"
  | "enrichment"
  | "agency_intake"
  | "college_program"
  | "life_skills"
  | "peer_group";

export type DemoOpportunity = {
  id: string;
  fictional: true;
  title: string;
  provider: string; // fictional partner
  kind: DemoOpportunityKind;
  product: DemoProduct;
  minGrade: 7 | 9 | 11;
  maxGrade: 7 | 9 | 11;
  themes: string[]; // must intersect with profile.stage.emphasizedThemes
  interests: string[]; // matched against profile.learning.interests (loose)
  goalAreas: DemoGoalArea[];
  environmentFit: string[]; // matches environmentsToSeek
  environmentRisk: string[]; // matches environmentsToAvoid
  disallowedIfPresent?: string[]; // if any is in profile.stage.disallowedThemes → hard-hide
  summary: string;
  region: string;
};

export type OpportunityMatch = {
  opportunity: DemoOpportunity;
  score: number; // 0–100
  band: "strong" | "worth_exploring" | "stretch" | "filtered_out";
  fitReasons: string[];
  gapReasons: string[];
  safeguardReasons: string[]; // populated only when filtered_out
};

// ---------------------------------------------------------------------------
// Fictional opportunity catalog
// ---------------------------------------------------------------------------
export const DEMO_OPPORTUNITIES: DemoOpportunity[] = [
  {
    id: "op-animal-care",
    fictional: true,
    title: "Paid Summer Apprenticeship — Animal Care Assistant",
    provider: "Riverbend Humane Society (fictional)",
    kind: "paid_work",
    product: "transitionforward",
    minGrade: 11,
    maxGrade: 11,
    themes: ["paid_work_experience", "agency_connections"],
    interests: ["Working with animals (especially dogs)", "animals"],
    goalAreas: ["employment", "living"],
    environmentFit: ["Applied labs with a coach nearby", "Roles with a defined checklist"],
    environmentRisk: [],
    disallowedIfPresent: ["adult_employment"],
    summary:
      "8-week paid role feeding, walking, and enrichment with on-site job coach; checklists provided.",
    region: "Eastern CT",
  },
  {
    id: "op-cc-applied-tech",
    fictional: true,
    title: "Community College Applied Tech — Sampler Semester",
    provider: "Coastline Community College (fictional)",
    kind: "college_program",
    product: "transitionforward",
    minGrade: 11,
    maxGrade: 11,
    themes: ["postsecondary_options"],
    interests: ["Video game design", "Music production"],
    goalAreas: ["education"],
    environmentFit: ["Small program cohort inside a larger campus"],
    environmentRisk: ["Large lectures"],
    disallowedIfPresent: ["postsecondary_applications"],
    summary:
      "Non-degree audit of two applied tech courses with cohort-based supports and quiet lab access.",
    region: "Shoreline",
  },
  {
    id: "op-brs-intake",
    fictional: true,
    title: "Bureau Of Rehab Services — Youth Intake Session",
    provider: "State BRS Youth Team (fictional)",
    kind: "agency_intake",
    product: "transitionforward",
    minGrade: 11,
    maxGrade: 11,
    themes: ["agency_connections", "rights_transfer"],
    interests: [],
    goalAreas: ["employment", "advocacy"],
    environmentFit: [],
    environmentRisk: [],
    disallowedIfPresent: ["agency_referrals"],
    summary:
      "Family + student intake to open the youth employment file before age of majority.",
    region: "Statewide",
  },
  {
    id: "op-hs-arts-visit",
    fictional: true,
    title: "Arts Magnet High School — Shadow Visit Day",
    provider: "Compass Arts Magnet (fictional)",
    kind: "school_visit",
    product: "bridgeforward",
    minGrade: 7,
    maxGrade: 9,
    themes: ["high_school_choice", "school_visits"],
    interests: ["Drawing", "Theater and drama club", "Musical theater soundtracks"],
    goalAreas: ["education"],
    environmentFit: ["Small cohort schools with strong arts programs"],
    environmentRisk: ["Very large open cafeterias at peak times"],
    summary:
      "Half-day shadow of a Grade 9 student with a family Q&A and sample studio class.",
    region: "Greater Hartford",
  },
  {
    id: "op-hs-tech-visit",
    fictional: true,
    title: "Regional Tech High School — Family Info Session",
    provider: "Northline Regional Tech (fictional)",
    kind: "school_visit",
    product: "bridgeforward",
    minGrade: 7,
    maxGrade: 9,
    themes: ["high_school_choice", "family_information_sessions"],
    interests: [
      "Building custom gaming PCs and repairing devices",
      "Trains, transit maps, and signal systems",
    ],
    goalAreas: ["education"],
    environmentFit: ["Structured schedules with clear expectations"],
    environmentRisk: [],
    summary:
      "Evening session for families with student panel and application walk-through.",
    region: "Northern CT",
  },
  {
    id: "op-middle-enrichment",
    fictional: true,
    title: "After-School Maker Club (Grades 6–8)",
    provider: "Brookline Middle Enrichment (fictional)",
    kind: "enrichment",
    product: "bridgeforward",
    minGrade: 7,
    maxGrade: 7,
    themes: ["middle_school_enrichment"],
    interests: [
      "Building custom gaming PCs and repairing devices",
      "Video games (strategy and simulation)",
    ],
    goalAreas: ["education"],
    environmentFit: ["Predictable routines"],
    environmentRisk: ["Loud gymnasium-style activities"],
    summary:
      "Weekly small-group build club with the same two adults each session.",
    region: "Central CT",
  },
  {
    id: "op-self-advocacy",
    fictional: true,
    title: "PPT Voice Workshop For Students",
    provider: "TransitionForward Peer Circle (fictional)",
    kind: "peer_group",
    product: "transitionforward",
    minGrade: 9,
    maxGrade: 11,
    themes: ["self_advocacy_at_ppt", "self_advocacy_foundations"],
    interests: [],
    goalAreas: ["advocacy"],
    environmentFit: [],
    environmentRisk: [],
    summary:
      "Three-session workshop rehearsing how to lead a section of your own PPT.",
    region: "Virtual",
  },
  {
    id: "op-travel-training",
    fictional: true,
    title: "CT Transit Travel Training — 1:1 Coach",
    provider: "MobilityForward (fictional)",
    kind: "life_skills",
    product: "transitionforward",
    minGrade: 11,
    maxGrade: 11,
    themes: ["independent_living"],
    interests: [],
    goalAreas: ["living"],
    environmentFit: [],
    environmentRisk: [],
    summary:
      "Six sessions practicing one commuter route end-to-end with a coach fading support.",
    region: "Shoreline",
  },
];

// ---------------------------------------------------------------------------
// Matcher
// ---------------------------------------------------------------------------
function looseIncludes(haystack: string[], needle: string): boolean {
  const n = needle.toLowerCase();
  return haystack.some((h) => {
    const hl = h.toLowerCase();
    return hl.includes(n) || n.includes(hl);
  });
}

export function matchOpportunities(profile: DemoProfile): OpportunityMatch[] {
  const grade = profile.demographics.gradeNumber;
  const emphasized = new Set(profile.stage.emphasizedThemes);
  const disallowed = new Set(profile.stage.disallowedThemes);
  const interests = profile.learning.interests;
  const seek = profile.environment.environmentsToSeek;
  const avoid = profile.environment.environmentsToAvoid;
  const goalAreas = new Set(profile.goals.map((g) => g.area));

  const results: OpportunityMatch[] = DEMO_OPPORTUNITIES.map((op) => {
    const fitReasons: string[] = [];
    const gapReasons: string[] = [];
    const safeguardReasons: string[] = [];

    // Hard safeguards → filter_out
    if (op.disallowedIfPresent?.some((t) => disallowed.has(t))) {
      safeguardReasons.push(
        `Age-safeguard: theme "${op.disallowedIfPresent
          .filter((t) => disallowed.has(t))
          .join(", ")
          .replace(/_/g, " ")}" is excluded for ${profile.shortName} (${profile.demographics.gradeLabel}).`,
      );
    }
    if (grade < op.minGrade || grade > op.maxGrade) {
      safeguardReasons.push(
        `Grade band ${op.minGrade === op.maxGrade ? `${op.minGrade}` : `${op.minGrade}–${op.maxGrade}`} does not include ${profile.demographics.gradeLabel}.`,
      );
    }
    if (op.product !== profile.stage.product) {
      safeguardReasons.push(
        `Product track (${op.product}) does not match ${profile.shortName}'s current track (${profile.stage.product}).`,
      );
    }

    if (safeguardReasons.length > 0) {
      return {
        opportunity: op,
        score: 0,
        band: "filtered_out" as const,
        fitReasons,
        gapReasons,
        safeguardReasons,
      };
    }

    let score = 0;

    // Theme overlap with emphasized (weight 25 each, cap 50)
    const themeHits = op.themes.filter((t) => emphasized.has(t));
    if (themeHits.length > 0) {
      score += Math.min(50, themeHits.length * 25);
      fitReasons.push(
        `Emphasized theme match: ${themeHits.map((t) => t.replace(/_/g, " ")).join(", ")}.`,
      );
    } else {
      gapReasons.push("None of this opportunity's themes are currently emphasized in the plan.");
    }

    // Interest overlap (weight 15 each, cap 30)
    const interestHits = op.interests.filter((i) => looseIncludes(interests, i));
    if (interestHits.length > 0) {
      score += Math.min(30, interestHits.length * 15);
      fitReasons.push(`Interest match: ${interestHits.join(", ")}.`);
    }

    // Goal-area overlap (weight 10)
    const goalHits = op.goalAreas.filter((g) => goalAreas.has(g));
    if (goalHits.length > 0) {
      score += 10;
      fitReasons.push(`Supports current ${goalHits.join(" + ")} goal.`);
    }

    // Environment
    const envFitHits = op.environmentFit.filter((e) => looseIncludes(seek, e));
    if (envFitHits.length > 0) {
      score += 10;
      fitReasons.push(`Environment fit: ${envFitHits.join("; ")}.`);
    }
    const envRiskHits = op.environmentRisk.filter((e) => looseIncludes(avoid, e));
    if (envRiskHits.length > 0) {
      score -= 15;
      gapReasons.push(`Environment risk: ${envRiskHits.join("; ")}.`);
    }

    score = Math.max(0, Math.min(100, score));

    const band: OpportunityMatch["band"] =
      score >= 65 ? "strong" : score >= 35 ? "worth_exploring" : "stretch";

    if (band === "stretch" && gapReasons.length === 0) {
      gapReasons.push("Weak overlap with the plan right now — worth revisiting later.");
    }

    return { opportunity: op, score, band, fitReasons, gapReasons, safeguardReasons };
  });

  // Sort: non-filtered by score desc; filtered_out last, alphabetized.
  return results.sort((a, b) => {
    if (a.band === "filtered_out" && b.band !== "filtered_out") return 1;
    if (b.band === "filtered_out" && a.band !== "filtered_out") return -1;
    if (a.band === "filtered_out" && b.band === "filtered_out") {
      return a.opportunity.title.localeCompare(b.opportunity.title);
    }
    return b.score - a.score;
  });
}
