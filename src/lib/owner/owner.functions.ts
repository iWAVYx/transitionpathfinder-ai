import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestHeader } from "@tanstack/react-start/server";
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

// ---------- Resources (Resource Library) ----------

export const RESOURCE_TYPES = [
  "article",
  "video",
  "podcast",
  "book",
  "checklist",
  "assessment",
  "worksheet",
  "guide",
  "online_tool",
  "local_program",
] as const;
export const RESOURCE_AUDIENCES = [
  "student",
  "parent_guardian",
  "teacher",
  "school_admin",
  "partner",
  "all",
] as const;
export const RESOURCE_VERIFIED_STATUSES = ["pending", "verified", "rejected"] as const;
export type ResourceVerifiedStatus = (typeof RESOURCE_VERIFIED_STATUSES)[number];

export type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  resource_type: string;
  audience: string;
  topic: string | null;
  format: string | null;
  grade_range: string | null;
  age_range: string | null;
  reading_level: string | null;
  location_scope: string;
  estimated_time: string | null;
  url: string | null;
  image_url: string | null;
  source_name: string | null;
  verified_status: ResourceVerifiedStatus;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
};

async function requireAnyAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error("Forbidden: Admin Hub access required.");
}

export const ownerListResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAnyAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("resources")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) {
      console.error("ownerListResources failed", error);
      return { resources: [] as ResourceRow[] };
    }
    return { resources: (data ?? []) as ResourceRow[] };
  });

const resourceInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(4000).optional().nullable(),
  resource_type: z.enum(RESOURCE_TYPES),
  audience: z.enum(RESOURCE_AUDIENCES).default("all"),
  topic: z.string().trim().max(200).optional().nullable(),
  format: z.string().trim().max(100).optional().nullable(),
  grade_range: z.string().trim().max(100).optional().nullable(),
  age_range: z.string().trim().max(100).optional().nullable(),
  reading_level: z.string().trim().max(100).optional().nullable(),
  location_scope: z.string().trim().max(100).default("national"),
  estimated_time: z.string().trim().max(100).optional().nullable(),
  url: z.string().trim().url().max(2000).optional().nullable().or(z.literal("")),
  image_url: z.string().trim().url().max(2000).optional().nullable().or(z.literal("")),
  source_name: z.string().trim().max(200).optional().nullable(),
  verified_status: z.enum(RESOURCE_VERIFIED_STATUSES).default("pending"),
});

export const ownerSaveResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => resourceInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const row: Record<string, any> = { ...rest };
    if (row.url === "") row.url = null;
    if (row.image_url === "") row.image_url = null;
    if (id) {
      const { error } = await supabaseAdmin
        .from("resources")
        .update(row as never)
        .eq("id", id);
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, "resource_updated", "resource", id);
      return { ok: true, id };
    } else {
      row.created_by_user_id = userId;
      const { data: ins, error } = await supabaseAdmin
        .from("resources")
        .insert(row as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      await logActivity(supabase, userId, "resource_created", "resource", ins.id);
      return { ok: true, id: ins.id };
    }
  });

export const ownerDeleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("resources")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "resource_deleted", "resource", data.id);
    return { ok: true };
  });

// ---------- Analytics ----------

export type AnalyticsSeriesPoint = { date: string; count: number };

export type AdminAnalytics = {
  range_days: number;
  totals: {
    users: number;
    waitlist: number;
    contacts: number;
    resources_published: number;
    resources_pending: number;
    blog_published: number;
    blog_drafts: number;
    faqs_published: number;
    testimonials_published: number;
  };
  recent: {
    waitlist: number;
    contacts: number;
    users: number;
  };
  waitlist_by_status: Record<string, number>;
  contacts_by_status: Record<string, number>;
  action_counts: Array<{ action_type: string; count: number }>;
  signup_series: AnalyticsSeriesPoint[];
  waitlist_series: AnalyticsSeriesPoint[];
  contact_series: AnalyticsSeriesPoint[];
};

function bucketByDay(rows: Array<{ created_at: string }>, days: number): AnalyticsSeriesPoint[] {
  const out: AnalyticsSeriesPoint[] = [];
  const map = new Map<string, number>();
  for (const r of rows) {
    const d = r.created_at.slice(0, 10);
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    out.push({ date: d, count: map.get(d) ?? 0 });
  }
  return out;
}

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ days: z.number().int().min(7).max(90).default(30) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const since = new Date(Date.now() - data.days * 24 * 60 * 60 * 1000).toISOString();

    const [
      uTotal,
      wTotal,
      cTotal,
      rPub,
      rPend,
      blogPub,
      blogDraft,
      faqsPub,
      testimonialsPub,
      uRecent,
      wRecent,
      cRecent,
      wByStatus,
      cByStatus,
      activity,
      signupRows,
      waitlistRows,
      contactRows,
    ] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("waitlist").select("id", { count: "exact", head: true }),
      supabase.from("contact_submissions").select("id", { count: "exact", head: true }),
      supabase
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("verified_status", "verified"),
      supabase
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("verified_status", "pending"),
      supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      supabase
        .from("blog_posts")
        .select("id", { count: "exact", head: true })
        .eq("status", "draft"),
      supabase
        .from("faqs")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      supabase
        .from("testimonials")
        .select("id", { count: "exact", head: true })
        .eq("is_published", true),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      supabase
        .from("waitlist")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      supabase
        .from("contact_submissions")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since),
      supabase.from("waitlist").select("status"),
      supabase.from("contact_submissions").select("status"),
      supabase
        .from("admin_activity_logs")
        .select("action_type")
        .gte("created_at", since)
        .limit(2000),
      supabase.from("profiles").select("created_at").gte("created_at", since).limit(5000),
      supabase.from("waitlist").select("created_at").gte("created_at", since).limit(5000),
      supabase
        .from("contact_submissions")
        .select("created_at")
        .gte("created_at", since)
        .limit(5000),
    ]);

    const tally = (rows: any[] | null, key: string) => {
      const m: Record<string, number> = {};
      for (const r of rows ?? []) m[r[key] ?? "unknown"] = (m[r[key] ?? "unknown"] ?? 0) + 1;
      return m;
    };
    const actionMap = tally(activity.data as any[], "action_type");
    const action_counts = Object.entries(actionMap)
      .map(([action_type, count]) => ({ action_type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const out: AdminAnalytics = {
      range_days: data.days,
      totals: {
        users: uTotal.count ?? 0,
        waitlist: wTotal.count ?? 0,
        contacts: cTotal.count ?? 0,
        resources_published: rPub.count ?? 0,
        resources_pending: rPend.count ?? 0,
        blog_published: blogPub.count ?? 0,
        blog_drafts: blogDraft.count ?? 0,
        faqs_published: faqsPub.count ?? 0,
        testimonials_published: testimonialsPub.count ?? 0,
      },
      recent: {
        users: uRecent.count ?? 0,
        waitlist: wRecent.count ?? 0,
        contacts: cRecent.count ?? 0,
      },
      waitlist_by_status: tally(wByStatus.data as any[], "status"),
      contacts_by_status: tally(cByStatus.data as any[], "status"),
      action_counts,
      signup_series: bucketByDay((signupRows.data ?? []) as any[], data.days),
      waitlist_series: bucketByDay((waitlistRows.data ?? []) as any[], data.days),
      contact_series: bucketByDay((contactRows.data ?? []) as any[], data.days),
    };
    return out;
  });

// ---------- Dashboard resource counts addendum ----------

export const getResourceCounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const [published, drafts] = await Promise.all([
      supabase
        .from("resources")
        .select("id", { count: "exact", head: true })
        .eq("verified_status", "verified"),
      supabase
        .from("resources")
        .select("id", { count: "exact", head: true })
        .neq("verified_status", "verified"),
    ]);
    return {
      published: published.count ?? 0,
      drafts: drafts.count ?? 0,
    };
  });

// ---------- Admin invitations ----------

export type AdminInvitation = {
  id: string;
  email: string;
  role: AdminRole;
  token: string;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  revoked_at: string | null;
  invited_by_name?: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
};

function invitationStatus(row: {
  accepted_at: string | null;
  revoked_at: string | null;
  expires_at: string;
}): AdminInvitation["status"] {
  if (row.accepted_at) return "accepted";
  if (row.revoked_at) return "revoked";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "pending";
}

export const ownerListAdminInvitations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { data, error } = await supabase
      .from("admin_invitations")
      .select("*")
      .order("invited_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as any[];
    const inviterIds = Array.from(new Set(rows.map((r) => r.invited_by).filter(Boolean)));
    let nameById = new Map<string, string | null>();
    if (inviterIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", inviterIds);
      nameById = new Map((profs ?? []).map((p: any) => [p.id, p.full_name]));
    }
    const invitations: AdminInvitation[] = rows.map((r) => ({
      ...r,
      invited_by_name: nameById.get(r.invited_by) ?? null,
      status: invitationStatus(r),
    }));
    return { invitations };
  });

export const ownerCreateAdminInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { email: string; role: AdminRole }) =>
    z
      .object({
        email: z.string().trim().toLowerCase().email().max(255),
        role: z.enum(ADMIN_ROLES),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);

    // If a profile already exists for that email AND already has the role, no-op.
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (existingProfile?.id) {
      const { data: existingRole } = await supabase
        .from("admin_roles")
        .select("id")
        .eq("user_id", existingProfile.id)
        .eq("role", data.role)
        .maybeSingle();
      if (existingRole) {
        throw new Error("That user already has this admin role.");
      }
    }

    // Revoke any prior pending invitation for the same email + role.
    await supabase
      .from("admin_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("email", data.email)
      .eq("role", data.role)
      .is("accepted_at", null)
      .is("revoked_at", null);

    const { data: inserted, error } = await supabase
      .from("admin_invitations")
      .insert({
        email: data.email,
        role: data.role,
        invited_by: userId,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "admin_invited", "admin_invitation", inserted.id, {
      email: data.email,
      role: data.role,
    });
    return { invitation: { ...inserted, status: "pending" } as AdminInvitation };
  });

export const ownerRevokeAdminInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    const { error } = await supabase
      .from("admin_invitations")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("accepted_at", null);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "admin_invitation_revoked", "admin_invitation", data.id);
    return { ok: true };
  });

export const ownerRemoveAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { user_id: string; role: AdminRole }) =>
    z.object({ user_id: z.string().uuid(), role: z.enum(ADMIN_ROLES) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await requirePlatformAdmin(supabase, userId);
    if (data.user_id === userId && data.role === "platform_owner") {
      // Prevent removing the last platform owner.
      const { count } = await supabase
        .from("admin_roles")
        .select("id", { count: "exact", head: true })
        .eq("role", "platform_owner");
      if ((count ?? 0) <= 1) throw new Error("Cannot remove the last platform owner.");
    }
    const { error } = await supabase
      .from("admin_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", data.role);
    if (error) throw new Error(error.message);
    await logActivity(supabase, userId, "admin_role_removed", "user", data.user_id, {
      role: data.role,
    });
    return { ok: true };
  });

// Public-ish: invitee looks up an invitation by token (must be signed in to see details).
export const previewAdminInvitation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(16).max(128) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("admin_invitations")
      .select("id, email, role, invited_at, expires_at, accepted_at, revoked_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { invitation: null };
    return {
      invitation: {
        id: row.id,
        email: row.email,
        role: row.role as AdminRole,
        invited_at: row.invited_at,
        expires_at: row.expires_at,
        status: invitationStatus(row),
      },
    };
  });

export const acceptAdminInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { token: string }) =>
    z.object({ token: z.string().min(16).max(128) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invite } = await supabaseAdmin
      .from("admin_invitations")
      .select("*")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) throw new Error("Invitation not found.");
    const status = invitationStatus(invite as any);
    if (status !== "pending") {
      throw new Error(`This invitation is ${status}.`);
    }

    // Verify signed-in user's email matches the invited email.
    // Prefer the auth claim (always present, always current); fall back to profiles.email.
    let userEmail = (context.claims as any)?.email
      ? String((context.claims as any).email).toLowerCase()
      : "";
    if (!userEmail) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", userId)
        .maybeSingle();
      userEmail = (profile?.email ?? "").toLowerCase();
    }
    if (!userEmail || userEmail !== invite.email.toLowerCase()) {
      throw new Error(
        `This invitation was sent to ${invite.email}. Sign in with that email to accept.`,
      );
    }

    // Grant the admin role (idempotent).
    const { error: roleErr } = await supabaseAdmin.from("admin_roles").insert({
      user_id: userId,
      role: invite.role,
      granted_by: invite.invited_by,
    });
    if (roleErr && !String(roleErr.message).toLowerCase().includes("duplicate")) {
      throw new Error(roleErr.message);
    }

    await supabaseAdmin
      .from("admin_invitations")
      .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq("id", invite.id);

    await logActivity(supabase, userId, "admin_invitation_accepted", "admin_invitation", invite.id, {
      role: invite.role,
    });
    return { ok: true, role: invite.role as AdminRole };
  });
