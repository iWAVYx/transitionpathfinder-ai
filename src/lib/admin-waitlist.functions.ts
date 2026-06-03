import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const WAITLIST_STATUSES = ["new", "contacted", "invited", "archived"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export type WaitlistEntry = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  state: string | null;
  student_grade_band: string | null;
  reason: string | null;
  source: string | null;
  status: WaitlistStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export const updateWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "contacted", "invited", "archived"]).optional(),
        admin_notes: z.string().trim().max(4000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!ok) throw new Error("Admins only.");
    const patch: { status?: string; admin_notes?: string | null } = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("waitlist").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export type RoleAssignment = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  roles: string[];
  created_at: string | null;
};

async function isAdmin(supabase: any, userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return Boolean(data);
}

async function requireAdmin(supabase: any, userId: string) {
  if (!(await isAdmin(supabase, userId))) {
    throw new Error("Admins only.");
  }
}

export const listWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("listWaitlist failed", error);
      return { entries: [] as WaitlistEntry[] };
    }
    return { entries: (data ?? []) as WaitlistEntry[] };
  });

export const deleteWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { error } = await supabase.from("waitlist").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const claimAdminBootstrap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase.rpc("claim_admin_if_unclaimed");
    if (error) throw new Error(error.message);
    return { claimed: Boolean(data) };
  });

export const listUserRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    // Roles table (RLS-readable by admin)
    const { data: roleRows, error: roleErr } = await supabase
      .from("user_roles")
      .select("user_id, role, created_at")
      .order("created_at", { ascending: false });
    if (roleErr) {
      console.error("listUserRoles roles failed", roleErr);
      return { users: [] as RoleAssignment[] };
    }
    const byUser = new Map<string, { roles: Set<string>; created_at: string | null }>();
    for (const r of roleRows ?? []) {
      const entry = byUser.get(r.user_id) ?? { roles: new Set<string>(), created_at: null };
      entry.roles.add(r.role);
      if (!entry.created_at || (r.created_at && r.created_at < entry.created_at)) {
        entry.created_at = r.created_at;
      }
      byUser.set(r.user_id, entry);
    }

    // Profile names + admin auth emails
    const userIds = Array.from(byUser.keys());
    const profiles = userIds.length
      ? (
          await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", userIds)
        ).data ?? []
      : [];
    const nameById = new Map<string, string | null>(
      profiles.map((p: any) => [p.id, p.full_name]),
    );

    // Emails via admin client (auth.users not exposed via PostgREST)
    const emailById = new Map<string, string | null>();
    try {
      // Paginate up to ~1000 users for now
      let page = 1;
      while (true) {
        const { data: list, error: aerr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (aerr) break;
        for (const u of list.users) emailById.set(u.id, u.email ?? null);
        if (list.users.length < 200) break;
        page++;
        if (page > 5) break;
      }
    } catch (e) {
      console.error("admin.listUsers failed", e);
    }

    const users: RoleAssignment[] = userIds.map((id) => ({
      user_id: id,
      email: emailById.get(id) ?? null,
      full_name: nameById.get(id) ?? null,
      roles: Array.from(byUser.get(id)!.roles).sort(),
      created_at: byUser.get(id)!.created_at,
    }));
    users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return { users };
  });

const RoleEnum = z.enum(["admin", "parent", "educator", "case_manager"]);

export const grantRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        role: RoleEnum,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);

    // Resolve user by email via admin auth API
    let foundId: string | null = null;
    try {
      let page = 1;
      while (true) {
        const { data: list, error: aerr } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (aerr) break;
        const hit = list.users.find((u) => (u.email ?? "").toLowerCase() === data.email);
        if (hit) {
          foundId = hit.id;
          break;
        }
        if (list.users.length < 200) break;
        page++;
        if (page > 5) break;
      }
    } catch (e) {
      console.error("grantRole admin lookup failed", e);
    }
    if (!foundId) {
      throw new Error(`No account found for ${data.email}. They need to sign up first.`);
    }
    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: foundId, role: data.role });
    if (error && !/duplicate key/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true, user_id: foundId };
  });

export const revokeRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        role: RoleEnum,
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    if (data.user_id === userId && data.role === "admin") {
      // Prevent admin lockout: ensure at least one other admin remains
      const { data: others } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .neq("user_id", userId);
      if (!others || others.length === 0) {
        throw new Error("You're the only admin — promote someone else before stepping down.");
      }
    }
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
