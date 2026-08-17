import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

const OPP_TYPES = [
  "internship",
  "job_shadowing",
  "volunteer_experience",
  "supported_employment",
  "day_program",
  "employment_exploration",
  "employment_enrichment",
  "certificate_program",
  "college_program",
  "technical_training",
  "mentorship",
  "independent_living_support",
  "transportation_support",
  "family_support",
  "agency_connection",
] as const;

export const opportunityItemSchema = z.object({
  opportunity_title: z.string().min(1, "Title is required").max(255, "Max 255 characters"),
  opportunity_type: z.string().refine((v) => (OPP_TYPES as readonly string[]).includes(v), {
    message: `Must be one of: ${OPP_TYPES.join(", ")}`,
  }),
  description: z.string().max(2000).optional().transform((v) => v?.trim() || null),
  location: z.string().max(255).optional().transform((v) => v?.trim() || null),
  county: z.string().max(255).optional().transform((v) => v?.trim() || null),
  pathway_category: z.string().max(255).optional().transform((v) => v?.trim() || null),
  age_range: z.string().max(50).optional().transform((v) => v?.trim() || null),
  eligibility: z.string().max(2000).optional().transform((v) => v?.trim() || null),
  support_level: z.string().max(255).optional().transform((v) => v?.trim() || null),
  schedule: z.string().max(255).optional().transform((v) => v?.trim() || null),
  cost_or_funding_notes: z.string().max(2000).optional().transform((v) => v?.trim() || null),
  application_url: z
    .union([z.string().url("Invalid URL").max(500), z.literal(""), z.null()])
    .optional()
    .transform((v) => v?.trim() || null),
  contact_email: z
    .union([z.string().email("Invalid email").max(255), z.literal(""), z.null()])
    .optional()
    .transform((v) => v?.trim() || null),
  next_step: z.string().max(1000).optional().transform((v) => v?.trim() || null),
  status: z.enum(["open", "waitlist", "closed", "archived"]).optional(),
  is_public: z.boolean().optional(),
});

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

// SIGNED-IN browse — wraps the public list. Includes opportunities count if needed in future.
export const listPartnersForBrowse = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("partner_organizations")
      .select(PUBLIC_COLS)
      .eq("is_public", true)
      .in("verification_status", ["verified", "featured", "potential", "needs_review"])
      .order("is_featured", { ascending: false })
      .order("organization_name", { ascending: true });
    if (error) throw error;
    return { partners: (data ?? []) as Partial<PartnerRow>[] };
  });

// ADMIN — full data + opportunities. Uses service-role client because
// column-level SELECT on PII (contact_email, phone, address, outreach_*,
// admin_notes, next_follow_up_date) is revoked from `authenticated`.
export const listAdminPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("partner_organizations")
      .select(ADMIN_COLS)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { partners: data ?? [] };
  });



export const setPartnerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
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


export const listOpportunitiesForPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { partner_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await requirePlatformAdmin(context.supabase, context.userId);
    const { data: rows, error } = await supabaseAdmin
      .from("partner_network_opportunities")
      .select("*")
      .eq("partner_id", data.partner_id)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return { opportunities: rows ?? [] };
  });

// Schema for upsert: every opportunity column the owner UI is allowed to
// write, including partner_id. Prevents writes to arbitrary columns even
// if a platform-admin session is compromised.
const upsertOpportunityInput = z.object({
  id: z.string().uuid().optional(),
  values: opportunityItemSchema.extend({
    partner_id: z.string().uuid(),
  }),
});

export const upsertOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => upsertOpportunityInput.parse(d))
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

export const bulkInsertOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { partner_id: string; items: unknown[] }) => d)
  .handler(async ({ data, context }) => {
    const errors: { row: number; field: string; message: string }[] = [];
    const valid: Record<string, unknown>[] = [];

    for (let idx = 0; idx < data.items.length; idx++) {
      const result = opportunityItemSchema.safeParse(data.items[idx]);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          errors.push({ row: idx, field: issue.path.join("."), message: issue.message });
        });
      } else {
        valid.push({
          partner_id: data.partner_id,
          status: "open",
          is_public: true,
          ...result.data,
        });
      }
    }

    if (errors.length > 0) {
      return { ok: false, errors, inserted: 0 };
    }

    if (valid.length === 0) {
      return { ok: false, errors: [{ row: 0, field: "items", message: "No valid items to import" }], inserted: 0 };
    }

    const { error } = await context.supabase
      .from("partner_network_opportunities")
      .insert(valid as never);
    if (error) throw error;
    return { ok: true, errors: [] as typeof errors, inserted: valid.length };
  });


export const archiveOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string; status?: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partner_network_opportunities")
      .update({ status: data.status ?? "archived" } as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const deleteOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partner_network_opportunities")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });




