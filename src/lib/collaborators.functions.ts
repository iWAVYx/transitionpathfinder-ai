import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function findUserIdByEmail(email: string): Promise<string | null> {
  const lower = email.toLowerCase();
  try {
    let page = 1;
    while (true) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) return null;
      const hit = list.users.find((u) => (u.email ?? "").toLowerCase() === lower);
      if (hit) return hit.id;
      if (list.users.length < 200) return null;
      page++;
      if (page > 5) return null;
    }
  } catch {
    return null;
  }
}

export type Collaborator = {
  id: string;
  student_id: string;
  user_id: string | null;
  invited_email: string;
  invited_by: string;
  role: "viewer" | "editor";
  status: "pending" | "accepted" | "revoked";
  created_at: string;
  updated_at: string;
};

export const listCollaborators = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("student_collaborators")
      .select("*")
      .eq("student_id", data.student_id)
      .order("created_at", { ascending: true });
    if (error) {
      console.error("listCollaborators failed", error);
      return { collaborators: [] as Collaborator[] };
    }
    return { collaborators: (rows ?? []) as Collaborator[] };
  });

export const inviteCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        student_id: z.string().uuid(),
        email: z.string().trim().toLowerCase().email().max(255),
        role: z.enum(["viewer", "editor"]).default("viewer"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Resolve invitee by email via admin auth API (auth.users isn't exposed via PostgREST).
    const invitedUserId = await findUserIdByEmail(data.email);

    const { data: row, error } = await supabase
      .from("student_collaborators")
      .insert({
        student_id: data.student_id,
        invited_email: data.email,
        invited_by: userId,
        role: data.role,
        status: "pending",
        user_id: invitedUserId,
      })
      .select("*")
      .single();

    if (error || !row) {
      console.error("inviteCollaborator failed", error);
      throw new Error("Could not send invite.");
    }

    // Audit log (best effort)
    await supabase.from("audit_log").insert({
      actor_id: userId,
      action: "collaborator.invited",
      entity_type: "student_collaborator",
      entity_id: row.id,
      student_id: data.student_id,
      metadata: { email: data.email, role: data.role },
    });

    return row as Collaborator;
  });

export const updateCollaboratorRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        role: z.enum(["viewer", "editor"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("student_collaborators")
      .update({ role: data.role })
      .eq("id", data.id);
    if (error) throw new Error("Could not update role.");
    return { ok: true };
  });

export const removeCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("student_collaborators")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error("Could not remove collaborator.");
    return { ok: true };
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("student_collaborators")
      .update({ status: "accepted", user_id: userId })
      .eq("id", data.id);
    if (error) throw new Error("Could not accept invite.");
    return { ok: true };
  });

export type InviteWithStudent = Collaborator & {
  student_first_name: string | null;
  student_last_name: string | null;
  inviter_name: string | null;
};

export const listMyInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId, claims } = context;
    const email = (claims.email as string | undefined)?.toLowerCase();
    if (!email) return { invites: [] as InviteWithStudent[] };

    // Use admin client: RLS would hide invites whose user_id isn't yet linked.
    const { data: rows, error } = await supabaseAdmin
      .from("student_collaborators")
      .select("*, student:students(first_name, last_name), inviter:profiles!student_collaborators_invited_by_fkey(full_name)")
      .eq("status", "pending")
      .or(`user_id.eq.${userId},invited_email.eq.${email}`)
      .order("created_at", { ascending: false });
    if (error) {
      // Fallback without the join (FK aliases may differ)
      const { data: plain } = await supabaseAdmin
        .from("student_collaborators")
        .select("*, student:students(first_name, last_name)")
        .eq("status", "pending")
        .or(`user_id.eq.${userId},invited_email.eq.${email}`)
        .order("created_at", { ascending: false });
      const invites: InviteWithStudent[] = (plain ?? []).map((r: any) => ({
        ...(r as Collaborator),
        student_first_name: r.student?.first_name ?? null,
        student_last_name: r.student?.last_name ?? null,
        inviter_name: null,
      }));
      return { invites };
    }
    const invites: InviteWithStudent[] = (rows ?? []).map((r: any) => ({
      ...(r as Collaborator),
      student_first_name: r.student?.first_name ?? null,
      student_last_name: r.student?.last_name ?? null,
      inviter_name: r.inviter?.full_name ?? null,
    }));
    return { invites };
  });

