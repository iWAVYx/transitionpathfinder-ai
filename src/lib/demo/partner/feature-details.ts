/**
 * Static demo fixtures for Partner dashboard feature drawers. CRITICAL
 * PRIVACY RULE: partners MUST NOT see any student PII, IEPs, Student
 * Voice, goals, meetings, documents, or Pathway Reports. All rows here
 * describe partner-scoped surfaces only (opportunities, org profile,
 * partner incentives, playbooks).
 */

export type PartnerFeatureId =
  | "partner-profile"
  | "active-opportunities"
  | "submitted-programs"
  | "application-windows"
  | "opportunity-management"
  | "incentives"
  | "partner-resources";

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

export const PARTNER_FEATURE_DETAILS: Record<PartnerFeatureId, PartnerFeatureDetail> = {
  "partner-profile": {
    id: "partner-profile",
    title: "Partner Profile",
    eyebrow: "Your Organization",
    summary:
      "Organization details, mission, service areas, and primary contact — how families find and understand you.",
    what: "Complete every section so your organization is discoverable and trusted by families.",
    dataSource: "Your org profile · admin-verified fields",
    primaryAction: { label: "Edit Profile", to: "/partners-manage/profile" },
    connectsTo: ["Active Opportunities", "Partner Resources"],
    stats: [
      { label: "Completion", value: "60%" },
      { label: "Verified", value: "Pending" },
      { label: "Service areas", value: "3" },
    ],
    rows: [
      { primary: "Organization name & mission", secondary: "Complete", status: "ok" },
      { primary: "Service areas & counties", secondary: "3 of 5 needed", status: "warning" },
      { primary: "Primary contact & hours", secondary: "Complete", status: "ok" },
      { primary: "Accessibility & languages", secondary: "Not yet", status: "warning" },
      { primary: "Verification documents", secondary: "Pending admin review", status: "warning" },
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
      "Programs, jobs, and services currently visible to families across the platform.",
    what: "Review what's live, edit details, or unpublish anything no longer available.",
    dataSource: "Approved opportunities · your organization",
    primaryAction: { label: "See Active Opportunities", to: "/partners-manage/opportunities" },
    connectsTo: ["Submitted Programs", "Application Windows"],
    stats: [
      { label: "Published", value: "8" },
      { label: "Expiring soon", value: "2" },
      { label: "New this month", value: "1" },
    ],
    rows: [
      { primary: "Summer Youth Employment · 2027 cohort", secondary: "Applications open · 42 slots", status: "ok" },
      { primary: "Life Skills Saturday Program", secondary: "Rolling enrollment", status: "ok" },
      { primary: "Career Discovery Workshops", secondary: "Application window closes Oct 15", meta: "Expiring", status: "warning" },
      { primary: "Community Job Coaching", secondary: "Waitlist · new cohort Jan", status: "ok" },
      { primary: "Independent Travel Training", secondary: "Application window closes Sep 30", meta: "Expiring", status: "warning" },
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
      "Program submissions awaiting TransitionForward admin approval before they go live.",
    what: "Track review status and respond to any admin questions or requested edits.",
    dataSource: "Submissions queue · admin review notes",
    primaryAction: { label: "See Submissions", to: "/partners-manage/opportunities" },
    connectsTo: ["Active Opportunities"],
    stats: [
      { label: "Pending", value: "3" },
      { label: "Changes requested", value: "1" },
      { label: "Avg review", value: "3 days" },
    ],
    rows: [
      { primary: "Spring Internship Pilot", secondary: "Submitted Sep 8 · in review", status: "muted" },
      { primary: "Weekend Peer Mentoring", secondary: "Submitted Sep 4 · in review", status: "muted" },
      { primary: "Transportation Voucher Add-on", secondary: "Changes requested · action needed", status: "warning" },
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
      { label: "Open now", value: "5" },
      { label: "Closing this month", value: "2" },
      { label: "Opening soon", value: "1" },
    ],
    rows: [
      { primary: "Summer Youth Employment", secondary: "Open · closes Feb 1", status: "ok" },
      { primary: "Career Discovery Workshops", secondary: "Closes Oct 15", meta: "Closing", status: "warning" },
      { primary: "Independent Travel Training", secondary: "Closes Sep 30", meta: "Closing", status: "warning" },
      { primary: "Spring Internship Pilot", secondary: "Opens Nov 1 (pending approval)", status: "muted" },
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
      "Publish, unpublish, and update opportunities and program details — all in one place.",
    what: "Refresh a program, retire an outdated one, or spin up a new offering fast.",
    dataSource: "Your opportunity catalog",
    primaryAction: { label: "Open Management", to: "/partners-manage/opportunities" },
    connectsTo: ["Active Opportunities", "Submitted Programs"],
    stats: [
      { label: "Total", value: "14" },
      { label: "Published", value: "8" },
      { label: "Draft / archived", value: "6" },
    ],
    rows: [
      { primary: "Draft: Winter Sports Program", secondary: "Not yet submitted", status: "muted" },
      { primary: "Draft: Financial Literacy Series", secondary: "Ready to submit", status: "muted" },
      { primary: "Archived: 2025 Summer Internship", secondary: "Ended · duplicate to relaunch", status: "muted" },
      { primary: "Bulk edit: partner contact update", secondary: "Applies to 3 opportunities", status: "warning" },
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
    eyebrow: "Playbooks & Templates",
    summary:
      "Playbooks, templates, and best-practice guides for partners serving transition-age youth.",
    what: "Download templates, share with your team, and improve your program design.",
    dataSource: "Curated partner library",
    primaryAction: { label: "Open Resources", to: "/partners-manage/resources" },
    connectsTo: ["Partner Profile", "Opportunity Management"],
    stats: [
      { label: "Guides", value: "24" },
      { label: "Templates", value: "12" },
      { label: "New this month", value: "3" },
    ],
    rows: [
      { primary: "Inclusive Hiring Playbook", secondary: "Guide · 24 pages", status: "ok" },
      { primary: "Program Application Template", secondary: "Template · editable", status: "ok" },
      { primary: "Accessibility Audit Checklist", secondary: "Checklist · printable", status: "ok" },
      { primary: "Family-Friendly Program Description", secondary: "Writing template", status: "ok" },
      { primary: "Outcomes Reporting Guide", secondary: "New · Sep 2026", meta: "New", status: "ok" },
    ],
    emptyHeadline: "No resources yet in your region.",
    emptyBody:
      "The partner library is still being seeded. Check back soon or request a specific guide.",
  },
};

export const PARTNER_FEATURE_ORDER: PartnerFeatureId[] = [
  "partner-profile",
  "active-opportunities",
  "submitted-programs",
  "application-windows",
  "opportunity-management",
  "incentives",
  "partner-resources",
];
