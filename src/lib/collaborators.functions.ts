import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getAppBaseUrl } from "@/lib/app-url.server";

// SECURITY: lazy-load service-role client to keep `client.server` out of client bundle graph.
let _supabaseAdmin: any;
async function getAdmin() {
  if (!_supabaseAdmin) {
    const m = await import("@/integrations/supabase/client.server");
    _supabaseAdmin = m.supabaseAdmin;
  }
  return _supabaseAdmin;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const lower = email.toLowerCase();
  try {
    let page = 1;
    while (true) {
      const { data: list, error } = await (await getAdmin()).auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) return null;
      const hit = list.users.find((u: { email?: string | null; id: string }) => (u.email ?? "").toLowerCase() === lower);
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
  .validator((i: unknown) => z.object({ student_id: z.string().uuid() }).parse(i))
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
  .validator((i: unknown) =>
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

    // Always create as pending with no pre-assigned user_id. The invitee must
    // explicitly accept the invite via the self-service accept flow — an editor
    // cannot silently grant instant access to another account.
    const { data: row, error } = await supabase
      .from("student_collaborators")
      .insert({
        student_id: data.student_id,
        invited_email: data.email,
        invited_by: userId,
        role: data.role,
        status: "pending",
        user_id: null,
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

    // Send branded invite email (best-effort; never block the invite on email failure).
    try {
      const origin = getAppBaseUrl();
      const authHeader = getRequestHeader("Authorization") ?? "";

      const [{ data: inviter }, { data: student }] = await Promise.all([
        supabase.from("profiles").select("full_name, first_name").eq("id", userId).maybeSingle(),
        supabase.from("students").select("first_name, last_name").eq("id", data.student_id).maybeSingle(),
      ]);
      const inviterName =
        (inviter?.full_name as string | null)?.trim() ||
        (inviter?.first_name as string | null)?.trim() ||
        "A TransitionForward user";
      const studentName =
        [student?.first_name, student?.last_name].filter(Boolean).join(" ").trim() ||
        "a student";

      await fetch(`${origin}/lovable/email/transactional/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({
          templateName: "collaborator-invitation",
          recipientEmail: data.email,
          idempotencyKey: `collab-invite-${row.id}`,
          templateData: {
            inviterName,
            studentName,
            roleLabel: data.role === "editor" ? "Editor" : "Viewer",
            acceptUrl: `${origin}/dashboard`,
            siteName: "TransitionForward",
          },
        }),
      });
    } catch (err) {
      console.error("collaborator invite email failed", err);
    }

    return row as Collaborator;
  });

export const updateCollaboratorRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        role: z.enum(["viewer", "editor"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Owner-only guard: only the student's owner may change collaborator roles.
    // Prevents an invitee from self-escalating viewer -> editor via their own RLS row.
    const { data: row, error: fetchErr } = await supabase
      .from("student_collaborators")
      .select("student_id, students:student_id(owner_id)")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr || !row) throw new Error("Collaborator not found.");
    const ownerId = (row as { students?: { owner_id?: string } }).students?.owner_id;
    if (!ownerId || ownerId !== userId) {
      throw new Error("Only the student owner can change collaborator roles.");
    }

    const { error } = await supabase
      .from("student_collaborators")
      .update({ role: data.role })
      .eq("id", data.id);
    if (error) throw new Error("Could not update role.");
    return { ok: true };
  });

export const removeCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
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
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { userId, claims } = context;
    const email = (claims.email as string | undefined)?.toLowerCase();

    // Use admin client: row may have user_id=null and RLS would block the update.
    const { data: row, error: fetchErr } = await (await getAdmin())
      .from("student_collaborators")
      .select("id, invited_email, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (fetchErr || !row) throw new Error("Invite not found.");
    if (row.status !== "pending") throw new Error("This invite is no longer pending.");

    const matchesEmail = email && row.invited_email.toLowerCase() === email;
    const matchesUser = row.user_id && row.user_id === userId;
    if (!matchesEmail && !matchesUser) {
      throw new Error("This invite isn't addressed to you.");
    }

    const { error } = await (await getAdmin())
      .from("student_collaborators")
      .update({ status: "accepted", user_id: userId })
      .eq("id", data.id);
    if (error) throw new Error("Could not accept invite.");
    return { ok: true };
  });

export const resendCollaboratorInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("student_collaborators")
      .select("id, student_id, invited_email, role, status")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !row) throw new Error("Invite not found.");
    if (row.status !== "pending") {
      throw new Error("This invite is no longer pending.");
    }

    try {
      const origin = getAppBaseUrl();
      const authHeader = getRequestHeader("Authorization") ?? "";
      const [{ data: inviter }, { data: student }] = await Promise.all([
        supabase.from("profiles").select("full_name, first_name").eq("id", userId).maybeSingle(),
        supabase.from("students").select("first_name, last_name").eq("id", row.student_id).maybeSingle(),
      ]);
      const inviterName =
        (inviter?.full_name as string | null)?.trim() ||
        (inviter?.first_name as string | null)?.trim() ||
        "A TransitionForward user";
      const studentName =
        [student?.first_name, student?.last_name].filter(Boolean).join(" ").trim() || "a student";

      await fetch(`${origin}/lovable/email/transactional/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authHeader },
        body: JSON.stringify({
          templateName: "collaborator-invitation",
          recipientEmail: row.invited_email,
          idempotencyKey: `collab-invite-resend-${row.id}-${Date.now()}`,
          templateData: {
            inviterName,
            studentName,
            roleLabel: row.role === "editor" ? "Editor" : "Viewer",
            acceptUrl: `${origin}/dashboard`,
            siteName: "TransitionForward",
          },
        }),
      });
    } catch (err) {
      console.error("resendCollaboratorInvite email failed", err);
      throw new Error("Could not resend invite email.");
    }

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
    const { data: rows, error } = await (await getAdmin())
      .from("student_collaborators")
      .select("*, student:students(first_name, last_name), inviter:profiles!student_collaborators_invited_by_fkey(full_name)")
      .eq("status", "pending")
      .or(`user_id.eq.${userId},invited_email.eq.${email}`)
      .order("created_at", { ascending: false });
    if (error) {
      // Fallback without the join (FK aliases may differ)
      const { data: plain } = await (await getAdmin())
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

