import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Platform-admin action: convert a waitlist row into a real invitation in the
 * `public.invitations` table. Marks the waitlist row as `invited` and stamps
 * `invited_at`. Does NOT send email — that hooks into the existing email
 * pipeline separately.
 */

const INVITED_ROLE = z.enum([
  "parent",
  "student",
  "educator",
  "case_manager",
  "school_admin",
  "district_admin",
  "partner",
]);

const INVITATION_TYPE = z.enum([
  "connect_to_student",
  "join_school",
  "join_district",
  "join_partner_org",
]);

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const convertWaitlistToInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        waitlist_id: z.string().uuid(),
        invited_role: INVITED_ROLE,
        invitation_type: INVITATION_TYPE,
        organization_id: z.string().uuid().optional().nullable(),
        message: z.string().trim().max(2000).optional(),
        expires_in_days: z.number().int().min(1).max(60).default(14),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin, error: roleErr } = await supabase.rpc("is_platform_admin", {
      _user_id: userId,
    });
    if (roleErr || !isAdmin) throw new Error("Not authorized.");

    const { data: row, error: wErr } = await supabase
      .from("waitlist")
      .select("id, email, full_name")
      .eq("id", data.waitlist_id)
      .maybeSingle();
    if (wErr || !row) throw new Error("Waitlist entry not found.");

    const token = randomToken();
    const expires_at = new Date(
      Date.now() + data.expires_in_days * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: invite, error: invErr } = await supabase
      .from("invitations")
      .insert({
        email: (row as { email: string }).email.toLowerCase(),
        invited_role: data.invited_role,
        invitation_type: data.invitation_type,
        organization_id: data.organization_id ?? null,
        message: data.message ?? null,
        invited_by_user_id: userId,
        status: "pending",
        token,
        expires_at,
      } as never)
      .select("id")
      .single();
    if (invErr) {
      console.error("convertWaitlistToInvitation: invite insert failed", invErr);
      throw new Error("Could not create invitation.");
    }

    const { error: updErr } = await supabase
      .from("waitlist")
      .update({
        status: "invited",
        converted_invitation_id: (invite as { id: string }).id,
      } as never)
      .eq("id", data.waitlist_id);
    if (updErr) console.error("convertWaitlistToInvitation: waitlist update failed", updErr);

    // Token comes from the locally generated value rather than re-reading it
    // from the row — the `token` column is no longer SELECT-able directly
    // through RLS by non-platform-admin clients.
    return { ok: true, invitation: { id: (invite as { id: string }).id, token } };
  });
