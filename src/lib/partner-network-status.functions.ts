import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PartnerNetworkStatus = {
  metrics: {
    totalPartners: number;
    totalOpportunities: number;
    verifiedPartners: number;
    potentialPartners: number;
    needsReview: number;
    outreachNeeded: number;
    partnerSubmissions: number;
    featuredPartners: number;
    connecticutResources: number;
    savedOpportunities: number;
    lastReviewedAt: string | null;
    nextReviewDueAt: string | null;
  };
};

async function requirePlatformAdmin(supabase: any, userId: string): Promise<void> {
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

export const getPartnerNetworkStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    const count = (q: { count: number | null }) => q.count ?? 0;

    const [
      total,
      verified,
      potential,
      review,
      outreach,
      featured,
      ct,
      opps,
      subs,
      saved,
      lastReviewed,
      nextReview,
    ] = await Promise.all([
      supabase.from("partner_organizations").select("id", { count: "exact", head: true }),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "verified"),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("partnership_status", "potential"),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("verification_status", "needs_review"),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .in("outreach_status", ["not_contacted", "outreach_needed", "follow_up"]),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("is_featured", true),
      supabase
        .from("partner_organizations")
        .select("id", { count: "exact", head: true })
        .eq("state", "CT"),
      supabase.from("partner_network_opportunities").select("id", { count: "exact", head: true }),
      supabase
        .from("partner_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_review"),
      supabase.from("student_saved_partners").select("id", { count: "exact", head: true }),
      supabase
        .from("partner_organizations")
        .select("last_reviewed_at")
        .not("last_reviewed_at", "is", null)
        .order("last_reviewed_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("partner_organizations")
        .select("next_review_due_at")
        .not("next_review_due_at", "is", null)
        .order("next_review_due_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

    return {
      metrics: {
        totalPartners: count(total),
        totalOpportunities: count(opps),
        verifiedPartners: count(verified),
        potentialPartners: count(potential),
        needsReview: count(review),
        outreachNeeded: count(outreach),
        partnerSubmissions: count(subs),
        featuredPartners: count(featured),
        connecticutResources: count(ct),
        savedOpportunities: count(saved),
        lastReviewedAt:
          (lastReviewed.data as { last_reviewed_at: string | null } | null)?.last_reviewed_at ??
          null,
        nextReviewDueAt:
          (nextReview.data as { next_review_due_at: string | null } | null)?.next_review_due_at ??
          null,
      },
    } satisfies PartnerNetworkStatus;
  });

export const METRIC_KEYS = [
  "totalPartners",
  "totalOpportunities",
  "verifiedPartners",
  "potentialPartners",
  "needsReview",
  "outreachNeeded",
  "partnerSubmissions",
  "featuredPartners",
  "connecticutResources",
  "savedOpportunities",
] as const;

export type MetricKey = (typeof METRIC_KEYS)[number];

export type DrillRow = {
  id: string;
  primary: string;
  secondary?: string | null;
  status?: string | null;
  meta?: string | null;
  updated_at?: string | null;
};

export type DrillResult = {
  metric: MetricKey;
  rows: DrillRow[];
  truncated: boolean;
};

const LIMIT = 200;

const SortBySchema = z.enum(["name", "status", "updated_at", "type", "county"]);

export const getPartnerMetricRows = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: {
      metric: MetricKey;
      search?: string;
      sortBy?: string;
      sortDirection?: "asc" | "desc";
      statusFilter?: string;
    }) =>
      z
        .object({
          metric: z.enum(METRIC_KEYS),
          search: z.string().optional(),
          sortBy: SortBySchema.optional(),
          sortDirection: z.enum(["asc", "desc"]).optional(),
          statusFilter: z.string().optional(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;

    const { metric, search, sortBy, sortDirection, statusFilter } = data;
    const ascending = sortDirection !== "desc";

    const partnerCols =
      "id, organization_name, partner_type, county, state, verification_status, partnership_status, outreach_status, is_featured, last_reviewed_at, updated_at";

    const mapPartner = (r: Record<string, unknown>): DrillRow => ({
      id: String(r.id),
      primary: String(r.organization_name ?? "—"),
      secondary: [r.partner_type, r.county, r.state].filter(Boolean).join(" · ") || null,
      status:
        (r.verification_status as string | null) ?? (r.partnership_status as string | null) ?? null,
      meta: (r.outreach_status as string | null) ?? null,
      updated_at: (r.updated_at as string | null) ?? null,
    });

    const applySearch = (qb: { ilike: (col: string, val: string) => unknown }) => {
      if (search && search.trim()) {
        (qb as unknown as { ilike: (col: string, val: string) => unknown }).ilike(
          "organization_name",
          `%${search.trim()}%`,
        );
      }
    };

    let rows: DrillRow[] = [];
    let truncated = false;

    if (metric === "totalPartners") {
      let q = supabase.from("partner_organizations").select(partnerCols);
      if (search?.trim()) q = q.ilike("organization_name", `%${search.trim()}%`);
      if (statusFilter) q = q.eq("verification_status", statusFilter as any);
      if (sortBy === "name") q = q.order("organization_name", { ascending });
      else if (sortBy === "status") q = q.order("verification_status", { ascending });
      else if (sortBy === "type") q = q.order("partner_type", { ascending });
      else if (sortBy === "county") q = q.order("county", { ascending });
      else q = q.order("updated_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map(mapPartner);
    } else if (metric === "verifiedPartners") {
      let q = supabase.from("partner_organizations").select(partnerCols).eq("verification_status", "verified");
      if (search?.trim()) q = q.ilike("organization_name", `%${search.trim()}%`);
      if (statusFilter) q = q.eq("partnership_status", statusFilter as any);
      if (sortBy === "name") q = q.order("organization_name", { ascending });
      else if (sortBy === "status") q = q.order("partnership_status", { ascending });
      else if (sortBy === "type") q = q.order("partner_type", { ascending });
      else if (sortBy === "county") q = q.order("county", { ascending });
      else q = q.order("updated_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map(mapPartner);
    } else if (metric === "potentialPartners") {
      let q = supabase.from("partner_organizations").select(partnerCols).eq("partnership_status", "potential");
      if (search?.trim()) q = q.ilike("organization_name", `%${search.trim()}%`);
      if (statusFilter) q = q.eq("verification_status", statusFilter as any);
      if (sortBy === "name") q = q.order("organization_name", { ascending });
      else if (sortBy === "status") q = q.order("verification_status", { ascending });
      else if (sortBy === "type") q = q.order("partner_type", { ascending });
      else if (sortBy === "county") q = q.order("county", { ascending });
      else q = q.order("updated_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map(mapPartner);
    } else if (metric === "needsReview") {
      let q = supabase
        .from("partner_organizations")
        .select(partnerCols)
        .eq("verification_status", "needs_review");
      if (search?.trim()) q = q.ilike("organization_name", `%${search.trim()}%`);
      if (sortBy === "name") q = q.order("organization_name", { ascending });
      else if (sortBy === "status") q = q.order("verification_status", { ascending });
      else if (sortBy === "type") q = q.order("partner_type", { ascending });
      else if (sortBy === "county") q = q.order("county", { ascending });
      else q = q.order("updated_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map(mapPartner);
    } else if (metric === "outreachNeeded") {
      let q = supabase
        .from("partner_organizations")
        .select(partnerCols)
        .in("outreach_status", ["not_contacted", "outreach_needed", "follow_up"]);
      if (search?.trim()) q = q.ilike("organization_name", `%${search.trim()}%`);
      if (statusFilter) q = q.eq("outreach_status", statusFilter as any);
      if (sortBy === "name") q = q.order("organization_name", { ascending });
      else if (sortBy === "status") q = q.order("outreach_status", { ascending });
      else if (sortBy === "type") q = q.order("partner_type", { ascending });
      else if (sortBy === "county") q = q.order("county", { ascending });
      else q = q.order("updated_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map(mapPartner);
    } else if (metric === "featuredPartners") {
      let q = supabase.from("partner_organizations").select(partnerCols).eq("is_featured", true);
      if (search?.trim()) q = q.ilike("organization_name", `%${search.trim()}%`);
      if (statusFilter) q = q.eq("verification_status", statusFilter as any);
      if (sortBy === "name") q = q.order("organization_name", { ascending });
      else if (sortBy === "status") q = q.order("verification_status", { ascending });
      else if (sortBy === "type") q = q.order("partner_type", { ascending });
      else if (sortBy === "county") q = q.order("county", { ascending });
      else q = q.order("updated_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map(mapPartner);
    } else if (metric === "connecticutResources") {
      let q = supabase.from("partner_organizations").select(partnerCols).eq("state", "CT");
      if (search?.trim()) q = q.ilike("organization_name", `%${search.trim()}%`);
      if (statusFilter) q = q.eq("verification_status", statusFilter as any);
      if (sortBy === "name") q = q.order("organization_name", { ascending });
      else if (sortBy === "status") q = q.order("verification_status", { ascending });
      else if (sortBy === "type") q = q.order("partner_type", { ascending });
      else if (sortBy === "county") q = q.order("county", { ascending });
      else q = q.order("updated_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map(mapPartner);
    } else if (metric === "totalOpportunities") {
      let q = supabase
        .from("partner_network_opportunities")
        .select(
          "id, opportunity_title, opportunity_type, county, status, updated_at, partner_organizations(organization_name)",
        );
      if (search?.trim()) q = q.ilike("opportunity_title", `%${search.trim()}%`);
      if (statusFilter) q = q.eq("status", statusFilter as any);
      if (sortBy === "name") q = q.order("opportunity_title", { ascending });
      else if (sortBy === "status") q = q.order("status", { ascending });
      else if (sortBy === "type") q = q.order("opportunity_type", { ascending });
      else if (sortBy === "county") q = q.order("county", { ascending });
      else q = q.order("updated_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map((r: Record<string, unknown>) => {
        const partner = r.partner_organizations as { organization_name?: string } | null;
        return {
          id: String(r.id),
          primary: String(r.opportunity_title ?? "—"),
          secondary:
            [partner?.organization_name, r.opportunity_type, r.county]
              .filter(Boolean)
              .join(" · ") || null,
          status: (r.status as string | null) ?? null,
          updated_at: (r.updated_at as string | null) ?? null,
        };
      });
    } else if (metric === "partnerSubmissions") {
      let q = supabase
        .from("partner_submissions")
        .select("id, organization_name, contact_name, contact_email, region, status, created_at")
        .eq("status", "pending_review");
      if (search?.trim()) q = q.ilike("organization_name", `%${search.trim()}%`);
      if (statusFilter) q = q.eq("status", statusFilter as any);
      if (sortBy === "name") q = q.order("organization_name", { ascending });
      else if (sortBy === "status") q = q.order("status", { ascending });
      else if (sortBy === "type") q = q.order("region", { ascending });
      else if (sortBy === "county") q = q.order("region", { ascending });
      else q = q.order("created_at", { ascending: ascending, nullsFirst: false });
      const { data: d } = await q.limit(LIMIT + 1);
      rows = (d ?? []).map((r: Record<string, unknown>) => ({
        id: String(r.id),
        primary: String(r.organization_name ?? "—"),
        secondary: [r.contact_name, r.contact_email, r.region].filter(Boolean).join(" · ") || null,
        status: (r.status as string | null) ?? null,
        updated_at: (r.created_at as string | null) ?? null,
      }));
    } else if (metric === "savedOpportunities") {
      const { data: d } = await supabase
        .from("student_saved_partners")
        .select(
          "id, created_at, partner_organizations(organization_name), partner_network_opportunities(opportunity_title)",
        )
        .order("created_at", { ascending: false })
        .limit(LIMIT + 1);
      rows = (d ?? []).map((r: Record<string, unknown>) => {
        const partner = r.partner_organizations as { organization_name?: string } | null;
        const opp = r.partner_network_opportunities as { opportunity_title?: string } | null;
        return {
          id: String(r.id),
          primary: opp?.opportunity_title ?? partner?.organization_name ?? "Saved item",
          secondary:
            opp?.opportunity_title && partner?.organization_name
              ? `at ${partner.organization_name}`
              : null,
          status: null,
          updated_at: (r.created_at as string | null) ?? null,
        };
      });
      // client-side search + sort for saved opportunities (joined fields)
      if (search?.trim()) {
        const term = search.trim().toLowerCase();
        rows = rows.filter(
          (r) =>
            r.primary.toLowerCase().includes(term) ||
            (r.secondary?.toLowerCase().includes(term) ?? false),
        );
      }
      if (sortBy === "name") {
        rows.sort((a, b) =>
          ascending
            ? a.primary.localeCompare(b.primary)
            : b.primary.localeCompare(a.primary),
        );
      } else if (sortBy === "updated_at") {
        rows.sort((a, b) => {
          const da = a.updated_at ? new Date(a.updated_at).getTime() : 0;
          const db = b.updated_at ? new Date(b.updated_at).getTime() : 0;
          return ascending ? da - db : db - da;
        });
      }
    }

    if (rows.length > LIMIT) {
      truncated = true;
      rows = rows.slice(0, LIMIT);
    }

    return { metric, rows, truncated } satisfies DrillResult;
  });

