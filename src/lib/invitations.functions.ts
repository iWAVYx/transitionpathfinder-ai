import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * General-purpose invitations (school/district/partner/student-connection).
 * Platform-admin invites still live in `admin_invitations` and are managed in
 * `src/lib/owner/owner.functions.ts`. This module operates on the new
 * `public.invitations` table.
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

// `token` is intentionally excluded — the column is not readable by the
// authenticated role. Inviters fetch tokens via `get_invitation_share_token`,
// and invitees redeem via `accept_invitation_by_token`.
export type Invitation = {
  id: string;
  email: string;
  invited_role: string;
  invited_by_user_id: string;
  organization_id: string | null;
  student_profile_id: string | null;
  invitation_type: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  message: string | null;
  created_at: string;
  updated_at: string;
};

const INVITATION_COLS =
  "id,email,invited_role,invited_by_user_id,organization_id,student_profile_id,invitation_type,status,expires_at,accepted_at,accepted_by,revoked_at,message,created_at,updated_at";


function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const createInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        invited_role: INVITED_ROLE,
        invitation_type: INVITATION_TYPE,
        organization_id: z.string().uuid().optional().nullable(),
        student_profile_id: z.string().uuid().optional().nullable(),
        message: z.string().trim().max(2000).optional(),
        expires_in_days: z.number().int().min(1).max(60).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ttl = data.expires_in_days ?? 14;
    const expires_at = new Date(Date.now() + ttl * 24 * 60 * 60 * 1000).toISOString();
    const token = randomToken();

    const { data: row, error } = await supabase
      .from("invitations")
      .insert({
        email: data.email.toLowerCase(),
        invited_role: data.invited_role,
        invitation_type: data.invitation_type,
        organization_id: data.organization_id ?? null,
        student_profile_id: data.student_profile_id ?? null,
        message: data.message ?? null,
        invited_by_user_id: userId,
        status: "pending",
        token,
        expires_at,
      } as never)
      .select(INVITATION_COLS)
      .single();
    if (error) {
      console.error("createInvitation failed", error);
      throw new Error("Could not create invitation.");
    }
    // Return the freshly-generated token to the inviter so they can build the
    // share URL. After this response it can only be retrieved via the
    // `get_invitation_share_token` RPC (inviter or platform admin only).
    return { invitation: row as Invitation, token };
  });

export const getInvitationShareToken = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: token, error } = await context.supabase.rpc(
      "get_invitation_share_token",
      { _invitation_id: data.id },
    );
    if (error) throw new Error("Could not load invitation token.");
    return { token: (token as string | null) ?? null };
  });

export const listMyInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Invites the user sent...
    const [sent, claims] = await Promise.all([
      supabase
        .from("invitations")
        .select(INVITATION_COLS)
        .eq("invited_by_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(100),
      // ...and invites addressed to their email.
      supabase.auth.getUser(),
    ]);
    const email = claims.data.user?.email?.toLowerCase() ?? "";
    const incoming = email
      ? await supabase
          .from("invitations")
          .select(INVITATION_COLS)
          .eq("email", email)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(100)
      : { data: [], error: null };

    return {
      sent: (sent.data ?? []) as Invitation[],
      incoming: (incoming.data ?? []) as Invitation[],
    };
  });

export const acceptInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z.object({ token: z.string().min(8).max(128) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase.rpc(
      "accept_invitation_by_token",
      { _token: data.token },
    );
    if (error) {
      throw new Error(error.message || "Could not accept invitation.");
    }
    const first = Array.isArray(rows) ? rows[0] : rows;
    const invitation_type =
      (first as { invitation_type?: string } | null)?.invitation_type ?? null;
    return { ok: true as const, invitation_type };
  });

export const revokeInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("invitations")
      .update({ status: "revoked", revoked_at: new Date().toISOString() } as never)
      .eq("id", data.id)
      .eq("invited_by_user_id", userId);
    if (error) throw new Error("Could not revoke invitation.");
    return { ok: true };
  });
