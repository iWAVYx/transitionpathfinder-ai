import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// SECURITY: lazy-load service-role client to keep `client.server` out of client bundle graph.
let _supabaseAdmin: any;
async function getAdmin() {
  if (!_supabaseAdmin) {
    const m = await import("@/integrations/supabase/client.server");
    _supabaseAdmin = m.supabaseAdmin;
  }
  return _supabaseAdmin;
}

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
  .validator((data) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { data: row, error } = await (await getAdmin())
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
    const { data, error } = await (await getAdmin())
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { announcements: (data ?? []) as Announcement[] };
  });

export const deleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { error } = await (await getAdmin()).from("announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const togglePublishAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z.object({ id: z.string().uuid(), published: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);
    const { error } = await (await getAdmin())
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
  .validator((data) =>
    z
      .object({
        roles: z.array(z.string().min(1).max(50)).min(1).max(20),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await requirePlatformAdmin(context.supabase, context.userId);

    // Find user_ids with at least one of the requested roles
    const { data: roleRows, error: roleErr } = await (await getAdmin())
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

    const { data: profiles, error: profErr } = await (await getAdmin())
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
      await (await getAdmin()).from("admin_activity_logs").insert({
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
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("announcement_dismissals")
      .upsert({ announcement_id: data.id, user_id: userId }, { onConflict: "announcement_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Engagement tracking ----------

async function primaryRoleFor(userId: string): Promise<string | null> {
  const { data } = await (await getAdmin())
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return (data?.role as string | undefined) ?? null;
}

export const trackAnnouncementView = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const role = await primaryRoleFor(userId);
    // Unique index on (announcement_id, user_id) WHERE event_type='view'
    // makes duplicate views a no-op.
    await (await getAdmin())
      .from("announcement_events")
      .insert({
        announcement_id: data.id,
        user_id: userId,
        event_type: "view",
        role,
      });
    return { ok: true };
  });

export const trackAnnouncementClick = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) =>
    z
      .object({
        id: z.string().uuid(),
        link_url: z.string().trim().max(2000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const role = await primaryRoleFor(userId);
    await (await getAdmin()).from("announcement_events").insert({
      announcement_id: data.id,
      user_id: userId,
      event_type: "click",
      role,
      link_url: data.link_url ?? null,
    });
    return { ok: true };
  });

export type AnnouncementEngagement = {
  announcement_id: string;
  views: number;
  clicks: number;
  unique_viewers: number;
  unique_clickers: number;
  by_role: Array<{ role: string; views: number; clicks: number }>;
  daily: Array<{ date: string; views: number; clicks: number }>;
  recent: Array<{
    user_id: string;
    email: string | null;
    full_name: string | null;
    role: string | null;
    event_type: "view" | "click";
    created_at: string;
  }>;
};

function startOfDay(d: Date) {
  const nd = new Date(d);
  nd.setHours(0, 0, 0, 0);
  return nd;
}

function formatISODate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getRangeBounds(range: "7d" | "30d" | "90d" | "custom", from?: string, to?: string) {
  const now = new Date();
  const end = startOfDay(now);
  let start = new Date(end);
  if (range === "7d") start.setDate(end.getDate() - 6);
  else if (range === "30d") start.setDate(end.getDate() - 29);
  else if (range === "90d") start.setDate(end.getDate() - 89);
  else if (range === "custom" && from && to) {
    start = startOfDay(new Date(from));
    const customEnd = startOfDay(new Date(to));
    if (customEnd >= start) {
      end.setTime(customEnd.getTime());
    }
  }
  return { start, end };
}

const engagementSchema = z.object({
  id: z.string().uuid(),
  range: z.enum(["7d", "30d", "90d", "custom"]).default("7d"),
  from: z.string().optional(),
  to: z.string().optional(),
  role: z.string().min(1).optional(),
});

export const getAnnouncementEngagement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data) => engagementSchema.parse(data))
  .handler(async ({ data, context }): Promise<AnnouncementEngagement> => {
    await requirePlatformAdmin(context.supabase, context.userId);

    const { start, end } = getRangeBounds(data.range, data.from, data.to);
    const startIso = start.toISOString();
    const endIso = new Date(end.getTime() + 86_400_000 - 1).toISOString();

    let query = (await getAdmin())
      .from("announcement_events")
      .select("user_id, event_type, role, created_at")
      .eq("announcement_id", data.id)
      .gte("created_at", startIso)
      .lte("created_at", endIso);
    if (data.role && data.role !== "all") {
      query = query.eq("role", data.role);
    }
    const { data: events, error } = await query
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);

    const rows = (events ?? []) as Array<{
      user_id: string;
      event_type: "view" | "click";
      role: string | null;
      created_at: string;
    }>;

    let views = 0;
    let clicks = 0;
    const viewers = new Set<string>();
    const clickers = new Set<string>();
    const byRole = new Map<string, { views: number; clicks: number }>();

    const daily = new Map<string, { views: number; clicks: number }>();
    const dayCount = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000) + 1);
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      daily.set(formatISODate(d), { views: 0, clicks: 0 });
    }

    for (const r of rows) {
      const roleKey = r.role ?? "unknown";
      const slot = byRole.get(roleKey) ?? { views: 0, clicks: 0 };
      const dayKey = formatISODate(new Date(r.created_at));
      const daySlot = daily.get(dayKey) ?? { views: 0, clicks: 0 };

      if (r.event_type === "view") {
        views++;
        viewers.add(r.user_id);
        slot.views++;
        daySlot.views++;
      } else {
        clicks++;
        clickers.add(r.user_id);
        slot.clicks++;
        daySlot.clicks++;
      }
      byRole.set(roleKey, slot);
      daily.set(dayKey, daySlot);
    }

    const dailySorted = Array.from(daily.entries())
      .map(([date, v]) => ({ date, ...v }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const recentRows = rows.slice(0, 25);
    const userIds = Array.from(new Set(recentRows.map((r) => r.user_id)));
    const profileMap = new Map<string, { email: string | null; full_name: string | null }>();
    if (userIds.length > 0) {
      const { data: profs } = await (await getAdmin())
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);
      for (const p of profs ?? []) {
        profileMap.set((p as any).id, {
          email: (p as any).email ?? null,
          full_name: (p as any).full_name ?? null,
        });
      }
    }

    return {
      announcement_id: data.id,
      views,
      clicks,
      unique_viewers: viewers.size,
      unique_clickers: clickers.size,
      by_role: Array.from(byRole.entries())
        .map(([role, v]) => ({ role, ...v }))
        .sort((a, b) => b.views + b.clicks - (a.views + a.clicks)),
      daily: dailySorted,
      recent: recentRows.map((r) => ({
        user_id: r.user_id,
        email: profileMap.get(r.user_id)?.email ?? null,
        full_name: profileMap.get(r.user_id)?.full_name ?? null,
        role: r.role,
        event_type: r.event_type,
        created_at: r.created_at,
      })),
    };
  });
