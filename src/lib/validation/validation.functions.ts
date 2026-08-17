import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// --- Shared admin guard ---
async function ensureAdmin(supabase: any, userId: string) {
  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (data) return;
  const { data: r } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!r) throw new Error("Forbidden");
}

// =============== BETA TESTERS ===============
export const listBetaTesters = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("beta_testers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertBetaTester = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        first_name: z.string().min(1).max(120),
        last_name: z.string().max(120).optional().nullable(),
        email: z.string().email().max(255),
        role_type: z.enum([
          "parent_guardian",
          "student",
          "educator_case_manager",
          "school_admin",
          "district_admin",
          "partner_org",
          "general_reviewer",
        ]),
        organization: z.string().max(255).optional().nullable(),
        invitation_status: z
          .enum(["not_invited", "invited", "accepted", "completed", "inactive"])
          .optional(),
        testing_status: z
          .enum(["not_started", "in_progress", "completed", "needs_follow_up"])
          .optional(),
        assigned_test_script: z.string().max(120).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const payload = { ...data, invited_by_user_id: context.userId };
    const { data: row, error } = data.id
      ? await context.supabase
          .from("beta_testers")
          .update(payload)
          .eq("id", data.id)
          .select()
          .single()
      : await context.supabase.from("beta_testers").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteBetaTester = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("beta_testers").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============== TESTING SCRIPTS ===============
export const listTestingScripts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("testing_scripts")
      .select("*")
      .order("title");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

// =============== FEEDBACK ===============
export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        feedback_type: z.enum([
          "bug",
          "confusing",
          "feature_request",
          "missing_resource",
          "missing_partner",
          "data_access",
          "design_usability",
          "general",
        ]),
        title: z.string().min(1).max(200),
        description: z.string().min(1).max(5000),
        related_page: z.string().max(500).optional(),
        screenshot_url: z.string().url().max(1000).optional().nullable(),
        priority_suggestion: z.enum(["low", "medium", "high", "critical"]).optional().nullable(),
        user_role: z.string().max(60).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("feedback_submissions")
      .insert({ ...data, submitted_by_user_id: context.userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const listFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("feedback_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const updateFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z
          .enum(["new", "reviewed", "in_progress", "resolved", "archived"])
          .optional(),
        admin_notes: z.string().max(5000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("feedback_submissions")
      .update(rest)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const convertFeedbackToIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        feedback_id: z.string().uuid(),
        priority: z.enum(["P0", "P1", "P2", "P3"]).default("P2"),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data: fb, error: fbErr } = await context.supabase
      .from("feedback_submissions")
      .select("*")
      .eq("id", data.feedback_id)
      .single();
    if (fbErr || !fb) throw new Error("Feedback not found");
    const { data: issue, error } = await context.supabase
      .from("product_issues")
      .insert({
        title: fb.title,
        description: fb.description,
        reported_by_user_id: fb.submitted_by_user_id,
        related_feedback_id: fb.id,
        affected_role: fb.user_role,
        priority: data.priority,
        status: "new",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await context.supabase
      .from("feedback_submissions")
      .update({ linked_issue_id: issue.id, status: "in_progress" })
      .eq("id", fb.id);
    return { issue };
  });

// =============== ISSUES ===============
export const listIssues = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("product_issues")
      .select("*")
      .order("priority")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        title: z.string().min(1).max(200),
        description: z.string().max(5000).optional().nullable(),
        affected_role: z.string().max(60).optional().nullable(),
        affected_feature: z.string().max(120).optional().nullable(),
        priority: z.enum(["P0", "P1", "P2", "P3"]),
        status: z.enum(["new", "triaged", "in_progress", "fixed", "wont_fix", "archived"]),
        admin_notes: z.string().max(5000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { data: row, error } = id
      ? await context.supabase
          .from("product_issues")
          .update(rest)
          .eq("id", id)
          .select()
          .single()
      : await context.supabase.from("product_issues").insert(rest).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteIssue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("product_issues").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============== LAUNCH CHECKLIST ===============
export const listChecklist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("launch_checklist_items")
      .select("*")
      .order("category")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const updateChecklistItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["not_started", "in_progress", "complete", "blocked"]).optional(),
        owner: z.string().max(120).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { error } = await context.supabase
      .from("launch_checklist_items")
      .update(rest)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============== PILOT OUTREACH ===============
export const listOutreach = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("pilot_outreach_contacts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        contact_name: z.string().min(1).max(200),
        organization: z.string().max(200).optional().nullable(),
        role_type: z.string().max(120).optional().nullable(),
        email: z.string().email().max(255).optional().nullable(),
        phone: z.string().max(50).optional().nullable(),
        relationship_notes: z.string().max(2000).optional().nullable(),
        outreach_status: z
          .enum([
            "not_contacted",
            "contacted",
            "meeting_scheduled",
            "demo_completed",
            "interested",
            "not_interested",
            "follow_up_needed",
          ])
          .optional(),
        last_contacted_at: z.string().datetime().optional().nullable(),
        next_follow_up_at: z.string().datetime().optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { data: row, error } = id
      ? await context.supabase
          .from("pilot_outreach_contacts")
          .update(rest)
          .eq("id", id)
          .select()
          .single()
      : await context.supabase
          .from("pilot_outreach_contacts")
          .insert(rest)
          .select()
          .single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deleteOutreach = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("pilot_outreach_contacts")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============== PILOT PACKAGES ===============
export const listPilotPackages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("pilot_packages")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });

export const upsertPilotPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        package_name: z.string().min(1).max(200),
        audience: z.string().max(200).optional().nullable(),
        description: z.string().max(5000).optional().nullable(),
        included_features: z.string().max(5000).optional().nullable(),
        suggested_price_or_status: z.string().max(200).optional().nullable(),
        notes: z.string().max(5000).optional().nullable(),
        public_visible: z.boolean().optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { id, ...rest } = data;
    const { data: row, error } = id
      ? await context.supabase
          .from("pilot_packages")
          .update(rest)
          .eq("id", id)
          .select()
          .single()
      : await context.supabase.from("pilot_packages").insert(rest).select().single();
    if (error) throw new Error(error.message);
    return { row };
  });

export const deletePilotPackage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("pilot_packages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// =============== USAGE EVENTS ===============
export const recordUsageEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({
        event_type: z.string().min(1).max(80).regex(/^[a-z0-9_.-]+$/i),
        page: z.string().max(300).optional().nullable(),
        related_record_type: z.string().max(80).optional().nullable(),
        related_record_id: z.string().uuid().optional().nullable(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await context.supabase.from("usage_events").insert({
      event_type: data.event_type,
      user_id: context.userId,
      page: data.page ?? null,
      related_record_type: data.related_record_type ?? null,
      related_record_id: data.related_record_id ?? null,
      metadata: (data.metadata as any) ?? null,
    });
    return { ok: true };
  });

export const summarizeUsageEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const since = new Date(Date.now() - 14 * 86400000).toISOString();
    const { data, error } = await context.supabase
      .from("usage_events")
      .select("event_type, created_at")
      .gte("created_at", since)
      .limit(5000);
    if (error) throw new Error(error.message);
    const counts = new Map<string, number>();
    for (const r of data ?? []) counts.set(r.event_type, (counts.get(r.event_type) ?? 0) + 1);
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([event_type, count]) => ({ event_type, count }));
    return { top, total: data?.length ?? 0 };
  });

// =============== EMAIL NOTIFICATIONS ===============
export const listEmailNotifications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.supabase, context.userId);
    const { data, error } = await context.supabase
      .from("email_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { rows: data ?? [] };
  });
