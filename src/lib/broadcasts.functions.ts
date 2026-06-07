import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const APP_ROLES = [
  "student",
  "parent",
  "guardian",
  "educator",
  "teacher",
  "case_manager",
  "school_admin",
  "district_admin",
  "admin",
  "partner",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

export type Announcement = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  target_roles: string[];
  severity: "info" | "success" | "warning" | "critical";
  published: boolean;
  expires_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

async function requirePlatformAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["platform_owner", "platform_admin"])
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: Platform admin access required.");
}

// ---------- Admin: manage announcements ----------

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  link_url: z.string().trim().max(1000).url().optional().or(z.literal("").transform(() => undefined)),
  link_label: z.string().trim().max(100).optional().or(z.literal("").transform(() => undefined)),
  target_roles: z.array(z.string().min(1).max(50)).min(1).max(20),
  severity: z.enum(["info", "success", "warning", "critical"]).default("info"),
  published: z.boolean().default(true),
  expires_at: z.string().datetime().nullable().optional(),
});

export const createAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { data: row, error } = await supabaseAdmin
      .from("announcements")
      .insert({
        title: data.title,
        body: data.body,
        link_url: data.link_url ?? null,
        link_label: data.link_label ?? null,
        target_roles: data.target_roles,
        severity: data.severity,
        published: data.published,
        expires_at: data.expires_at ?? null,
        created_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as Announcement;
  });

export const listAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { data, error } = await supabaseAdmin
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { announcements: (data ?? []) as Announcement[] };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin.from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePublishAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ id: z.string().uuid(), published: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { error } = await supabaseAdmin
      .from("announcements")
      .update({ published: data.published })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Admin: export users by role ----------

export type RecipientRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
};

export const exportRecipientsByRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        roles: z.array(z.string().min(1).max(50)).min(1).max(20),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);

    // Find user_ids with at least one of the requested roles
    const { data: roleRows, error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .in("role", data.roles as any);
    if (roleErr) throw new Error(roleErr.message);

    const byUser = new Map<string, Set<string>>();
    for (const r of roleRows ?? []) {
      const set = byUser.get(r.user_id) ?? new Set<string>();
      set.add(r.role as string);
      byUser.set(r.user_id, set);
    }
    const userIds = Array.from(byUser.keys());
    if (userIds.length === 0) return { recipients: [] as RecipientRow[] };

    const { data: profiles, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, full_name, first_name, last_name")
      .in("id", userIds);
    if (profErr) throw new Error(profErr.message);

    const recipients: RecipientRow[] = (profiles ?? []).map((p: any) => ({
      user_id: p.id,
      email: p.email ?? null,
      full_name: p.full_name ?? null,
      first_name: p.first_name ?? null,
      last_name: p.last_name ?? null,
      roles: Array.from(byUser.get(p.id) ?? []),
    }));

    // Try to log activity (best-effort)
    try {
      await supabaseAdmin.from("admin_activity_logs").insert({
        admin_user_id: context.userId,
        action_type: "broadcast.export_recipients",
        target_type: "user_roles",
        target_id: null,
        details: { roles: data.roles, count: recipients.length } as any,
      });
    } catch {
      /* noop */
    }

    return { recipients };
  });

// ---------- User-facing: read & dismiss ----------

export const listMyAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // RLS scopes to targeted + published + not-expired
    const { data, error } = await supabase
      .from("announcements")
      .select("id, title, body, link_url, link_label, severity, created_at, expires_at, target_roles")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const { data: dismissed } = await supabase
      .from("announcement_dismissals")
      .select("announcement_id")
      .eq("user_id", userId);
    const dismissedSet = new Set((dismissed ?? []).map((d: any) => d.announcement_id));

    return {
      announcements: (data ?? []).map((a: any) => ({
        ...a,
        dismissed: dismissedSet.has(a.id),
      })),
    };
  });

export const dismissAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("announcement_dismissals")
      .upsert({ announcement_id: data.id, user_id: userId }, { onConflict: "announcement_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
