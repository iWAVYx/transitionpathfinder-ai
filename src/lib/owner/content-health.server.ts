/**
 * Content Health — Phase 1 (Owner Admin Hub).
 *
 * A single read-only rollup that answers "what content is decaying?" across
 * the resource library, partner network, and opportunity catalogue so admins
 * do not have to walk eight separate queues to find stale or broken records.
 *
 * Every check returns a count plus a small sample of offending records so the
 * console can render an actionable row without a second round trip.
 */

export type ContentHealthSeverity = "critical" | "warning" | "info";

export type ContentHealthSample = {
  id: string;
  label: string;
  detail?: string;
};

export type ContentHealthCheck = {
  key: string;
  title: string;
  description: string;
  severity: ContentHealthSeverity;
  count: number;
  /** Admin Hub destination that resolves this class of problem. */
  to: string;
  samples: ContentHealthSample[];
};

export type ContentHealthReport = {
  generatedAt: string;
  totals: { critical: number; warning: number; info: number };
  checks: ContentHealthCheck[];
};

type Client = {
  from: (table: string) => any;
};

const STALE_DAYS = 365;

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

export async function requirePlatformAdminAccess(
  supabase: Client,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["platform_owner", "platform_admin"])
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Forbidden: Platform admin access required.");
  }
}

function sample<T extends Record<string, any>>(
  rows: T[] | null | undefined,
  label: (row: T) => string,
  detail?: (row: T) => string | undefined,
): ContentHealthSample[] {
  return (rows ?? []).slice(0, 5).map((r) => ({
    id: String(r['id'] ?? label(r)),
    label: label(r) || "Untitled",
    ...(detail ? { detail: detail(r) } : {}),
  }));
}

export async function buildContentHealthReport(
  supabase: Client,
): Promise<ContentHealthReport> {
  const staleCutoff = daysAgoIso(STALE_DAYS);

  const [
    brokenLinks,
    staleResources,
    missingAccessibility,
    awaitingResourceReview,
    incompletePartners,
    partnersOverdueReview,
    expiredOpportunities,
    opportunitiesMissingNextStep,
    draftBlogPosts,
  ] = await Promise.all([
    supabase
      .from("resources")
      .select("id, title, url", { count: "exact" })
      .eq("link_status", "broken")
      .limit(5),
    supabase
      .from("resources")
      .select("id, title, last_reviewed_at", { count: "exact" })
      .eq("published_status", "published")
      .or(`last_reviewed_at.is.null,last_reviewed_at.lt.${staleCutoff}`)
      .limit(5),
    supabase
      .from("resources")
      .select("id, title", { count: "exact" })
      .eq("published_status", "published")
      .is("accessibility_notes", null)
      .limit(5),
    supabase
      .from("resources")
      .select("id, title", { count: "exact" })
      .eq("review_status", "needs_review")
      .limit(5),
    supabase
      .from("partner_organizations")
      .select("id, organization_name, description, contact_email", { count: "exact" })
      .eq("is_public", true)
      .or("description.is.null,contact_email.is.null,county.is.null")
      .limit(5),
    supabase
      .from("partner_organizations")
      .select("id, organization_name, next_review_due_at", { count: "exact" })
      .eq("is_public", true)
      .not("next_review_due_at", "is", null)
      .lt("next_review_due_at", new Date().toISOString())
      .limit(5),
    supabase
      .from("partner_network_opportunities")
      .select("id, opportunity_title, updated_at", { count: "exact" })
      .eq("status", "active")
      .lt("updated_at", staleCutoff)
      .limit(5),
    supabase
      .from("partner_network_opportunities")
      .select("id, opportunity_title", { count: "exact" })
      .eq("is_public", true)
      .or("next_step.is.null,application_url.is.null")
      .limit(5),
    supabase
      .from("blog_posts")
      .select("id, title, updated_at", { count: "exact" })
      .eq("status", "draft")
      .limit(5),
  ]);

  const checks: ContentHealthCheck[] = [
    {
      key: "broken_links",
      title: "Broken Resource Links",
      description: "Published resources whose destination URL failed the last link check.",
      severity: "critical",
      count: brokenLinks.count ?? 0,
      to: "/owner/resource-review",
      samples: sample(brokenLinks.data, (r) => r.title, (r) => r.url),
    },
    {
      key: "partners_incomplete",
      title: "Incomplete Partner Profiles",
      description: "Public partner listings missing a description, contact email, or county.",
      severity: "critical",
      count: incompletePartners.count ?? 0,
      to: "/owner/partner-network",
      samples: sample(incompletePartners.data, (r) => r.organization_name),
    },
    {
      key: "resources_stale",
      title: "Resources Past Review Window",
      description: `Published resources not reviewed in the last ${STALE_DAYS} days.`,
      severity: "warning",
      count: staleResources.count ?? 0,
      to: "/owner/resource-review",
      samples: sample(
        staleResources.data,
        (r) => r.title,
        (r) => (r.last_reviewed_at ? `Last reviewed ${new Date(r.last_reviewed_at).toLocaleDateString()}` : "Never reviewed"),
      ),
    },
    {
      key: "partners_overdue",
      title: "Partner Reviews Overdue",
      description: "Partner records whose scheduled re-verification date has passed.",
      severity: "warning",
      count: partnersOverdueReview.count ?? 0,
      to: "/owner/partner-network",
      samples: sample(partnersOverdueReview.data, (r) => r.organization_name),
    },
    {
      key: "opportunities_stale",
      title: "Stale Opportunities",
      description: "Active opportunities untouched for over a year — likely expired.",
      severity: "warning",
      count: expiredOpportunities.count ?? 0,
      to: "/owner/opportunities",
      samples: sample(expiredOpportunities.data, (r) => r.opportunity_title),
    },
    {
      key: "resources_awaiting_review",
      title: "Awaiting Review",
      description: "Resources flagged for a human review decision.",
      severity: "warning",
      count: awaitingResourceReview.count ?? 0,
      to: "/owner/resource-review",
      samples: sample(awaitingResourceReview.data, (r) => r.title),
    },
    {
      key: "resources_missing_accessibility",
      title: "Missing Accessibility Notes",
      description: "Published resources with no accessibility guidance for families.",
      severity: "info",
      count: missingAccessibility.count ?? 0,
      to: "/owner/resources",
      samples: sample(missingAccessibility.data, (r) => r.title),
    },
    {
      key: "opportunities_missing_next_step",
      title: "Opportunities Without A Next Step",
      description: "Public opportunities missing an application link or next-step instruction.",
      severity: "info",
      count: opportunitiesMissingNextStep.count ?? 0,
      to: "/owner/opportunities",
      samples: sample(opportunitiesMissingNextStep.data, (r) => r.opportunity_title),
    },
    {
      key: "blog_drafts",
      title: "Unpublished Drafts",
      description: "Blog and news posts still sitting in draft.",
      severity: "info",
      count: draftBlogPosts.count ?? 0,
      to: "/owner/blog",
      samples: sample(draftBlogPosts.data, (r) => r.title),
    },
  ];

  const totals = checks.reduce(
    (acc, c) => {
      if (c.count > 0) acc[c.severity] += 1;
      return acc;
    },
    { critical: 0, warning: 0, info: 0 },
  );

  return { generatedAt: new Date().toISOString(), totals, checks };
}
