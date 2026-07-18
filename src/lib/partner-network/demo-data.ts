/**
 * Fictional Partner Network catalog used by the signed-in Partner Network
 * feature. All organizations, contacts, and outcomes here are illustrative
 * and clearly labeled `fictional: true`. Do NOT surface real partner PII
 * or student identifiers through this module.
 */

export type PartnerOpportunityKind =
  | "paid_work"
  | "internship"
  | "volunteer"
  | "day_program"
  | "college_pathway"
  | "life_skills"
  | "family_support";

export type PartnerOpportunity = {
  id: string;
  fictional: true;
  orgId: string;
  orgName: string;
  title: string;
  kind: PartnerOpportunityKind;
  summary: string;
  location: string;
  /** Minimum + maximum ages served. */
  minAge: number;
  maxAge: number;
  /** Themes the pathway engine can align against. */
  themes: string[];
  /** Interests the opportunity aligns to (used for explanations). */
  interests: string[];
  /** Support features the opportunity provides. */
  supports: string[];
  seatsOpen: number;
  applicationWindow: string;
  verified: boolean;
};

export type PartnerOrganization = {
  id: string;
  name: string;
  kind: "workforce" | "college" | "day_program" | "nonprofit" | "community";
  town: string;
  verified: boolean;
  fictional: true;
};

export const DEMO_PARTNER_ORGS: PartnerOrganization[] = [
  { id: "org-oakwood", name: "Oakwood Animal Rescue", kind: "nonprofit", town: "Hartford, CT", verified: true, fictional: true },
  { id: "org-ctc", name: "Capital Community College — Access Program", kind: "college", town: "Hartford, CT", verified: true, fictional: true },
  { id: "org-buildup", name: "BuildUp Construction Careers", kind: "workforce", town: "New Britain, CT", verified: true, fictional: true },
  { id: "org-harmony", name: "Harmony Day Services", kind: "day_program", town: "Manchester, CT", verified: true, fictional: true },
  { id: "org-culinary", name: "Northside Culinary Collective", kind: "workforce", town: "Hartford, CT", verified: false, fictional: true },
  { id: "org-riverbend-y", name: "Riverbend Community YMCA", kind: "community", town: "Farmington, CT", verified: true, fictional: true },
  { id: "org-tech4all", name: "Tech4All Coding Studio", kind: "workforce", town: "West Hartford, CT", verified: true, fictional: true },
  { id: "org-familyanchor", name: "Family Anchor Advocacy", kind: "nonprofit", town: "Statewide, CT", verified: true, fictional: true },
];

export const DEMO_PARTNER_OPPORTUNITIES: PartnerOpportunity[] = [
  {
    id: "opp-oakwood-1",
    fictional: true,
    orgId: "org-oakwood",
    orgName: "Oakwood Animal Rescue",
    title: "Summer Kennel Assistant (Supported)",
    kind: "paid_work",
    summary: "Paid Saturday shift caring for shelter dogs with a job coach on site.",
    location: "Hartford, CT",
    minAge: 16,
    maxAge: 22,
    themes: ["paid_work_experience", "postsecondary_options"],
    interests: ["animals", "hands-on", "dogs", "working with animals"],
    supports: ["job_coach", "written_checklists", "quiet_area"],
    seatsOpen: 3,
    applicationWindow: "Rolling — reviewed weekly",
    verified: true,
  },
  {
    id: "opp-ctc-access",
    fictional: true,
    orgId: "org-ctc",
    orgName: "Capital Community College — Access Program",
    title: "Access Program Campus Visit + Interview",
    kind: "college_pathway",
    summary: "Half-day campus tour, peer mentor lunch, and structured interview for the Access pathway.",
    location: "Hartford, CT",
    minAge: 17,
    maxAge: 22,
    themes: ["postsecondary_options", "agency_connections"],
    interests: ["college", "animal care", "applied tech"],
    supports: ["peer_mentor", "small_group", "written_agenda"],
    seatsOpen: 12,
    applicationWindow: "Applications open Sep 1 – Nov 15",
    verified: true,
  },
  {
    id: "opp-buildup-taste",
    fictional: true,
    orgId: "org-buildup",
    orgName: "BuildUp Construction Careers",
    title: "Trades Taste Test — 2-Day Workshop",
    kind: "internship",
    summary: "Try carpentry, electrical, and painting with a coach. Bus stipend included.",
    location: "New Britain, CT",
    minAge: 15,
    maxAge: 19,
    themes: ["paid_work_experience", "career_awareness"],
    interests: ["hands-on", "building", "construction"],
    supports: ["job_coach", "hands_on_practice"],
    seatsOpen: 4,
    applicationWindow: "Next cohort starts Oct 14",
    verified: true,
  },
  {
    id: "opp-harmony-drop",
    fictional: true,
    orgId: "org-harmony",
    orgName: "Harmony Day Services",
    title: "Post-22 Day Program Open House",
    kind: "day_program",
    summary: "Tour of adult day services with a focus on community access and arts.",
    location: "Manchester, CT",
    minAge: 18,
    maxAge: 26,
    themes: ["agency_connections", "adult_services_bridge"],
    interests: ["community", "arts"],
    supports: ["staff_ratio_1_to_3", "sensory_break_room"],
    seatsOpen: 20,
    applicationWindow: "Open house Nov 4, 10am",
    verified: true,
  },
  {
    id: "opp-culinary-eve",
    fictional: true,
    orgId: "org-culinary",
    orgName: "Northside Culinary Collective",
    title: "Teen Culinary Basics — Evening Cohort",
    kind: "internship",
    summary: "8-week culinary basics with a stipend for the final showcase.",
    location: "Hartford, CT",
    minAge: 14,
    maxAge: 18,
    themes: ["career_awareness", "life_skills"],
    interests: ["cooking", "food", "hands-on"],
    supports: ["small_cohort", "visual_recipes"],
    seatsOpen: 2,
    applicationWindow: "Applications close Sep 30",
    verified: false,
  },
  {
    id: "opp-riverbend-y",
    fictional: true,
    orgId: "org-riverbend-y",
    orgName: "Riverbend Community YMCA",
    title: "Middle School Explorers Club",
    kind: "volunteer",
    summary: "After-school club rotating through STEM, art, and sports — inclusive by design.",
    location: "Farmington, CT",
    minAge: 11,
    maxAge: 14,
    themes: ["middle_school_enrichment", "self_advocacy_early"],
    interests: ["sports", "art", "science", "community"],
    supports: ["peer_mentor", "predictable_schedule"],
    seatsOpen: 6,
    applicationWindow: "Rolling",
    verified: true,
  },
  {
    id: "opp-tech4all",
    fictional: true,
    orgId: "org-tech4all",
    orgName: "Tech4All Coding Studio",
    title: "Game Design Sprint — Fall Series",
    kind: "internship",
    summary: "Six Saturdays building a small game. Portfolio piece and reference letter on completion.",
    location: "West Hartford, CT",
    minAge: 13,
    maxAge: 19,
    themes: ["career_awareness", "postsecondary_options"],
    interests: ["video game design", "coding", "music production"],
    supports: ["written_curriculum", "coach_1_to_4"],
    seatsOpen: 5,
    applicationWindow: "Starts Oct 5",
    verified: true,
  },
  {
    id: "opp-familyanchor",
    fictional: true,
    orgId: "org-familyanchor",
    orgName: "Family Anchor Advocacy",
    title: "Rights Transfer Family Workshop (Ages 17-18)",
    kind: "family_support",
    summary: "Two-evening workshop for families preparing for the age-of-majority transition.",
    location: "Virtual + Hartford, CT",
    minAge: 16,
    maxAge: 22,
    themes: ["rights_transfer", "self_advocacy_at_ppt"],
    interests: ["advocacy", "family_support"],
    supports: ["interpreter_english_spanish", "recorded_replay"],
    seatsOpen: 30,
    applicationWindow: "Next session Nov 12 & 14",
    verified: true,
  },
];
