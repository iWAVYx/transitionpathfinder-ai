/**
 * Static demo fixtures powering the Platform Owner / Admin Hub feature
 * previews. These render at /demo/feature/owner/<slug> using the shared
 * DemoFeatureShell so that anyone signed in as a Platform Admin (or
 * previewing the demo) can see exactly what each Owner Hub surface
 * does with sample data. Nothing here is real tenant data.
 *
 * Every entry mirrors the shape used by the other role registries so
 * the demo route + audit tests treat Owner identically.
 */

export type OwnerFeatureId =
  | "testing"
  | "diagnostics"
  | "role-audit"
  | "content"
  | "demo-hub"
  | "activity"
  | "analytics"
  | "pilot-packages";

export type FeatureBullet = { label: string; value?: string; hint?: string };

export type FeatureRow = {
  primary: string;
  secondary?: string;
  meta?: string;
  status?: "ok" | "warning" | "critical" | "muted";
};

export type OwnerFeatureDetail = {
  id: OwnerFeatureId;
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

export const OWNER_FEATURE_DETAILS: Record<OwnerFeatureId, OwnerFeatureDetail> = {
  testing: {
    id: "testing",
    title: "Testing Scripts",
    eyebrow: "Release Readiness",
    summary:
      "Run through the release-readiness scripts for each role so nothing ships broken. Each script pairs a scenario with pass/fail evidence.",
    what: "Open a script, walk through the steps, and record pass / fail with notes.",
    dataSource: "Curated test scripts · past run history · role coverage matrix",
    primaryAction: { label: "Open Testing Scripts", to: "/owner/testing" },
    connectsTo: ["Role Audit", "Activity Log", "Analytics"],
    stats: [
      { label: "Scripts", value: "24" },
      { label: "Passed this release", value: "18" },
      { label: "Blocked", value: "2" },
    ],
    rows: [
      { primary: "Student onboarding · happy path", secondary: "Passed 2 days ago", status: "ok" },
      { primary: "Family invite → educator accept", secondary: "Passed 1 day ago", status: "ok" },
      { primary: "District aggregate visibility", secondary: "Failed — see notes", status: "critical" },
      { primary: "Partner PII scoping", secondary: "Passed 3 days ago", status: "ok" },
      { primary: "Owner impersonation audit trail", secondary: "Pending run", status: "warning" },
    ],
    emptyHeadline: "No scripts have been run yet this release.",
    emptyBody:
      "Add a release tag and start with the smoke scripts for each role.",
  },

  diagnostics: {
    id: "diagnostics",
    title: "System Diagnostics",
    eyebrow: "Platform Health",
    summary:
      "Runtime health at a glance — queue depth, background jobs, integrations, and error rates across the platform.",
    what: "Check the last hour's errors, restart a stuck worker, or drill into a slow query.",
    dataSource: "Server metrics · background job queue · edge function logs · database health",
    primaryAction: { label: "Open Health Dashboard", to: "/owner/health" },
    connectsTo: ["Activity Log", "Testing", "Analytics"],
    stats: [
      { label: "Uptime (30d)", value: "99.97%" },
      { label: "Errors (1h)", value: "0" },
      { label: "Queue depth", value: "3" },
    ],
    rows: [
      { primary: "AI job processor", secondary: "Healthy · 42 completed today", status: "ok" },
      { primary: "Email queue", secondary: "Healthy · 0 dead-letter", status: "ok" },
      { primary: "Search indexer", secondary: "Warming after last deploy", status: "warning" },
      { primary: "Nightly backup", secondary: "Completed 03:12 UTC", status: "ok" },
      { primary: "Realtime channel", secondary: "12 subscribers", status: "muted" },
    ],
    emptyHeadline: "No signal yet.",
    emptyBody:
      "Once the platform serves live traffic, diagnostics start streaming here.",
  },

  "role-audit": {
    id: "role-audit",
    title: "Role Audit",
    eyebrow: "Access Governance",
    summary:
      "See who holds which role in which tenant, when it was assigned, and who authorized it. Elevation is never silent.",
    what: "Grant, revoke, or downgrade a role; every change is logged with actor + reason.",
    dataSource: "user_roles table · audit log · admin invitations",
    primaryAction: { label: "Open Role Audit", to: "/owner/role-audit" },
    connectsTo: ["Activity Log", "Contacts", "Testing"],
    stats: [
      { label: "Platform admins", value: "3" },
      { label: "District admins", value: "12" },
      { label: "Educators", value: "148" },
      { label: "Changes this month", value: "27" },
    ],
    rows: [
      { primary: "Grant · educator", secondary: "Hartford Regional · Ms. Patel", meta: "3 days ago", status: "ok" },
      { primary: "Revoke · school-admin", secondary: "West Ridge · departed", meta: "6 days ago", status: "warning" },
      { primary: "Grant · district-admin", secondary: "Cheshire District", meta: "10 days ago", status: "ok" },
      { primary: "Pending invite · partner-admin", secondary: "Kennedy Collective", status: "warning" },
    ],
    emptyHeadline: "No role changes recorded.",
    emptyBody:
      "Assign the first role in a tenant to start the audit trail.",
  },

  content: {
    id: "content",
    title: "Content Library",
    eyebrow: "Editorial Surface",
    summary:
      "Blog posts, resources, framework pages, and marketing content — publish, unpublish, and see what's live.",
    what: "Draft a post, publish or unpublish an item, and see which pieces are trending in the last 30 days.",
    dataSource: "Blog · Resources · Framework pages · CMS drafts",
    primaryAction: { label: "Open Content", to: "/owner/content" },
    connectsTo: ["Blog", "Resources", "Analytics"],
    stats: [
      { label: "Published", value: "62" },
      { label: "Drafts", value: "8" },
      { label: "Views (30d)", value: "14.2k" },
    ],
    rows: [
      { primary: "Transition Planning 101 for Families", secondary: "Published · 2.1k views (30d)", status: "ok" },
      { primary: "Understanding the Age of Majority", secondary: "Published · 1.4k views (30d)", status: "ok" },
      { primary: "New: Partner Spotlight — Vet Tech Path", secondary: "Draft", status: "warning" },
      { primary: "Retired: Legacy Onboarding Guide", secondary: "Unpublished 12 days ago", status: "muted" },
    ],
    emptyHeadline: "No content published yet.",
    emptyBody:
      "Create the first post so families and educators have a starting point.",
  },

  "demo-hub": {
    id: "demo-hub",
    title: "Demo Hub",
    eyebrow: "Provision Sample Tenants",
    summary:
      "Provision a seeded Demo Parent, Demo Educator, or Demo District so anyone can walk the fully interactive experience.",
    what: "Reset a demo tenant, mint credentials, or preview any role's dashboard as sample data.",
    dataSource: "Demo tenant seed · sample students · sample calendar",
    primaryAction: { label: "Open Demo Hub", to: "/owner/demo" },
    connectsTo: ["Testing", "Role Audit", "Activity Log"],
    stats: [
      { label: "Demo tenants", value: "5" },
      { label: "Last reseed", value: "1 day ago" },
      { label: "Active sessions", value: "3" },
    ],
    rows: [
      { primary: "Demo Family · Rivera household", secondary: "Reseeded today · 3 students", status: "ok" },
      { primary: "Demo Educator · Hartford Regional", secondary: "Reseeded 2 days ago", status: "ok" },
      { primary: "Demo District · Sample County", secondary: "Reseeded 5 days ago", status: "muted" },
      { primary: "Demo Partner · Vet Tech Path", secondary: "Reseeded 5 days ago", status: "muted" },
    ],
    emptyHeadline: "No demo tenants yet.",
    emptyBody:
      "Seed the first demo family so anyone can walk the product without a live tenant.",
  },

  activity: {
    id: "activity",
    title: "Activity Log",
    eyebrow: "Everything That Happened",
    summary:
      "The system's paper trail — invites sent, roles changed, reports published, documents shared, and admins impersonating.",
    what: "Filter by actor, tenant, or event type; export a slice for compliance review.",
    dataSource: "audit_log table · realtime events · authenticated requests",
    primaryAction: { label: "Open Activity Log", to: "/owner/activity" },
    connectsTo: ["Role Audit", "Testing", "Diagnostics"],
    stats: [
      { label: "Events (24h)", value: "482" },
      { label: "Sensitive (24h)", value: "6" },
      { label: "Exports (30d)", value: "2" },
    ],
    rows: [
      { primary: "Pathway Report published", secondary: "Educator · Ms. Patel", meta: "12m ago", status: "ok" },
      { primary: "Role granted · educator", secondary: "Platform admin · you", meta: "3h ago", status: "warning" },
      { primary: "Owner impersonation started", secondary: "Ticket #482 · 8m session", meta: "yesterday", status: "warning" },
      { primary: "Document shared with family", secondary: "Educator · Ms. Patel", meta: "yesterday", status: "ok" },
    ],
    emptyHeadline: "No activity yet.",
    emptyBody:
      "As users sign in and take actions, the audit log fills up here.",
  },

  analytics: {
    id: "analytics",
    title: "Platform Analytics",
    eyebrow: "Usage & Outcomes",
    summary:
      "Aggregate signals across every tenant — active users, Pathway Reports published, meeting prep completion, and partner match volume.",
    what: "Compare this month to last, spot a slipping district, or export a slice for a stakeholder update.",
    dataSource: "Aggregated telemetry · privacy-safe roll-ups · never a specific student",
    primaryAction: { label: "Open Analytics", to: "/owner/analytics" },
    connectsTo: ["Testing", "Content", "District Reports"],
    stats: [
      { label: "MAU", value: "1,284" },
      { label: "Reports published (30d)", value: "312" },
      { label: "Matches surfaced (30d)", value: "1,940" },
    ],
    rows: [
      { primary: "Weekly active users", secondary: "+8% vs last week", status: "ok" },
      { primary: "Pathway Reports published", secondary: "+12% vs last month", status: "ok" },
      { primary: "Meeting prep completion", secondary: "62% (down from 68%)", status: "warning" },
      { primary: "Partner match rate", secondary: "Stable", status: "muted" },
    ],
    emptyHeadline: "Not enough data yet.",
    emptyBody:
      "Analytics warm up after the first 30 days of live traffic.",
  },

  "pilot-packages": {
    id: "pilot-packages",
    title: "Pilot Packages",
    eyebrow: "Rollout Planning",
    summary:
      "Configure pilot bundles for a district or partner network — seat counts, feature flags, and onboarding milestones in one place.",
    what: "Create a new pilot, edit an existing bundle, and check milestone completion.",
    dataSource: "Pilot registry · onboarding milestones · billing seat counts",
    primaryAction: { label: "Open Pilot Packages", to: "/owner/pilot-packages" },
    connectsTo: ["Demo Hub", "Role Audit", "Analytics"],
    stats: [
      { label: "Active pilots", value: "6" },
      { label: "Onboarding", value: "2" },
      { label: "Renewal windows", value: "3" },
    ],
    rows: [
      { primary: "Cheshire District pilot", secondary: "Onboarding · 4 of 6 milestones", status: "warning" },
      { primary: "Hartford Regional pilot", secondary: "Active · renewal Jun 2027", status: "ok" },
      { primary: "West Ridge trial", secondary: "Active · 30-day check-in due", status: "warning" },
      { primary: "Kennedy Collective partner bundle", secondary: "Onboarding · 1 of 4 milestones", status: "warning" },
    ],
    emptyHeadline: "No pilot packages yet.",
    emptyBody:
      "Create the first pilot to lock in seat counts and onboarding milestones.",
  },
};

export const OWNER_FEATURE_ORDER: OwnerFeatureId[] = [
  "testing",
  "diagnostics",
  "role-audit",
  "content",
  "demo-hub",
  "activity",
  "analytics",
  "pilot-packages",
];
