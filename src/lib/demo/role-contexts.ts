/**
 * Role-aware demo context model.
 *
 * Each admin/partner role has its own fictional context set that swaps the
 * data inside the existing role dashboard tiles — no layout changes.
 *
 * - School Admin: two schools (comprehensive + specialized)
 * - District Admin: two districts (large regional network + smaller local)
 * - Partner: one organization shown under Free vs Premium listing plans
 *
 * The Student / Family / Educator roles keep the existing DemoProfile
 * system (three students) and never see these selectors.
 */

import type { DashboardTile } from "@/lib/demo/role-previews";

/* ─────────────── SCHOOLS ─────────────── */

export type SchoolProfileId = "comprehensive" | "specialized";

export type SchoolProfile = {
  id: SchoolProfileId;
  shortName: string;
  displayName: string;
  archetype: "Comprehensive" | "Specialized";
  emoji: string;
  tagline: string;
  enrollment: number;
  iepCaseload: number;
  gradeBands: string;
  caseManagers: number;
  educators: number;
  reportsComplete: number;
  reportsInProgress: number;
  completionPct: number;
  quarterDelta: string;
  upcomingDeadlines: string;
  topSupportGap: string;
  supportGapGrade: string;
  onboardingNeeded: number;
  activityHeadline: string;
};

export const SCHOOL_PROFILE_ORDER: SchoolProfileId[] = [
  "comprehensive",
  "specialized",
];

export const SCHOOL_PROFILES: Record<SchoolProfileId, SchoolProfile> = {
  comprehensive: {
    id: "comprehensive",
    shortName: "Riverbend HS",
    displayName: "Riverbend Comprehensive High School",
    archetype: "Comprehensive",
    emoji: "🏫",
    tagline: "Large general-education high school",
    enrollment: 1420,
    iepCaseload: 168,
    gradeBands: "Grades 9–12+",
    caseManagers: 9,
    educators: 22,
    reportsComplete: 97,
    reportsInProgress: 31,
    completionPct: 68,
    quarterDelta: "+9% vs. last quarter",
    upcomingDeadlines: "12 PPTs · 4 wks",
    topSupportGap: "Travel training",
    supportGapGrade: "Top gap · Grade 11",
    onboardingNeeded: 3,
    activityHeadline: "Caseload balance · 22 educators active",
  },
  specialized: {
    id: "specialized",
    shortName: "Northgate Center",
    displayName: "Northgate Specialized Learning Center",
    archetype: "Specialized",
    emoji: "🎓",
    tagline: "Specialized program · full IEP caseload",
    enrollment: 94,
    iepCaseload: 94,
    gradeBands: "Ages 14–22",
    caseManagers: 12,
    educators: 18,
    reportsComplete: 71,
    reportsInProgress: 18,
    completionPct: 82,
    quarterDelta: "+5% vs. last quarter",
    upcomingDeadlines: "6 CBI trips · 3 wks",
    topSupportGap: "Agency coordination",
    supportGapGrade: "Transition · ages 18–22",
    onboardingNeeded: 1,
    activityHeadline: "Multidisciplinary teams · community-based instruction",
  },
};

export function schoolTilesFor(school: SchoolProfile): DashboardTile[] {
  return [
    {
      label: "Students in planning",
      value: String(school.iepCaseload),
      hint: school.gradeBands,
    },
    {
      label: "Pathway Reports complete",
      value: `${school.completionPct}%`,
      hint: school.quarterDelta,
    },
    {
      label: "Team activity",
      value: `${school.educators} educators`,
      hint: `${school.onboardingNeeded} need onboarding`,
    },
    {
      label: "Support gaps",
      value: school.topSupportGap,
      hint: school.supportGapGrade,
    },
  ];
}

/* ─────────────── DISTRICTS ─────────────── */

export type DistrictProfileId = "regional-network" | "local-district";

export type DistrictProfile = {
  id: DistrictProfileId;
  shortName: string;
  displayName: string;
  archetype: "Regional Network" | "Local District";
  emoji: string;
  tagline: string;
  schools: number;
  schoolsConnected: number;
  enrollment: number;
  iepPopulation: number;
  coordinators: number;
  reportsComplete: number;
  readinessBand: string;
  readinessTrend: string;
  serviceGap: string;
  partnerCoverage: string;
  activityHeadline: string;
};

export const DISTRICT_PROFILE_ORDER: DistrictProfileId[] = [
  "regional-network",
  "local-district",
];

export const DISTRICT_PROFILES: Record<DistrictProfileId, DistrictProfile> = {
  "regional-network": {
    id: "regional-network",
    shortName: "Coastal Regional",
    displayName: "Coastal Regional Educational Network",
    archetype: "Regional Network",
    emoji: "🌐",
    tagline: "Multi-district regional service network",
    schools: 24,
    schoolsConnected: 22,
    enrollment: 12480,
    iepPopulation: 1836,
    coordinators: 14,
    reportsComplete: 1204,
    readinessBand: "Developing",
    readinessTrend: "+6% this term",
    serviceGap: "Travel · employment",
    partnerCoverage: "38 partners · 6 counties",
    activityHeadline: "Cross-school implementation variance",
  },
  "local-district": {
    id: "local-district",
    shortName: "Millbrook Public",
    displayName: "Millbrook Public Schools",
    archetype: "Local District",
    emoji: "🏛️",
    tagline: "Local district · 8 schools",
    schools: 8,
    schoolsConnected: 8,
    enrollment: 3120,
    iepPopulation: 412,
    coordinators: 3,
    reportsComplete: 268,
    readinessBand: "Progressing",
    readinessTrend: "+4% this term",
    serviceGap: "Specialist capacity",
    partnerCoverage: "9 local partners",
    activityHeadline: "Direct school knowledge · shared specialists",
  },
};

export function districtTilesFor(d: DistrictProfile): DashboardTile[] {
  return [
    {
      label: "Schools connected",
      value: `${d.schoolsConnected} of ${d.schools}`,
      hint: d.schools === d.schoolsConnected ? "All onboarded" : `${d.schools - d.schoolsConnected} pending`,
    },
    {
      label: "District readiness",
      value: d.readinessBand,
      hint: d.readinessTrend,
    },
    {
      label: "Reports complete",
      value: String(d.reportsComplete),
      hint: `${d.iepPopulation.toLocaleString()} IEP students`,
    },
    {
      label: "Service gaps",
      value: d.serviceGap,
      hint: d.partnerCoverage,
    },
  ];
}

/* ─────────────── PARTNER PLANS ─────────────── */

export type PartnerPlanId = "free" | "premium";

export type PartnerPlan = {
  id: PartnerPlanId;
  label: string;
  emoji: string;
  tagline: string;
  profileStatus: string;
  activeOpportunities: string;
  activeOpportunitiesHint: string;
  visibility: string;
  visibilityHint: string;
  analytics: string;
  analyticsHint: string;
};

export const PARTNER_PLAN_ORDER: PartnerPlanId[] = ["free", "premium"];

export const PARTNER_PLANS: Record<PartnerPlanId, PartnerPlan> = {
  free: {
    id: "free",
    label: "Free Listing",
    emoji: "🆓",
    tagline: "Entry-level partner listing",
    profileStatus: "Verified",
    activeOpportunities: "2 live",
    activeOpportunitiesHint: "Free tier · up to 3",
    visibility: "Standard",
    visibilityHint: "Directory listing",
    analytics: "Basic",
    analyticsHint: "Listing views only",
  },
  premium: {
    id: "premium",
    label: "Premium Listing",
    emoji: "⭐",
    tagline: "Full partner toolkit unlocked",
    profileStatus: "Verified · Featured",
    activeOpportunities: "8 live",
    activeOpportunitiesHint: "Premium · unlimited",
    visibility: "Featured",
    visibilityHint: "Sponsored placement",
    analytics: "Advanced",
    analyticsHint: "Match insights · engagement",
  },
};

export function partnerTilesFor(plan: PartnerPlan): DashboardTile[] {
  return [
    {
      label: "Profile status",
      value: plan.profileStatus,
      hint: "Public directory listing",
    },
    {
      label: "Active opportunities",
      value: plan.activeOpportunities,
      hint: plan.activeOpportunitiesHint,
    },
    {
      label: "Directory visibility",
      value: plan.visibility,
      hint: plan.visibilityHint,
    },
    {
      label: "Engagement analytics",
      value: plan.analytics,
      hint: plan.analyticsHint,
    },
  ];
}
