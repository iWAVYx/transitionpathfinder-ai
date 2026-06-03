import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- Types & constants ----------

export const ADMIN_ROLES = [
  "platform_owner",
  "platform_admin",
  "content_manager",
  "support_admin",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  platform_owner: "Platform Owner",
  platform_admin: "Platform Admin",
  content_manager: "Content Manager",
  support_admin: "Support / Admin Assistant",
};

export const WAITLIST_STATUSES = [
  "new",
  "reviewed",
  "contacted",
  "invited",
  "converted",
  "archived",
] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export const CONTACT_STATUSES = ["new", "reviewed", "replied", "archived"] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export type WaitlistEntry = {
  id: string;
  email: string;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  organization: string | null;
  state: string | null;
  city: string | null;
  interest_area: string | null;
  student_grade_band: string | null;
  reason: string | null;
  source: string | null;
  source_page: string | null;
  consent_to_contact: boolean;
  status: WaitlistStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type WaitlistNote = {
  id: string;
  waitlist_entry_id: string;
  admin_user_id: string;
  note: string;
  created_at: string;
  admin_name?: string | null;
};

export type ContactSubmission = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  phone: string | null;
  organization: string | null;
  inquiry_type: string;
  message: string;
  source_page: string | null;
  status: ContactStatus;
  internal_notes: string | null;
  created_at: string;
  updated_at: string | null;
};

export type SiteSetting = {
  setting_key: string;
  setting_value: any;
  is_public: boolean;
  updated_at: string | null;
};

export type ActivityLog = {
  id: string;
  admin_user_id: string;
  admin_name?: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, any>;
  created_at: string;
};

export type AdminUserSummary = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  admin_roles: AdminRole[];
  granted_at: string | null;
};

export type DashboardMetrics = {
  totalUsers: number;
  newUsersThisWeek: number;
  totalWaitlist: number;
  newWaitlist: number;
  newContacts: number;
  totalContacts: number;
  publishedResources: number;
  draftResources: number;
  partnerInquiries: number;
  recentActivity: ActivityLog[];
  siteStatus: {
    maintenanceMode: boolean;
    waitlistOpen: boolean;
    launchStatus: string;
  };
};

// ---------- Auth helpers ----------

async function requirePlatformAdmin(
  supabase: any,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["platform_owner", "platform_admin"])
    .limit(1)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Forbidden: Platform admin access required.");
  }
}

async function logActivity(
  supabase: any,
  userId: string,
  action_type: string,
  target_type: string | null,
  target_id: string | null,
  details: Record<string, unknown> = {},
) {
  await supabase.from("admin_activity_logs").insert({
    admin_user_id: userId,
    action_type,
    target_type,
    target_id,
    details,
  });
}

// ---------- Current admin status ----------

export const getMyAdminRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("admin_roles")
      .select("role, granted_at")
      .eq("user_id", userId);
    const roles = (data ?? []).map((r: any) => r.role as AdminRole);
    return {
      roles,
      isPlatformAdmin: roles.some(
        (r) => r === "platform_owner" || r === "platform_admin",
      ),
      isAnyAdmin: roles.length > 0,
    };
  });

// ---------- Dashboard ----------

export const getDashboardMetrics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      profilesAll,
      profilesNew,
      waitlistAll,
      waitlistNew,
      contactsAll,
      contactsNew,
      orgs,
      activity,
      settings,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", oneWeekAgo),
      supabase.from("waitlist").select("id", { count: "exact", head: true }),
      supabase
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("organizations")
        .select("id", { count: "exact", head: true })
        .eq("verified_status", "pending"),
      supabase
        .from("admin_activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15),
      supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["maintenance_mode", "waitlist_open", "launch_status"]),
    ]);

    const settingsMap = new Map<string, unknown>();
    for (const s of (settings.data ?? []) as Array<{ setting_key: string; setting_value: unknown }>) {
      settingsMap.set(s.setting_key, s.setting_value);
    }

    const metrics: DashboardMetrics = {
      totalUsers: profilesAll.count ?? 0,
      newUsersThisWeek: profilesNew.count ?? 0,
      totalWaitlist: waitlistAll.count ?? 0,
      newWaitlist: waitlistNew.count ?? 0,
      totalContacts: contactsAll.count ?? 0,
      newContacts: contactsNew.count ?? 0,
      publishedResources: 0, // Phase 3
      draftResources: 0,
      partnerInquiries: orgs.count ?? 0,
      recentActivity: (activity.data ?? []) as ActivityLog[],
      siteStatus: {
        maintenanceMode: Boolean(settingsMap.get("maintenance_mode")),
        waitlistOpen: Boolean(settingsMap.get("waitlist_open")),
        launchStatus: String(settingsMap.get("launch_status") ?? "private_beta"),
      },
    };
    return metrics;
  });

// ---------- Waitlist ----------

export const ownerListWaitlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      console.error("ownerListWaitlist failed", error);
      return { entries: [] as WaitlistEntry[] };
    }
    return { entries: (data ?? []) as WaitlistEntry[] };
  });

export const ownerGetWaitlistEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const [{ data: entry, error: e1 }, { data: notes, error: e2 }] = await Promise.all([
      supabase.from("waitlist").select("*").eq("id", data.id).maybeSingle(),
      supabase
        .from("waitlist_admin_notes")
        .select("*")
        .eq("waitlist_entry_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (e1) throw new Error(e1.message);
    if (!entry) throw new Error("Not found");

    let notesWithNames: WaitlistNote[] = (notes ?? []) as WaitlistNote[];
    const adminIds = Array.from(new Set(notesWithNames.map((n) => n.admin_user_id)));
    if (adminIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", adminIds);
      const nameById = new Map<string, string | null>(
        (profs ?? []).map((p: any) => [p.id, p.full_name]),
      );
      notesWithNames = notesWithNames.map((n) => ({
        ...n,
        admin_name: nameById.get(n.admin_user_id) ?? null,
      }));
    }
    return { entry: entry as WaitlistEntry, notes: notesWithNames };
  });

export const ownerUpdateWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(WAITLIST_STATUSES).optional(),
        admin_notes: z.string().trim().max(4000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const patch: Record<string, any> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase.from("waitlist").update(patch as never).eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "waitlist_updated", "waitlist", data.id, patch);
    return { ok: true };
  });

export const ownerAddWaitlistNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        waitlist_entry_id: z.string().uuid(),
        note: z.string().trim().min(1).max(4000),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { error } = await supabase.from("waitlist_admin_notes").insert({
      waitlist_entry_id: data.waitlist_entry_id,
      admin_user_id: userId,
      note: data.note,
    });
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "waitlist_note_added", "waitlist", data.waitlist_entry_id);
    return { ok: true };
  });

export const ownerDeleteWaitlistEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { error } = await supabase.from("waitlist").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "waitlist_deleted", "waitlist", data.id);
    return { ok: true };
  });

// ---------- Contact submissions ----------

export const ownerListContacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("ownerListContacts failed", error);
      return { submissions: [] as ContactSubmission[] };
    }
    return { submissions: (data ?? []) as ContactSubmission[] };
  });

export const ownerUpdateContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(CONTACT_STATUSES).optional(),
        internal_notes: z.string().trim().max(4000).nullable().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const patch: Record<string, any> = {};
    if (data.status !== undefined) patch.status = data.status;
    if (data.internal_notes !== undefined) patch.internal_notes = data.internal_notes;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await supabase
      .from("contact_submissions")
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "contact_updated", "contact", data.id, patch);
    return { ok: true };
  });

export const ownerDeleteContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { error } = await supabase
      .from("contact_submissions")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "contact_deleted", "contact", data.id);
    return { ok: true };
  });

// Public contact submission (no auth required)
export const submitContactForm = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z
      .object({
        first_name: z.string().trim().min(1).max(100),
        last_name: z.string().trim().max(100).optional().nullable(),
        email: z.string().trim().toLowerCase().email().max(320),
        phone: z.string().trim().max(40).optional().nullable(),
        organization: z.string().trim().max(200).optional().nullable(),
        inquiry_type: z.string().trim().max(50).default("general"),
        message: z.string().trim().min(1).max(5000),
        source_page: z.string().trim().max(200).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("contact_submissions").insert({
      first_name: data.first_name,
      last_name: data.last_name ?? null,
      email: data.email,
      phone: data.phone ?? null,
      organization: data.organization ?? null,
      inquiry_type: data.inquiry_type,
      message: data.message,
      source_page: data.source_page ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Site settings ----------

export const ownerListSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("site_settings")
      .select("setting_key, setting_value, is_public, updated_at")
      .order("setting_key");
    if (error) throw new Error(error.message);
    return { settings: (data ?? []) as SiteSetting[] };
  });

export const ownerUpdateSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        setting_key: z.string().trim().min(1).max(100),
        setting_value: z.any(),
        is_public: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const upsertRow: Record<string, any> = {
      setting_key: data.setting_key,
      setting_value: data.setting_value,
      updated_by: userId,
    };
    if (data.is_public !== undefined) upsertRow.is_public = data.is_public;
    const { error } = await supabase
      .from("site_settings")
      .upsert(upsertRow, { onConflict: "setting_key" });
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "setting_changed", "setting", data.setting_key, {
      value: data.setting_value,
    });
    return { ok: true };
  });

// ---------- Activity logs ----------

export const ownerListActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("admin_activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      console.error("ownerListActivity failed", error);
      return { logs: [] as ActivityLog[] };
    }
    const logs = (data ?? []) as ActivityLog[];
    const adminIds = Array.from(new Set(logs.map((l) => l.admin_user_id)));
    if (adminIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", adminIds);
      const nameById = new Map<string, string | null>(
        (profs ?? []).map((p: any) => [p.id, p.full_name]),
      );
      for (const l of logs) l.admin_name = nameById.get(l.admin_user_id) ?? null;
    }
    return { logs };
  });

// ---------- Admin users ----------

export const ownerListAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);

    const { data: rows, error } = await supabase
      .from("admin_roles")
      .select("user_id, role, granted_at");
    if (error) throw new Error(error.message);

    const byUser = new Map<string, { roles: AdminRole[]; granted_at: string | null }>();
    for (const r of (rows ?? []) as Array<{
      user_id: string;
      role: AdminRole;
      granted_at: string;
    }>) {
      const e = byUser.get(r.user_id) ?? { roles: [], granted_at: null };
      e.roles.push(r.role);
      if (!e.granted_at || r.granted_at < e.granted_at) e.granted_at = r.granted_at;
      byUser.set(r.user_id, e);
    }

    const userIds = Array.from(byUser.keys());
    let profilesById = new Map<string, { full_name: string | null; email: string | null }>();
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      profilesById = new Map(
        (profs ?? []).map((p: any) => [p.id, { full_name: p.full_name, email: p.email }]),
      );
    }

    const users: AdminUserSummary[] = userIds.map((id) => ({
      user_id: id,
      email: profilesById.get(id)?.email ?? null,
      full_name: profilesById.get(id)?.full_name ?? null,
      admin_roles: byUser.get(id)!.roles.sort() as AdminRole[],
      granted_at: byUser.get(id)!.granted_at,
    }));
    users.sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
    return { users };
  });
