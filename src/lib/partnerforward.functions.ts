import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* ============================================================
 * PartnerForward — extends the existing partner workspace with:
 *   - submit-for-review workflow on opportunities
 *   - impact events (workshops, tours, referrals)
 *   - public incentive-resource hub (cautious copy)
 *   - admin: manage incentive resources, award badges
 *
 * All write paths verify org membership via `is_org_admin`.
 * Public reads only return is_published rows.
 * ============================================================ */

// -------- Opportunity submit-for-review --------

export const submitOpportunityForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partner_opportunities")
      .update({ status: "pending_review" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -------- Impact events --------

const ImpactKinds = [
  "workshop",
  "tour",
  "referral",
  "info_session",
  "mentorship_session",
  "internship_placement",
  "other",
] as const;

const ImpactInput = z.object({
  organization_id: z.string().uuid(),
  event_kind: z.enum(ImpactKinds),
  occurred_at: z.string().optional(),
  participant_count: z.number().int().min(0).max(100000).nullable().optional(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export const recordImpactEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => ImpactInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify caller is an active member of this org.
    const { data: member } = await supabase.rpc("is_org_member", {
      _user_id: userId,
      _org_id: data.organization_id,
    });
    if (!member) throw new Error("You are not a member of this organization.");

    const { error } = await supabase.from("partner_impact_events").insert({
      organization_id: data.organization_id,
      event_kind: data.event_kind,
      occurred_at: data.occurred_at ?? new Date().toISOString(),
      participant_count: data.participant_count ?? null,
      notes: data.notes ?? null,
      created_by: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const listImpactEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ organization_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("partner_impact_events")
      .select("*")
      .eq("organization_id", data.organization_id)
      .order("occurred_at", { ascending: false })
      .limit(200);
    return { events: rows ?? [] };
  });

export const getImpactSummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ organization_id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { data: events } = await context.supabase
      .from("partner_impact_events")
      .select("event_kind,participant_count,occurred_at")
      .eq("organization_id", data.organization_id);
    const list = events ?? [];
    const totals: Record<string, number> = {};
    let participants = 0;
    for (const e of list) {
      totals[e.event_kind] = (totals[e.event_kind] ?? 0) + 1;
      participants += e.participant_count ?? 0;
    }
    return {
      total_events: list.length,
      total_participants: participants,
      by_kind: totals,
    };
  });

// -------- Incentive resources (PUBLIC read) --------

export const listPublishedIncentives = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const [legacy, modern] = await Promise.all([
      supabaseAdmin
        .from("partner_incentive_resources")
        .select(
          "id,slug,title,category,agency,short_description,long_description,external_url,cautious_disclaimer,sort_order",
        )
        .eq("is_published", true)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true }),
      supabaseAdmin
        .from("partnerforward_resources")
        .select(
          "id,title,category,source_name,summary,partner_value,eligibility_notes,action_steps,official_url,cautious_disclaimer,legal_financial_disclaimer_required",
        )
        .eq("status", "published")
        .order("title", { ascending: true }),
    ]);
    const mapped = (modern.data ?? []).map((r) => ({
      id: r.id,
      slug: r.id,
      title: r.title,
      category: r.category,
      agency: r.source_name,
      short_description: r.summary ?? r.partner_value ?? "",
      long_description: [r.partner_value, r.eligibility_notes, r.action_steps]
        .filter(Boolean)
        .join("\n\n"),
      external_url: r.official_url,
      cautious_disclaimer: r.cautious_disclaimer,
      sort_order: 0,
    }));
    return { resources: [...(legacy.data ?? []), ...mapped] };
  });

// -------- Admin: manage incentive resources --------

const IncentiveInput = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  title: z.string().trim().min(2).max(200),
  category: z.string().trim().min(1).max(100),
  agency: z.string().trim().max(200).optional().nullable(),
  short_description: z.string().trim().min(1).max(500),
  long_description: z.string().trim().max(4000).optional().nullable(),
  external_url: z
    .string()
    .url()
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),
  cautious_disclaimer: z.string().trim().max(2000).optional(),
  is_published: z.boolean().optional(),
  sort_order: z.number().int().min(0).max(10000).optional(),
});

async function assertPlatformAdmin(
  supabase: { rpc: (...a: unknown[]) => Promise<{ data: unknown }> },
  userId: string,
) {
  const { data } = await supabase.rpc("is_platform_admin", {
    _user_id: userId,
  });
  if (!data) throw new Error("Forbidden");
}

export const adminListIncentives = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context.supabase as never, context.userId);
    const { data } = await context.supabase
      .from("partner_incentive_resources")
      .select("*")
      .order("sort_order", { ascending: true });
    return { resources: data ?? [] };
  });

export const adminUpsertIncentive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => IncentiveInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase
      .from("partner_incentive_resources")
      .upsert(data as never, { onConflict: "slug" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminDeleteIncentive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase
      .from("partner_incentive_resources")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -------- Admin: badges --------

const BADGE_KINDS = [
  "verified",
  "inclusive",
  "youth_pathway",
  "career_exploration",
  "community_resource",
  "accessibility_minded",
  "outreach_needed",
  "needs_review",
] as const;

export const adminAwardBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        organization_id: z.string().uuid(),
        badge_kind: z.enum(BADGE_KINDS),
        notes: z.string().trim().max(500).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase.from("partner_badges").insert({
      organization_id: data.organization_id,
      badge_kind: data.badge_kind,
      notes: data.notes ?? null,
      awarded_by: context.userId,
      is_active: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminRevokeBadge = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context.supabase as never, context.userId);
    const { error } = await context.supabase
      .from("partner_badges")
      .update({ is_active: false })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

// -------- Partner-scoped resources (authenticated) --------
// Used by /partners-manage/resources — partners browse the published
// PartnerForward library and save/unsave/annotate resources.

export const listPartnerResourcesWithSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [resources, saves] = await Promise.all([
      supabase
        .from("partnerforward_resources")
        .select(
          "id,title,category,summary,partner_value,eligibility_notes,action_steps,official_url,source_name,cautious_disclaimer",
        )
        .eq("status", "published")
        .order("category", { ascending: true })
        .order("title", { ascending: true }),
      supabase
        .from("partnerforward_partner_saved_resources")
        .select("id,resource_id,notes,created_at,updated_at")
        .eq("partner_user_id", userId),
    ]);
    if (resources.error) throw new Error(resources.error.message);
    if (saves.error) throw new Error(saves.error.message);
    const saveByResource = new Map(
      (saves.data ?? []).map((s) => [s.resource_id, s]),
    );
    const items = (resources.data ?? []).map((r) => ({
      ...r,
      saved: saveByResource.get(r.id) ?? null,
    }));
    return { items };
  });

export const savePartnerResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        resource_id: z.string().uuid(),
        notes: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partnerforward_partner_saved_resources")
      .insert({
        partner_user_id: context.userId,
        resource_id: data.resource_id,
        notes: data.notes ?? null,
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const updatePartnerSavedResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        notes: z.string().trim().max(2000).nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partnerforward_partner_saved_resources")
      .update({ notes: data.notes })
      .eq("id", data.id)
      .eq("partner_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const unsavePartnerResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partnerforward_partner_saved_resources")
      .delete()
      .eq("id", data.id)
      .eq("partner_user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
