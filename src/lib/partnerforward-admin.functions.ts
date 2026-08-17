import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

const ResourceInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  category: z.enum([
    "tax_credit","tax_deduction","grant","workforce_program",
    "accessibility_support","inclusive_hiring","disability_awareness_training",
    "vocational_rehabilitation","sponsorship","technical_assistance",
    "funding_opportunity","employer_support","other",
  ]),
  summary: z.string().trim().max(2000).optional().nullable(),
  partner_value: z.string().trim().max(2000).optional().nullable(),
  eligibility_notes: z.string().trim().max(4000).optional().nullable(),
  action_steps: z.string().trim().max(4000).optional().nullable(),
  official_url: z.string().trim().max(500).optional().nullable(),
  source_name: z.string().trim().max(200).optional().nullable(),
  source_type: z
    .enum(["federal","state_ct","local","nonprofit","workforce_board","foundation","internal"])
    .optional()
    .nullable(),
  status: z.enum(["draft","needs_review","verified","published","archived"]),
  legal_financial_disclaimer_required: z.boolean().default(false),
  cautious_disclaimer: z.string().trim().max(1000).optional().nullable(),
});

export const adminListResources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("partnerforward_resources")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { resources: data ?? [] };
  });

export const adminUpsertResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => ResourceInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const payload = {
      ...data,
      created_by: context.userId,
      last_verified_at:
        data.status === "verified" || data.status === "published"
          ? new Date().toISOString()
          : null,
    };
    const { data: row, error } = await context.supabase
      .from("partnerforward_resources")
      .upsert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminReviewResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        resource_id: z.string().uuid(),
        action: z.string().trim().min(1).max(60),
        notes: z.string().trim().max(2000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("partnerforward_admin_reviews")
      .insert({
        resource_id: data.resource_id,
        reviewer_id: context.userId,
        action: data.action,
        notes: data.notes ?? null,
      });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminArchiveResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("partnerforward_resources")
      .update({ status: "archived" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
