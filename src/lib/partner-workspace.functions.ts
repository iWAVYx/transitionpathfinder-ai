import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type PartnerOrg = {
  id: string;
  name: string;
  type: string;
  verified_status: string;
};

export type PartnerOpportunity = {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  opportunity_type: string;
  status: string;
  location: string | null;
  age_range: string | null;
  eligibility: string | null;
  application_url: string | null;
  contact_email: string | null;
  created_at: string;
};

export type PartnerWorkspace = {
  is_partner: boolean;
  orgs: PartnerOrg[];
  selected_org_id: string | null;
  opportunities: PartnerOpportunity[];
};

export const getPartnerWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<PartnerWorkspace> => {
    const { supabase, userId } = context;

    const { data: memberships } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "active");
    const orgIds = (memberships ?? []).map((m: { organization_id: string }) => m.organization_id);
    if (orgIds.length === 0) {
      return { is_partner: false, orgs: [], selected_org_id: null, opportunities: [] };
    }

    const { data: orgsData } = await supabase
      .from("organizations")
      .select("id, name, type, verified_status")
      .in("id", orgIds)
      .in("type", ["partner", "agency"]);
    const orgs = (orgsData ?? []) as PartnerOrg[];
    if (orgs.length === 0) {
      return { is_partner: false, orgs: [], selected_org_id: null, opportunities: [] };
    }

    const selectedOrgId =
      data.org_id && orgs.some((o) => o.id === data.org_id) ? data.org_id : orgs[0].id;

    const { data: opps } = await supabase
      .from("partner_opportunities")
      .select(
        "id, organization_id, title, description, opportunity_type, status, location, age_range, eligibility, application_url, contact_email, created_at",
      )
      .eq("organization_id", selectedOrgId)
      .order("created_at", { ascending: false });

    return {
      is_partner: true,
      orgs,
      selected_org_id: selectedOrgId,
      opportunities: (opps ?? []) as PartnerOpportunity[],
    };
  });

const opportunitySchema = z.object({
  organization_id: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  opportunity_type: z.string().trim().min(2).max(60),
  location: z.string().trim().max(200).optional(),
  age_range: z.string().trim().max(60).optional(),
  eligibility: z.string().trim().max(500).optional(),
  application_url: z.string().url().max(500).optional().or(z.literal("").transform(() => undefined)),
  contact_email: z.string().email().max(200).optional().or(z.literal("").transform(() => undefined)),
});

export const createOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => opportunitySchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("partner_opportunities")
      .insert({ ...data, status: "draft" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row?.id as string };
  });

export const updateOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().trim().min(2).max(200).optional(),
        description: z.string().trim().max(2000).optional(),
        status: z.enum(["draft", "submitted", "approved", "archived"]).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { error } = await supabase.from("partner_opportunities").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("partner_opportunities").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
