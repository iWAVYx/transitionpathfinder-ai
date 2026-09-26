import type { PartnerFeatureDetail, PartnerFeatureId } from "@/lib/demo/partner/feature-details";
import type { PartnerOpportunity, PartnerWorkspace } from "@/lib/partner-workspace.functions";

export type PartnerLivePreview = {
  organization: NonNullable<PartnerWorkspace["selected_org"]>;
  details: Record<PartnerFeatureId, PartnerFeatureDetail>;
  tones: Partial<
    Record<PartnerFeatureId, "default" | "success" | "warning" | "critical" | "muted">
  >;
};

function opportunityRow(opportunity: PartnerOpportunity) {
  return {
    primary: opportunity.title,
    secondary: [
      opportunity.opportunity_type.replaceAll("_", " "),
      opportunity.location,
      opportunity.age_range ? `Ages ${opportunity.age_range}` : null,
    ]
      .filter(Boolean)
      .join(" · "),
    meta: opportunity.status.replaceAll("_", " "),
    status:
      opportunity.status === "approved"
        ? ("ok" as const)
        : opportunity.status === "pending_review"
          ? ("warning" as const)
          : ("muted" as const),
  };
}

function catalogRow(primary: string, secondary: string) {
  return { primary, secondary, status: "muted" as const };
}

export function buildPartnerLivePreview(
  workspace: PartnerWorkspace | null,
): PartnerLivePreview | null {
  const organization = workspace?.selected_org;
  if (!workspace?.is_partner || !organization) return null;

  const opportunities = workspace.opportunities.filter(
    (opportunity) => opportunity.organization_id === organization.id,
  );
  const approved = opportunities.filter((opportunity) => opportunity.status === "approved");
  const pending = opportunities.filter((opportunity) => opportunity.status === "pending_review");
  const draftOrInactive = opportunities.filter(
    (opportunity) => opportunity.status === "draft" || opportunity.status === "inactive",
  );
  const applicationReady = approved.filter(
    (opportunity) => opportunity.application_url || opportunity.contact_email,
  );

  const profileFields = [
    organization.name,
    organization.type,
    organization.website,
    organization.contact_email,
    organization.city,
    organization.state,
    organization.address,
  ];
  const completedProfileFields = profileFields.filter(Boolean).length;
  const profileCompletion = Math.round((completedProfileFields / profileFields.length) * 100);
  const locationLabel = [organization.city, organization.state].filter(Boolean).join(", ");

  const details: Record<PartnerFeatureId, PartnerFeatureDetail> = {
    "partner-profile": {
      id: "partner-profile",
      title: "Partner Profile",
      eyebrow: "Signed-In Organization",
      summary: `${organization.name} profile readiness and verification status.`,
      what: "Complete the organization details families and schools need before evaluating an opportunity.",
      dataSource: "Your authorized organization membership and profile",
      primaryAction: { label: "Edit Profile", to: "/partners-manage/profile" },
      connectsTo: ["Active Opportunities", "Partner Network"],
      stats: [
        { label: "Completion", value: `${profileCompletion}%` },
        { label: "Verification", value: organization.verified_status || "Pending" },
        { label: "Location", value: locationLabel || "Not added" },
      ],
      rows: [
        {
          primary: "Organization identity",
          secondary: organization.name ? "Complete" : "Needs attention",
          status: organization.name ? "ok" : "warning",
        },
        {
          primary: "Website",
          secondary: organization.website ? "Added" : "Not added",
          status: organization.website ? "ok" : "warning",
        },
        {
          primary: "Public contact method",
          secondary: organization.contact_email ? "Added" : "Not added",
          status: organization.contact_email ? "ok" : "warning",
        },
        {
          primary: "Service location",
          secondary: locationLabel || "Not added",
          status: locationLabel ? "ok" : "warning",
        },
      ],
      emptyHeadline: "Your partner profile is not set up yet.",
      emptyBody: "Complete the organization profile before publishing opportunities.",
    },
    "active-opportunities": {
      id: "active-opportunities",
      title: "Active Opportunities",
      eyebrow: "Published Catalog",
      summary: `${approved.length} approved ${approved.length === 1 ? "opportunity" : "opportunities"} currently belong to ${organization.name}.`,
      what: "Review what is live and update anything that is no longer available.",
      dataSource: "Approved opportunities for your authorized organization",
      primaryAction: { label: "See Active Opportunities", to: "/partners-manage/opportunities" },
      connectsTo: ["Submitted Programs", "Application Windows"],
      stats: [
        { label: "Published", value: String(approved.length) },
        { label: "Total catalog", value: String(opportunities.length) },
        { label: "Apply-ready", value: String(applicationReady.length) },
      ],
      rows: approved.slice(0, 5).map(opportunityRow),
      emptyHeadline: "No active opportunities yet.",
      emptyBody: "Publish the first approved opportunity so families and educators can find it.",
    },
    "submitted-programs": {
      id: "submitted-programs",
      title: "Submitted Programs",
      eyebrow: "Review Queue",
      summary: `${pending.length} ${pending.length === 1 ? "submission is" : "submissions are"} awaiting review.`,
      what: "Track the real review status of programs submitted by your organization.",
      dataSource: "Pending-review opportunities for your authorized organization",
      primaryAction: { label: "See Submissions", to: "/partners-manage/opportunities" },
      connectsTo: ["Active Opportunities"],
      stats: [
        { label: "Pending", value: String(pending.length) },
        { label: "Published", value: String(approved.length) },
        { label: "Draft / inactive", value: String(draftOrInactive.length) },
      ],
      rows: pending.slice(0, 5).map(opportunityRow),
      emptyHeadline: "Nothing is pending review right now.",
      emptyBody: "Submit an opportunity and its real review state will appear here.",
    },
    "application-windows": {
      id: "application-windows",
      title: "Application Windows",
      eyebrow: "Published Application Paths",
      summary: `${applicationReady.length} published ${applicationReady.length === 1 ? "opportunity has" : "opportunities have"} an application link or contact method.`,
      what: "Verify that every published opportunity gives families a current way to apply or make contact.",
      dataSource: "Approved opportunities and their application/contact fields",
      primaryAction: { label: "Open Windows", to: "/partners-manage/deadlines" },
      connectsTo: ["Active Opportunities"],
      stats: [
        { label: "Apply-ready", value: String(applicationReady.length) },
        { label: "Published", value: String(approved.length) },
        {
          label: "Needs a path",
          value: String(Math.max(0, approved.length - applicationReady.length)),
        },
      ],
      rows: approved.slice(0, 5).map((opportunity) => ({
        primary: opportunity.title,
        secondary: opportunity.application_url
          ? "Application link added"
          : opportunity.contact_email
            ? "Contact email added"
            : "Add an application link or contact method",
        status: opportunity.application_url || opportunity.contact_email ? "ok" : "warning",
      })),
      emptyHeadline: "No published application paths yet.",
      emptyBody:
        "Publish an opportunity with an application link or contact method to populate this preview.",
    },
    "opportunity-management": {
      id: "opportunity-management",
      title: "Opportunity Management",
      eyebrow: "Your Real Catalog",
      summary: `${opportunities.length} total catalog ${opportunities.length === 1 ? "item" : "items"} for ${organization.name}.`,
      what: "Create, edit, submit, publish, or retire opportunities from the full management tool.",
      dataSource: "Your organization's complete opportunity catalog",
      primaryAction: { label: "Open Management", to: "/partners-manage/opportunities" },
      connectsTo: ["Active Opportunities", "Submitted Programs"],
      stats: [
        { label: "Total", value: String(opportunities.length) },
        { label: "Published", value: String(approved.length) },
        { label: "Draft / inactive", value: String(draftOrInactive.length) },
      ],
      rows: opportunities.slice(0, 5).map(opportunityRow),
      emptyHeadline: "Your catalog is empty.",
      emptyBody: "Create the first opportunity draft, then submit it for review when ready.",
    },
    incentives: {
      id: "incentives",
      title: "PartnerForward Incentives",
      eyebrow: "Current Curated Catalog",
      summary:
        "Open the live incentives catalog to browse grants, credits, subsidies, and coaching.",
      what: "Browse current programs and follow official-source links from the full tool.",
      dataSource: "TransitionForward's curated incentive catalog",
      primaryAction: { label: "Open Incentives", to: "/partnerforward/incentives" },
      connectsTo: ["Partner Resources", "Partner Profile"],
      stats: [{ label: "Status", value: "Open catalog" }],
      rows: [
        catalogRow(
          "Live incentive catalog",
          "Open the full tool for current entries; this preview does not invent a count.",
        ),
      ],
      emptyHeadline: "No incentive preview is available.",
      emptyBody: "Open the incentives catalog to see its current verified entries.",
    },
    "partner-resources": {
      id: "partner-resources",
      title: "Partner Resources",
      eyebrow: "Current Resource Library",
      summary: "Open the live partner library to search and save playbooks, templates, and guides.",
      what: "Search the live library, save useful items, and add organization notes.",
      dataSource: "Published PartnerForward resources and your saved-resource records",
      primaryAction: { label: "Open Resources", to: "/partners-manage/resources" },
      connectsTo: ["Partner Profile", "Opportunity Management"],
      stats: [{ label: "Status", value: "Open library" }],
      rows: [
        catalogRow(
          "Live resource library",
          "Open the full tool for current entries and your saved resources; no sample count is shown.",
        ),
      ],
      emptyHeadline: "No resource preview is available.",
      emptyBody: "Open the resource library to see its current published entries.",
    },
    "partner-network": {
      id: "partner-network",
      title: "Partner Network",
      eyebrow: "Published Organization Presence",
      summary: `${approved.length} published ${approved.length === 1 ? "listing is" : "listings are"} eligible to appear in the network.`,
      what: "Review the public directory experience and keep the organization profile and listings current.",
      dataSource: "Approved organization opportunities; no student records",
      primaryAction: { label: "Open Partner Network", to: "/partner-network" },
      connectsTo: ["Active Opportunities", "Partner Profile"],
      stats: [
        { label: "Published listings", value: String(approved.length) },
        { label: "Verification", value: organization.verified_status || "Pending" },
      ],
      rows: approved.slice(0, 5).map(opportunityRow),
      emptyHeadline: "No published network listings yet.",
      emptyBody:
        "Complete the profile and publish an opportunity to build the organization presence.",
    },
  };

  return {
    organization,
    details,
    tones: {
      "partner-profile": profileCompletion === 100 ? "success" : "warning",
      "active-opportunities": approved.length > 0 ? "success" : "muted",
      "submitted-programs": pending.length > 0 ? "warning" : "muted",
      "application-windows": approved.length > applicationReady.length ? "warning" : "success",
      "opportunity-management": opportunities.length > 0 ? "default" : "muted",
      incentives: "muted",
      "partner-resources": "muted",
      "partner-network": approved.length > 0 ? "success" : "muted",
    },
  };
}
