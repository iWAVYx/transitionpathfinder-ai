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

export const listMyInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    // Pending invites where user_id matches OR (best-effort) invited_email matches user's email.
    // RLS limits to rows the caller can see (student access OR own row).
    const { data: rows } = await supabase
      .from("student_collaborators")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    return { invites: (rows ?? []) as Collaborator[] };
  });
