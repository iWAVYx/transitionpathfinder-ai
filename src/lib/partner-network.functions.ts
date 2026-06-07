import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type PartnerRow = {
  id: string;
  organization_name: string;
  partner_type: string;
  description: string | null;
  website_url: string | null;
  county: string | null;
  city: string | null;
  state: string;
  verification_status: string;
  partnership_status: string;
  outreach_status: string;
  collection_tags: string[];
  pathway_categories: string[];
  tags: string[];
  audience_served: string[];
  age_range: string | null;
  is_public: boolean;
  is_featured: boolean;
  source_url: string | null;
};

const PUBLIC_COLS =
  "id,organization_name,partner_type,description,website_url,county,city,state,verification_status,collection_tags,pathway_categories,tags,audience_served,age_range,is_featured,source_url";

const ADMIN_COLS = "*";

// PUBLIC — uses admin client with explicit column projection (no PII)
export const listPublicPartners = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("partner_organizations")
    .select(PUBLIC_COLS)
    .eq("is_public", true)
    .in("verification_status", ["verified", "featured", "potential", "needs_review"])
    .order("is_featured", { ascending: false })
    .order("organization_name", { ascending: true });
  if (error) throw error;
  return { partners: (data ?? []) as Partial<PartnerRow>[] };
});

// SIGNED-IN — full directory
export const listPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("partner_organizations")
      .select(PUBLIC_COLS + ",partnership_status,outreach_status")
      .order("is_featured", { ascending: false })
      .order("organization_name", { ascending: true });
    if (error) throw error;
    return { partners: (data ?? []) as unknown as PartnerRow[] };
  });


// ADMIN — full data + opportunities
export const listAdminPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("partner_organizations")
      .select(ADMIN_COLS)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { partners: data ?? [] };
  });

export const getPartner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: partner, error } = await context.supabase
      .from("partner_organizations")
      .select(ADMIN_COLS)
      .eq("id", data.id)
      .single();
    if (error) throw error;
    const { data: opps } = await context.supabase
      .from("partner_network_opportunities")
      .select("*")
      .eq("partner_id", data.id)
      .order("opportunity_title");
    return { partner, opportunities: opps ?? [] };
  });

export const upsertPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    const payload = { ...data.values, updated_at: new Date().toISOString() };
    if (data.id) {
      const { error } = await context.supabase
        .from("partner_organizations")
        .update(payload as never)
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("partner_organizations")
      .insert({ ...payload, created_by: context.userId } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id };
  });

export const setPartnerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      verification_status?: string;
      outreach_status?: string;
      is_featured?: boolean;
      is_public?: boolean;
    }) => d,
  )
  .handler(async ({ data, context }) => {
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("partner_organizations")
      .update({ ...patch, last_reviewed_at: new Date().toISOString() } as never)
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const deletePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partner_organizations")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const upsertOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; values: Record<string, unknown> }) => d)
  .handler(async ({ data, context }) => {
    if (data.id) {
      const { error } = await context.supabase
        .from("partner_network_opportunities")
        .update(data.values as never)
        .eq("id", data.id);
      if (error) throw error;
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("partner_network_opportunities")
      .insert(data.values as never)
      .select("id")
      .single();
    if (error) throw error;
    return { id: (row as { id: string }).id };
  });


export const savePartnerForStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: { student_id: string; partner_id?: string; opportunity_id?: string; notes?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("student_saved_partners").insert({
      student_id: data.student_id,
      partner_id: data.partner_id ?? null,
      opportunity_id: data.opportunity_id ?? null,
      saved_by_user_id: context.userId,
      notes: data.notes ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const listSavedPartnersForStudent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { student_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("student_saved_partners")
      .select("*, partner:partner_organizations(*), opportunity:partner_network_opportunities(*)")
      .eq("student_id", data.student_id);
    if (error) throw error;
    return { saved: rows ?? [] };
  });
