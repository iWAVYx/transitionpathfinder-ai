import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SUB_STATUS = [
  "pending_review",
  "approved",
  "declined",
  "needs_more_info",
  "archived",
] as const;

const publicSubmissionSchema = z.object({
  organization_name: z.string().trim().min(1).max(255),
  organization_type: z.string().max(100).optional().transform((v) => v?.trim() || null),
  contact_name: z.string().trim().min(1).max(255),
  contact_email: z.string().trim().email().max(255),
  contact_phone: z.string().max(50).optional().transform((v) => v?.trim() || null),
  website_url: z
    .union([z.string().url().max(500), z.literal(""), z.null()])
    .optional()
    .transform((v) => v?.trim() || null),
  region: z.string().max(255).optional().transform((v) => v?.trim() || null),
  services_offered: z.string().max(5000).optional().transform((v) => v?.trim() || null),
  audience_served: z.string().max(2000).optional().transform((v) => v?.trim() || null),
  pathway_fit: z.string().max(500).optional().transform((v) => v?.trim() || null),
  age_range: z.string().max(50).optional().transform((v) => v?.trim() || null),
  message: z.string().max(5000).optional().transform((v) => v?.trim() || null),
  consent_to_contact: z.boolean().default(true),
});

// Public — anyone can submit, uses admin client to bypass auth-only RLS context (insert policy still validates shape)
export const submitPartnerApplication = createServerFn({ method: "POST" })
  .validator((d: unknown) => publicSubmissionSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("partner_submissions")
      .insert({ ...data, source: "partners-apply" } as never);
    if (error) throw error;
    return { ok: true };
  });

// Admin — list submissions
export const listPartnerSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("partner_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return { submissions: data ?? [] };
  });

// Admin — update status, notes
export const updateSubmissionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    (d: { id: string; status: (typeof SUB_STATUS)[number]; admin_notes?: string }) => d,
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partner_submissions")
      .update({
        status: data.status,
        admin_notes: data.admin_notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

// Admin — approve & promote into a partner record
export const approveSubmissionToPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: sub, error: e1 } = await context.supabase
      .from("partner_submissions")
      .select("*")
      .eq("id", data.id)
      .single();
    if (e1 || !sub) throw e1 ?? new Error("Submission not found");

    const submission = sub as unknown as {
      organization_name: string;
      organization_type: string | null;
      contact_email: string;
      contact_phone: string | null;
      website_url: string | null;
      region: string | null;
      services_offered: string | null;
      audience_served: string | null;
      pathway_fit: string | null;
      age_range: string | null;
      message: string | null;
    };

    const { data: partner, error: e2 } = await context.supabase
      .from("partner_organizations")
      .insert({
        organization_name: submission.organization_name,
        partner_type: "nonprofit",
        description: submission.services_offered ?? submission.message ?? null,
        contact_email: submission.contact_email,
        phone: submission.contact_phone,
        website_url: submission.website_url,
        service_area: submission.region,
        age_range: submission.age_range,
        audience_served: submission.audience_served ? [submission.audience_served] : null,
        pathway_categories: submission.pathway_fit ? [submission.pathway_fit] : null,
        state: "CT",
        verification_status: "needs_review",
        partnership_status: "submitted",
        outreach_status: "approved_partner",
        is_public: false,
        admin_notes: `Promoted from submission ${data.id}`,
        created_by: context.userId,
      } as never)
      .select("id")
      .single();
    if (e2 || !partner) throw e2 ?? new Error("Failed to create partner");

    await context.supabase
      .from("partner_submissions")
      .update({
        status: "approved",
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        promoted_partner_id: (partner as { id: string }).id,
      } as never)
      .eq("id", data.id);

    return { ok: true, partner_id: (partner as { id: string }).id };
  });
