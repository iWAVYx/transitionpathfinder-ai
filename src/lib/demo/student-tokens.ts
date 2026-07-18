/**
 * Per-profile tokens derived from the currently-selected demo student.
 *
 * The student, family, and educator feature-detail templates are written
 * with `{token}` placeholders (e.g. `{studentShortName}`, `{gradeLabel}`,
 * `{school}`, `{primaryInterest}`) so that switching the selected demo
 * profile updates identity, grade, school, and interest content everywhere
 * — dashboard tiles, drawers, and dedicated feature pages — without any
 * hand-authored per-profile prose. Grade-aware phrasing (postsecondary vs.
 * high-school choice vs. career exploration) is also derived here.
 *
 * Nothing here is real data. Every profile is fictional.
 */

import type { DemoProfile } from "@/lib/demo/demo-profiles";

export type StudentTokens = {
  studentShortName: string;
  studentDisplayName: string;
  pronoun: string;
  possessive: string;
  gradeLabel: string;
  gradeNumber: number;
  gradeShort: string; // "G7" / "G9" / "G11"
  school: string;
  region: string;
  primaryInterest: string;
  secondaryInterest: string;
  interestList: string;
  caseManager: string;
  familyLead: string;
  planningHorizon: string; // grade-aware phrasing
  postSecondaryLabel: string; // grade-aware
  nextMeetingLabel: string;
  nextMeetingDate: string;
  partnerMatchCount: string;
  primaryPartnerRow: string;
  primaryPartnerNote: string;
  reportVersion: string;
};

function safeInterest(profile: DemoProfile, idx: number, fallback: string): string {
  return profile.learning.interests[idx] ?? fallback;
}

/**
 * Grade-aware phrasing so a Grade 7 student never sees "adult services"
 * and a Grade 11 student never sees "high-school choice."
 */
function planningHorizonFor(profile: DemoProfile): string {
  if (profile.demographics.gradeNumber >= 11) {
    return "postsecondary planning";
  }
  if (profile.demographics.gradeNumber >= 9) {
    return "early high-school planning";
  }
  return "high-school exploration";
}

function postSecondaryLabelFor(profile: DemoProfile): string {
  if (profile.demographics.gradeNumber >= 11) return "Postsecondary options";
  if (profile.demographics.gradeNumber >= 9) return "CTE & tech pathways";
  return "High-school choice";
}

function nextMeetingLabelFor(profile: DemoProfile): string {
  if (profile.demographics.gradeNumber >= 11) return "PPT — annual review";
  if (profile.demographics.gradeNumber >= 9) return "Transition planning start";
  return "IEP check-in";
}

function nextMeetingDateFor(profile: DemoProfile): string {
  // Deterministic per-profile date so previews and full pages line up.
  switch (profile.id) {
    case "jordan": return "Sep 15";
    case "riley": return "Oct 3";
    case "sam": return "Nov 12";
  }
}

function caseManagerFor(profile: DemoProfile): string {
  switch (profile.id) {
    case "jordan": return "Ms. Patel";
    case "riley": return "Mr. Ortiz";
    case "sam": return "Mrs. Delgado";
  }
}

function familyLeadFor(profile: DemoProfile): string {
  switch (profile.id) {
    case "jordan": return "Jordan's mom";
    case "riley": return "Riley's dad";
    case "sam": return "Sam's mom";
  }
}

function partnerMatchCountFor(profile: DemoProfile): string {
  switch (profile.id) {
    case "jordan": return "5";
    case "riley": return "3";
    case "sam": return "4";
  }
}

function primaryPartnerRowFor(profile: DemoProfile): string {
  switch (profile.id) {
    case "jordan":
      return "Oakwood Animal Rescue · after-school internship";
    case "riley":
      return "CT Tech HS Applied CS · informational tour";
    case "sam":
      return "Elm City Youth Arts · after-school studio";
  }
}

function primaryPartnerNoteFor(profile: DemoProfile): string {
  switch (profile.id) {
    case "jordan":
      return "Matches Jordan's animal-care interest · Grades 10–12";
    case "riley":
      return "Matches Riley's computer-science interest · Grade 9 exposure";
    case "sam":
      return "Matches Sam's art & design interest · Grades 6–8";
  }
}

function reportVersionFor(profile: DemoProfile): string {
  switch (profile.id) {
    case "jordan": return "v4 · draft";
    case "riley": return "v1 · baseline";
    case "sam": return "v1 · exploration";
  }
}

export function tokensForProfile(profile: DemoProfile): StudentTokens {
  const pronouns = profile.demographics.pronouns.split("/");
  const pronoun = pronouns[0] ?? "they";
  const possessive = pronouns[1] ?? "their";
  const primary = safeInterest(profile, 0, "their interests");
  const secondary = safeInterest(profile, 1, "their goals");
  return {
    studentShortName: profile.shortName,
    studentDisplayName: profile.displayName,
    pronoun,
    possessive,
    gradeLabel: profile.demographics.gradeLabel,
    gradeNumber: profile.demographics.gradeNumber,
    gradeShort: `G${profile.demographics.gradeNumber}`,
    school: profile.demographics.schoolPlaceholder,
    region: profile.demographics.townRegion,
    primaryInterest: primary,
    secondaryInterest: secondary,
    interestList: profile.learning.interests.slice(0, 3).join(" · "),
    caseManager: caseManagerFor(profile),
    familyLead: familyLeadFor(profile),
    planningHorizon: planningHorizonFor(profile),
    postSecondaryLabel: postSecondaryLabelFor(profile),
    nextMeetingLabel: nextMeetingLabelFor(profile),
    nextMeetingDate: nextMeetingDateFor(profile),
    partnerMatchCount: partnerMatchCountFor(profile),
    primaryPartnerRow: primaryPartnerRowFor(profile),
    primaryPartnerNote: primaryPartnerNoteFor(profile),
    reportVersion: reportVersionFor(profile),
  };
}

/**
 * Substitute `{token}` placeholders in a string. Unknown tokens are left
 * intact so template drift is visible instead of silent.
 */
export function substituteTokens(input: string, tokens: StudentTokens): string {
  return input.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = (tokens as Record<string, unknown>)[key];
    return typeof value === "string" || typeof value === "number"
      ? String(value)
      : match;
  });
}

/**
 * Deep-substitute tokens in every string field of a plain-object detail.
 * Preserves shape; arrays and nested objects are recursed. Non-string
 * primitives pass through unchanged.
 */
export function applyTokensDeep<T>(value: T, tokens: StudentTokens): T {
  if (typeof value === "string") {
    return substituteTokens(value, tokens) as unknown as T;
  }
  if (Array.isArray(value)) {
    return value.map((v) => applyTokensDeep(v, tokens)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = applyTokensDeep(v, tokens);
    }
    return out as unknown as T;
  }
  return value;
}
