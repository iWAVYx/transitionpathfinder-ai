import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAuthorized } from "./authz";
import { requireFeatureEntitlement } from "./entitlement-guard";

export type PartnerOrg = {
  id: string;
  name: string;
  type: string;
  verified_status: string;
  website: string | null;
  contact_email: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
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
  selected_org: PartnerOrg | null;
  opportunities: PartnerOpportunity[];
};

const ORG_SELECT =
  "id, name, type, verified_status, website, contact_email, city, state, address";

// DB-allowed statuses for partner_opportunities
const OPP_STATUS = ["draft", "pending_review", "approved", "inactive"] as const;
// DB-allowed opportunity types
const OPP_TYPE = [
  "college_program",
  "technical_school",
  "certificate_program",
  "employer",
  "internship",
  "mentorship",
  "job_shadowing",
  "agency_support",
  "community_resource",
] as const;

export const getPartnerWorkspace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ org_id: z.string().uuid().optional() }).parse(i ?? {}),
  )
  .handler(async ({ data, context }): Promise<PartnerWorkspace> => {
    const { supabase, userId } = context;

    // Membership check runs under the user's RLS context (cannot be spoofed).
    const { data: memberships } = await supabase
      .from("organization_memberships")
      .select("organization_id")
      .eq("user_id", userId)
      .eq("status", "active");
    const orgIds = (memberships ?? []).map((m: { organization_id: string }) => m.organization_id);
    if (orgIds.length === 0) {
      return { is_partner: false, orgs: [], selected_org: null, opportunities: [] };
    }

    // contact_email column SELECT is revoked from the authenticated role,
    // so we elevate to the service role here AFTER confirming the caller is
    // an active member of these specific orgs.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: orgsData } = await supabaseAdmin
      .from("organizations")
      .select(ORG_SELECT)
      .in("id", orgIds)
      .in("type", ["partner", "agency"]);
    const orgs = (orgsData ?? []) as PartnerOrg[];
    if (orgs.length === 0) {
      return { is_partner: false, orgs: [], selected_org: null, opportunities: [] };
    }

    const selected =
      (data.org_id && orgs.find((o) => o.id === data.org_id)) || orgs[0];

    const { data: opps } = await supabaseAdmin
      .from("partner_opportunities")
      .select(
        "id, organization_id, title, description, opportunity_type, status, location, age_range, eligibility, application_url, contact_email, created_at",
      )
      .eq("organization_id", selected.id)
      .order("created_at", { ascending: false });

    return {
      is_partner: true,
      orgs,
      selected_org: selected,
      opportunities: (opps ?? []) as PartnerOpportunity[],
    };
  });

const opportunitySchema = z.object({
  organization_id: z.string().uuid(),
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).optional(),
  opportunity_type: z.enum(OPP_TYPE),
  location: z.string().trim().max(200).optional(),
  age_range: z.string().trim().max(60).optional(),
  eligibility: z.string().trim().max(500).optional(),
  application_url: z
    .string()
    .url()
    .max(500)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contact_email: z
    .string()
    .email()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

export const createOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => opportunitySchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireFeatureEntitlement(supabase, userId, "partner");
    await assertAuthorized(
      { supabase, userId, action: "publish_opportunity", resourceType: "partner_capability" },
      "Your partner tier doesn't allow publishing opportunities.",
    );
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
        status: z.enum(OPP_STATUS).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAuthorized(
      { supabase, userId, action: "publish_opportunity", resourceType: "partner_capability" },
      "Your partner tier doesn't allow editing opportunities.",
    );
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

// Bootstrap: create a partner organization and add the current user as
// an active admin member. Used when a partner user has no org yet.
export const createPartnerOrg = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        name: z.string().trim().min(2).max(200),
        type: z.enum(["partner", "agency"]).default("partner"),
        website: z
          .string()
          .url()
          .max(500)
          .optional()
          .or(z.literal("").transform(() => undefined)),
        contact_email: z
          .string()
          .email()
          .max(200)
          .optional()
          .or(z.literal("").transform(() => undefined)),
        city: z.string().trim().max(120).optional(),
        state: z.string().trim().max(60).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    // organizations INSERT is admin-only and organization_memberships INSERT
    // requires the caller to already be an org admin — bootstrap with the
    // admin client so the very first partner org + admin membership work.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: org, error } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: data.name,
        type: data.type,
        website: data.website ?? null,
        contact_email: data.contact_email ?? null,
        city: data.city ?? null,
        state: data.state ?? null,
        verified_status: "pending",
      })
      .select("id")
      .single();
    if (error || !org) throw new Error(error?.message ?? "Could not create organization");

    const { error: mErr } = await supabaseAdmin.from("organization_memberships").insert({
      organization_id: org.id,
      user_id: userId,
      role_within_org: "admin",
      status: "active",
    });
    if (mErr) throw new Error(mErr.message);
    return { id: org.id as string };
  });

export const updatePartnerOrgProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        name: z.string().trim().min(2).max(200).optional(),
        website: z
          .string()
          .url()
          .max(500)
          .optional()
          .or(z.literal("").transform(() => undefined)),
        contact_email: z
          .string()
          .email()
          .max(200)
          .optional()
          .or(z.literal("").transform(() => undefined)),
        city: z.string().trim().max(120).optional(),
        state: z.string().trim().max(60).optional(),
        address: z.string().trim().max(300).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { id, ...patch } = data;
    const { error } = await supabase.from("organizations").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

