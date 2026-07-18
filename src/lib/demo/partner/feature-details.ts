/**
 * Static demo fixtures for Partner dashboard feature drawers.
 *
 * The same fictional partner organization (Bridgeworks Community Programs)
 * is shown under two listing plans the demo can switch between:
 *   - free    → basic tier, up to 3 opportunities, standard visibility
 *   - premium → featured tier, unlimited opportunities, advanced analytics
 *
 * The partner's identity NEVER changes when switching plans. Only the
 * entitlements, sample postings, visibility, analytics, and team/match
 * capabilities change.
 *
 * CRITICAL PRIVACY RULE: partners MUST NOT see any student PII, IEPs,
 * Student Voice, goals, meetings, documents, or Pathway Reports. All rows
 * here describe partner-scoped surfaces only (opportunities, org profile,
 * partner incentives, playbooks). Premium mode does NOT relax this.
 */

export type PartnerFeatureId =
  | "partner-profile"
  | "active-opportunities"
  | "submitted-programs"
  | "application-windows"
  | "opportunity-management"
  | "incentives"
  | "partner-resources"
  | "partner-network";

export type FeatureBullet = { label: string; value?: string; hint?: string };

export type FeatureRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  status?: "ok" | "warning" | "critical" | "muted";
};

export type PartnerFeatureDetail = {
  id: PartnerFeatureId;
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

export type PartnerPlanKey = "free" | "premium";

/* ─────────── FREE tier ─────────── */

const FREE: Record<PartnerFeatureId, PartnerFeatureDetail> = {
  "partner-profile": {
    id: "partner-profile",
    title: "Partner Profile",
    eyebrow: "Your Organization",
    summary:
      "Bridgeworks Community Programs — organization details, mission, service areas, and primary contact.",
    what: "Complete every section so your organization is discoverable and trusted by families.",
    dataSource: "Your org profile · admin-verified fields",
    primaryAction: { label: "Edit Profile", to: "/partners-manage/profile" },
    connectsTo: ["Active Opportunities", "Partner Resources"],
    stats: [
      { label: "Completion", value: "60%" },
      { label: "Verification", value: "Verified" },
      { label: "Service areas", value: "3" },
    ],
    rows: [
      { primary: "Organization name & mission", secondary: "Complete", status: "ok" },
      { primary: "Service areas & counties", secondary: "3 of 5 · add more to reach families", status: "warning" },
      { primary: "Primary contact & hours", secondary: "Complete", status: "ok" },
      { primary: "Accessibility & languages", secondary: "Not yet · locked behind Premium", status: "warning" },
      { primary: "Featured placement", secondary: "Not available on Free · Premium only", status: "muted" },
    ],
    emptyHeadline: "Your profile isn't set up yet.",
    emptyBody:
      "Complete your organization profile so families and district staff can find and evaluate your programs.",
  },

  "active-opportunities": {
    id: "active-opportunities",
    title: "Active Opportunities",
    eyebrow: "Live For Families",
    summary:
      "Free tier allows up to 3 published opportunities visible to families.",
    what: "Review what's live, edit details, or unpublish anything no longer available. Upgrade for more slots.",
    dataSource: "Approved opportunities · your organization",
    primaryAction: { label: "See Active Opportunities", to: "/partners-manage/opportunities" },
    connectsTo: ["Submitted Programs", "Application Windows"],
    stats: [
      { label: "Published", value: "2 of 3" },
      { label: "Expiring soon", value: "1" },
      { label: "Free tier cap", value: "3" },
    ],
    rows: [
      { primary: "Summer Youth Employment · 2027 cohort", secondary: "Applications open · 42 slots", status: "ok" },
      { primary: "Life Skills Saturday Program", secondary: "Rolling enrollment", status: "ok" },
      { primary: "Career Discovery Workshops (expired)", secondary: "Free tier cap reached · renew or upgrade", meta: "Free cap", status: "warning" },
      { primary: "Featured placement", secondary: "Not available on Free", status: "muted" },
    ],
    emptyHeadline: "No active opportunities yet.",
    emptyBody:
      "Publish your first opportunity so families and educators can find it in the platform.",
  },

  "submitted-programs": {
    id: "submitted-programs",
    title: "Submitted Programs",
    eyebrow: "Pending Review",
    summary:
      "Program submissions awaiting TransitionForward admin approval. Free tier: standard review queue.",
    what: "Track review status and respond to any admin questions or requested edits.",
    dataSource: "Submissions queue · admin review notes",
    primaryAction: { label: "See Submissions", to: "/partners-manage/opportunities" },
    connectsTo: ["Active Opportunities"],
    stats: [
      { label: "Pending", value: "1" },
      { label: "Changes requested", value: "0" },
      { label: "Avg review", value: "5 days" },
    ],
    rows: [
      { primary: "Weekend Peer Mentoring", secondary: "Submitted Sep 4 · in standard queue", status: "muted" },
      { primary: "Priority review", secondary: "Not available on Free · Premium only", status: "muted" },
    ],
    emptyHeadline: "Nothing pending review right now.",
    emptyBody:
      "Submit a new opportunity and it will appear here while our team reviews it.",
  },

  "application-windows": {
    id: "application-windows",
    title: "Application Windows",
    eyebrow: "Open Dates",
    summary:
      "Application links, contact info, and open/close dates for every published opportunity.",
    what: "Keep dates and links current so families don't miss deadlines.",
    dataSource: "Opportunity schedule · applications flow",
    primaryAction: { label: "Open Windows", to: "/partners-manage/deadlines" },
    connectsTo: ["Active Opportunities"],
    stats: [
      { label: "Open now", value: "2" },
      { label: "Closing this month", value: "1" },
      { label: "Automated reminders", value: "Off" },
    ],
    rows: [
      { primary: "Summer Youth Employment", secondary: "Open · closes Feb 1", status: "ok" },
      { primary: "Life Skills Saturday Program", secondary: "Rolling · always open", status: "ok" },
      { primary: "Automated family reminders", secondary: "Locked · Premium only", status: "muted" },
    ],
    emptyHeadline: "No application windows scheduled.",
    emptyBody:
      "Add open/close dates to your opportunities so families can plan applications.",
  },

  "opportunity-management": {
    id: "opportunity-management",
    title: "Opportunity Management",
    eyebrow: "Publish & Edit",
    summary:
      "Publish, unpublish, and update opportunities. Free tier: single-editor workflow.",
    what: "Refresh a program, retire an outdated one, or spin up a new offering fast.",
    dataSource: "Your opportunity catalog",
    primaryAction: { label: "Open Management", to: "/partners-manage/opportunities" },
    connectsTo: ["Active Opportunities", "Submitted Programs"],
    stats: [
      { label: "Total", value: "4" },
      { label: "Published", value: "2" },
      { label: "Draft / archived", value: "2" },
    ],
    rows: [
      { primary: "Draft: Winter Sports Program", secondary: "Not yet submitted", status: "muted" },
      { primary: "Archived: 2025 Summer Internship", secondary: "Ended · duplicate to relaunch", status: "muted" },
      { primary: "Bulk edit", secondary: "Not available on Free · single-item edits only", status: "muted" },
      { primary: "Team seats", secondary: "1 owner · locked · Premium unlocks 5", status: "muted" },
    ],
    emptyHeadline: "Your catalog is empty.",
    emptyBody:
      "Create your first opportunity draft — you can save, edit, and submit for review when ready.",
  },

  incentives: {
    id: "incentives",
    title: "PartnerForward Incentives",
    eyebrow: "Grants & Credits",
    summary:
      "Grants, subsidies, tax credits, and coaching that reward partners supporting transition-age youth.",
    what: "Explore incentives that fit your organization and click through to the official source.",
    dataSource: "Curated by TransitionForward · links to official agencies",
    primaryAction: { label: "Open Incentives", to: "/partnerforward/incentives" },
    connectsTo: ["Partner Resources", "Partner Profile"],
    stats: [
      { label: "Programs listed", value: "18" },
      { label: "Federal", value: "6" },
      { label: "State & local", value: "9" },
    ],
    rows: [
      { primary: "Work Opportunity Tax Credit (WOTC)", secondary: "Federal · IRS", status: "ok" },
      { primary: "Disabled Access Credit", secondary: "Federal · small business", status: "ok" },
      { primary: "State Vocational Rehabilitation partnerships", secondary: "State · check your state agency", status: "ok" },
      { primary: "Inclusive hiring coaching (free)", secondary: "TransitionForward network", status: "ok" },
    ],
    emptyHeadline: "No incentives available in your region right now.",
    emptyBody:
      "Check back — our team regularly adds federal, state, and philanthropic programs relevant to partners.",
  },

  "partner-resources": {
    id: "partner-resources",
    title: "Partner Resources",
    eyebrow: "Playbooks & Templates",
    summary:
      "Basic playbooks and templates for partners serving transition-age youth. Full library on Premium.",
    what: "Download templates, share with your team, and improve your program design.",
    dataSource: "Curated partner library",
    primaryAction: { label: "Open Resources", to: "/partners-manage/resources" },
    connectsTo: ["Partner Profile", "Opportunity Management"],
    stats: [
      { label: "Free guides", value: "12" },
      { label: "Templates", value: "4" },
      { label: "Locked (Premium)", value: "20" },
    ],
    rows: [
      { primary: "Inclusive Hiring Playbook", secondary: "Guide · 24 pages", status: "ok" },
      { primary: "Program Application Template", secondary: "Template · editable", status: "ok" },
      { primary: "Accessibility Audit Checklist", secondary: "Checklist · printable", status: "ok" },
      { primary: "Outcomes Reporting Guide", secondary: "Locked · Premium only", status: "muted" },
    ],
    emptyHeadline: "No resources yet in your region.",
    emptyBody:
      "The partner library is still being seeded. Check back soon or request a specific guide.",
  },

  "partner-network": {
    id: "partner-network",
    title: "Partner Network",
    eyebrow: "De-identified Demand",
    summary:
      "How families and educators are discovering your opportunities. No student PII — aggregate demand signal only.",
    what: "Preview aggregate views and referral starts for your listings, then open the full Partner Network.",
    dataSource: "Aggregate views · anonymous referral starts · listing metadata",
    primaryAction: { label: "Open Partner Network", to: "/partner-network" },
    connectsTo: ["Active Opportunities", "Application Windows", "Partner Profile"],
    stats: [
      { label: "Views (30d)", value: "142" },
      { label: "Referrals started", value: "9" },
      { label: "Active listings", value: "2 of 3" },
    ],
    rows: [
      { primary: "Most-viewed segment · Grade 11", secondary: "Interest in animals and applied tech", meta: "Aggregate", status: "ok" },
      { primary: "Referrals started this month", secondary: "9 anonymous families / educators", meta: "No PII", status: "ok" },
      { primary: "Free-tier listing cap", secondary: "2 of 3 slots used", meta: "Upgrade for more", status: "warning" },
      { primary: "Featured placement", secondary: "Not available on Free", meta: "Premium only", status: "muted" },
    ],
    emptyHeadline: "No demand signal yet.",
    emptyBody:
      "Once your listings are live, aggregate views and referral starts will appear here — never student PII.",
  },
};

/* ─────────── PREMIUM tier ─────────── */

const PREMIUM: Record<PartnerFeatureId, PartnerFeatureDetail> = {
  "partner-profile": {
    id: "partner-profile",
    title: "Partner Profile",
    eyebrow: "Your Organization · Featured",
    summary:
      "Bridgeworks Community Programs — featured listing with expanded storytelling, media, and impact sections.",
    what: "Complete every section, upload media, and publish outcomes to strengthen your featured placement.",
    dataSource: "Your org profile · admin-verified fields · media library · outcomes upload",
    primaryAction: { label: "Edit Profile", to: "/partners-manage/profile" },
    connectsTo: ["Active Opportunities", "Partner Resources"],
    stats: [
      { label: "Completion", value: "92%" },
      { label: "Verification", value: "Featured" },
      { label: "Service areas", value: "8" },
    ],
    rows: [
      { primary: "Organization name & mission", secondary: "Complete", status: "ok" },
      { primary: "Service areas & counties", secondary: "8 of 8 · full coverage listed", status: "ok" },
      { primary: "Primary contact & hours", secondary: "Complete · 24-hr response SLA badge", status: "ok" },
      { primary: "Accessibility & languages", secondary: "Complete · EN, ES, Portuguese", status: "ok" },
      { primary: "Featured hero photo & video", secondary: "Published · shown on directory", status: "ok" },
      { primary: "Outcomes highlights", secondary: "Published · 3 case studies", status: "ok" },
    ],
    emptyHeadline: "Your profile isn't set up yet.",
    emptyBody:
      "Complete your organization profile so families and district staff can find and evaluate your programs.",
  },

  "active-opportunities": {
    id: "active-opportunities",
    title: "Active Opportunities",
    eyebrow: "Live For Families · Unlimited",
    summary:
      "Premium tier: unlimited published opportunities. 8 currently live including featured placements.",
    what: "Review what's live, edit details, promote a featured slot, or unpublish anything no longer available.",
    dataSource: "Approved opportunities · your organization · featured slots",
    primaryAction: { label: "See Active Opportunities", to: "/partners-manage/opportunities" },
    connectsTo: ["Submitted Programs", "Application Windows"],
    stats: [
      { label: "Published", value: "8" },
      { label: "Featured", value: "2" },
      { label: "New this month", value: "1" },
    ],
    rows: [
      { primary: "Summer Youth Employment · 2027 cohort", secondary: "Featured · 214 saves this week", meta: "Featured", status: "ok" },
      { primary: "Life Skills Saturday Program", secondary: "Rolling enrollment · 88 saves", status: "ok" },
      { primary: "Career Discovery Workshops", secondary: "Application window closes Oct 15", meta: "Expiring", status: "warning" },
      { primary: "Community Job Coaching", secondary: "Waitlist · new cohort Jan", status: "ok" },
      { primary: "Independent Travel Training", secondary: "Application window closes Sep 30", meta: "Expiring", status: "warning" },
      { primary: "Culinary Skills Pathway", secondary: "Featured · new placement · 96 saves", meta: "Featured", status: "ok" },
      { primary: "Peer Mentoring Weekends", secondary: "Rolling · 42 saves", status: "ok" },
      { primary: "Community Arts Studio", secondary: "New this month · 31 saves", status: "ok" },
    ],
    emptyHeadline: "No active opportunities yet.",
    emptyBody:
      "Publish your first opportunity so families and educators can find it in the platform.",
  },

  "submitted-programs": {
    id: "submitted-programs",
    title: "Submitted Programs",
    eyebrow: "Priority Review",
    summary:
      "Premium tier: priority admin review queue. 3 pending — average turnaround 24 hours.",
    what: "Track review status and respond to any admin questions or requested edits.",
    dataSource: "Submissions queue · admin review notes · priority routing",
    primaryAction: { label: "See Submissions", to: "/partners-manage/opportunities" },
    connectsTo: ["Active Opportunities"],
    stats: [
      { label: "Pending", value: "3" },
      { label: "Changes requested", value: "1" },
      { label: "Avg review", value: "24 hrs" },
    ],
    rows: [
      { primary: "Spring Internship Pilot", secondary: "Submitted Sep 8 · priority queue", meta: "Priority", status: "muted" },
      { primary: "Weekend Peer Mentoring", secondary: "Submitted Sep 4 · priority queue", meta: "Priority", status: "muted" },
      { primary: "Transportation Voucher Add-on", secondary: "Changes requested · action needed", status: "warning" },
    ],
    emptyHeadline: "Nothing pending review right now.",
    emptyBody:
      "Submit a new opportunity and it will appear here while our team reviews it.",
  },

  "application-windows": {
    id: "application-windows",
    title: "Application Windows",
    eyebrow: "Open Dates · Reminders On",
    summary:
      "Application links, contact info, and open/close dates for every published opportunity. Automated family reminders enabled.",
    what: "Keep dates and links current. Automated reminders go out to interested families 7 and 2 days before close.",
    dataSource: "Opportunity schedule · applications flow · reminder engine",
    primaryAction: { label: "Open Windows", to: "/partners-manage/deadlines" },
    connectsTo: ["Active Opportunities"],
    stats: [
      { label: "Open now", value: "5" },
      { label: "Closing this month", value: "2" },
      { label: "Auto reminders sent", value: "148" },
    ],
    rows: [
      { primary: "Summer Youth Employment", secondary: "Open · closes Feb 1 · 62 saved reminders", status: "ok" },
      { primary: "Career Discovery Workshops", secondary: "Closes Oct 15 · 34 reminders queued", meta: "Closing", status: "warning" },
      { primary: "Independent Travel Training", secondary: "Closes Sep 30 · reminders sent yesterday", meta: "Closing", status: "warning" },
      { primary: "Spring Internship Pilot", secondary: "Opens Nov 1 (pending approval)", status: "muted" },
      { primary: "Automated reminder engine", secondary: "148 nudges sent this month · 46 opens", status: "ok" },
    ],
    emptyHeadline: "No application windows scheduled.",
    emptyBody:
      "Add open/close dates to your opportunities so families can plan applications.",
  },

  "opportunity-management": {
    id: "opportunity-management",
    title: "Opportunity Management",
    eyebrow: "Publish, Edit & Analyze",
    summary:
      "Publish, unpublish, update, and analyze opportunities. Premium tier: bulk edit, 5 team seats, and engagement analytics.",
    what: "Refresh a program, retire an outdated one, spin up a new offering, or hand off to a teammate.",
    dataSource: "Your opportunity catalog · team seats · engagement events",
    primaryAction: { label: "Open Management", to: "/partners-manage/opportunities" },
    connectsTo: ["Active Opportunities", "Submitted Programs"],
    stats: [
      { label: "Total", value: "18" },
      { label: "Published", value: "8" },
      { label: "Team seats", value: "5" },
    ],
    rows: [
      { primary: "Draft: Winter Sports Program", secondary: "Not yet submitted · assigned to A. Ramos", status: "muted" },
      { primary: "Draft: Financial Literacy Series", secondary: "Ready to submit · assigned to J. Blake", status: "muted" },
      { primary: "Archived: 2025 Summer Internship", secondary: "Ended · duplicate to relaunch", status: "muted" },
      { primary: "Bulk edit: partner contact update", secondary: "Applies to 8 opportunities", status: "warning" },
      { primary: "Engagement analytics", secondary: "782 saves · 214 clicks · 46 applications this month", status: "ok" },
      { primary: "Match insight: Culinary Pathway", secondary: "Recommended to 34 students by matcher (explained)", status: "ok" },
    ],
    emptyHeadline: "Your catalog is empty.",
    emptyBody:
      "Create your first opportunity draft — you can save, edit, and submit for review when ready.",
  },

  incentives: {
    id: "incentives",
    title: "PartnerForward Incentives",
    eyebrow: "Grants & Credits",
    summary:
      "Grants, subsidies, tax credits, and coaching that reward partners supporting transition-age youth.",
    what: "Explore incentives that fit your organization and click through to the official source.",
    dataSource: "Curated by TransitionForward · links to official agencies",
    primaryAction: { label: "Open Incentives", to: "/partnerforward/incentives" },
    connectsTo: ["Partner Resources", "Partner Profile"],
    stats: [
      { label: "Programs listed", value: "18" },
      { label: "Federal", value: "6" },
      { label: "State & local", value: "9" },
    ],
    rows: [
      { primary: "Work Opportunity Tax Credit (WOTC)", secondary: "Federal · IRS", status: "ok" },
      { primary: "Disabled Access Credit", secondary: "Federal · small business", status: "ok" },
      { primary: "State Vocational Rehabilitation partnerships", secondary: "State · check your state agency", status: "ok" },
      { primary: "Inclusive hiring coaching (free)", secondary: "TransitionForward network", status: "ok" },
      { primary: "Accessibility grant · philanthropic", secondary: "Application window open", status: "warning" },
    ],
    emptyHeadline: "No incentives available in your region right now.",
    emptyBody:
      "Check back — our team regularly adds federal, state, and philanthropic programs relevant to partners.",
  },

  "partner-resources": {
    id: "partner-resources",
    title: "Partner Resources",
    eyebrow: "Full Library · Playbooks & Templates",
    summary:
      "Full playbook and template library plus premium-only outcomes reporting guides for partners.",
    what: "Download templates, share with your team, and improve your program design.",
    dataSource: "Curated partner library",
    primaryAction: { label: "Open Resources", to: "/partners-manage/resources" },
    connectsTo: ["Partner Profile", "Opportunity Management"],
    stats: [
      { label: "Guides", value: "32" },
      { label: "Templates", value: "12" },
      { label: "New this month", value: "3" },
    ],
    rows: [
      { primary: "Inclusive Hiring Playbook", secondary: "Guide · 24 pages", status: "ok" },
      { primary: "Program Application Template", secondary: "Template · editable", status: "ok" },
      { primary: "Accessibility Audit Checklist", secondary: "Checklist · printable", status: "ok" },
      { primary: "Family-Friendly Program Description", secondary: "Writing template", status: "ok" },
      { primary: "Outcomes Reporting Guide", secondary: "Premium · Sep 2026", meta: "Premium", status: "ok" },
      { primary: "Explainable Match Insights Playbook", secondary: "Premium · shows why the matcher recommends you", meta: "Premium", status: "ok" },
    ],
    emptyHeadline: "No resources yet in your region.",
    emptyBody:
      "The partner library is still being seeded. Check back soon or request a specific guide.",
  },

  "partner-network": {
    id: "partner-network",
    title: "Partner Network",
    eyebrow: "De-identified Demand",
    summary:
      "Advanced demand signal for your featured listings — aggregate views, segments, and referral starts. Never student PII.",
    what: "Preview featured-tier analytics for your listings, then open the full Partner Network.",
    dataSource: "Aggregate views · anonymous referral starts · segment analytics",
    primaryAction: { label: "Open Partner Network", to: "/partner-network" },
    connectsTo: ["Active Opportunities", "Application Windows", "Partner Profile"],
    stats: [
      { label: "Views (30d)", value: "1,284" },
      { label: "Referrals started", value: "62" },
      { label: "Featured listings", value: "2" },
    ],
    rows: [
      { primary: "Featured segment · Grades 10–12", secondary: "Applied-tech + animals interests", meta: "Trending", status: "ok" },
      { primary: "Referrals started this month", secondary: "62 anonymous families / educators", meta: "No PII", status: "ok" },
      { primary: "Segment breakdown", secondary: "Family 41% · Educator 38% · Student 21%", meta: "Aggregate", status: "ok" },
      { primary: "Search-rank position", secondary: "Featured placement · top of category", meta: "Premium", status: "ok" },
    ],
    emptyHeadline: "No demand signal yet.",
    emptyBody:
      "Once your featured listings are live, aggregate views and referral starts will appear here — never student PII.",
  },
};

/* ─────────── Exports ─────────── */

export const PARTNER_FEATURE_DETAILS_BY_PLAN: Record<
  PartnerPlanKey,
  Record<PartnerFeatureId, PartnerFeatureDetail>
> = {
  free: FREE,
  premium: PREMIUM,
};

/** Back-compat: default = premium (matches original 8-live catalog). */
export const PARTNER_FEATURE_DETAILS: Record<PartnerFeatureId, PartnerFeatureDetail> = PREMIUM;

export function getPartnerFeatureDetails(
  planId: PartnerPlanKey,
): Record<PartnerFeatureId, PartnerFeatureDetail> {
  return PARTNER_FEATURE_DETAILS_BY_PLAN[planId] ?? FREE;
}

export const PARTNER_FEATURE_ORDER: PartnerFeatureId[] = [
  "partner-profile",
  "active-opportunities",
  "submitted-programs",
  "application-windows",
  "opportunity-management",
  "incentives",
  "partner-resources",
];

/* ─────────── Tile metadata per plan ─────────── */

export type PartnerTileMeta = {
  status: string;
  tone: "default" | "success" | "warning" | "critical" | "muted";
  bullets: { label: string; value: string }[];
};

export const PARTNER_TILE_META_BY_PLAN: Record<
  PartnerPlanKey,
  Record<PartnerFeatureId, PartnerTileMeta>
> = {
  free: {
    "partner-profile": {
      status: "60% complete",
      tone: "warning",
      bullets: [
        { label: "Verified", value: "Yes" },
        { label: "Service areas", value: "3" },
      ],
    },
    "active-opportunities": {
      status: "2 of 3 live",
      tone: "warning",
      bullets: [
        { label: "Free cap", value: "3" },
        { label: "Featured", value: "0" },
      ],
    },
    "submitted-programs": {
      status: "1 pending",
      tone: "muted",
      bullets: [
        { label: "Avg review", value: "5 days" },
        { label: "Priority", value: "Off" },
      ],
    },
    "application-windows": {
      status: "2 open",
      tone: "default",
      bullets: [
        { label: "Closing", value: "1" },
        { label: "Reminders", value: "Off" },
      ],
    },
    "opportunity-management": {
      status: "4 total",
      tone: "muted",
      bullets: [
        { label: "Team seats", value: "1" },
        { label: "Bulk edit", value: "Off" },
      ],
    },
    incentives: {
      status: "18 listed",
      tone: "success",
      bullets: [
        { label: "Federal", value: "6" },
        { label: "State & local", value: "9" },
      ],
    },
    "partner-resources": {
      status: "12 free",
      tone: "muted",
      bullets: [
        { label: "Templates", value: "4" },
        { label: "Locked", value: "20" },
      ],
    },
  },
  premium: {
    "partner-profile": {
      status: "92% · Featured",
      tone: "success",
      bullets: [
        { label: "Verified", value: "Featured" },
        { label: "Service areas", value: "8" },
      ],
    },
    "active-opportunities": {
      status: "8 live",
      tone: "success",
      bullets: [
        { label: "Featured", value: "2" },
        { label: "New this month", value: "1" },
      ],
    },
    "submitted-programs": {
      status: "3 pending",
      tone: "warning",
      bullets: [
        { label: "Changes requested", value: "1" },
        { label: "Avg review", value: "24 hrs" },
      ],
    },
    "application-windows": {
      status: "5 open",
      tone: "default",
      bullets: [
        { label: "Auto reminders", value: "148" },
        { label: "Closing", value: "2" },
      ],
    },
    "opportunity-management": {
      status: "18 total",
      tone: "default",
      bullets: [
        { label: "Team seats", value: "5" },
        { label: "Bulk edit", value: "On" },
      ],
    },
    incentives: {
      status: "18 listed",
      tone: "success",
      bullets: [
        { label: "Federal", value: "6" },
        { label: "State & local", value: "9" },
      ],
    },
    "partner-resources": {
      status: "32 guides",
      tone: "success",
      bullets: [
        { label: "Templates", value: "12" },
        { label: "New this month", value: "3" },
      ],
    },
  },
};
