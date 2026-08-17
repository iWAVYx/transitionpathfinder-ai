import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CHANNELS = ["email", "phone", "meeting", "event", "other"] as const;
const OUTCOMES = ["no_response", "interested", "declined", "follow_up", "approved"] as const;

const outreachSchema = z.object({
  partner_id: z.string().uuid(),
  channel: z.enum(CHANNELS).default("email"),
  contact_person: z.string().max(255).optional().transform((v) => v?.trim() || null),
  summary: z.string().min(1, "Summary required").max(5000),
  outcome: z.enum(OUTCOMES).optional(),
  next_follow_up_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date (YYYY-MM-DD)")
    .optional()
    .nullable(),
  contacted_at: z.string().optional(),
});

export const listOutreachForPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { partner_id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("partner_outreach_log")
      .select("*")
      .eq("partner_id", data.partner_id)
      .order("contacted_at", { ascending: false });
    if (error) throw error;
    return { entries: rows ?? [] };
  });

export const listAllOutreach = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("partner_outreach_log")
      .select("*, partner:partner_organizations(id,organization_name,partner_type,outreach_status)")
      .order("contacted_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    return { entries: data ?? [] };
  });

export const addOutreachEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => outreachSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("partner_outreach_log").insert({
      ...data,
      logged_by: context.userId,
    } as never);
    if (error) throw error;
    // Cascade follow-up date and outcome onto the partner record for filter convenience
    const patch: Record<string, unknown> = {};
    if (data.next_follow_up_date) patch.next_follow_up_date = data.next_follow_up_date;
    if (data.outcome === "approved") patch.outreach_status = "approved_partner";
    else if (data.outcome === "interested") patch.outreach_status = "in_conversation";
    else if (data.outcome === "follow_up") patch.outreach_status = "needs_follow_up";
    else if (data.outcome === "declined") patch.outreach_status = "declined";
    if (Object.keys(patch).length > 0) {
      await context.supabase
        .from("partner_organizations")
        .update(patch as never)
        .eq("id", data.partner_id);
    }
    return { ok: true };
  });

export const deleteOutreachEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("partner_outreach_log")
      .delete()
      .eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
